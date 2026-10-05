begin;
create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  choices jsonb not null,
  created_at timestamptz not null default now()
);
create index survey_responses_survey_id_idx on public.survey_responses(survey_id);
create function public.validate_survey_response()
returns trigger language plpgsql set search_path = '' as $$
declare
  survey_questions jsonb;
  deadline date;
  question jsonb;
  selections jsonb;
  selection jsonb;
  question_index integer;
begin
  select questions, end_date into survey_questions, deadline
  from public.surveys where id = new.survey_id;
  if not found then raise exception 'Survey not found'; end if;
  if deadline < current_date then raise exception 'Survey has ended'; end if;
  if jsonb_typeof(new.choices) is distinct from 'array' then raise exception 'Invalid choices'; end if;
  if jsonb_array_length(new.choices) <> jsonb_array_length(survey_questions) then
    raise exception 'Answer every question';
  end if;
  for question_index in 0..jsonb_array_length(survey_questions) - 1 loop
    question := survey_questions->question_index;
    selections := new.choices->question_index;
    if jsonb_typeof(selections) is distinct from 'array' then raise exception 'Invalid selections'; end if;
    if jsonb_array_length(selections) = 0
      or (not (question->>'multiple')::boolean and jsonb_array_length(selections) <> 1) then
      raise exception 'Invalid number of answers';
    end if;
    if (select count(distinct value) from jsonb_array_elements(selections)) <> jsonb_array_length(selections) then
      raise exception 'Duplicate answer';
    end if;
    for selection in select value from jsonb_array_elements(selections) loop
      if jsonb_typeof(selection) is distinct from 'number' then raise exception 'Invalid answer index'; end if;
      if (selection #>> '{}') !~ '^[0-9]+$' then raise exception 'Invalid answer index'; end if;
      if (selection #>> '{}')::numeric >= jsonb_array_length(question->'answers') then
        raise exception 'Invalid answer index';
      end if;
    end loop;
  end loop;
  return new;
end;
$$;
create trigger validate_survey_response before insert on public.survey_responses
for each row execute function public.validate_survey_response();
alter table public.survey_responses enable row level security;
revoke all on public.survey_responses from anon, authenticated;
grant select, insert on public.survey_responses to anon, authenticated;
create policy "Read survey responses" on public.survey_responses for select to anon, authenticated using (true);
create policy "Submit survey responses" on public.survey_responses for insert to anon, authenticated
with check (exists (select 1 from public.surveys where id = survey_id and (end_date is null or end_date >= current_date)));
commit;

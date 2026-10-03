begin;

-- The app currently has no login: published surveys are public and anyone can
-- create one. No client can update or delete existing surveys.
create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 300),
  description text not null default '',
  category text not null check (category in ('Team activities', 'Gaming', 'Healthy Lifestyle', 'Other')),
  end_date date,
  questions jsonb not null,
  created_at timestamptz not null default now(),
  constraint questions_are_array check (
    jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) >= 1
  )
);

-- Validate all nested inputs even when requests bypass the form.
create function public.validate_survey_questions()
returns trigger language plpgsql set search_path = '' as $$
declare question jsonb; answer jsonb;
begin
  for question in select value from jsonb_array_elements(new.questions) loop
    if jsonb_typeof(question) is distinct from 'object'
      or jsonb_typeof(question->'title') is distinct from 'string'
      or length(trim(question->>'title')) = 0
      or jsonb_typeof(question->'multiple') is distinct from 'boolean'
      or jsonb_typeof(question->'answers') is distinct from 'array' then
      raise exception 'Invalid question';
    end if;
    if jsonb_array_length(question->'answers') < 2 then
      raise exception 'At least two answers are required';
    end if;
    for answer in select value from jsonb_array_elements(question->'answers') loop
      if jsonb_typeof(answer) is distinct from 'string' or length(trim(answer #>> '{}')) = 0 then
        raise exception 'Invalid answer';
      end if;
    end loop;
  end loop;
  return new;
end;
$$;

create trigger validate_survey_questions before insert or update on public.surveys
for each row execute function public.validate_survey_questions();

alter table public.surveys enable row level security;
revoke all on public.surveys from anon, authenticated;
grant select, insert on public.surveys to anon, authenticated;
create policy "Read published surveys" on public.surveys for select to anon, authenticated using (true);
create policy "Create surveys" on public.surveys for insert to anon, authenticated
with check (end_date is null or end_date >= current_date);

commit;

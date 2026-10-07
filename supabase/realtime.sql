-- Applied remotely as enable_survey_response_realtime (20261007044622).
-- Enable live insert notifications without changing existing access policies.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'survey_responses'
  ) then
    alter publication supabase_realtime add table public.survey_responses;
  end if;
end;
$$;

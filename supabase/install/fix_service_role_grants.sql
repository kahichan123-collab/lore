-- 古問 LORE — fix service-role table privileges
-- Run this once in the Supabase SQL Editor if `npm run seed` says
-- "permission denied for table classics".
--
-- Supabase's service_role bypasses Row Level Security, but it still needs
-- ordinary table privileges. The current one-file installer includes these
-- grants; this small script repairs a project that was created before that
-- fix. It is safe to run more than once.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

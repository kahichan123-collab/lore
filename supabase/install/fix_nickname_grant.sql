-- 古問 LORE — fix the nickname-onboarding permission
-- Run this once in the Supabase SQL Editor if the welcome page says
-- "未能儲存暱稱，請再試一次" / "Could not save your nickname".
--
-- The original column grant covered nickname and language only, but the
-- welcome and profile forms also write nickname_chosen.

grant update (nickname_chosen) on public.profiles to authenticated;

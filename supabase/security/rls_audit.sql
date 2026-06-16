-- Verify RLS is enabled and ownership policies are present.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('google_ads_credentials', 'campaigns_log', 'ad_drafts')
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in ('google_ads_credentials', 'campaigns_log', 'ad_drafts')
order by tablename, cmd, policyname;

-- Idempotent RLS hardening. Run with a privileged role in Supabase SQL editor.
alter table public.google_ads_credentials enable row level security;
alter table public.campaigns_log enable row level security;
alter table public.ad_drafts enable row level security;

-- Remove the original policy names from 001_initial_schema.sql so only the audited policy set remains.
drop policy if exists "Users can read their Google Ads credentials" on public.google_ads_credentials;
drop policy if exists "Users can insert their Google Ads credentials" on public.google_ads_credentials;
drop policy if exists "Users can update their Google Ads credentials" on public.google_ads_credentials;
drop policy if exists "Users can delete their Google Ads credentials" on public.google_ads_credentials;
drop policy if exists "Users can read their campaign logs" on public.campaigns_log;
drop policy if exists "Users can insert their campaign logs" on public.campaigns_log;
drop policy if exists "Users can update their campaign logs" on public.campaigns_log;
drop policy if exists "Users can delete their campaign logs" on public.campaigns_log;
drop policy if exists "Users can read their ad drafts" on public.ad_drafts;
drop policy if exists "Users can insert their ad drafts" on public.ad_drafts;
drop policy if exists "Users can update their ad drafts" on public.ad_drafts;
drop policy if exists "Users can delete their ad drafts" on public.ad_drafts;

drop policy if exists "google_ads_credentials_select_own" on public.google_ads_credentials;
create policy "google_ads_credentials_select_own"
on public.google_ads_credentials for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "google_ads_credentials_insert_own" on public.google_ads_credentials;
create policy "google_ads_credentials_insert_own"
on public.google_ads_credentials for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "google_ads_credentials_update_own" on public.google_ads_credentials;
create policy "google_ads_credentials_update_own"
on public.google_ads_credentials for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "google_ads_credentials_delete_own" on public.google_ads_credentials;
create policy "google_ads_credentials_delete_own"
on public.google_ads_credentials for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "campaigns_log_select_own" on public.campaigns_log;
create policy "campaigns_log_select_own"
on public.campaigns_log for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "campaigns_log_insert_own" on public.campaigns_log;
create policy "campaigns_log_insert_own"
on public.campaigns_log for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "campaigns_log_update_own" on public.campaigns_log;
create policy "campaigns_log_update_own"
on public.campaigns_log for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "campaigns_log_delete_own" on public.campaigns_log;
create policy "campaigns_log_delete_own"
on public.campaigns_log for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "ad_drafts_select_own" on public.ad_drafts;
create policy "ad_drafts_select_own"
on public.ad_drafts for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "ad_drafts_insert_own" on public.ad_drafts;
create policy "ad_drafts_insert_own"
on public.ad_drafts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "ad_drafts_update_own" on public.ad_drafts;
create policy "ad_drafts_update_own"
on public.ad_drafts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "ad_drafts_delete_own" on public.ad_drafts;
create policy "ad_drafts_delete_own"
on public.ad_drafts for delete
to authenticated
using (auth.uid() = user_id);

-- Anon-key RLS test example. Replace placeholders and run from a shell.
-- export SUPABASE_URL="https://PROJECT.supabase.co"
-- export SUPABASE_ANON_KEY="ey..."
-- export USER_A_JWT="ey..." # access_token for signed-in user A, not service role
-- export USER_B_ID="00000000-0000-0000-0000-000000000000"
-- curl "$SUPABASE_URL/rest/v1/campaigns_log?select=*&user_id=eq.$USER_B_ID" \
--   -H "apikey: $SUPABASE_ANON_KEY" \
--   -H "Authorization: Bearer $USER_A_JWT"
-- Expected result: [] for another user's rows. Inserts with user_id != auth.uid() must return 403/401.

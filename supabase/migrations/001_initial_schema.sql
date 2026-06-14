create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.app_settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on all tables in schema private from anon, authenticated;

insert into private.app_settings (key, value)
values ('google_ads_encryption_key', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

create or replace function public.google_ads_encryption_key()
returns text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  key_value text;
begin
  key_value := current_setting('app.google_ads_encryption_key', true);

  if key_value is null or length(key_value) < 32 then
    select value into key_value
    from private.app_settings
    where key = 'google_ads_encryption_key';
  end if;

  if key_value is null or length(key_value) < 32 then
    raise exception 'Missing Google Ads encryption key. Re-run the Supabase migration or set app.google_ads_encryption_key.';
  end if;

  return key_value;
end;
$$;

create or replace function public.encrypt_google_ads_secret(secret_value text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if secret_value is null or secret_value = '' then
    return secret_value;
  end if;
  return encode(extensions.pgp_sym_encrypt(secret_value, public.google_ads_encryption_key()), 'base64');
end;
$$;

create or replace function public.decrypt_google_ads_secret(secret_value text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if secret_value is null or secret_value = '' then
    return secret_value;
  end if;
  return extensions.pgp_sym_decrypt(decode(secret_value, 'base64'), public.google_ads_encryption_key());
end;
$$;

create table if not exists public.google_ads_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  client_secret text not null,
  refresh_token text,
  developer_token text not null,
  customer_id text,
  manager_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_ads_credentials_customer_id_digits check (customer_id is null or customer_id ~ '^[0-9]+$'),
  constraint google_ads_credentials_manager_id_digits check (manager_customer_id is null or manager_customer_id ~ '^[0-9]+$'),
  constraint google_ads_credentials_one_per_user unique (user_id)
);

create table if not exists public.campaigns_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_resource_name text not null,
  campaign_name text not null,
  campaign_type text not null,
  status text not null default 'PAUSED',
  daily_budget_micros bigint not null default 0,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  last_synced_at timestamptz,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  spend_micros bigint not null default 0,
  conversions numeric not null default 0,
  ctr numeric not null default 0,
  avg_cpc_micros bigint not null default 0,
  constraint campaigns_log_status_check check (status in ('ENABLED', 'PAUSED', 'REMOVED', 'UNKNOWN')),
  constraint campaigns_log_type_check check (campaign_type in ('SEARCH', 'DISPLAY', 'PERFORMANCE_MAX', 'VIDEO', 'DEMAND_GEN')),
  constraint campaigns_log_unique_campaign unique (user_id, campaign_resource_name)
);

create table if not exists public.ad_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_type text not null,
  form_data jsonb not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_drafts_type_check check (campaign_type in ('SEARCH', 'DISPLAY', 'PERFORMANCE_MAX', 'VIDEO', 'DEMAND_GEN')),
  constraint ad_drafts_status_check check (status in ('draft', 'pushed', 'failed'))
);

create index if not exists google_ads_credentials_user_id_idx on public.google_ads_credentials(user_id);
create index if not exists campaigns_log_user_id_idx on public.campaigns_log(user_id);
create index if not exists campaigns_log_resource_idx on public.campaigns_log(campaign_resource_name);
create index if not exists ad_drafts_user_id_idx on public.ad_drafts(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists google_ads_credentials_updated_at on public.google_ads_credentials;
create trigger google_ads_credentials_updated_at
before update on public.google_ads_credentials
for each row execute function public.set_updated_at();

drop trigger if exists ad_drafts_updated_at on public.ad_drafts;
create trigger ad_drafts_updated_at
before update on public.ad_drafts
for each row execute function public.set_updated_at();

alter table public.google_ads_credentials enable row level security;
alter table public.campaigns_log enable row level security;
alter table public.ad_drafts enable row level security;

drop policy if exists "Users can read their Google Ads credentials" on public.google_ads_credentials;
create policy "Users can read their Google Ads credentials"
on public.google_ads_credentials for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their Google Ads credentials" on public.google_ads_credentials;
create policy "Users can insert their Google Ads credentials"
on public.google_ads_credentials for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their Google Ads credentials" on public.google_ads_credentials;
create policy "Users can update their Google Ads credentials"
on public.google_ads_credentials for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their Google Ads credentials" on public.google_ads_credentials;
create policy "Users can delete their Google Ads credentials"
on public.google_ads_credentials for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their campaign logs" on public.campaigns_log;
create policy "Users can read their campaign logs"
on public.campaigns_log for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their campaign logs" on public.campaigns_log;
create policy "Users can insert their campaign logs"
on public.campaigns_log for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their campaign logs" on public.campaigns_log;
create policy "Users can update their campaign logs"
on public.campaigns_log for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their campaign logs" on public.campaigns_log;
create policy "Users can delete their campaign logs"
on public.campaigns_log for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their ad drafts" on public.ad_drafts;
create policy "Users can read their ad drafts"
on public.ad_drafts for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their ad drafts" on public.ad_drafts;
create policy "Users can insert their ad drafts"
on public.ad_drafts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their ad drafts" on public.ad_drafts;
create policy "Users can update their ad drafts"
on public.ad_drafts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their ad drafts" on public.ad_drafts;
create policy "Users can delete their ad drafts"
on public.ad_drafts for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.upsert_google_ads_credentials(
  p_user_id uuid,
  p_client_id text,
  p_client_secret text,
  p_refresh_token text,
  p_developer_token text,
  p_customer_id text,
  p_manager_customer_id text
)
returns public.google_ads_credentials
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row public.google_ads_credentials;
begin
  if auth.uid() is distinct from p_user_id and auth.role() <> 'service_role' then
    raise exception 'You can only save credentials for your own account.';
  end if;

  insert into public.google_ads_credentials (
    user_id,
    client_id,
    client_secret,
    refresh_token,
    developer_token,
    customer_id,
    manager_customer_id
  ) values (
    p_user_id,
    p_client_id,
    public.encrypt_google_ads_secret(p_client_secret),
    public.encrypt_google_ads_secret(p_refresh_token),
    public.encrypt_google_ads_secret(p_developer_token),
    nullif(regexp_replace(coalesce(p_customer_id, ''), '[^0-9]', '', 'g'), ''),
    nullif(regexp_replace(coalesce(p_manager_customer_id, ''), '[^0-9]', '', 'g'), '')
  )
  on conflict (user_id) do update set
    client_id = excluded.client_id,
    client_secret = excluded.client_secret,
    refresh_token = coalesce(excluded.refresh_token, public.google_ads_credentials.refresh_token),
    developer_token = excluded.developer_token,
    customer_id = excluded.customer_id,
    manager_customer_id = excluded.manager_customer_id
  returning * into saved_row;

  return saved_row;
end;
$$;

create or replace function public.get_google_ads_credentials(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  client_id text,
  client_secret text,
  refresh_token text,
  developer_token text,
  customer_id text,
  manager_customer_id text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.user_id,
    c.client_id,
    public.decrypt_google_ads_secret(c.client_secret) as client_secret,
    public.decrypt_google_ads_secret(c.refresh_token) as refresh_token,
    public.decrypt_google_ads_secret(c.developer_token) as developer_token,
    c.customer_id,
    c.manager_customer_id,
    c.created_at,
    c.updated_at
  from public.google_ads_credentials c
  where c.user_id = p_user_id
    and (auth.uid() = p_user_id or auth.role() = 'service_role')
  limit 1;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-assets',
  'campaign-assets',
  false,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their campaign assets" on storage.objects;
create policy "Users can read their campaign assets"
on storage.objects for select
to authenticated
using (bucket_id = 'campaign-assets' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "Users can upload their campaign assets" on storage.objects;
create policy "Users can upload their campaign assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'campaign-assets' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "Users can delete their campaign assets" on storage.objects;
create policy "Users can delete their campaign assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'campaign-assets' and split_part(name, '/', 1) = auth.uid()::text);

-- 002_google_ads_encryption_key_fallback.sql
-- Ensure encrypted Google Ads credential storage works even when the database
-- setting app.google_ads_encryption_key has not been manually configured.

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
    raise exception 'Missing Google Ads encryption key. Re-run migration 002_google_ads_encryption_key_fallback.sql or set app.google_ads_encryption_key.';
  end if;

  return key_value;
end;
$$;

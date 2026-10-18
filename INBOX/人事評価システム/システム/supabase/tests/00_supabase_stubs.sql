-- Minimal stand-ins for the pieces Supabase provides, so that the project's
-- real migrations can be applied unmodified against a throwaway Postgres.
create extension if not exists pgcrypto;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb
);

create function auth.uid() returns uuid language sql stable as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$fn$;

create function auth.role() returns text language sql stable as $fn$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated');
$fn$;

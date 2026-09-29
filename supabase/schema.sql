-- PS5 Arena — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE where possible.

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists btree_gist; -- required for the EXCLUDE constraint below

-- ─────────────────────────────────────────────────────────────────────
-- Bookings
-- ─────────────────────────────────────────────────────────────────────
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_ref text unique not null,
  name text not null,
  phone text not null,
  email text,                      -- optional, extends the requested schema so we can email a confirmation
  date date not null,
  start_time time not null,
  duration_hours smallint not null check (duration_hours between 1 and 5),
  end_time time not null,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled')),
  selected_games jsonb,             -- optional, extends the requested schema to keep the game-picker UX
  created_at timestamptz not null default now(),
  -- Naive (timezone-less) timestamps combining date + time. Every booking
  -- is always in the lounge's own local time (IST), so plain `timestamp`
  -- arithmetic is correct here and — unlike `timestamptz` with a named
  -- zone — is IMMUTABLE, which Postgres requires for generated columns.
  starts_at timestamp generated always as (date + start_time) stored,
  ends_at timestamp generated always as (date + end_time) stored
);

create index if not exists bookings_date_idx on bookings (date);
create index if not exists bookings_status_idx on bookings (status);

-- Atomic, race-condition-proof overlap prevention: two non-cancelled
-- bookings can never have overlapping [starts_at, ends_at) ranges. This is
-- enforced by Postgres itself at INSERT time (raises error 23P01), so no
-- amount of concurrent requests can ever double-book a slot.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_no_overlap'
  ) then
    alter table bookings
      add constraint bookings_no_overlap
      exclude using gist (tsrange(starts_at, ends_at) with &&)
      where (status <> 'cancelled');
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- Rate limiting (fixed window, keyed by "bucket:ip:windowStartMs")
-- ─────────────────────────────────────────────────────────────────────
create table if not exists rate_limits (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists rate_limits_window_idx on rate_limits (window_start);

-- Atomic increment-or-create. Concurrent calls with the same key are
-- serialized by Postgres's row-level locking on the upsert, so the
-- returned count is always correct even under a burst of requests.
create or replace function increment_rate_limit(p_key text, p_window_start timestamptz)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  insert into rate_limits (key, count, window_start, updated_at)
  values (p_key, 1, p_window_start, now())
  on conflict (key) do update
    set count = rate_limits.count + 1,
        updated_at = now()
  returning count into v_count;

  -- Opportunistic cleanup of old windows so this table doesn't grow forever.
  delete from rate_limits where window_start < now() - interval '1 hour';

  return v_count;
end;
$$;

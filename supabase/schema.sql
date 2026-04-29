-- ================================================================
-- Base — powered by Call Stream AI  |  Full v2 Schema
-- ================================================================
-- Run this in Supabase → SQL Editor (safe to re-run — idempotent)

create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- 1. profiles  (one per auth.users row)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
    id            uuid primary key references auth.users(id) on delete cascade,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    display_name  text,
    company_name  text,
    company_role  text,
    avatar_url    text
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ──────────────────────────────────────────────────────────────
-- 2. flows  (saved Based flows, per user)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.flows (
    id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    name        text not null,
    description text,
    code        text not null
);

create index if not exists flows_user_id_idx on public.flows (user_id, created_at desc);

alter table public.flows enable row level security;
drop policy if exists "Users manage their own flows" on public.flows;

create policy "Users manage their own flows"
  on public.flows for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- 3. submissions  (every Debugging / Vibe AI request)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.submissions (
    id               uuid primary key default gen_random_uuid(),
    created_at       timestamptz not null default now(),
    user_id          uuid references auth.users(id) on delete set null,
    type             text not null default 'debugging',  -- 'debugging' | 'vibe'
    problem          text,
    flow             text,
    example          text,
    goal             text,
    -- vibe fields
    agent_name       text,
    rag              text,
    prompts          text,
    functions        text,
    -- response
    response         text,
    attachment_count integer not null default 0,
    user_agent       text
);

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);
create index if not exists submissions_user_id_idx on public.submissions (user_id, created_at desc);

alter table public.submissions enable row level security;
-- Service role inserts/reads bypass RLS automatically.
-- No public policies needed here.

-- ──────────────────────────────────────────────────────────────
-- 4. attachments
-- ──────────────────────────────────────────────────────────────
create table if not exists public.attachments (
    id              uuid primary key default gen_random_uuid(),
    created_at      timestamptz not null default now(),
    submission_id   uuid not null references public.submissions(id) on delete cascade,
    name            text not null,
    mime_type       text,
    size            bigint not null default 0,
    storage_path    text not null
);

create index if not exists attachments_submission_idx on public.attachments (submission_id);
alter table public.attachments enable row level security;

-- ──────────────────────────────────────────────────────────────
-- 5. Storage bucket for attachments (private)
-- ──────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'attachments') then
    insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);
  end if;
end$$;

-- ================================================================
-- Done.
-- ================================================================

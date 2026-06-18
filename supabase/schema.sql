-- ===================================================================
-- Kingdom of Order — Supabase shared-state backend
-- ===================================================================
-- Run this ONCE in the Supabase dashboard → SQL Editor → New query → Run.
--
-- BEFORE RUNNING: replace  CHANGE_ME_TO_YOUR_PASSPHRASE  (one place, below)
-- with the family passphrase you want everyone to type. It is hashed
-- (bcrypt) at rest — the plaintext is never stored.
--
-- Security model: the tables have Row Level Security ON with NO policies,
-- so the public (anon/publishable) key can NEVER read or write them
-- directly. The only way in is the four SECURITY DEFINER functions below,
-- each of which refuses to do anything unless the correct passphrase is
-- supplied. No passphrase -> empty hand, even hitting the REST API raw.
-- ===================================================================

-- pgcrypto provides crypt()/gen_salt() for bcrypt hashing.
-- On Supabase it lives in the "extensions" schema (the default).
create extension if not exists pgcrypto with schema extensions;

-- ---- tables -------------------------------------------------------
create table if not exists public.family_state (
    id         text primary key,
    state      jsonb       not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.app_config (
    id         int  primary key default 1,
    pass_hash  text not null,
    constraint app_config_single_row check (id = 1)
);

-- Lock both tables: RLS on + no policies => no direct anon/authenticated access.
alter table public.family_state enable row level security;
alter table public.app_config   enable row level security;
revoke all on public.family_state from anon, authenticated;
revoke all on public.app_config   from anon, authenticated;

-- ---- set the family passphrase (REPLACE the placeholder) ----------
insert into public.app_config (id, pass_hash)
values (1, extensions.crypt('CHANGE_ME_TO_YOUR_PASSPHRASE', extensions.gen_salt('bf')))
on conflict (id) do update set pass_hash = excluded.pass_hash;

-- ---- passphrase check (internal helper) ---------------------------
create or replace function public.kingdom_check(p_pass text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
    select exists (
        select 1 from public.app_config
        where id = 1 and pass_hash = extensions.crypt(p_pass, pass_hash)
    );
$$;

-- ---- load the shared state ----------------------------------------
create or replace function public.kingdom_load(p_pass text)
returns table(state jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
    if not public.kingdom_check(p_pass) then
        raise exception 'unauthorized' using errcode = '42501';
    end if;
    return query
        select fs.state, fs.updated_at
        from public.family_state fs
        where fs.id = 'default';
end;
$$;

-- ---- lightweight "has anything changed?" poll ---------------------
create or replace function public.kingdom_version(p_pass text)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v timestamptz;
begin
    if not public.kingdom_check(p_pass) then
        raise exception 'unauthorized' using errcode = '42501';
    end if;
    select fs.updated_at into v from public.family_state fs where fs.id = 'default';
    return v;
end;
$$;

-- ---- save the shared state (upsert; last write wins) --------------
create or replace function public.kingdom_save(p_pass text, p_state jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v timestamptz;
begin
    if not public.kingdom_check(p_pass) then
        raise exception 'unauthorized' using errcode = '42501';
    end if;
    insert into public.family_state (id, state, updated_at)
    values ('default', p_state, now())
    on conflict (id) do update
        set state = excluded.state, updated_at = now()
    returning updated_at into v;
    return v;
end;
$$;

-- ---- expose the functions to the public (anon) key ----------------
grant execute on function public.kingdom_check(text)         to anon;
grant execute on function public.kingdom_load(text)          to anon;
grant execute on function public.kingdom_version(text)       to anon;
grant execute on function public.kingdom_save(text, jsonb)   to anon;

-- To change the passphrase later, re-run just the "set the family
-- passphrase" INSERT above with a new value.

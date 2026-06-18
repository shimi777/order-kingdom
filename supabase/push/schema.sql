-- ===================================================================
-- Push notifications — optional add-on for closed-app reminders.
-- Run this in the Supabase SQL Editor AFTER the main supabase/schema.sql
-- (it reuses kingdom_check / the family passphrase).
-- ===================================================================

create table if not exists public.push_subscriptions (
    id         bigint generated always as identity primary key,
    endpoint   text unique not null,
    sub        jsonb not null,
    created_at timestamptz not null default now()
);

-- Locked like everything else: no direct anon access.
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- A device registers its Web-Push subscription, gated by the family passphrase.
create or replace function public.save_push_sub(p_pass text, p_sub jsonb)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
    if not public.kingdom_check(p_pass) then
        raise exception 'unauthorized' using errcode = '42501';
    end if;
    insert into public.push_subscriptions (endpoint, sub)
    values (p_sub->>'endpoint', p_sub)
    on conflict (endpoint) do update set sub = excluded.sub;
end;
$$;
grant execute on function public.save_push_sub(text, jsonb) to anon;

-- ---- Optional: schedule the daily reminder via pg_cron + pg_net ----
-- (Run these AFTER deploying the "push" Edge Function. Enable the
--  extensions once under Database -> Extensions: pg_cron, pg_net.)
--
-- select cron.schedule(
--   'kingdom-daily-push', '0 6 * * *',   -- 06:00 UTC = 09:00 Israel (DST); adjust as needed
--   $$ select net.http_post(
--        url := 'https://wtsslpwpuqosxkgqyhpr.supabase.co/functions/v1/push',
--        headers := jsonb_build_object('Content-Type','application/json',
--                                      'Authorization','Bearer ' || current_setting('app.cron_key', true))
--      ); $$
-- );
-- To remove: select cron.unschedule('kingdom-daily-push');

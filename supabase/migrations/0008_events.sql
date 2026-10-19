-- =========================================================================
-- MADS — the semester calendar
--
-- The landing page's calendar was a hardcoded array in Calendar.jsx. It is
-- now a table, written from the admin panel by any role holding
-- events:write — which the President grants (0007 gives it to the President,
-- Vice President and Events Head to begin with).
--
-- Dates and times are wall-clock Cairo time with no zone: `date` + optional
-- `end_date` for a multi-day event, `start_time` + optional `end_time`, and
-- a null `start_time` for an all-day one. A timestamptz would move a
-- midnight-to-midnight datathon onto the wrong day for any reader whose
-- browser is set to another zone, and nobody reads this calendar from one.
--
-- Idempotent: safe to re-run.
-- =========================================================================

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(trim(title)) > 0),
  description text not null default '',
  location    text not null default '',
  date        date not null,
  end_date    date,
  start_time  time,
  end_time    time,
  -- Public by default: almost everything on the calendar is an announcement.
  -- A board meeting is the exception and is unticked on purpose.
  is_public   boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint events_end_date_order check (end_date is null or end_date >= date),
  constraint events_end_time_needs_start check (end_time is null or start_time is not null),
  constraint events_end_time_order check (
    end_time is null
    or (end_date is not null and end_date > date)
    or end_time >= start_time
  )
);

create index if not exists events_date_idx on public.events (date);

create or replace function public.touch_event()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists events_touch on public.events;
create trigger events_touch
  before update on public.events
  for each row execute function public.touch_event();

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;

alter table public.events enable row level security;

-- The site shows public events to everyone; a signed-in member also sees the
-- private ones, the same floor forms_read uses for internal forms.
drop policy if exists events_read on public.events;
create policy events_read on public.events
  for select to anon, authenticated
  using (is_public or auth.uid() is not null);

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated
  with check (public.has_permission('events:write'));

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update to authenticated
  using (public.has_permission('events:write'))
  with check (public.has_permission('events:write'));

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete to authenticated
  using (public.has_permission('events:write'));

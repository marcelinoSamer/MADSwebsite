-- =========================================================================
-- MADS — initial schema
--
-- Mirrors packages/db/src/seed.js one-for-one, in snake_case. The adapter
-- maps between the two; nothing else in the apps knows the difference.
--
-- Authorization lives here, in RLS, not in the client. The admin panel's
-- <Gate> only decides what to render — this file decides what is allowed.
-- =========================================================================

create extension if not exists citext;

-- --- Roles and profiles --------------------------------------------------

-- Permissions are text[] on the role rather than an enum on the user, so a
-- new committee's access is an UPDATE, never a migration. The strings match
-- PERMISSIONS in packages/db/src/permissions.js exactly.
create table if not exists public.roles (
  id          text primary key,
  name        text not null,
  description text not null default '',
  permissions text[] not null default '{}'
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      citext not null unique,
  full_name  text not null default '',
  role_id    text not null references public.roles (id),
  created_at timestamptz not null default now()
);

-- --- Content -------------------------------------------------------------

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  excerpt      text not null default '',
  body_md      text not null default '',
  status       text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  author_id    uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists posts_status_published_at_idx
  on public.posts (status, published_at desc);

create table if not exists public.courses (
  id    uuid primary key default gen_random_uuid(),
  code  text not null unique,
  title text not null,
  level text not null default ''
);

create table if not exists public.syllabi (
  id          uuid primary key default gen_random_uuid(),
  -- restrict, not cascade: deleting a course with files on it should fail
  -- loudly rather than silently bin the archive.
  course_id   uuid not null references public.courses (id) on delete restrict,
  term        text not null,
  year        int not null,
  file_name   text not null,
  file_path   text not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists syllabi_course_idx on public.syllabi (course_id);

-- --- Newsletter and forms ------------------------------------------------

create table if not exists public.subscribers (
  id              uuid primary key default gen_random_uuid(),
  -- citext so Someone@AUC and someone@auc cannot both sign up.
  email           citext not null unique,
  source          text not null default 'site',
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists public.forms (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text not null default '',
  audience    text not null default 'internal' check (audience in ('public', 'internal')),
  is_open     boolean not null default true,
  fields      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.forms (id) on delete cascade,
  payload      jsonb not null default '{}'::jsonb,
  submitted_by uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists form_submissions_form_idx
  on public.form_submissions (form_id, created_at desc);

-- --- Permission helper ---------------------------------------------------

-- security definer so it can read profiles/roles while those tables have RLS
-- on. Without this every policy would recurse into its own table.
create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles p
      join public.roles r on r.id = p.role_id
     where p.id = auth.uid()
       and perm = any (r.permissions)
  );
$$;

revoke execute on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to authenticated, anon;

-- --- Publish trigger -----------------------------------------------------

-- Publishing is a distinct permission from editing, and an UPDATE policy
-- cannot compare old.status to new.status. A trigger can.
create or replace function public.enforce_post_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if not public.has_permission('posts:publish') then
      raise exception 'Your role does not allow: posts:publish'
        using errcode = '42501';
    end if;

    -- Stamp published_at once, on first publish; clear it on unpublish.
    if new.status = 'published' then
      new.published_at := coalesce(old.published_at, now());
    else
      new.published_at := null;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists posts_publish_guard on public.posts;
create trigger posts_publish_guard
  before update on public.posts
  for each row execute function public.enforce_post_publish();

-- --- Newsletter sign-up --------------------------------------------------

-- Anonymous visitors must be able to subscribe, and a previously
-- unsubscribed address must be able to come back. Doing that with a bare
-- anon UPDATE policy would let anyone rewrite arbitrary rows, so it is an
-- RPC instead: the only anonymous write path, and it returns nothing that
-- would let a caller enumerate the list.
create or replace function public.subscribe(subscriber_email text, subscriber_source text default 'site')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean citext := lower(trim(subscriber_email));
begin
  if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'That does not look like an email address.'
      using errcode = '22023';
  end if;

  insert into public.subscribers (email, source)
  values (clean, coalesce(nullif(trim(subscriber_source), ''), 'site'))
  on conflict (email) do update
    set unsubscribed_at = null;
end;
$$;

revoke execute on function public.subscribe(text, text) from public;
grant execute on function public.subscribe(text, text) to anon, authenticated;

-- --- Row level security --------------------------------------------------

alter table public.roles            enable row level security;
alter table public.profiles         enable row level security;
alter table public.posts            enable row level security;
alter table public.courses          enable row level security;
alter table public.syllabi          enable row level security;
alter table public.subscribers      enable row level security;
alter table public.forms            enable row level security;
alter table public.form_submissions enable row level security;

-- roles: any signed-in user reads them (the session needs its own
-- permission list); only members:write may change them.
drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles
  for select to authenticated using (true);

drop policy if exists roles_write on public.roles;
create policy roles_write on public.roles
  for update to authenticated
  using (public.has_permission('members:write'))
  with check (public.has_permission('members:write'));

-- profiles: you can always read your own; the roster needs members:write.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.has_permission('members:write'));

drop policy if exists profiles_write on public.profiles;
create policy profiles_write on public.profiles
  for update to authenticated
  using (public.has_permission('members:write'))
  with check (public.has_permission('members:write'));

-- posts: the world reads published ones; drafts need posts:read.
drop policy if exists posts_read_published on public.posts;
create policy posts_read_published on public.posts
  for select to anon, authenticated
  using (status = 'published' or public.has_permission('posts:read'));

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts
  for insert to authenticated
  with check (public.has_permission('posts:write') and status = 'draft');

drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts
  for update to authenticated
  using (public.has_permission('posts:write'))
  with check (public.has_permission('posts:write'));

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts
  for delete to authenticated
  using (public.has_permission('posts:write'));

-- courses + syllabi: public to read (the archive is public by decision),
-- syllabi:write to change.
drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses
  for select to anon, authenticated using (true);

drop policy if exists courses_write on public.courses;
create policy courses_write on public.courses
  for all to authenticated
  using (public.has_permission('syllabi:write'))
  with check (public.has_permission('syllabi:write'));

drop policy if exists syllabi_read on public.syllabi;
create policy syllabi_read on public.syllabi
  for select to anon, authenticated using (true);

drop policy if exists syllabi_write on public.syllabi;
create policy syllabi_write on public.syllabi
  for all to authenticated
  using (public.has_permission('syllabi:write'))
  with check (public.has_permission('syllabi:write'));

-- subscribers: never readable anonymously. Inserts go through subscribe().
drop policy if exists subscribers_read on public.subscribers;
create policy subscribers_read on public.subscribers
  for select to authenticated
  using (public.has_permission('subscribers:read'));

drop policy if exists subscribers_delete on public.subscribers;
create policy subscribers_delete on public.subscribers
  for delete to authenticated
  using (public.has_permission('subscribers:read'));

-- forms: public ones are readable by anyone (the site renders them);
-- internal ones only by staff who can read responses or edit forms.
drop policy if exists forms_read on public.forms;
create policy forms_read on public.forms
  for select to anon, authenticated
  using (
    audience = 'public'
    or public.has_permission('forms:write')
    or public.has_permission('submissions:read')
  );

drop policy if exists forms_write on public.forms;
create policy forms_write on public.forms
  for all to authenticated
  using (public.has_permission('forms:write'))
  with check (public.has_permission('forms:write'));

-- submissions: write-only for the public. Anyone may submit to an open
-- public form; internal forms require a session. Nobody reads without
-- submissions:read — including the person who submitted.
drop policy if exists submissions_insert on public.form_submissions;
create policy submissions_insert on public.form_submissions
  for insert to anon, authenticated
  with check (
    exists (
      select 1
        from public.forms f
       where f.id = form_id
         and f.is_open
         and (f.audience = 'public' or auth.uid() is not null)
    )
  );

drop policy if exists submissions_read on public.form_submissions;
create policy submissions_read on public.form_submissions
  for select to authenticated
  using (public.has_permission('submissions:read'));

-- --- Storage -------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('syllabi', 'syllabi', true), ('post-media', 'post-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('syllabi', 'post-media'));

drop policy if exists storage_syllabi_write on storage.objects;
create policy storage_syllabi_write on storage.objects
  for all to authenticated
  using (bucket_id = 'syllabi' and public.has_permission('syllabi:write'))
  with check (bucket_id = 'syllabi' and public.has_permission('syllabi:write'));

drop policy if exists storage_media_write on storage.objects;
create policy storage_media_write on storage.objects
  for all to authenticated
  using (bucket_id = 'post-media' and public.has_permission('posts:write'))
  with check (bucket_id = 'post-media' and public.has_permission('posts:write'));

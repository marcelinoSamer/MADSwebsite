-- =========================================================================
-- MADS — the President as the one fixed account, and roles as data
--
-- Until now President was an ordinary role: two founding accounts held it,
-- anyone holding members:write could hand it to someone else, and its
-- permission list was as editable as any other. The board's rule is simpler
-- than that: mads@aucegypt.edu is the President, and that is the only
-- constant. Every other role — the heads, what each one may do, who holds
-- it — is the President's to define from the Members page.
--
-- So, from this migration:
--
--   * profiles.is_super marks exactly one account, the association's own.
--   * role-president is held by that account and nobody else, and what it
--     grants cannot be edited or deleted except by a migration.
--   * members:write (managing members and roles) is never granted to any
--     other role, so only the President manages the roster.
--   * Roles can be created and deleted from the panel, not only edited.
--
-- Every rule is a trigger rather than a policy, for the reason 0004 gives:
-- a policy cannot see what a row is changing *from*. They fire for the
-- admin-users Edge Function and for a service-role key too, except where a
-- comment says otherwise.
--
-- Idempotent: safe to re-run.
-- =========================================================================

-- --- Preconditions -------------------------------------------------------

-- The President's account has to exist before anything can be pinned to
-- it. `npm run db:seed` creates it from MADS_EMAIL in .env.
do $$
begin
  if not exists (select 1 from public.profiles where lower(email) = 'mads@aucegypt.edu') then
    raise exception 'No profile for mads@aucegypt.edu. Run npm run db:seed first, then re-run this migration.';
  end if;
end;
$$;

-- --- Roles ---------------------------------------------------------------

-- New roles get an id from the database, like every other row. The four
-- seeded ids stay as they are; role-president is the only one anything keys on.
alter table public.roles
  alter column id set default ('role-' || gen_random_uuid()::text);

-- Two roles with the same name would be indistinguishable in every dropdown.
create unique index if not exists roles_name_key on public.roles (lower(name));

-- Every permission, including events:write for the calendar (0008).
update public.roles
   set description = 'Full access, including members and roles. Held only by the association account.',
       permissions = array[
         'posts:read','posts:write','posts:publish','syllabi:write',
         'subscribers:read','forms:write','submissions:read','events:write',
         'members:write'
       ]
 where id = 'role-president';

-- Somewhere for an account that held President until now to land: all of the
-- President's reach except the roster itself.
insert into public.roles (id, name, description, permissions) values
  ('role-vice-president', 'Vice President', 'Everything except managing members and roles.', array[
      'posts:read','posts:write','posts:publish','syllabi:write',
      'subscribers:read','forms:write','submissions:read','events:write'
   ]),
  ('role-events', 'Events Head', 'Runs the semester calendar and the forms that feed it.', array[
      'posts:read','events:write','forms:write','submissions:read'
   ])
on conflict (id) do nothing;

-- --- The President's account ---------------------------------------------

alter table public.profiles
  add column if not exists is_super boolean not null default false;

-- At most one. A partial unique index on the constant `true`.
create unique index if not exists profiles_one_super
  on public.profiles (is_super) where is_super;

update public.profiles set is_super = true where lower(email) = 'mads@aucegypt.edu';
update public.profiles set role_id = 'role-president' where is_super;

-- Anyone else who held President moves to Vice President. The 0004 floor
-- lets this through because the President still holds members:write.
update public.profiles
   set role_id = 'role-vice-president'
 where role_id = 'role-president'
   and not is_super;

-- --- Profile guard -------------------------------------------------------

create or replace function public.enforce_president_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Deleting the President is refused even under the service role, and that
  -- includes the cascade from deleting their auth user. Handing the account
  -- over means changing its password (npm run db:seed), never replacing it.
  if tg_op = 'DELETE' then
    if old.is_super then
      raise exception 'The President’s account cannot be removed.'
        using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and auth.uid() is not null then
    if new.is_super is distinct from old.is_super then
      raise exception 'Who the President is cannot be changed from the panel.'
        using errcode = '42501';
    end if;
    -- profiles.email mirrors auth.users.email, the sign-in identity. A
    -- PostgREST update could only make the two disagree.
    if new.email is distinct from old.email then
      raise exception 'An email address cannot be changed here.'
        using errcode = '42501';
    end if;
  end if;

  if new.is_super and new.role_id is distinct from 'role-president' then
    raise exception 'The President’s role is fixed.'
      using errcode = '42501';
  end if;

  if not new.is_super and new.role_id = 'role-president' then
    raise exception 'The President role belongs to the association account alone. Pick another role.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_president_guard on public.profiles;
create trigger profiles_president_guard
  before insert or update or delete on public.profiles
  for each row execute function public.enforce_president_profile();

-- --- Role guard ----------------------------------------------------------

create or replace function public.enforce_president_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.id = 'role-president' then
      raise exception 'The President role is fixed.' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id then
      raise exception 'A role’s id cannot change.' using errcode = '42501';
    end if;
    -- Exempt under the service role so a migration can add a permission the
    -- President should have, as this one does for events:write.
    if old.id = 'role-president' and auth.uid() is not null then
      raise exception 'The President role is fixed.' using errcode = '42501';
    end if;
  end if;

  -- Not exempt: no path, service role included, gives the roster to a
  -- second role. That would make the "only constant" a matter of trust.
  if new.id <> 'role-president' and 'members:write' = any (new.permissions) then
    raise exception 'Managing members and roles stays with the President. It cannot be given to another role.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists roles_president_guard on public.roles;
create trigger roles_president_guard
  before insert or update or delete on public.roles
  for each row execute function public.enforce_president_role();

-- --- Policies ------------------------------------------------------------

-- 0001 only allowed UPDATE on roles. Creating and deleting one is the same
-- authority. A role somebody still holds cannot be deleted: profiles.role_id
-- has no cascade, so that fails with 23503 and the panel asks for the
-- members to be moved first.
drop policy if exists roles_insert on public.roles;
create policy roles_insert on public.roles
  for insert to authenticated
  with check (public.has_permission('members:write'));

drop policy if exists roles_delete on public.roles;
create policy roles_delete on public.roles
  for delete to authenticated
  using (public.has_permission('members:write'));

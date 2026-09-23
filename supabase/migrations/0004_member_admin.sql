-- =========================================================================
-- MADS — member administration
--
-- Adding and deleting an account touches auth.users, which only the
-- service-role key may do, so that lives in the `admin-users` Edge Function.
-- What belongs *here* are the two rules the function must not be the only
-- thing enforcing: they hold for a direct PostgREST update too, and for a
-- service-role write that skips RLS entirely.
--
-- Both are triggers rather than policies for the same reason the publish
-- guard is: an UPDATE policy cannot compare old.role_id to new.role_id.
-- =========================================================================

-- --- Nobody edits their own role -----------------------------------------

-- Demoting yourself locks you out of the page that could undo it, and with
-- two accounts on the project there may be no second president to ask.
-- auth.uid() is null under the service role, so the seeding script and the
-- Edge Function are deliberately exempt.
create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role_id is distinct from old.role_id
     and auth.uid() is not null
     and new.id = auth.uid() then
    raise exception 'You cannot change your own role.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_role_change();

-- --- Someone must keep members:write -------------------------------------

-- The floor under the whole panel: if the last profile holding members:write
-- is demoted or deleted, nobody can ever grant it again without a
-- service-role key on a laptop. Fires on delete as well as update, which
-- also covers the cascade from deleting the auth user.
--
-- 23514 (check_violation) rather than 42501: the adapter maps it to the same
-- CONFLICT code the mock throws, and shows this message verbatim.
create or replace function public.enforce_admin_floor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- NEW is null in a DELETE trigger, so every exit returns this rather than
  -- coalescing two records together.
  result    public.profiles;
  was_admin boolean;
  others    int;
begin
  if tg_op = 'DELETE' then
    result := old;
  else
    result := new;
  end if;

  select exists (
    select 1 from public.roles r
     where r.id = old.role_id and 'members:write' = any (r.permissions)
  ) into was_admin;

  if not was_admin then
    return result;
  end if;

  -- Still an admin after an UPDATE? Then nothing is being taken away.
  if tg_op = 'UPDATE' and exists (
    select 1 from public.roles r
     where r.id = new.role_id and 'members:write' = any (r.permissions)
  ) then
    return result;
  end if;

  select count(*) from public.profiles p
    join public.roles r on r.id = p.role_id
   where p.id <> old.id
     and 'members:write' = any (r.permissions)
    into others;

  if others = 0 then
    raise exception 'Someone has to keep the ability to manage members. Give another member that role first.'
      using errcode = '23514';
  end if;

  return result;
end;
$$;

drop trigger if exists profiles_admin_floor on public.profiles;
create trigger profiles_admin_floor
  before update or delete on public.profiles
  for each row execute function public.enforce_admin_floor();

-- --- Roles keep the same floor -------------------------------------------

-- Editing the President role's permission list is another way to strip the
-- last members:write, and roles_write is a plain policy that cannot see it.
create or replace function public.enforce_role_admin_floor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  others int;
begin
  if 'members:write' = any (old.permissions)
     and not ('members:write' = any (new.permissions)) then
    select count(*) from public.profiles p
      join public.roles r on r.id = p.role_id
     where r.id <> old.id
       and 'members:write' = any (r.permissions)
      into others;

    if others = 0 then
      raise exception 'Someone has to keep the ability to manage members. Give another role that permission first.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists roles_admin_floor on public.roles;
create trigger roles_admin_floor
  before update on public.roles
  for each row execute function public.enforce_role_admin_floor();

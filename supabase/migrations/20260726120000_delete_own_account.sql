-- ============================================================
-- In-app account deletion (Apple Guideline 5.1.1(v))
-- ============================================================
-- Version-controlled record of the delete_own_account() function that is
-- DEPLOYED IN SUPABASE (run manually in the SQL editor, like the other
-- migrations in this folder). This file documents and reproduces exactly
-- what is live.
--
-- Design: a pure SECURITY DEFINER RPC. Runs as owner (postgres), so it
-- bypasses RLS and can delete auth.users; auth.uid() still reflects the
-- CALLER's JWT, so it only ever deletes the caller's own account. No user_id
-- parameter is accepted — one user can never delete another.
--
-- Deletion order is load-bearing: every user-keyed row is removed FIRST, then
-- auth.users LAST (several FKs are NO ACTION / absent, which would block the
-- auth-user delete if any child row survived). The whole function runs in one
-- transaction, so a missed table fails loudly and rolls back — nothing is
-- half-deleted.
--
-- Coverage is catalog-driven (not a hand-maintained list) after the original
-- explicit list repeatedly missed tables (e.g. user_reading_stats, and a whole
-- web-app schema — group_*/study_*/org_roles — sharing this Supabase project):
--   (A) explicit deletes for indirect-key children (no auth.users FK AND no
--       user column — keyed via a parent row);
--   (B) a sweep over every public table with a uuid user-column but NO FK to
--       auth.users (the silent-orphan class the transaction safe-fail can't
--       catch); one delete per user-column, so multi-column tables are covered;
--   (C) a sweep over every public table with a single-column FK to auth.users
--       (the blocking class; confirmed all-ownership columns).
--
-- Verified 2026-07-26: deleting a fully-seeded test account cleared all 27
-- user-data tables + auth.users (28/28 verification counts returned 0).
-- ============================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r record;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- (A) INDIRECT-KEY CHILDREN — no auth.users FK AND no user column
  --     (keyed via a parent row). Neither sweep below can target these.
  delete from public.user_reading_plan_passage_progress
    where user_progress_id in (select id from public.user_reading_plan_progress where user_id = uid);
  delete from public.user_reading_plan_day_progress
    where user_progress_id in (select id from public.user_reading_plan_progress where user_id = uid);

  -- (B) NO-FK USER-COLUMN SWEEP — the silent-orphan class.
  --     Every public base table with a uuid user-column that does NOT have an
  --     FK to auth.users. Catalog-driven (real column names, never a typo),
  --     uuid-typed (won't touch text "created_by" author fields), one delete
  --     per user-column so multi-column tables (groups, study_series,
  --     study_questions, group_prayers) are fully covered.
  for r in
    select cl.relname as tbl, a.attname as col
    from pg_class cl
    join pg_namespace ns on ns.oid = cl.relnamespace
    join pg_attribute a  on a.attrelid = cl.oid and a.attnum > 0 and not a.attisdropped
    where cl.relkind = 'r'
      and ns.nspname = 'public'
      and a.atttypid = 'uuid'::regtype
      and a.attname in ('user_id','created_by','owner_id','author_id',
                        'uploaded_by','member_id','inviter_id','created_by_user_id')
      and not exists (                              -- exclude FK cols (handled by C)
        select 1 from pg_constraint con
        where con.conrelid = cl.oid and con.contype = 'f'
          and con.confrelid = 'auth.users'::regclass
          and a.attnum = any(con.conkey)
      )
  loop
    execute format('delete from public.%I where %I = $1', r.tbl, r.col) using uid;
  end loop;

  -- (C) FK SWEEP — the blocking class. Every public table with a single-column
  --     FK to auth.users.
  for r in
    select cl.relname as tbl, att.attname as col
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace ns on ns.oid = cl.relnamespace
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
    where con.contype = 'f'
      and con.confrelid = 'auth.users'::regclass
      and ns.nspname = 'public'
      and array_length(con.conkey, 1) = 1
  loop
    execute format('delete from public.%I where %I = $1', r.tbl, r.col) using uid;
  end loop;

  -- (D) auth user LAST
  delete from auth.users where id = uid;
end;
$$;

-- Only a signed-in user may run it, and only on their own account (auth.uid()).
revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

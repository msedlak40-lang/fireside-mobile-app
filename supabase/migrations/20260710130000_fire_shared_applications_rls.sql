-- ============================================
-- FIRE FEED FIX: let co-members read SHARED arsenal rows
-- ============================================
-- Problem: the Fire feed embeds user_saved_applications, whose only policy is
-- owner-only ("Users manage own saved applications" USING auth.uid() = user_id).
-- So other members' shares come back as blank cards — the embedded row is hidden
-- by RLS and the theme content ends up null.
--
-- Fix: ADD a second, permissive SELECT policy. Postgres ORs permissive policies,
-- so the existing owner-only FOR ALL policy is untouched (owner keeps full
-- read/write on all their rows, shared or not); co-members ADDITIONALLY get read
-- on rows that have actually been shared into a fire they belong to.
--
-- Key off the fire_shares JOIN, not the denormalized user_saved_applications.fire_id
-- column. The fire_shares row IS the share (source of truth). The stamped fire_id
-- column is last-write-wins: re-sharing the same save into a second fire overwrites
-- it and would silently re-blank the card in the first fire. A security predicate
-- must not depend on a column with that failure mode.
--
-- Read is granted ONLY when a fire_shares row links this saved_application to a
-- fire the reader is a member of. It never exposes a user's unshared arsenal.

CREATE POLICY "Fire co-members can view shared applications"
  ON user_saved_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM fire_shares
      JOIN fire_members ON fire_members.fire_id = fire_shares.fire_id
      WHERE fire_shares.saved_application_id = user_saved_applications.id
        AND fire_members.user_id = auth.uid()
    )
  );

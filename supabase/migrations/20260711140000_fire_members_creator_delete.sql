-- ============================================
-- FIRE MEMBERS: allow a fire's CREATOR to remove other members
-- ============================================
-- removeMember() (creator removing someone) deletes a fire_members row whose
-- user_id != auth.uid(). The only DELETE policy is "Users can leave fires"
-- (USING auth.uid() = user_id) — self-deletion only — so the creator's delete
-- matched zero rows and silently no-op'd, while the UI reported "Member removed".
--
-- Add a second, additive DELETE policy authorizing a fire's creator. Permissive
-- policies are OR'd, so a row is deletable if (it's your own membership) OR
-- (you created the fire it belongs to). The existing "Users can leave fires"
-- policy is untouched.
--
-- RECURSION-SAFE: the creator check subqueries the `fires` table ONLY, never
-- fire_members. A policy that subqueries its own table risks infinite recursion,
-- and fire_members already has a self-referential SELECT policy we are NOT
-- touching — so this predicate deliberately reads fires.created_by instead.
--
-- Policy name is unique on this table (existing fire_members policies:
-- "Fire members can view members", "Users can join fires", "Users can leave
-- fires", "Users can update own membership").

CREATE POLICY "Fire creators can remove members"
  ON fire_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fires
      WHERE fires.id = fire_members.fire_id
        AND fires.created_by = auth.uid()
    )
  );

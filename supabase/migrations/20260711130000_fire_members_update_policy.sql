-- ============================================
-- FIRE MEMBERS: allow self-row UPDATE (fixes the never-clearing Fire badge)
-- ============================================
-- fire_members has RLS enabled but only SELECT / INSERT / DELETE policies — no
-- UPDATE. So markFireViewed()'s UPDATE of last_active_at matched zero rows and
-- silently no-op'd, freezing last_active_at at join time and leaving the unread
-- badge permanently non-zero.
--
-- Add a FOR UPDATE policy scoped to the user's own membership row. This does NOT
-- touch the existing INSERT ("Users can join fires") / DELETE ("Users can leave
-- fires") policies — it is a separate, additive policy (FOR UPDATE specifically,
-- not FOR ALL). Policy name is unique on this table (no collision with the three
-- existing fire_members policies).

CREATE POLICY "Users can update own membership"
  ON fire_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

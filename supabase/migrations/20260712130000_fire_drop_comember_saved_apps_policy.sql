-- ============================================
-- FIRE PRIVACY FIX — FINAL STEP: drop the co-member SELECT policy
-- ============================================
-- The Fire feed no longer reads user_saved_applications: arsenal theme content
-- is denormalized onto fire_shares (migration 20260712120000) and getFireShares
-- reads only fire_shares' own columns. This co-member SELECT policy was the last
-- thing exposing the private row (incl. user_note) to co-members via a crafted
-- API call. Dropping it returns the table to OWNER-ONLY, closing the exposure.
--
-- The owner-only policy ("Users manage own saved applications",
-- USING auth.uid() = user_id) remains and is the ONLY remaining access. Every
-- code path that touches this table does so as the owner of the row (verified
-- by grep: all reads are .eq('user_id', uid) or by-id where the actor owns it).
--
-- Run ONLY after confirming the feed renders correctly from the denormalized
-- columns (both backfilled and newly-created shares).

DROP POLICY IF EXISTS "Fire co-members can view shared applications" ON user_saved_applications;

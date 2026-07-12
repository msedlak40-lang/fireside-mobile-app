-- ============================================
-- FIRE ARSENAL SHARES: denormalize safe theme fields onto fire_shares
-- ============================================
-- Privacy fix (pre-public-release): the Fire feed currently embeds the private
-- user_saved_applications row for arsenal shares, and the co-member RLS policy
-- grants ROW-level SELECT — so a crafted API call could read user_note off a
-- shared row. This migration copies the SAFE, shareable fields onto fire_shares
-- (mirroring the existing verse_* columns) so the feed never needs that row.
--
-- SAFE fields only: book, chapter, theme_tag, sub_theme_tag come from the saved
-- application; application/key_insight/action_step come from the public, static
-- chapter_themes content. user_note (and other private columns) are NEVER copied.
--
-- This migration is ADDITIVE and does NOT drop the co-member SELECT policy on
-- user_saved_applications. That policy drop is a SEPARATE, final migration, run
-- only after the read path is confirmed to no longer embed that table.

-- 1. Safe denormalized columns (all nullable; existing rows unaffected until backfill).
ALTER TABLE fire_shares
  ADD COLUMN IF NOT EXISTS theme_tag     TEXT,
  ADD COLUMN IF NOT EXISTS sub_theme_tag TEXT,
  ADD COLUMN IF NOT EXISTS book          TEXT,
  ADD COLUMN IF NOT EXISTS chapter       INTEGER,
  ADD COLUMN IF NOT EXISTS application   TEXT,
  ADD COLUMN IF NOT EXISTS key_insight   TEXT,
  ADD COLUMN IF NOT EXISTS action_step   TEXT;

-- 2. Backfill existing arsenal shares from the owner's saved application joined
--    to the public chapter_themes content. Runs as the migration role, so RLS
--    does not restrict the join. user_note is deliberately NOT selected.
--    Idempotent: only touches arsenal shares not yet backfilled (theme_tag NULL).
UPDATE fire_shares AS fs
SET
  theme_tag     = usa.theme_tag,
  sub_theme_tag = usa.sub_theme_tag,
  book          = usa.book,
  chapter       = usa.chapter,
  application   = ct.application,
  key_insight   = ct.key_insight,
  action_step   = ct.action_step
FROM user_saved_applications AS usa
LEFT JOIN chapter_themes AS ct ON ct.id = usa.chapter_theme_id
WHERE fs.saved_application_id = usa.id
  AND fs.share_type = 'arsenal'
  AND fs.theme_tag IS NULL;

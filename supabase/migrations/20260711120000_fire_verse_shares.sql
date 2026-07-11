-- ============================================
-- FIRE VERSE SHARES: let a fire_shares row carry a verse directly
-- ============================================
-- Adds a 'verse' share type plus the columns to hold the verse. Verse posts
-- carry their own reference + text on fire_shares (saved_application_id stays
-- null), so they render for any co-member with no dependency on the
-- user_saved_applications RLS path.
--
-- Structured refs (verse_book / verse_chapter / verse_number) are stored now so
-- a future "open chapter from post" path needs no second migration. The flat
-- verse_reference is kept as the display snapshot the card renders directly.
--
-- All new columns are nullable; existing (arsenal) rows are unaffected.

ALTER TABLE fire_shares
  ADD COLUMN IF NOT EXISTS verse_reference TEXT,
  ADD COLUMN IF NOT EXISTS verse_text TEXT,
  ADD COLUMN IF NOT EXISTS verse_book TEXT,
  ADD COLUMN IF NOT EXISTS verse_chapter INTEGER,
  ADD COLUMN IF NOT EXISTS verse_number INTEGER;

-- Add 'verse' to the allowed share types (a CHECK value can't be added in place;
-- drop and recreate the constraint).
ALTER TABLE fire_shares DROP CONSTRAINT IF EXISTS valid_share_type;

ALTER TABLE fire_shares
  ADD CONSTRAINT valid_share_type
  CHECK (share_type IN ('arsenal', 'theme_discovery', 'prayer_request', 'encouragement', 'verse'));

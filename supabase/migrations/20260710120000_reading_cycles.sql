-- ============================================
-- READING CYCLES
-- Migration: reading_cycles
-- Date: 2026-07-10
-- ============================================
-- Adds a per-row `cycle` to user_reading_progress so a user can re-read the
-- Bible in fresh cycles without losing prior progress, plus a user-level
-- current-cycle counter. All existing rows backfill to cycle 1.

-- 1) Per-row cycle on reading progress (existing rows default to 1).
ALTER TABLE user_reading_progress
  ADD COLUMN IF NOT EXISTS cycle integer NOT NULL DEFAULT 1;

-- 2) Extend the uniqueness key to include cycle, so the same chapter can be
--    completed once per cycle. Adding a column to a unique key only weakens it,
--    so no existing row can violate the new key.
--    (Confirmed live: the only unique key is user_reading_progress_user_book_chapter_tier_key
--     on (user_id, book_name, chapter_number, study_tier); no other unique index exists.)
ALTER TABLE user_reading_progress
  DROP CONSTRAINT IF EXISTS user_reading_progress_user_book_chapter_tier_key;
ALTER TABLE user_reading_progress
  ADD CONSTRAINT user_reading_progress_user_book_chapter_tier_cycle_key
  UNIQUE (user_id, book_name, chapter_number, study_tier, cycle);

-- 3) Index the common cycle-scoped read path.
CREATE INDEX IF NOT EXISTS idx_user_reading_progress_user_cycle
  ON user_reading_progress(user_id, cycle);

-- 4) User-level current reading cycle (no row = cycle 1).
CREATE TABLE IF NOT EXISTS user_reading_cycle (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_cycle INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_reading_cycle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reading cycle"
  ON user_reading_cycle
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

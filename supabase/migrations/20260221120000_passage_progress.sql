-- ============================================
-- PASSAGE-LEVEL PROGRESS TRACKING
-- ============================================
-- Tracks individual passage completion within a reading plan day.
-- Each reading_plan_days row has a full_reference field that may contain
-- multiple passages (e.g. "1 Cor 10:31; Romans 12:1; Psalm 95:2").
-- The UI parses these into indexed blocks (0-based).
-- This table tracks completion per passage_index within a plan_day_id.
-- ============================================

CREATE TABLE IF NOT EXISTS user_reading_plan_passage_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_progress_id UUID NOT NULL REFERENCES user_reading_plan_progress(id) ON DELETE CASCADE,
  plan_day_id INTEGER NOT NULL REFERENCES reading_plan_days(id) ON DELETE CASCADE,
  passage_index INTEGER NOT NULL,  -- 0-based index from parsed full_reference
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One completion record per user per passage
  CONSTRAINT unique_user_passage UNIQUE(user_progress_id, plan_day_id, passage_index)
);

-- Index for fast lookups by user progress + day
CREATE INDEX IF NOT EXISTS idx_passage_progress_user_day
  ON user_reading_plan_passage_progress(user_progress_id, plan_day_id);

-- RLS Policies
ALTER TABLE user_reading_plan_passage_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own passage progress"
  ON user_reading_plan_passage_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_reading_plan_progress
      WHERE user_reading_plan_progress.id = user_reading_plan_passage_progress.user_progress_id
        AND user_reading_plan_progress.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own passage progress"
  ON user_reading_plan_passage_progress
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_reading_plan_progress
      WHERE user_reading_plan_progress.id = user_reading_plan_passage_progress.user_progress_id
        AND user_reading_plan_progress.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own passage progress"
  ON user_reading_plan_passage_progress
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_reading_plan_progress
      WHERE user_reading_plan_progress.id = user_reading_plan_passage_progress.user_progress_id
        AND user_reading_plan_progress.user_id = auth.uid()
    )
  );

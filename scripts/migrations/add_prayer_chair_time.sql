-- Migration: Add Prayer/Chair Time tables
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Create user_prayer_sessions table
-- ============================================

CREATE TABLE IF NOT EXISTS user_prayer_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER NOT NULL,
  pre_session_verse TEXT,
  post_session_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE user_prayer_sessions IS 'Tracks chair time / prayer sessions for users';
COMMENT ON COLUMN user_prayer_sessions.duration_minutes IS 'Length of prayer session in minutes';
COMMENT ON COLUMN user_prayer_sessions.pre_session_verse IS 'Optional scripture verse to meditate on during session';
COMMENT ON COLUMN user_prayer_sessions.post_session_notes IS 'What the user heard from God during the session';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prayer_sessions_user_id
ON user_prayer_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_prayer_sessions_user_date
ON user_prayer_sessions(user_id, session_date DESC);

-- ============================================
-- STEP 2: Enable RLS (Row Level Security)
-- ============================================

ALTER TABLE user_prayer_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own prayer sessions"
ON user_prayer_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own prayer sessions"
ON user_prayer_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own prayer sessions"
ON user_prayer_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own prayer sessions"
ON user_prayer_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- STEP 3: Create function to calculate streak
-- ============================================

CREATE OR REPLACE FUNCTION calculate_prayer_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_streak INTEGER := 0;
  v_check_date DATE;
BEGIN
  -- Start from yesterday (today doesn't count until it's done)
  v_check_date := CURRENT_DATE - INTERVAL '1 day';

  -- Loop backwards through dates
  WHILE EXISTS (
    SELECT 1 FROM user_prayer_sessions
    WHERE user_id = p_user_id
    AND session_date = v_check_date
  ) LOOP
    v_streak := v_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
  END LOOP;

  RETURN v_streak;
END;
$$;

COMMENT ON FUNCTION calculate_prayer_streak IS 'Calculates consecutive days of prayer sessions for a user';

-- ============================================
-- STEP 4: Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON user_prayer_sessions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_prayer_sessions_id_seq TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Run these to verify the migration worked:
-- SELECT * FROM user_prayer_sessions LIMIT 1;
-- SELECT calculate_prayer_streak(auth.uid());

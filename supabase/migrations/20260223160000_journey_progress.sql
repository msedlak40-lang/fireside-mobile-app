CREATE TABLE IF NOT EXISTS user_journey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id TEXT NOT NULL,
  current_location INTEGER DEFAULT 0,
  completed_locations INTEGER[] DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(user_id, journey_id)
);

-- RLS Policies
ALTER TABLE user_journey_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journey progress"
  ON user_journey_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journey progress"
  ON user_journey_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journey progress"
  ON user_journey_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_user_journey_progress_user_journey
  ON user_journey_progress(user_id, journey_id);

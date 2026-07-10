-- Devotion interactions: starring/favorites and read tracking
CREATE TABLE IF NOT EXISTS user_devotion_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  devotion_id INTEGER NOT NULL REFERENCES daily_devotions(id) ON DELETE CASCADE,

  is_starred BOOLEAN NOT NULL DEFAULT FALSE,
  starred_at TIMESTAMPTZ,

  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, devotion_id)
);

CREATE INDEX idx_devotion_interactions_starred
  ON user_devotion_interactions(user_id, is_starred, starred_at DESC);

CREATE INDEX idx_devotion_interactions_read
  ON user_devotion_interactions(user_id, is_read);

ALTER TABLE user_devotion_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own devotion interactions"
  ON user_devotion_interactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

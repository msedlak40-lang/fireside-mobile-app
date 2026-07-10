-- VOTD interactions: history, favorites, tracking
CREATE TABLE user_votd_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  verse_reference TEXT NOT NULL,
  verse_text TEXT,
  theme TEXT,
  source TEXT, -- 'curated' | 'insight' | 'random'

  -- Favorites
  is_starred BOOLEAN DEFAULT FALSE,
  starred_at TIMESTAMP WITH TIME ZONE,

  -- Tracking
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX idx_user_votd_date ON user_votd_interactions(user_id, date DESC);
CREATE INDEX idx_user_votd_starred ON user_votd_interactions(user_id, is_starred, starred_at DESC);

-- Enable RLS
ALTER TABLE user_votd_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own VOTD interactions"
  ON user_votd_interactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

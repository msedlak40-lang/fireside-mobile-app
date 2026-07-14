-- Battle Verses: user-saved verses with battle tags for spiritual warfare
CREATE TABLE IF NOT EXISTS user_battle_verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  verse_reference TEXT NOT NULL,
  verse_text TEXT NOT NULL,
  notes TEXT,
  battle_tag TEXT, -- fear, anger, temptation, doubt, loneliness, identity, purpose, general
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, book_name, chapter_number, verse_number)
);

-- RLS
ALTER TABLE user_battle_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own battle verses"
  ON user_battle_verses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own battle verses"
  ON user_battle_verses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own battle verses"
  ON user_battle_verses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own battle verses"
  ON user_battle_verses FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_battle_verses_user
  ON user_battle_verses(user_id);

CREATE INDEX idx_battle_verses_user_tag
  ON user_battle_verses(user_id, battle_tag);

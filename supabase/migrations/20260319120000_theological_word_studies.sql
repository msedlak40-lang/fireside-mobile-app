-- Theological Word Studies table
-- Stores AI-generated + human-reviewed word study entries for Strong's numbers

CREATE TABLE theological_word_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strongs_number TEXT NOT NULL UNIQUE,
  entry_text TEXT NOT NULL,
  core_meaning TEXT,
  theological_significance TEXT,
  typical_contexts TEXT[],
  related_strongs TEXT[],
  key_verse_examples TEXT[],
  word_count INTEGER,
  ai_generated BOOLEAN DEFAULT true,
  human_reviewed BOOLEAN DEFAULT false,
  reviewed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_theological_strongs ON theological_word_studies(strongs_number);
CREATE INDEX idx_theological_reviewed ON theological_word_studies(human_reviewed);

ALTER TABLE theological_word_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read theological studies"
  ON theological_word_studies
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can modify theological studies"
  ON theological_word_studies
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

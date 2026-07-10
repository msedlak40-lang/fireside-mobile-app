-- Verse Review Queue: Deep study system with Strong's concordance and cross-references

-- ============================================================
-- 1. Strong's Lexicon (Hebrew + Greek dictionary entries)
-- ============================================================
CREATE TABLE IF NOT EXISTS strongs_lexicon (
  id SERIAL PRIMARY KEY,
  strongs_number TEXT NOT NULL UNIQUE, -- e.g. 'H1', 'G26'
  language TEXT NOT NULL CHECK (language IN ('hebrew', 'greek')),
  original_word TEXT NOT NULL,         -- Hebrew/Greek characters
  transliteration TEXT,                -- Romanized pronunciation
  short_definition TEXT NOT NULL,      -- Brief meaning
  detailed_definition TEXT,            -- Extended explanation
  usage_notes TEXT,                    -- Usage context and notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_strongs_number ON strongs_lexicon(strongs_number);
CREATE INDEX idx_strongs_language ON strongs_lexicon(language);

-- ============================================================
-- 2. Verse-to-Strong's Word Mappings
-- ============================================================
CREATE TABLE IF NOT EXISTS verse_strongs_words (
  id SERIAL PRIMARY KEY,
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  word_position INTEGER NOT NULL,      -- Word order in verse (1-based)
  original_word TEXT NOT NULL,          -- Hebrew/Greek word
  transliteration TEXT,
  english_word TEXT NOT NULL,           -- English translation
  strongs_number TEXT NOT NULL,         -- Reference to strongs_lexicon
  grammar_code TEXT,                    -- Morphology/grammar info

  UNIQUE(book_name, chapter_number, verse_number, word_position)
);

CREATE INDEX idx_verse_strongs_ref
  ON verse_strongs_words(book_name, chapter_number, verse_number);

CREATE INDEX idx_verse_strongs_number
  ON verse_strongs_words(strongs_number);

-- ============================================================
-- 3. Cross-References (Treasury of Scripture Knowledge)
-- ============================================================
CREATE TABLE IF NOT EXISTS verse_cross_references (
  id SERIAL PRIMARY KEY,
  source_book TEXT NOT NULL,
  source_chapter INTEGER NOT NULL,
  source_verse INTEGER NOT NULL,
  target_book TEXT NOT NULL,
  target_chapter INTEGER NOT NULL,
  target_verse_start INTEGER NOT NULL,
  target_verse_end INTEGER,            -- NULL if single verse
  votes INTEGER DEFAULT 0,             -- Relevance ranking

  UNIQUE(source_book, source_chapter, source_verse, target_book, target_chapter, target_verse_start)
);

CREATE INDEX idx_cross_ref_source
  ON verse_cross_references(source_book, source_chapter, source_verse);

CREATE INDEX idx_cross_ref_target
  ON verse_cross_references(target_book, target_chapter, target_verse_start);

-- ============================================================
-- 4. User Verse Review Queue
-- ============================================================
CREATE TABLE IF NOT EXISTS user_verse_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  verse_reference TEXT NOT NULL,        -- e.g. "John 3:16"
  verse_text TEXT NOT NULL,
  personal_notes TEXT,
  is_studied BOOLEAN DEFAULT FALSE,
  studied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, book_name, chapter_number, verse_number)
);

-- RLS
ALTER TABLE user_verse_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review queue"
  ON user_verse_review_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to own review queue"
  ON user_verse_review_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review queue"
  ON user_verse_review_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own review queue"
  ON user_verse_review_queue FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_review_queue_user
  ON user_verse_review_queue(user_id);

CREATE INDEX idx_review_queue_user_studied
  ON user_verse_review_queue(user_id, is_studied);

-- Reference data tables are public read-only (no RLS needed for strongs/cross-refs)
-- They contain no user data

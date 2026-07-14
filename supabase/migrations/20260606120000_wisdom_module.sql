-- Wisdom Module: life-application commentary
-- Three tables populated by the batch pipeline in scripts/wisdom/.
-- Public read (matches strongs_lexicon / matthew_henry_commentary policies).

-- One row per verse -------------------------------------------------------
CREATE TABLE IF NOT EXISTS verse_life_application (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  plain_truth TEXT NOT NULL,
  deeper_layer TEXT NOT NULL,
  reflection_question TEXT NOT NULL,
  headline_strongs_number TEXT,
  themes TEXT[] NOT NULL DEFAULT '{}',     -- slugs into wisdom_themes (validated against the controlled vocabulary)
  word_count INTEGER,
  quality_flag TEXT,                       -- null | too_short | too_long | review | no_mh_source | no_word_data | no_themes
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (book_name, chapter_number, verse_number)
);
CREATE INDEX IF NOT EXISTS idx_vla_lookup ON verse_life_application(book_name, chapter_number, verse_number);
CREATE INDEX IF NOT EXISTS idx_vla_quality ON verse_life_application(quality_flag);

-- One row per chapter -----------------------------------------------------
CREATE TABLE IF NOT EXISTS chapter_life_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  the_thread TEXT NOT NULL,
  moment_that_cuts_deepest TEXT NOT NULL,  -- includes a verse reference
  one_thing_to_carry TEXT NOT NULL,
  word_count INTEGER,
  quality_flag TEXT,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (book_name, chapter_number)
);
CREATE INDEX IF NOT EXISTS idx_cls_lookup ON chapter_life_summary(book_name, chapter_number);

-- Which Strong's number each verse's Deeper Layer was built around --------
-- Used to discourage repeating the same headline word within a book.
CREATE TABLE IF NOT EXISTS featured_strongs_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strongs_number TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (book_name, chapter_number, verse_number)
);
CREATE INDEX IF NOT EXISTS idx_fsl_book ON featured_strongs_log(book_name);

ALTER TABLE verse_life_application ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_life_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_strongs_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verse_life_application" ON verse_life_application FOR SELECT USING (true);
CREATE POLICY "Anyone can read chapter_life_summary" ON chapter_life_summary FOR SELECT USING (true);
CREATE POLICY "Anyone can read featured_strongs_log" ON featured_strongs_log FOR SELECT USING (true);

-- Writes happen from the batch pipeline using the service-role key (bypasses RLS).

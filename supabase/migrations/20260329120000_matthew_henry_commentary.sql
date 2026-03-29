-- Matthew Henry Complete Commentary (Public Domain)
-- Source: HelloAO Bible API (https://bible.helloao.org)
-- ~4,124 verse-level commentaries across 65 books

CREATE TABLE IF NOT EXISTS matthew_henry_commentary (
  id SERIAL PRIMARY KEY,
  book_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  commentary_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_mh_verse UNIQUE (book_name, chapter_number, verse_number)
);

CREATE INDEX IF NOT EXISTS idx_mh_book_chapter ON matthew_henry_commentary(book_name, chapter_number);
CREATE INDEX IF NOT EXISTS idx_mh_verse_lookup ON matthew_henry_commentary(book_name, chapter_number, verse_number);

ALTER TABLE matthew_henry_commentary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON matthew_henry_commentary
  FOR SELECT USING (true);

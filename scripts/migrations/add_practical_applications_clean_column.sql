-- Add a new test column for cleaned practical applications
-- This preserves the existing practical_applications column

ALTER TABLE bible_chapter_summaries_strongs
ADD COLUMN IF NOT EXISTS practical_applications_clean TEXT[];

COMMENT ON COLUMN bible_chapter_summaries_strongs.practical_applications_clean IS 'Practical applications with Greek word headers removed';

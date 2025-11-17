-- Add theological_themes column to bible_chapter_summaries table
-- This will store extracted theological themes from the summary_content field

-- Step 1: Add the column
ALTER TABLE bible_chapter_summaries
ADD COLUMN IF NOT EXISTS theological_themes TEXT[];

-- Step 2: Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_bible_chapter_summaries_theological_themes
ON bible_chapter_summaries USING GIN (theological_themes);

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bible_chapter_summaries'
  AND column_name = 'theological_themes';

-- Export all theological themes from bible_chapter_summaries
-- This query exports themes in JSON format for easy import/analysis

-- Export as JSON array (easiest to work with in code)
SELECT json_agg(
  json_build_object(
    'book_name', book_name,
    'chapter_number', chapter_number,
    'themes', theological_themes
  ) ORDER BY book_name, chapter_number
) as theological_themes_export
FROM bible_chapter_summaries
WHERE theological_themes IS NOT NULL
  AND array_length(theological_themes, 1) > 0;

-- Alternative: Export as CSV-friendly format (one row per chapter)
-- Uncomment to use this version instead:
/*
SELECT
  book_name,
  chapter_number,
  array_length(theological_themes, 1) as theme_count,
  array_to_string(theological_themes, ' | ') as themes_concatenated
FROM bible_chapter_summaries
WHERE theological_themes IS NOT NULL
  AND array_length(theological_themes, 1) > 0
ORDER BY book_name, chapter_number;
*/

-- Alternative: Export as expanded format (one row per theme)
-- Uncomment to use this version instead:
/*
SELECT
  book_name,
  chapter_number,
  unnest(theological_themes) as theme
FROM bible_chapter_summaries
WHERE theological_themes IS NOT NULL
  AND array_length(theological_themes, 1) > 0
ORDER BY book_name, chapter_number;
*/

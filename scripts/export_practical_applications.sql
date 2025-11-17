-- Export all practical applications from bible_chapter_summaries_strongs
-- This query exports applications in JSON format for easy import/analysis

-- Export as JSON array (easiest to work with in code)
SELECT json_agg(
  json_build_object(
    'book_name', book_name,
    'chapter_number', chapter_number,
    'applications', practical_applications
  ) ORDER BY book_name, chapter_number
) as practical_applications_export
FROM bible_chapter_summaries_strongs
WHERE practical_applications IS NOT NULL
  AND array_length(practical_applications, 1) > 0;

-- Alternative: Export as CSV-friendly format (one row per chapter)
-- Uncomment to use this version instead:
/*
SELECT
  book_name,
  chapter_number,
  array_length(practical_applications, 1) as app_count,
  array_to_string(practical_applications, ' | ') as applications_concatenated
FROM bible_chapter_summaries_strongs
WHERE practical_applications IS NOT NULL
  AND array_length(practical_applications, 1) > 0
ORDER BY book_name, chapter_number;
*/

-- Alternative: Export as expanded format (one row per application)
-- Uncomment to use this version instead:
/*
SELECT
  book_name,
  chapter_number,
  unnest(practical_applications) as application
FROM bible_chapter_summaries_strongs
WHERE practical_applications IS NOT NULL
  AND array_length(practical_applications, 1) > 0
ORDER BY book_name, chapter_number;
*/

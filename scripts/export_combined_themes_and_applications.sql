-- Export both theological themes and practical applications in a single combined format
-- This creates a comprehensive dataset with both themes and applications per chapter

-- Combined export as JSON (recommended for most use cases)
SELECT json_build_object(
  'theological_themes', (
    SELECT json_agg(
      json_build_object(
        'book_name', book_name,
        'chapter_number', chapter_number,
        'themes', theological_themes
      ) ORDER BY book_name, chapter_number
    )
    FROM bible_chapter_summaries
    WHERE theological_themes IS NOT NULL
      AND array_length(theological_themes, 1) > 0
  ),
  'practical_applications', (
    SELECT json_agg(
      json_build_object(
        'book_name', book_name,
        'chapter_number', chapter_number,
        'applications', practical_applications
      ) ORDER BY book_name, chapter_number
    )
    FROM bible_chapter_summaries_strongs
    WHERE practical_applications IS NOT NULL
      AND array_length(practical_applications, 1) > 0
  )
) as combined_export;

-- Alternative: Side-by-side comparison (themes and applications for each chapter)
-- This joins both tables to show themes and apps together
-- Uncomment to use this version instead:
/*
SELECT
  COALESCE(t.book_name, a.book_name) as book_name,
  COALESCE(t.chapter_number, a.chapter_number) as chapter_number,
  t.theological_themes as themes,
  a.practical_applications as applications,
  array_length(t.theological_themes, 1) as theme_count,
  array_length(a.practical_applications, 1) as app_count
FROM bible_chapter_summaries t
FULL OUTER JOIN bible_chapter_summaries_strongs a
  ON t.book_name = a.book_name
  AND t.chapter_number = a.chapter_number
WHERE (t.theological_themes IS NOT NULL AND array_length(t.theological_themes, 1) > 0)
   OR (a.practical_applications IS NOT NULL AND array_length(a.practical_applications, 1) > 0)
ORDER BY
  COALESCE(t.book_name, a.book_name),
  COALESCE(t.chapter_number, a.chapter_number);
*/

-- Statistics summary
SELECT
  'Theological Themes' as dataset,
  COUNT(*) as chapters_with_data,
  SUM(array_length(theological_themes, 1)) as total_items,
  ROUND(AVG(array_length(theological_themes, 1)), 1) as avg_per_chapter
FROM bible_chapter_summaries
WHERE theological_themes IS NOT NULL
  AND array_length(theological_themes, 1) > 0

UNION ALL

SELECT
  'Practical Applications' as dataset,
  COUNT(*) as chapters_with_data,
  SUM(array_length(practical_applications, 1)) as total_items,
  ROUND(AVG(array_length(practical_applications, 1)), 1) as avg_per_chapter
FROM bible_chapter_summaries_strongs
WHERE practical_applications IS NOT NULL
  AND array_length(practical_applications, 1) > 0;

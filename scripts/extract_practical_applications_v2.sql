-- Simplified SQL to Extract Practical Applications
-- Run this in your Supabase SQL Editor

-- Step 1: Test extraction on Genesis 1 first
DO $$
DECLARE
  summary_text TEXT;
  practical_section TEXT;
  applications TEXT[];
  single_app TEXT;
BEGIN
  -- Get Genesis 1 summary
  SELECT summary_advanced #>> '{}' INTO summary_text
  FROM bible_chapter_summaries_strongs
  WHERE book_name = 'Genesis' AND chapter_number = 1;

  RAISE NOTICE 'Summary text length: %', length(summary_text);

  -- Extract just the Practical Applications section
  practical_section := substring(
    summary_text
    from '## Practical Applications(.*?)(?=---|\z)'
  );

  RAISE NOTICE 'Practical section found: %', CASE WHEN practical_section IS NOT NULL THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE 'Section length: %', length(practical_section);

  -- Simple pattern: Find lines starting with **From
  applications := ARRAY[]::TEXT[];

  -- Split by double newline and filter for lines with **From
  FOR single_app IN
    SELECT trim(both E'\n' from unnest(string_to_array(practical_section, E'\n\n')))
    WHERE trim(both E'\n' from unnest) LIKE '%**From%'
  LOOP
    -- Clean up the markdown
    single_app := regexp_replace(single_app, '\*\*From ["""]([^"""]+)["""] \(([^)]+)\):\*\*\s*\n?', 'From "\1" (\2): ', 'g');
    single_app := regexp_replace(single_app, E'\n', ' ', 'g');
    single_app := trim(single_app);

    IF length(single_app) > 20 THEN
      applications := array_append(applications, single_app);
      RAISE NOTICE 'Found app: %', left(single_app, 100);
    END IF;
  END LOOP;

  RAISE NOTICE 'Total applications found: %', array_length(applications, 1);

  -- Update the row
  IF array_length(applications, 1) > 0 THEN
    UPDATE bible_chapter_summaries_strongs
    SET practical_applications = applications
    WHERE book_name = 'Genesis' AND chapter_number = 1;

    RAISE NOTICE 'Updated Genesis 1 with % applications', array_length(applications, 1);
  END IF;
END $$;

-- Step 2: Verify the update worked
SELECT
  book_name,
  chapter_number,
  practical_applications,
  array_length(practical_applications, 1) as app_count
FROM bible_chapter_summaries_strongs
WHERE book_name = 'Genesis' AND chapter_number = 1;

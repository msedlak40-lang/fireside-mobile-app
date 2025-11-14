-- Ultra-simple extraction - just for Genesis 1 to test
DO $$
DECLARE
  summary_text TEXT;
  app_section TEXT;
  app_array TEXT[];
  temp_text TEXT;
BEGIN
  -- Get the summary as plain text
  SELECT summary_advanced #>> '{}' INTO summary_text
  FROM bible_chapter_summaries_strongs
  WHERE book_name = 'Genesis' AND chapter_number = 1;

  RAISE NOTICE 'Got summary, length: %', length(summary_text);

  -- Extract everything between "## Practical Applications" and "## Discussion Questions"
  app_section := substring(summary_text from '## Practical Applications\n\n(.+?)\n\n---\n\n## Discussion Questions');

  RAISE NOTICE 'Extracted section, length: %', coalesce(length(app_section), 0);

  IF app_section IS NOT NULL THEN
    -- Manual extraction: Split on the pattern **From
    -- Each application is: **From "word" (concept):** followed by text
    app_array := regexp_split_to_array(app_section, '\n\n(?=\*\*From)');

    RAISE NOTICE 'Found % potential applications', array_length(app_array, 1);

    -- Clean up each one
    FOR i IN 1..array_length(app_array, 1) LOOP
      temp_text := app_array[i];

      -- Remove **From "xxx" (yyy):** and replace with From "xxx" (yyy):
      temp_text := regexp_replace(temp_text, '^\*\*From (["""])([^"""]+)\1 \(([^)]+)\):\*\*\s*', 'From "\2" (\3): ');

      -- Replace newlines with spaces
      temp_text := regexp_replace(temp_text, '\n', ' ', 'g');

      -- Trim
      temp_text := trim(temp_text);

      app_array[i] := temp_text;

      RAISE NOTICE 'App %: %', i, left(temp_text, 80);
    END LOOP;

    -- Update the database
    UPDATE bible_chapter_summaries_strongs
    SET practical_applications = app_array
    WHERE book_name = 'Genesis' AND chapter_number = 1;

    RAISE NOTICE 'Updated database with % applications', array_length(app_array, 1);
  ELSE
    RAISE NOTICE 'Could not extract section!';
  END IF;
END $$;

-- Check the result
SELECT
  book_name,
  chapter_number,
  practical_applications,
  array_length(practical_applications, 1) as count
FROM bible_chapter_summaries_strongs
WHERE book_name = 'Genesis' AND chapter_number = 1;

-- Extract Practical Applications for ALL chapters
-- This will process all 1,189+ chapters

DO $$
DECLARE
  chapter_record RECORD;
  summary_text TEXT;
  app_section TEXT;
  app_array TEXT[];
  temp_text TEXT;
  success_count INT := 0;
  empty_count INT := 0;
  error_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting extraction for all chapters...';

  -- Loop through all chapters
  FOR chapter_record IN
    SELECT id, book_name, chapter_number, summary_advanced
    FROM bible_chapter_summaries_strongs
    ORDER BY book_name, chapter_number
  LOOP
    BEGIN
      -- Get the summary as plain text
      summary_text := chapter_record.summary_advanced #>> '{}';

      IF summary_text IS NULL OR summary_text = '' THEN
        empty_count := empty_count + 1;
        CONTINUE;
      END IF;

      -- Extract everything between "## Practical Applications" and "## Discussion Questions"
      app_section := substring(summary_text from '## Practical Applications\n\n(.+?)\n\n---\n\n## Discussion Questions');

      IF app_section IS NULL OR app_section = '' THEN
        -- Try alternative pattern without Discussion Questions
        app_section := substring(summary_text from '## Practical Applications\n\n(.+?)(?=\n\n---|\n\n##|$)');
      END IF;

      IF app_section IS NOT NULL AND app_section != '' THEN
        -- Split on the pattern **From (each application starts with this)
        app_array := regexp_split_to_array(app_section, '\n\n(?=\*\*From)');

        -- Clean up each application
        FOR i IN 1..array_length(app_array, 1) LOOP
          temp_text := app_array[i];

          -- Remove **From "xxx" (yyy):** and replace with From "xxx" (yyy):
          -- Handle both straight quotes and curly quotes
          temp_text := regexp_replace(temp_text, '^\*\*From (["""])([^"""]+)\1 \(([^)]+)\):\*\*\s*', 'From "\2" (\3): ');
          temp_text := regexp_replace(temp_text, '^\*\*From the (.+?):\*\*\s*', 'From the \1: ');

          -- Replace newlines with spaces
          temp_text := regexp_replace(temp_text, '\n', ' ', 'g');

          -- Trim
          temp_text := trim(temp_text);

          -- Only keep if it's a real application (has substance)
          IF length(temp_text) > 20 THEN
            app_array[i] := temp_text;
          ELSE
            app_array[i] := NULL;
          END IF;
        END LOOP;

        -- Remove null entries
        app_array := array_remove(app_array, NULL);

        IF array_length(app_array, 1) > 0 THEN
          -- Update the database
          UPDATE bible_chapter_summaries_strongs
          SET practical_applications = app_array
          WHERE id = chapter_record.id;

          success_count := success_count + 1;

          -- Log every 50th chapter
          IF success_count % 50 = 0 THEN
            RAISE NOTICE 'Processed % chapters...', success_count;
          END IF;
        ELSE
          empty_count := empty_count + 1;
        END IF;
      ELSE
        empty_count := empty_count + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE NOTICE 'Error processing % %: %', chapter_record.book_name, chapter_record.chapter_number, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'EXTRACTION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Success: % chapters', success_count;
  RAISE NOTICE 'Empty: % chapters', empty_count;
  RAISE NOTICE 'Errors: % chapters', error_count;
  RAISE NOTICE '========================================';
END $$;

-- Verify the results
SELECT
  COUNT(*) as total_chapters,
  COUNT(practical_applications) FILTER (WHERE practical_applications IS NOT NULL AND array_length(practical_applications, 1) > 0) as chapters_with_apps,
  SUM(array_length(practical_applications, 1)) FILTER (WHERE practical_applications IS NOT NULL) as total_applications,
  ROUND(AVG(array_length(practical_applications, 1)) FILTER (WHERE practical_applications IS NOT NULL), 1) as avg_apps_per_chapter
FROM bible_chapter_summaries_strongs;

-- Show sample from different books
SELECT
  book_name,
  chapter_number,
  array_length(practical_applications, 1) as app_count,
  left(practical_applications[1], 100) as first_app_preview
FROM bible_chapter_summaries_strongs
WHERE practical_applications IS NOT NULL
  AND array_length(practical_applications, 1) > 0
ORDER BY random()
LIMIT 10;

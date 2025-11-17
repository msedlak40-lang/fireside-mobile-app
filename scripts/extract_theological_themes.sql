-- Extract Theological Themes for ALL chapters from bible_chapter_summaries
-- This extracts and parses the "Theological Themes" section from summary_content

DO $$
DECLARE
  chapter_record RECORD;
  summary_text TEXT;
  themes_section TEXT;
  themes_array TEXT[];
  temp_text TEXT;
  success_count INT := 0;
  empty_count INT := 0;
  error_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting theological themes extraction for all chapters...';

  -- Loop through all chapters
  FOR chapter_record IN
    SELECT id, book_name, chapter_number, summary_content
    FROM bible_chapter_summaries
    ORDER BY book_name, chapter_number
  LOOP
    BEGIN
      -- Get the summary as plain text
      -- If summary_content is JSONB, convert to text
      -- If it's already TEXT, just use it directly
      BEGIN
        summary_text := chapter_record.summary_content #>> '{}';
      EXCEPTION WHEN OTHERS THEN
        summary_text := chapter_record.summary_content::TEXT;
      END;

      IF summary_text IS NULL OR summary_text = '' THEN
        empty_count := empty_count + 1;
        CONTINUE;
      END IF;

      -- Extract everything between "## Theological Themes" and the next ## section or end
      -- Try multiple patterns to catch variations
      themes_section := substring(summary_text from '## Theological Themes\n\n(.+?)(?=\n\n---\n\n##|\n\n##|$)');

      -- If that didn't work, try without the section separator
      IF themes_section IS NULL OR themes_section = '' THEN
        themes_section := substring(summary_text from '## Theological Themes[:\n]+(.+?)(?=\n\n##|$)');
      END IF;

      IF themes_section IS NOT NULL AND themes_section != '' THEN
        -- Split on newlines that start with a number or bullet point
        -- Common formats:
        -- 1. Theme name
        -- - Theme name
        -- * Theme name
        -- **Theme name**

        -- Split on pattern: newline followed by number/bullet
        themes_array := regexp_split_to_array(themes_section, '\n(?=[\d\-\*•])');

        -- Clean up each theme
        FOR i IN 1..array_length(themes_array, 1) LOOP
          temp_text := themes_array[i];

          -- Remove leading numbers, bullets, asterisks
          temp_text := regexp_replace(temp_text, '^\s*[\d]+\.\s*', '');
          temp_text := regexp_replace(temp_text, '^\s*[\-\*•]\s*', '');

          -- Remove markdown bold formatting **text**
          temp_text := regexp_replace(temp_text, '^\*\*([^*]+)\*\*:?\s*', '\1: ');

          -- Replace newlines with spaces
          temp_text := regexp_replace(temp_text, '\n', ' ', 'g');

          -- Trim
          temp_text := trim(temp_text);

          -- Only keep if it's a real theme (has substance)
          IF length(temp_text) > 10 THEN
            themes_array[i] := temp_text;
          ELSE
            themes_array[i] := NULL;
          END IF;
        END LOOP;

        -- Remove null entries
        themes_array := array_remove(themes_array, NULL);

        IF array_length(themes_array, 1) > 0 THEN
          -- Update the database
          UPDATE bible_chapter_summaries
          SET theological_themes = themes_array
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
  COUNT(theological_themes) FILTER (WHERE theological_themes IS NOT NULL AND array_length(theological_themes, 1) > 0) as chapters_with_themes,
  SUM(array_length(theological_themes, 1)) FILTER (WHERE theological_themes IS NOT NULL) as total_themes,
  ROUND(AVG(array_length(theological_themes, 1)) FILTER (WHERE theological_themes IS NOT NULL), 1) as avg_themes_per_chapter
FROM bible_chapter_summaries;

-- Show sample from different books
SELECT
  book_name,
  chapter_number,
  array_length(theological_themes, 1) as theme_count,
  left(theological_themes[1], 100) as first_theme_preview
FROM bible_chapter_summaries
WHERE theological_themes IS NOT NULL
  AND array_length(theological_themes, 1) > 0
ORDER BY random()
LIMIT 10;

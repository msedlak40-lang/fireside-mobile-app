-- SQL Function to Extract Practical Applications from summary_advanced
-- Run this in your Supabase SQL Editor

-- Step 1: Create the extraction function
CREATE OR REPLACE FUNCTION extract_practical_applications()
RETURNS TABLE(
  book_name TEXT,
  chapter_number INTEGER,
  applications_count INTEGER,
  status TEXT
) AS $$
DECLARE
  row_record RECORD;
  summary_text TEXT;
  practical_section TEXT;
  applications TEXT[];
  app_match TEXT;
  app_text TEXT;
BEGIN
  -- Loop through all chapters
  FOR row_record IN
    SELECT id, book_name, chapter_number, summary_advanced
    FROM bible_chapter_summaries_strongs
    ORDER BY book_name, chapter_number
  LOOP
    BEGIN
      -- Initialize
      applications := ARRAY[]::TEXT[];

      -- Extract summary_advanced as text
      -- It's stored as jsonb, but contains a string, so we need to extract it
      IF row_record.summary_advanced IS NOT NULL THEN
        -- Convert jsonb to text and remove the surrounding quotes
        summary_text := row_record.summary_advanced #>> '{}';

        -- Extract the Practical Applications section
        -- Pattern: ## Practical Applications ... (everything until --- or end)
        practical_section := substring(summary_text from '## Practical Applications\n\n(.*?)(?=\n---|\n##|$)');

        IF practical_section IS NOT NULL AND practical_section != '' THEN
          -- Use regexp_matches to find all applications
          -- Pattern: **From "word" (concept):** followed by text
          FOR app_match IN
            SELECT regexp_matches[1] || ' ' || regexp_matches[2] || ': ' || regexp_matches[3]
            FROM regexp_matches(
              practical_section,
              '\*\*From ["""]([^"""]+)["""] \(([^)]+)\):\*\*\s*\n([^\n*]+(?:\n(?!\*\*From)[^\n*]+)*)',
              'g'
            )
          LOOP
            -- Clean up the application text
            app_text := 'From "' || split_part(app_match, ' ', 2) || '"' ||
                       substring(app_match from '\([^)]+\)') ||
                       substring(app_match from ':\s*(.*)$');

            applications := array_append(applications, trim(app_text));
          END LOOP;
        END IF;
      END IF;

      -- Update the row if we found applications
      IF array_length(applications, 1) > 0 THEN
        UPDATE bible_chapter_summaries_strongs
        SET practical_applications = applications
        WHERE id = row_record.id;

        -- Return success
        RETURN QUERY SELECT
          row_record.book_name,
          row_record.chapter_number,
          array_length(applications, 1),
          'SUCCESS'::TEXT;
      ELSE
        -- Return empty status
        RETURN QUERY SELECT
          row_record.book_name,
          row_record.chapter_number,
          0,
          'EMPTY'::TEXT;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Return error status
      RETURN QUERY SELECT
        row_record.book_name,
        row_record.chapter_number,
        0,
        ('ERROR: ' || SQLERRM)::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Run the extraction (this will take a minute or two)
SELECT * FROM extract_practical_applications()
ORDER BY status, book_name, chapter_number;

-- Step 3: View summary statistics
SELECT
  status,
  COUNT(*) as chapter_count,
  SUM(applications_count) as total_applications
FROM extract_practical_applications()
GROUP BY status
ORDER BY status;

-- Step 4: Clean up the function (optional - run after you're done)
-- DROP FUNCTION IF EXISTS extract_practical_applications();

/**
 * Extract Practical Applications from summary_advanced and populate practical_applications column
 *
 * Run with: deno run --allow-net --allow-env extract_practical_applications.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Load environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Extract practical applications from markdown text
 */
function extractPracticalApplications(markdownText: string): string[] {
  const applications: string[] = [];

  // Find the "## Practical Applications" section
  const practicalAppsMatch = markdownText.match(/## Practical Applications\n\n([\s\S]*?)(?=\n---\n|$)/);

  if (!practicalAppsMatch) {
    return applications;
  }

  const practicalAppsSection = practicalAppsMatch[1];

  // Match each application: **From "..." (...):** followed by text
  // Pattern: **From "word" (concept):** Application text.
  const appPattern = /\*\*From ["""]([^"""]+)["""] \(([^)]+)\):\*\*\n([^\n*]+(?:\n(?!\*\*From)[^\n*]+)*)/g;

  let match;
  while ((match = appPattern.exec(practicalAppsSection)) !== null) {
    const keyword = match[1].trim();
    const concept = match[2].trim();
    const applicationText = match[3].trim();

    // Format: "From 'keyword' (concept): application text"
    const formattedApp = `From "${keyword}" (${concept}): ${applicationText}`;
    applications.push(formattedApp);
  }

  return applications;
}

/**
 * Process all chapters and extract applications
 */
async function processAllChapters() {
  console.log('🔍 Fetching all chapters from bible_chapter_summaries_strongs...');

  const { data: chapters, error } = await supabase
    .from('bible_chapter_summaries_strongs')
    .select('id, book_name, chapter_number, summary_advanced')
    .order('book_name')
    .order('chapter_number');

  if (error) {
    console.error('❌ Error fetching chapters:', error);
    return;
  }

  if (!chapters || chapters.length === 0) {
    console.log('⚠️ No chapters found');
    return;
  }

  console.log(`📚 Processing ${chapters.length} chapters...\n`);

  let successCount = 0;
  let emptyCount = 0;
  let errorCount = 0;

  for (const chapter of chapters) {
    try {
      // Extract summary_advanced as string
      let summaryText = '';

      if (typeof chapter.summary_advanced === 'string') {
        summaryText = chapter.summary_advanced;
      } else if (chapter.summary_advanced && typeof chapter.summary_advanced === 'object') {
        // If it's already parsed as object, stringify it
        summaryText = JSON.stringify(chapter.summary_advanced);
      }

      // Remove JSON quotes if present (the value is stored as a JSON string)
      if (summaryText.startsWith('"') && summaryText.endsWith('"')) {
        summaryText = JSON.parse(summaryText);
      }

      // Extract applications
      const applications = extractPracticalApplications(summaryText);

      if (applications.length === 0) {
        console.log(`⚠️  ${chapter.book_name} ${chapter.chapter_number}: No applications found`);
        emptyCount++;
        continue;
      }

      // Update the database
      const { error: updateError } = await supabase
        .from('bible_chapter_summaries_strongs')
        .update({ practical_applications: applications })
        .eq('id', chapter.id);

      if (updateError) {
        console.error(`❌ ${chapter.book_name} ${chapter.chapter_number}: Update error:`, updateError);
        errorCount++;
        continue;
      }

      console.log(`✅ ${chapter.book_name} ${chapter.chapter_number}: Extracted ${applications.length} applications`);
      successCount++;

    } catch (err) {
      console.error(`❌ ${chapter.book_name} ${chapter.chapter_number}: Error:`, err.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   ✅ Success: ${successCount} chapters`);
  console.log(`   ⚠️  Empty: ${emptyCount} chapters`);
  console.log(`   ❌ Errors: ${errorCount} chapters`);
  console.log('='.repeat(60));
}

// Run the script
if (import.meta.main) {
  console.log('🚀 Starting Practical Applications Extraction...\n');
  await processAllChapters();
  console.log('\n✨ Done!');
}

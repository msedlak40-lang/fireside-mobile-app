// scripts/generate-theological-studies.ts
// Batch-generates theological word studies for Strong's numbers using Claude API
//
// Usage:
//   deno run --allow-net --allow-env --allow-read scripts/generate-theological-studies.ts
//
// Reads ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY from scripts/.env

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// LOAD .env (same directory)
// ============================================

async function loadEnv() {
  try {
    const envPath = new URL('./.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
    const text = await Deno.readTextFile(envPath);
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!Deno.env.get(key)) {
        Deno.env.set(key, val);
      }
    }
  } catch {
    // .env not found — rely on environment variables
  }
}

await loadEnv();

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  SUPABASE_URL: Deno.env.get('SUPABASE_URL') || '',
  SUPABASE_SERVICE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  ANTHROPIC_API_KEY: Deno.env.get('ANTHROPIC_API_KEY') || '',

  // Processing options
  DELAY_MS: 2000,        // ms between API calls
  MAX_RETRIES: 3,
  VERSE_SAMPLE_SIZE: 15, // verses per entry

  // Filters — edit these to control what gets processed
  LANGUAGE_FILTER: 'G' as string | null,   // null = all, 'H' = Hebrew, 'G' = Greek
  LIMIT: null as number | null,            // null = all, number = cap for testing
};

// Validate config
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}
if (!CONFIG.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  Deno.exit(1);
}

// ============================================
// SUPABASE CLIENT
// ============================================

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);

// ============================================
// DATA FETCHING
// ============================================

async function fetchStrongsNumbers(): Promise<string[]> {
  console.log('Fetching Strong\'s numbers...');

  // Paginate to get ALL rows (Supabase defaults to 1000 max per request)
  const all: string[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    let query = supabase
      .from('strongs_lexicon')
      .select('strongs_number')
      .order('strongs_number')
      .range(offset, offset + PAGE_SIZE - 1);

    if (CONFIG.LANGUAGE_FILTER) {
      query = query.ilike('strongs_number', `${CONFIG.LANGUAGE_FILTER}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...data.map((d: { strongs_number: string }) => d.strongs_number));
    offset += PAGE_SIZE;

    if (data.length < PAGE_SIZE) break; // last page
  }

  // Apply LIMIT if set
  const result = CONFIG.LIMIT ? all.slice(0, CONFIG.LIMIT) : all;

  console.log(`Found ${result.length} Strong's numbers (total in DB: ${all.length})`);
  return result;
}

async function fetchExistingEntries(): Promise<Set<string>> {
  // Fetch ALL strongs_numbers that already have entries (skip on resume)
  const existing: string[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('theological_word_studies')
      .select('strongs_number')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    existing.push(...data.map((d: { strongs_number: string }) => d.strongs_number));
    offset += PAGE_SIZE;

    if (data.length < PAGE_SIZE) break;
  }

  return new Set(existing);
}

interface StrongsDefinition {
  original_word: string;
  transliteration: string;
  short_definition: string;
  detailed_definition: string | null;
  usage_notes: string | null;
  language: string;
}

async function fetchStrongsDefinition(strongsNumber: string): Promise<StrongsDefinition> {
  const { data, error } = await supabase
    .from('strongs_lexicon')
    .select('original_word, transliteration, short_definition, detailed_definition, usage_notes, language')
    .eq('strongs_number', strongsNumber)
    .single();

  if (error) throw error;
  return data as StrongsDefinition;
}

interface VerseExample {
  book_name: string;
  chapter_number: number;
  verse_number: number;
  english_word: string;
  original_word: string;
  verse_text: string;
  reference: string;
}

async function fetchVerseExamples(strongsNumber: string, limit: number): Promise<VerseExample[]> {
  // Fetch more than needed so we can pick diverse books
  const { data, error } = await supabase
    .from('verse_strongs_words')
    .select('book_name, chapter_number, verse_number, english_word, original_word')
    .eq('strongs_number', strongsNumber)
    .limit(limit * 3);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Group by book for diversity
  const byBook = new Map<string, typeof data>();
  for (const v of data) {
    if (!byBook.has(v.book_name)) byBook.set(v.book_name, []);
    byBook.get(v.book_name)!.push(v);
  }

  // Round-robin across books
  const samples: typeof data = [];
  const books = Array.from(byBook.values());
  let idx = 0;
  while (samples.length < limit && books.length > 0) {
    const book = books[idx % books.length];
    if (book.length > 0) {
      samples.push(book.shift()!);
    } else {
      books.splice(idx % books.length, 1);
      if (books.length === 0) break;
    }
    idx++;
  }

  // Fetch KJV text for each sample
  const withText = await Promise.all(
    samples.map(async (v) => {
      const { data: verse } = await supabase
        .from('bible_verses')
        .select('verse_text')
        .eq('book_name', v.book_name)
        .eq('chapter_number', v.chapter_number)
        .eq('verse_number', v.verse_number)
        .eq('translation', 'KJV')
        .maybeSingle();

      return {
        ...v,
        verse_text: verse?.verse_text || '',
        reference: `${v.book_name} ${v.chapter_number}:${v.verse_number}`,
      };
    })
  );

  return withText.filter((v) => v.verse_text) as VerseExample[];
}

async function fetchUsageCount(strongsNumber: string): Promise<number> {
  const { count, error } = await supabase
    .from('verse_strongs_words')
    .select('*', { count: 'exact', head: true })
    .eq('strongs_number', strongsNumber);

  if (error) return 0;
  return count || 0;
}

// ============================================
// PROMPT
// ============================================

function buildPrompt(
  strongsNumber: string,
  def: StrongsDefinition,
  verses: VerseExample[],
  totalCount: number,
): string {
  const lang = strongsNumber.startsWith('H') ? 'Hebrew' : 'Greek';
  const testament = strongsNumber.startsWith('H') ? 'Old Testament' : 'New Testament';

  const verseLines = verses
    .map((v, i) => `${i + 1}. ${v.reference} (translated "${v.english_word}") - "${v.verse_text}"`)
    .join('\n');

  return `You are a biblical ${lang} scholar creating theological word study entries for a Bible study app.

STRONG'S NUMBER: ${strongsNumber}
ORIGINAL WORD: ${def.original_word}
TRANSLITERATION: ${def.transliteration}
BASIC DEFINITION: ${def.short_definition}
${def.detailed_definition ? 'DETAILED DEFINITION: ' + def.detailed_definition + '\n' : ''}${def.usage_notes ? 'USAGE NOTES: ' + def.usage_notes + '\n' : ''}TOTAL OCCURRENCES: ${totalCount} verses in the ${testament}

SAMPLE VERSE USAGE (showing ${verses.length} of ${totalCount}):
${verseLines}

TASK:
Write a 180-220 word theological word study entry that explains:

1. CORE MEANING: What does this word fundamentally mean? What is its root concept? (1-2 sentences)

2. THEOLOGICAL SIGNIFICANCE: What theological concepts does this word represent? Why did inspired writers choose THIS specific word? What does it reveal about God's character or His relationship with humanity? (3-4 sentences)

3. TYPICAL CONTEXTS: Where does this word appear most often in Scripture? What patterns emerge from the verses above? (worship, covenant, judgment, salvation, relationships, etc.) Be specific and cite examples. (2-3 sentences)

4. RELATED WORDS & NUANCES: How is this word different from related ${lang} words with similar meanings? What's unique about THIS word's theological nuance or emphasis? If you don't know specific related words, explain the word's distinctive character. (2-3 sentences)

5. PRACTICAL INSIGHT: What does this word teach us about God's nature or our walk with Him? How does understanding this word deepen biblical comprehension? (1-2 sentences)

CRITICAL GUIDELINES:
- Use modern, accessible language (avoid academic jargon)
- ONLY cite verse references from the examples provided above - do NOT invent or hallucinate verses
- Be theologically sound and evangelical in perspective
- Write exactly 180-220 words total
- Make it compelling and insightful for serious Bible students
- Do NOT use markdown formatting, headers, or bullet points - write in flowing prose paragraphs
- Do NOT include the title or Strong's number in your response - just the entry text

Write the theological word study entry now:`;
}

// ============================================
// CLAUDE API
// ============================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callClaude(prompt: string, retries = 0): Promise<string> {
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (resp.status === 429) {
      // Rate limited — back off
      const retryAfter = parseInt(resp.headers.get('retry-after') || '30', 10);
      console.log(`   Rate limited, waiting ${retryAfter}s...`);
      await delay(retryAfter * 1000);
      return callClaude(prompt, retries);
    }

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`API ${resp.status}: ${body.slice(0, 200)}`);
    }

    const data = await resp.json();
    return data.content[0].text;
  } catch (err) {
    if (retries < CONFIG.MAX_RETRIES) {
      console.log(`   Retry ${retries + 1}/${CONFIG.MAX_RETRIES}: ${(err as Error).message}`);
      await delay(5000);
      return callClaude(prompt, retries + 1);
    }
    throw err;
  }
}

// ============================================
// SAVE
// ============================================

async function saveEntry(strongsNumber: string, entryText: string, def: StrongsDefinition) {
  const wordCount = entryText.trim().split(/\s+/).length;

  // Extract verse references from entry text
  const refPattern = /(\d?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(\d+:\d+)/g;
  const refs: string[] = [];
  let m;
  while ((m = refPattern.exec(entryText)) !== null) refs.push(m[0]);

  const { error } = await supabase
    .from('theological_word_studies')
    .upsert(
      {
        strongs_number: strongsNumber,
        entry_text: entryText,
        core_meaning: def.short_definition,
        word_count: wordCount,
        key_verse_examples: refs.length > 0 ? refs.slice(0, 5) : null,
        ai_generated: true,
        human_reviewed: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'strongs_number' },
    );

  if (error) throw error;
  return wordCount;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== Theological Word Study Generator ===\n');
  console.log(`Language filter: ${CONFIG.LANGUAGE_FILTER || 'All'}`);
  console.log(`Limit: ${CONFIG.LIMIT || 'All'}`);
  console.log(`Delay: ${CONFIG.DELAY_MS}ms\n`);

  const startTime = Date.now();

  const strongsNumbers = await fetchStrongsNumbers();
  const reviewed = await fetchExistingEntries();
  console.log(`Already reviewed: ${reviewed.size}\n`);

  let processed = 0;
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const sn of strongsNumbers) {
    processed++;

    // Skip entries that already exist in the database
    if (reviewed.has(sn)) {
      console.log(`[${processed}/${strongsNumbers.length}] ${sn} — skipped (exists)`);
      skipped++;
      continue;
    }

    try {
      console.log(`[${processed}/${strongsNumbers.length}] ${sn} — fetching data...`);

      const def = await fetchStrongsDefinition(sn);
      const verses = await fetchVerseExamples(sn, CONFIG.VERSE_SAMPLE_SIZE);
      const count = await fetchUsageCount(sn);

      if (verses.length === 0) {
        console.log(`   No verse examples — skipped`);
        skipped++;
        continue;
      }

      const prompt = buildPrompt(sn, def, verses, count);

      console.log(`   Calling Claude (${def.transliteration} — "${def.short_definition}")...`);
      const entryText = await callClaude(prompt);
      const wc = await saveEntry(sn, entryText, def);

      console.log(`   Saved (${wc} words)`);
      generated++;

      // Rate limit pause
      await delay(CONFIG.DELAY_MS);
    } catch (err) {
      console.error(`   FAILED: ${(err as Error).message}`);
      failed++;
    }

    // Progress summary every 10
    if (processed % 10 === 0) {
      const mins = ((Date.now() - startTime) / 60000).toFixed(1);
      console.log(`\n--- Progress: ${processed}/${strongsNumbers.length} | Generated: ${generated} | Skipped: ${skipped} | Failed: ${failed} | ${mins}min ---\n`);
    }
  }

  // Final summary
  const totalMin = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log('\n' + '='.repeat(50));
  console.log('COMPLETE');
  console.log('='.repeat(50));
  console.log(`Processed:  ${processed}`);
  console.log(`Generated:  ${generated}`);
  console.log(`Skipped:    ${skipped}`);
  console.log(`Failed:     ${failed}`);
  console.log(`Time:       ${totalMin} min`);
  console.log(`Est. cost:  $${(generated * 0.006).toFixed(2)}`);
  console.log('='.repeat(50));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  Deno.exit(1);
});

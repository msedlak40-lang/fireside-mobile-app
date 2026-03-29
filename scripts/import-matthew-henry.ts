// scripts/import-matthew-henry.ts
// Imports Matthew Henry's Complete Commentary from HelloAO Bible API into Supabase.
//
// Usage:
//   deno run --allow-net --allow-env --allow-read scripts/import-matthew-henry.ts
//
// Reads SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY from scripts/.env

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// LOAD .env
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
      if (!Deno.env.get(key)) Deno.env.set(key, val);
    }
  } catch { /* .env not found */ }
}

await loadEnv();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API_BASE = 'https://bible.helloao.org/api/c/matthew-henry';

// HelloAO book abbreviations
const BOOKS = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU',
  'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI',
  '1CH', '2CH', 'EZR', 'NEH', 'EST',
  'JOB', 'PSA', 'PRO', 'ECC', 'SNG',
  'ISA', 'JER', 'LAM', 'EZK', 'DAN',
  'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN',
  'ACT',
  'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL',
  '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM',
  'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD',
  'REV',
];

// ============================================
// HELPERS
// ============================================

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item: unknown) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          if (obj.text) return String(obj.text);
          if (obj.content) return extractText(obj.content);
        }
        return '';
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return '';
}

async function fetchJSON(url: string): Promise<unknown | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url);
      if (resp.status === 404) return null;
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      console.error(`  Failed after 3 attempts: ${msg}`);
      return null;
    }
  }
  return null;
}

// ============================================
// IMPORT LOGIC
// ============================================

async function importBook(bookAbbrev: string): Promise<number> {
  // First fetch books.json to check how many chapters this book has
  let totalVerses = 0;
  let chapter = 1;
  let misses = 0;

  while (misses < 3) {
    const url = `${API_BASE}/${bookAbbrev}/${chapter}.json`;
    const data = await fetchJSON(url) as Record<string, unknown> | null;

    if (!data || !data.chapter) {
      misses++;
      chapter++;
      continue;
    }

    misses = 0;
    const bookData = data.book as Record<string, unknown> | undefined;
    const chapterData = data.chapter as Record<string, unknown>;
    const bookName = String(bookData?.name ?? bookAbbrev);
    const verses = (chapterData.content ?? []) as Array<Record<string, unknown>>;

    const records: Array<{
      book_name: string;
      chapter_number: number;
      verse_number: number;
      commentary_text: string;
    }> = [];

    for (const verse of verses) {
      if (verse.type !== 'verse') continue;
      const verseNum = Number(verse.number);
      const text = extractText(verse.content);
      if (!text || text.length < 10) continue;

      records.push({
        book_name: bookName,
        chapter_number: chapter,
        verse_number: verseNum,
        commentary_text: text,
      });
    }

    if (records.length > 0) {
      const { error } = await supabase
        .from('matthew_henry_commentary')
        .upsert(records, { onConflict: 'book_name,chapter_number,verse_number' });

      if (error) {
        console.error(`  Error inserting ${bookAbbrev} ${chapter}: ${error.message}`);
      } else {
        totalVerses += records.length;
        console.log(`  ${bookName} ${chapter}: ${records.length} verses`);
      }
    }

    chapter++;
    // Be nice to the API
    await new Promise(r => setTimeout(r, 300));
  }

  return totalVerses;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== Matthew Henry Commentary Import ===');
  console.log(`Books: ${BOOKS.length}`);
  console.log();

  // Check how many already exist
  const { count: existingCount } = await supabase
    .from('matthew_henry_commentary')
    .select('*', { count: 'exact', head: true });
  console.log(`Existing entries: ${existingCount ?? 0}`);

  let grandTotal = 0;
  const startTime = Date.now();

  for (let i = 0; i < BOOKS.length; i++) {
    const book = BOOKS[i];
    console.log(`\n[${i + 1}/${BOOKS.length}] ${book}`);
    const count = await importBook(book);
    grandTotal += count;

    const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
    console.log(`  Subtotal: ${count} | Running total: ${grandTotal} | Elapsed: ${elapsed}min`);
  }

  console.log('\n=== Import Complete ===');
  console.log(`Total verses imported: ${grandTotal}`);
  console.log(`Time: ${((Date.now() - startTime) / 60000).toFixed(1)} minutes`);
}

main();

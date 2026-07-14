// src/services/verseOfTheDay.ts
import { supabase } from '../lib/supabaseClient';

export type VerseOfTheDay = {
  book_name: string;
  chapter_number: number;
  verse_number: number;
  verse_text: string;
  translation: string;
  reference: string;
  insight_title?: string;
  insight_detail?: string;
  related_verses?: string[];
  theme?: string;
  source: 'curated' | 'insight' | 'random';
  is_starred?: boolean;
};

type CuratedVerse = {
  book_name: string;
  chapter: number;
  verse: number;
  theme: string;
};

// ---------------------------------------------------------------------------
// Curated verses organized by weekly themes (84 total, 12 weeks x 7 days)
// ---------------------------------------------------------------------------
const CURATED_VERSES: CuratedVerse[] = [
  // Week 1: Faith
  { book_name: 'Hebrews', chapter: 11, verse: 1, theme: 'Faith' },
  { book_name: 'Mark', chapter: 11, verse: 24, theme: 'Faith' },
  { book_name: '2 Corinthians', chapter: 5, verse: 7, theme: 'Faith' },
  { book_name: 'Romans', chapter: 10, verse: 17, theme: 'Faith' },
  { book_name: 'James', chapter: 2, verse: 17, theme: 'Faith' },
  { book_name: 'Matthew', chapter: 17, verse: 20, theme: 'Faith' },
  { book_name: 'Ephesians', chapter: 2, verse: 8, theme: 'Faith' },

  // Week 2: Hope
  { book_name: 'Romans', chapter: 15, verse: 13, theme: 'Hope' },
  { book_name: 'Jeremiah', chapter: 29, verse: 11, theme: 'Hope' },
  { book_name: 'Psalms', chapter: 42, verse: 11, theme: 'Hope' },
  { book_name: 'Lamentations', chapter: 3, verse: 22, theme: 'Hope' },
  { book_name: 'Proverbs', chapter: 23, verse: 18, theme: 'Hope' },
  { book_name: 'Hebrews', chapter: 6, verse: 19, theme: 'Hope' },
  { book_name: '1 Peter', chapter: 1, verse: 3, theme: 'Hope' },

  // Week 3: Love
  { book_name: '1 Corinthians', chapter: 13, verse: 4, theme: 'Love' },
  { book_name: 'John', chapter: 3, verse: 16, theme: 'Love' },
  { book_name: '1 John', chapter: 4, verse: 8, theme: 'Love' },
  { book_name: 'Romans', chapter: 8, verse: 38, theme: 'Love' },
  { book_name: 'Colossians', chapter: 3, verse: 14, theme: 'Love' },
  { book_name: 'John', chapter: 13, verse: 34, theme: 'Love' },
  { book_name: '1 John', chapter: 4, verse: 19, theme: 'Love' },

  // Week 4: Peace
  { book_name: 'Philippians', chapter: 4, verse: 7, theme: 'Peace' },
  { book_name: 'John', chapter: 14, verse: 27, theme: 'Peace' },
  { book_name: 'Isaiah', chapter: 26, verse: 3, theme: 'Peace' },
  { book_name: 'Romans', chapter: 5, verse: 1, theme: 'Peace' },
  { book_name: 'Colossians', chapter: 3, verse: 15, theme: 'Peace' },
  { book_name: 'Psalms', chapter: 29, verse: 11, theme: 'Peace' },
  { book_name: 'Numbers', chapter: 6, verse: 26, theme: 'Peace' },

  // Week 5: Wisdom
  { book_name: 'Proverbs', chapter: 3, verse: 5, theme: 'Wisdom' },
  { book_name: 'James', chapter: 1, verse: 5, theme: 'Wisdom' },
  { book_name: 'Proverbs', chapter: 9, verse: 10, theme: 'Wisdom' },
  { book_name: 'Psalms', chapter: 111, verse: 10, theme: 'Wisdom' },
  { book_name: 'Colossians', chapter: 3, verse: 16, theme: 'Wisdom' },
  { book_name: 'Proverbs', chapter: 2, verse: 6, theme: 'Wisdom' },
  { book_name: 'Ecclesiastes', chapter: 7, verse: 12, theme: 'Wisdom' },

  // Week 6: Courage
  { book_name: 'Joshua', chapter: 1, verse: 9, theme: 'Courage' },
  { book_name: 'Psalms', chapter: 27, verse: 1, theme: 'Courage' },
  { book_name: 'Isaiah', chapter: 41, verse: 10, theme: 'Courage' },
  { book_name: 'Deuteronomy', chapter: 31, verse: 6, theme: 'Courage' },
  { book_name: '1 Chronicles', chapter: 28, verse: 20, theme: 'Courage' },
  { book_name: '2 Timothy', chapter: 1, verse: 7, theme: 'Courage' },
  { book_name: 'Psalms', chapter: 31, verse: 24, theme: 'Courage' },

  // Week 7: Joy
  { book_name: 'Nehemiah', chapter: 8, verse: 10, theme: 'Joy' },
  { book_name: 'Psalms', chapter: 16, verse: 11, theme: 'Joy' },
  { book_name: 'Philippians', chapter: 4, verse: 4, theme: 'Joy' },
  { book_name: 'Psalms', chapter: 30, verse: 5, theme: 'Joy' },
  { book_name: 'Romans', chapter: 15, verse: 13, theme: 'Joy' },
  { book_name: 'Galatians', chapter: 5, verse: 22, theme: 'Joy' },
  { book_name: '1 Thessalonians', chapter: 5, verse: 16, theme: 'Joy' },

  // Week 8: Strength
  { book_name: 'Philippians', chapter: 4, verse: 13, theme: 'Strength' },
  { book_name: 'Isaiah', chapter: 40, verse: 31, theme: 'Strength' },
  { book_name: 'Psalms', chapter: 46, verse: 1, theme: 'Strength' },
  { book_name: '2 Corinthians', chapter: 12, verse: 9, theme: 'Strength' },
  { book_name: 'Exodus', chapter: 15, verse: 2, theme: 'Strength' },
  { book_name: 'Nehemiah', chapter: 8, verse: 10, theme: 'Strength' },
  { book_name: 'Psalms', chapter: 28, verse: 7, theme: 'Strength' },

  // Week 9: Prayer
  { book_name: 'Matthew', chapter: 6, verse: 9, theme: 'Prayer' },
  { book_name: '1 Thessalonians', chapter: 5, verse: 17, theme: 'Prayer' },
  { book_name: 'Philippians', chapter: 4, verse: 6, theme: 'Prayer' },
  { book_name: 'James', chapter: 5, verse: 16, theme: 'Prayer' },
  { book_name: 'Matthew', chapter: 7, verse: 7, theme: 'Prayer' },
  { book_name: 'Luke', chapter: 18, verse: 1, theme: 'Prayer' },
  { book_name: 'Colossians', chapter: 4, verse: 2, theme: 'Prayer' },

  // Week 10: Forgiveness
  { book_name: '1 John', chapter: 1, verse: 9, theme: 'Forgiveness' },
  { book_name: 'Ephesians', chapter: 4, verse: 32, theme: 'Forgiveness' },
  { book_name: 'Colossians', chapter: 3, verse: 13, theme: 'Forgiveness' },
  { book_name: 'Matthew', chapter: 6, verse: 14, theme: 'Forgiveness' },
  { book_name: 'Psalms', chapter: 103, verse: 12, theme: 'Forgiveness' },
  { book_name: 'Isaiah', chapter: 43, verse: 25, theme: 'Forgiveness' },
  { book_name: 'Acts', chapter: 3, verse: 19, theme: 'Forgiveness' },

  // Week 11: Trust
  { book_name: 'Proverbs', chapter: 3, verse: 5, theme: 'Trust' },
  { book_name: 'Psalms', chapter: 56, verse: 3, theme: 'Trust' },
  { book_name: 'Isaiah', chapter: 26, verse: 4, theme: 'Trust' },
  { book_name: 'Nahum', chapter: 1, verse: 7, theme: 'Trust' },
  { book_name: 'Psalms', chapter: 37, verse: 5, theme: 'Trust' },
  { book_name: 'Proverbs', chapter: 29, verse: 25, theme: 'Trust' },
  { book_name: 'Jeremiah', chapter: 17, verse: 7, theme: 'Trust' },

  // Week 12: Grace
  { book_name: 'Ephesians', chapter: 2, verse: 8, theme: 'Grace' },
  { book_name: '2 Corinthians', chapter: 12, verse: 9, theme: 'Grace' },
  { book_name: 'Romans', chapter: 3, verse: 24, theme: 'Grace' },
  { book_name: 'Titus', chapter: 2, verse: 11, theme: 'Grace' },
  { book_name: 'Hebrews', chapter: 4, verse: 16, theme: 'Grace' },
  { book_name: 'James', chapter: 4, verse: 6, theme: 'Grace' },
  { book_name: '2 Peter', chapter: 3, verse: 18, theme: 'Grace' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Simple deterministic PRNG — returns 0..1 for a given integer seed */
function seedRandom(seed: number): number {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

// ---------------------------------------------------------------------------
// Core fetch — weighted hybrid (60 % curated, 40 % insight)
// ---------------------------------------------------------------------------

export async function fetchVerseOfTheDay(
  preferredTranslation: string = 'KJV',
): Promise<VerseOfTheDay | null> {
  try {
    const dayOfYear = getDayOfYear();
    const year = new Date().getFullYear();
    const seed = year * 1000 + dayOfYear;
    const roll = seedRandom(seed);

    // 60 % curated, 40 % insight
    if (roll < 0.6) {
      const result = await fetchCuratedVerse(dayOfYear, preferredTranslation);
      if (result) return result;
    }

    // Insight path (or fallback when curated fails)
    const insightResult = await fetchInsightVerse(seed, preferredTranslation);
    if (insightResult) return insightResult;

    // Last-resort fallback: random from bible_verses
    return fetchRandomVerse(preferredTranslation);
  } catch (err) {
    console.error('[fetchVerseOfTheDay] Unexpected error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Curated verse fetch
// ---------------------------------------------------------------------------

async function fetchCuratedVerse(
  dayOfYear: number,
  translation: string,
): Promise<VerseOfTheDay | null> {
  const curated = CURATED_VERSES[dayOfYear % CURATED_VERSES.length];

  const { data: verse } = await supabase
    .from('bible_verses')
    .select('verse_text')
    .eq('book_name', curated.book_name)
    .eq('chapter_number', curated.chapter)
    .eq('verse_number', curated.verse)
    .eq('translation', translation)
    .maybeSingle();

  if (!verse) return null;

  // Try to enrich with insight
  const { data: insight } = await supabase
    .from('bible_verse_insights')
    .select('insight_title, insight_detail, related_verses')
    .eq('chapter_number', curated.chapter)
    .eq('verse_number', curated.verse)
    .maybeSingle();

  return {
    book_name: curated.book_name,
    chapter_number: curated.chapter,
    verse_number: curated.verse,
    verse_text: verse.verse_text,
    translation,
    reference: `${curated.book_name} ${curated.chapter}:${curated.verse}`,
    insight_title: insight?.insight_title || undefined,
    insight_detail: insight?.insight_detail || undefined,
    related_verses: insight?.related_verses || undefined,
    theme: curated.theme,
    source: 'curated',
  };
}

// ---------------------------------------------------------------------------
// Insight verse fetch (from bible_verse_insights)
// ---------------------------------------------------------------------------

async function fetchInsightVerse(
  seed: number,
  translation: string,
): Promise<VerseOfTheDay | null> {
  const { count, error: countError } = await supabase
    .from('bible_verse_insights')
    .select('*', { count: 'exact', head: true });

  if (countError || !count) return null;

  const offset = seed % count;

  const { data: insightData } = await supabase
    .from('bible_verse_insights')
    .select('*')
    .order('id', { ascending: true })
    .range(offset, offset)
    .limit(1)
    .maybeSingle();

  if (!insightData) return null;

  // Resolve book name
  const { data: bookData } = await supabase
    .from('bible_books_metadata')
    .select('book_name')
    .eq('id', insightData.book_id)
    .maybeSingle();

  const bookName = bookData?.book_name || '';

  // Fetch verse text in preferred translation
  const { data: verseData } = await supabase
    .from('bible_verses')
    .select('verse_text')
    .eq('book_name', bookName)
    .eq('chapter_number', insightData.chapter_number)
    .eq('verse_number', insightData.verse_number)
    .eq('translation', translation)
    .maybeSingle();

  if (!verseData) return null;

  return {
    book_name: bookName,
    chapter_number: insightData.chapter_number,
    verse_number: insightData.verse_number,
    verse_text: verseData.verse_text,
    translation,
    reference: `${bookName} ${insightData.chapter_number}:${insightData.verse_number}`,
    insight_title: insightData.insight_title || undefined,
    insight_detail: insightData.insight_detail || undefined,
    related_verses: insightData.related_verses || undefined,
    source: 'insight',
  };
}

// ---------------------------------------------------------------------------
// Random fallback
// ---------------------------------------------------------------------------

async function fetchRandomVerse(
  translation: string,
): Promise<VerseOfTheDay | null> {
  const { count } = await supabase
    .from('bible_verses')
    .select('*', { count: 'exact', head: true })
    .eq('translation', translation);

  if (!count) return null;

  const dayOfYear = getDayOfYear();
  const year = new Date().getFullYear();
  const offset = (year * 1000 + dayOfYear) % count;

  const { data } = await supabase
    .from('bible_verses')
    .select('book_name, chapter_number, verse_number, verse_text')
    .eq('translation', translation)
    .order('book_name')
    .order('chapter_number')
    .order('verse_number')
    .range(offset, offset)
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    book_name: data.book_name,
    chapter_number: data.chapter_number,
    verse_number: data.verse_number,
    verse_text: data.verse_text,
    translation,
    reference: `${data.book_name} ${data.chapter_number}:${data.verse_number}`,
    source: 'random',
  };
}

// ---------------------------------------------------------------------------
// VOTD Interactions (history, favorites)
// ---------------------------------------------------------------------------

/** Log that the user viewed today's VOTD. Upserts by (user_id, date). */
export async function logVotdView(votd: VerseOfTheDay): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];

  await supabase
    .from('user_votd_interactions')
    .upsert(
      {
        user_id: user.id,
        date: today,
        book_name: votd.book_name,
        chapter_number: votd.chapter_number,
        verse_number: votd.verse_number,
        verse_reference: votd.reference,
        verse_text: votd.verse_text,
        theme: votd.theme || null,
        source: votd.source,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' },
    )
    .then(({ error }) => {
      if (error) console.warn('[logVotdView]', error.message);
    });
}

/** Toggle star on a VOTD by date string (YYYY-MM-DD). Returns new starred state. */
export async function toggleVotdStar(date: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: existing } = await supabase
    .from('user_votd_interactions')
    .select('id, is_starred')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle();

  if (!existing) return false;

  const newStarred = !existing.is_starred;

  await supabase
    .from('user_votd_interactions')
    .update({
      is_starred: newStarred,
      starred_at: newStarred ? new Date().toISOString() : null,
    })
    .eq('id', existing.id);

  return newStarred;
}

/** Check if today's VOTD is starred. */
export async function isTodayVotdStarred(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('user_votd_interactions')
    .select('is_starred')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle();

  return data?.is_starred ?? false;
}

/** Get VOTD history for archive screen. */
export async function getVotdHistory(limit: number = 60): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('user_votd_interactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(limit);

  return data || [];
}

/** Get starred VOTD entries. */
export async function getStarredVotd(): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('user_votd_interactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_starred', true)
    .order('starred_at', { ascending: false });

  return data || [];
}

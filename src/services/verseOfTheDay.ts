// src/services/verseOfTheDay.ts
import { supabase } from '../lib/supabaseClient';

export type VerseOfTheDay = {
  book_name: string;
  chapter_number: number;
  verse_number: number;
  verse_text: string;
  translation: string;
  reference: string;
  theme?: string;
  source?: 'curated' | 'personalized' | 'random';
};

type CuratedVerse = {
  book_name: string;
  chapter: number;
  verse: number;
  theme: string;
};

/**
 * Curated list of meaningful verses organized by weekly themes
 * Each week has a theme, rotating through the year
 */
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
  { book_name: 'Psalm', chapter: 42, verse: 11, theme: 'Hope' },
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
  { book_name: 'Psalm', chapter: 29, verse: 11, theme: 'Peace' },
  { book_name: 'Numbers', chapter: 6, verse: 26, theme: 'Peace' },

  // Week 5: Wisdom
  { book_name: 'Proverbs', chapter: 3, verse: 5, theme: 'Wisdom' },
  { book_name: 'James', chapter: 1, verse: 5, theme: 'Wisdom' },
  { book_name: 'Proverbs', chapter: 9, verse: 10, theme: 'Wisdom' },
  { book_name: 'Psalm', chapter: 111, verse: 10, theme: 'Wisdom' },
  { book_name: 'Colossians', chapter: 3, verse: 16, theme: 'Wisdom' },
  { book_name: 'Proverbs', chapter: 2, verse: 6, theme: 'Wisdom' },
  { book_name: 'Ecclesiastes', chapter: 7, verse: 12, theme: 'Wisdom' },

  // Week 6: Courage
  { book_name: 'Joshua', chapter: 1, verse: 9, theme: 'Courage' },
  { book_name: 'Psalm', chapter: 27, verse: 1, theme: 'Courage' },
  { book_name: 'Isaiah', chapter: 41, verse: 10, theme: 'Courage' },
  { book_name: 'Deuteronomy', chapter: 31, verse: 6, theme: 'Courage' },
  { book_name: '1 Chronicles', chapter: 28, verse: 20, theme: 'Courage' },
  { book_name: '2 Timothy', chapter: 1, verse: 7, theme: 'Courage' },
  { book_name: 'Psalm', chapter: 31, verse: 24, theme: 'Courage' },

  // Week 7: Joy
  { book_name: 'Nehemiah', chapter: 8, verse: 10, theme: 'Joy' },
  { book_name: 'Psalm', chapter: 16, verse: 11, theme: 'Joy' },
  { book_name: 'Philippians', chapter: 4, verse: 4, theme: 'Joy' },
  { book_name: 'Psalm', chapter: 30, verse: 5, theme: 'Joy' },
  { book_name: 'Romans', chapter: 15, verse: 13, theme: 'Joy' },
  { book_name: 'Galatians', chapter: 5, verse: 22, theme: 'Joy' },
  { book_name: '1 Thessalonians', chapter: 5, verse: 16, theme: 'Joy' },

  // Week 8: Strength
  { book_name: 'Philippians', chapter: 4, verse: 13, theme: 'Strength' },
  { book_name: 'Isaiah', chapter: 40, verse: 31, theme: 'Strength' },
  { book_name: 'Psalm', chapter: 46, verse: 1, theme: 'Strength' },
  { book_name: '2 Corinthians', chapter: 12, verse: 9, theme: 'Strength' },
  { book_name: 'Exodus', chapter: 15, verse: 2, theme: 'Strength' },
  { book_name: 'Nehemiah', chapter: 8, verse: 10, theme: 'Strength' },
  { book_name: 'Psalm', chapter: 28, verse: 7, theme: 'Strength' },

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
  { book_name: 'Psalm', chapter: 103, verse: 12, theme: 'Forgiveness' },
  { book_name: 'Isaiah', chapter: 43, verse: 25, theme: 'Forgiveness' },
  { book_name: 'Acts', chapter: 3, verse: 19, theme: 'Forgiveness' },

  // Week 11: Trust
  { book_name: 'Proverbs', chapter: 3, verse: 5, theme: 'Trust' },
  { book_name: 'Psalm', chapter: 56, verse: 3, theme: 'Trust' },
  { book_name: 'Isaiah', chapter: 26, verse: 4, theme: 'Trust' },
  { book_name: 'Nahum', chapter: 1, verse: 7, theme: 'Trust' },
  { book_name: 'Psalm', chapter: 37, verse: 5, theme: 'Trust' },
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

/**
 * Get the day of the year (1-365/366)
 */
function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Get a curated verse for today based on the day of year
 */
function getCuratedVerseForToday(): CuratedVerse {
  const dayOfYear = getDayOfYear();
  const index = dayOfYear % CURATED_VERSES.length;
  return CURATED_VERSES[index];
}

/**
 * Try to get a personalized verse based on user's current studies
 */
async function getPersonalizedVerse(preferredTranslation: string = 'KJV'): Promise<VerseOfTheDay | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if user has an active reading plan
    const { data: activePlan } = await supabase
      .from('user_reading_plan_progress')
      .select('plan_id, current_day, bible_reading_plans(plan_name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (activePlan) {
      // Get today's reading from the active plan
      const { data: todayReading } = await supabase
        .from('reading_plan_days')
        .select('book_name, chapter_number, verse_range, full_reference')
        .eq('plan_id', activePlan.plan_id)
        .eq('day_number', activePlan.current_day)
        .limit(1)
        .maybeSingle();

      if (todayReading) {
        // Parse verse range (e.g., "1-5" or "1")
        const verseMatch = todayReading.verse_range?.match(/^(\d+)/);
        const verseNumber = verseMatch ? parseInt(verseMatch[1], 10) : 1;

        // Fetch the verse text
        const { data: verseData } = await supabase
          .from('bible_verses')
          .select('verse_text')
          .eq('book_name', todayReading.book_name)
          .eq('chapter_number', todayReading.chapter_number)
          .eq('verse_number', verseNumber)
          .eq('translation', preferredTranslation)
          .maybeSingle();

        if (verseData) {
          return {
            book_name: todayReading.book_name,
            chapter_number: todayReading.chapter_number,
            verse_number: verseNumber,
            verse_text: verseData.verse_text,
            translation: preferredTranslation,
            reference: `${todayReading.book_name} ${todayReading.chapter_number}:${verseNumber}`,
            theme: 'Your Reading Plan',
            source: 'personalized',
          };
        }
      }
    }

    // Check if user has an active character study
    const { data: activeCharacter } = await supabase
      .from('user_character_progress')
      .select('character_id, bible_characters(name)')
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeCharacter) {
      // Get a verse from a lesson about this character
      const { data: lessonVerse } = await supabase
        .from('character_lessons')
        .select('key_passage')
        .eq('character_id', activeCharacter.character_id)
        .order('lesson_number', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (lessonVerse?.key_passage) {
        // Parse key_passage (e.g., "Genesis 22:1-2")
        const passageMatch = lessonVerse.key_passage.match(/^([A-Za-z\s]+)\s+(\d+):(\d+)/);
        if (passageMatch) {
          const [, bookName, chapterStr, verseStr] = passageMatch;
          const chapterNumber = parseInt(chapterStr, 10);
          const verseNumber = parseInt(verseStr, 10);

          const { data: verseData } = await supabase
            .from('bible_verses')
            .select('verse_text')
            .eq('book_name', bookName.trim())
            .eq('chapter_number', chapterNumber)
            .eq('verse_number', verseNumber)
            .eq('translation', preferredTranslation)
            .maybeSingle();

          if (verseData) {
            return {
              book_name: bookName.trim(),
              chapter_number: chapterNumber,
              verse_number: verseNumber,
              verse_text: verseData.verse_text,
              translation: preferredTranslation,
              reference: `${bookName.trim()} ${chapterNumber}:${verseNumber}`,
              theme: `Character Study: ${(activeCharacter as any).bible_characters?.name}`,
              source: 'personalized',
            };
          }
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('[getPersonalizedVerse] Error:', err);
    return null;
  }
}

/**
 * Fetch verse text from database
 */
async function fetchVerseText(
  bookName: string,
  chapter: number,
  verse: number,
  translation: string = 'KJV'
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('bible_verses')
      .select('verse_text')
      .eq('book_name', bookName)
      .eq('chapter_number', chapter)
      .eq('verse_number', verse)
      .eq('translation', translation)
      .maybeSingle();

    if (error || !data) {
      console.warn('[fetchVerseText] Error or no data:', error);
      return null;
    }

    return data.verse_text;
  } catch (err) {
    console.error('[fetchVerseText] Unexpected error:', err);
    return null;
  }
}

/**
 * Hybrid approach to verse of the day:
 * - 20% chance: personalized based on user's active studies
 * - 80% chance: curated verse from themed rotation
 * - Fallback: random verse if both fail
 */
export async function fetchVerseOfTheDay(preferredTranslation: string = 'KJV'): Promise<VerseOfTheDay | null> {
  try {
    // 20% chance to try personalization
    const shouldPersonalize = Math.random() < 0.2;

    if (shouldPersonalize) {
      const personalizedVerse = await getPersonalizedVerse(preferredTranslation);
      if (personalizedVerse) {
        return personalizedVerse;
      }
    }

    // Use curated verse for today
    const curatedVerse = getCuratedVerseForToday();
    const verseText = await fetchVerseText(
      curatedVerse.book_name,
      curatedVerse.chapter,
      curatedVerse.verse,
      preferredTranslation
    );

    if (verseText) {
      return {
        book_name: curatedVerse.book_name,
        chapter_number: curatedVerse.chapter,
        verse_number: curatedVerse.verse,
        verse_text: verseText,
        translation: preferredTranslation,
        reference: `${curatedVerse.book_name} ${curatedVerse.chapter}:${curatedVerse.verse}`,
        theme: curatedVerse.theme,
        source: 'curated',
      };
    }

    // Fallback to old random method if curated verse not found
    console.warn('[fetchVerseOfTheDay] Curated verse not found, using fallback');
    return fetchRandomVerse(preferredTranslation);
  } catch (err) {
    console.error('[fetchVerseOfTheDay] Unexpected error:', err);
    return null;
  }
}

/**
 * Fallback: get a random verse (old method)
 */
async function fetchRandomVerse(preferredTranslation: string = 'KJV'): Promise<VerseOfTheDay | null> {
  try {
    const { count, error: countError } = await supabase
      .from('bible_verses')
      .select('*', { count: 'exact', head: true })
      .eq('translation', preferredTranslation);

    if (countError || !count) {
      console.warn('[fetchRandomVerse] Could not get verse count:', countError);
      return null;
    }

    const today = new Date();
    const dayOfYear = getDayOfYear();
    const year = today.getFullYear();
    const seed = (year * 1000 + dayOfYear) % count;

    const { data, error } = await supabase
      .from('bible_verses')
      .select('book_name, chapter_number, verse_number, verse_text, translation')
      .eq('translation', preferredTranslation)
      .order('book_name', { ascending: true })
      .order('chapter_number', { ascending: true })
      .order('verse_number', { ascending: true })
      .range(seed, seed)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn('[fetchRandomVerse] Error fetching verse:', error);
      return null;
    }

    return {
      book_name: data.book_name,
      chapter_number: data.chapter_number,
      verse_number: data.verse_number,
      verse_text: data.verse_text,
      translation: data.translation,
      reference: `${data.book_name} ${data.chapter_number}:${data.verse_number}`,
      source: 'random',
    };
  } catch (err) {
    console.error('[fetchRandomVerse] Unexpected error:', err);
    return null;
  }
}

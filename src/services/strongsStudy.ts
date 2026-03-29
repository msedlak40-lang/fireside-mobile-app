// src/services/strongsStudy.ts
import { supabase } from '../lib/supabaseClient';

export interface StrongsEntry {
  id: number;
  strongs_number: string;
  language: 'hebrew' | 'greek';
  original_word: string;
  transliteration: string;
  short_definition: string;
  detailed_definition: string | null;
  usage_notes: string | null;
}

export interface VerseWord {
  id: number;
  book_name: string;
  chapter_number: number;
  verse_number: number;
  word_position: number;
  original_word: string;
  transliteration: string;
  english_word: string;
  strongs_number: string;
  grammar_code: string | null;
}

export interface CrossReference {
  id: number;
  source_book: string;
  source_chapter: number;
  source_verse: number;
  target_book: string;
  target_chapter: number;
  target_verse_start: number;
  target_verse_end: number | null;
  votes: number;
}

export interface VerseStudyData {
  words: VerseWord[];
  crossReferences: CrossReference[];
}

/**
 * Get all Strong's-tagged words for a specific verse.
 */
export async function getVerseWords(
  bookName: string,
  chapter: number,
  verse: number,
): Promise<VerseWord[]> {
  const { data, error } = await supabase
    .from('verse_strongs_words')
    .select('*')
    .eq('book_name', bookName)
    .eq('chapter_number', chapter)
    .eq('verse_number', verse)
    .order('word_position', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Look up a Strong's lexicon entry by number.
 */
export async function getStrongsEntry(
  strongsNumber: string,
): Promise<StrongsEntry | null> {
  const { data, error } = await supabase
    .from('strongs_lexicon')
    .select('*')
    .eq('strongs_number', strongsNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Look up multiple Strong's entries at once (for a full verse).
 */
export async function getStrongsEntries(
  strongsNumbers: string[],
): Promise<StrongsEntry[]> {
  if (strongsNumbers.length === 0) return [];

  const unique = [...new Set(strongsNumbers)];
  const { data, error } = await supabase
    .from('strongs_lexicon')
    .select('*')
    .in('strongs_number', unique);

  if (error) throw error;
  return data || [];
}

/**
 * Get cross-references for a specific verse, sorted by relevance (votes).
 */
export async function getCrossReferences(
  bookName: string,
  chapter: number,
  verse: number,
  limit = 10,
): Promise<CrossReference[]> {
  const { data, error } = await supabase
    .from('verse_cross_references')
    .select('*')
    .eq('source_book', bookName)
    .eq('source_chapter', chapter)
    .eq('source_verse', verse)
    .order('votes', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get complete study data for a verse (words + cross-refs).
 */
export async function getVerseStudyData(
  bookName: string,
  chapter: number,
  verse: number,
): Promise<VerseStudyData> {
  const [words, crossReferences] = await Promise.all([
    getVerseWords(bookName, chapter, verse),
    getCrossReferences(bookName, chapter, verse),
  ]);

  return { words, crossReferences };
}

/**
 * Search for Strong's entries by keyword in definition.
 */
export async function searchStrongs(
  query: string,
  language?: 'hebrew' | 'greek',
  limit = 20,
): Promise<StrongsEntry[]> {
  let q = supabase
    .from('strongs_lexicon')
    .select('*')
    .ilike('short_definition', `%${query}%`)
    .limit(limit);

  if (language) {
    q = q.eq('language', language);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/**
 * Find all verses where a specific Strong's number appears.
 */
export async function findVersesByStrongs(
  strongsNumber: string,
  limit = 50,
): Promise<VerseWord[]> {
  const { data, error } = await supabase
    .from('verse_strongs_words')
    .select('*')
    .eq('strongs_number', strongsNumber)
    .order('book_name', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

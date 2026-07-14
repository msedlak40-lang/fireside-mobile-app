// src/services/themeSearch.ts
import { supabase } from '../lib/supabaseClient';
import type { ChapterTheme } from './themes';

export interface ThemeSearchResults {
  themeChapters: ChapterTheme[];
  verseMatches: Array<{
    book_name: string;
    chapter_number: number;
    verse_number: number;
    verse_text: string;
  }>;
}

/**
 * Search chapter_themes by theme name or sub_theme.
 */
export async function searchChaptersByTheme(query: string): Promise<ChapterTheme[]> {
  const { data, error } = await supabase
    .from('chapter_themes')
    .select('*')
    .or(`theme.ilike.%${query}%,sub_theme.ilike.%${query}%`)
    .order('book')
    .order('chapter')
    .limit(50);

  if (error) {
    console.error('[themeSearch] chapter search error:', error);
    return [];
  }
  return data || [];
}

/**
 * Hybrid search: theme-based chapters first, then verse text fallback.
 */
export async function hybridThemeSearch(
  query: string,
  translation: string,
): Promise<ThemeSearchResults> {
  // Run both searches in parallel
  const [themeChapters, verseResult] = await Promise.all([
    searchChaptersByTheme(query),
    supabase
      .from('bible_verses')
      .select('book_name, chapter_number, verse_number, verse_text')
      .ilike('verse_text', `%${query}%`)
      .eq('translation', translation)
      .limit(50),
  ]);

  return {
    themeChapters,
    verseMatches: verseResult.data || [],
  };
}

/**
 * Get chapter counts per core theme (for chip badges).
 */
export async function getThemeChapterCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('chapter_themes')
    .select('theme');

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.theme] = (counts[row.theme] || 0) + 1;
  }
  return counts;
}

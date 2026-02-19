// Theme System Service Layer
// Handles yearly themes, chapter theme applications, and sub-theme discoveries

import { supabase } from '../lib/supabaseClient';

// ============================================
// TYPES
// ============================================

export interface UserYearlyTheme {
  id: string;
  user_id: string;
  year: number;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface UserQuarterlyTheme {
  id: string;
  user_id: string;
  year: number;
  quarter: number;
  theme: string;
  created_at: string;
}

export interface ChapterTheme {
  id: string;
  book: string;
  chapter: number;
  theme: string;
  sub_theme: string | null;
  application: string;
  key_insight: string | null;
  action_step: string | null;
  generated_at: string;
  generation_model: string;
}

export interface ThemeDiscovery {
  id: string;
  user_id: string;
  theme: string;
  sub_theme: string;
  first_encountered_book: string | null;
  first_encountered_chapter: number | null;
  discovered_at: string;
}

export interface ThemeProgress {
  theme: string;
  chapters_read: number;
  insights_collected: number;
  sub_themes_discovered: string[];
}

// ============================================
// CONSTANTS
// ============================================

// Core 5 themes for launch
export const CORE_THEMES = [
  'Courage',
  'Integrity',
  'Purpose',
  'Leadership',
  'Faith',
] as const;

export type CoreTheme = (typeof CORE_THEMES)[number];

// Theme descriptions for UI
export const THEME_DESCRIPTIONS: Record<CoreTheme, string> = {
  Courage:
    'Face fear with boldness. Discover how biblical men found strength to act despite uncertainty.',
  Integrity:
    'Live with consistency. Learn to align your private character with your public witness.',
  Purpose:
    'Find your calling. Explore how God shapes men for specific missions and seasons.',
  Leadership:
    'Serve through influence. Study biblical principles of leading others well.',
  Faith:
    'Trust in the unseen. Deepen your confidence in God through stories of belief tested.',
};

// Theme colors for UI consistency
export const THEME_COLORS: Record<CoreTheme, { primary: string; light: string; dark: string }> = {
  Courage: { primary: '#ef4444', light: '#fee2e2', dark: '#991b1b' },
  Integrity: { primary: '#10b981', light: '#dcfce7', dark: '#065f46' },
  Purpose: { primary: '#8b5cf6', light: '#ede9fe', dark: '#5b21b6' },
  Leadership: { primary: '#f59e0b', light: '#fef3c7', dark: '#92400e' },
  Faith: { primary: '#3b82f6', light: '#dbeafe', dark: '#1e40af' },
};

// ============================================
// YEARLY THEME FUNCTIONS
// ============================================

/**
 * Get user's theme for a specific year
 */
export async function getUserYearlyTheme(
  userId: string,
  year: number = new Date().getFullYear()
): Promise<UserYearlyTheme | null> {
  try {
    const { data, error } = await supabase
      .from('user_yearly_themes')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle();

    if (error) {
      console.error('[Themes] Error fetching yearly theme:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('[Themes] getUserYearlyTheme failed:', err);
    return null;
  }
}

/**
 * Set or update user's theme for a year
 */
export async function setUserYearlyTheme(
  userId: string,
  theme: string,
  year: number = new Date().getFullYear()
): Promise<UserYearlyTheme | null> {
  try {
    const { data, error } = await supabase
      .from('user_yearly_themes')
      .upsert(
        {
          user_id: userId,
          year,
          theme,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,year',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Themes] Error setting yearly theme:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('[Themes] setUserYearlyTheme failed:', err);
    return null;
  }
}

/**
 * Get user's theme history (all years)
 */
export async function getUserThemeHistory(userId: string): Promise<UserYearlyTheme[]> {
  try {
    const { data, error } = await supabase
      .from('user_yearly_themes')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false });

    if (error) {
      console.error('[Themes] Error fetching theme history:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('[Themes] getUserThemeHistory failed:', err);
    return [];
  }
}

// ============================================
// QUARTERLY THEME FUNCTIONS
// ============================================

/**
 * Get user's quarterly theme
 */
export async function getUserQuarterlyTheme(
  userId: string,
  year: number = new Date().getFullYear(),
  quarter: number = Math.ceil((new Date().getMonth() + 1) / 3)
): Promise<UserQuarterlyTheme | null> {
  try {
    const { data, error } = await supabase
      .from('user_quarterly_themes')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('quarter', quarter)
      .maybeSingle();

    if (error) {
      console.error('[Themes] Error fetching quarterly theme:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('[Themes] getUserQuarterlyTheme failed:', err);
    return null;
  }
}

/**
 * Set user's quarterly theme
 */
export async function setUserQuarterlyTheme(
  userId: string,
  theme: string,
  year: number = new Date().getFullYear(),
  quarter: number = Math.ceil((new Date().getMonth() + 1) / 3)
): Promise<UserQuarterlyTheme | null> {
  try {
    const { data, error } = await supabase
      .from('user_quarterly_themes')
      .upsert(
        {
          user_id: userId,
          year,
          quarter,
          theme,
        },
        {
          onConflict: 'user_id,year,quarter',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Themes] Error setting quarterly theme:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('[Themes] setUserQuarterlyTheme failed:', err);
    return null;
  }
}

// ============================================
// CHAPTER THEME FUNCTIONS
// ============================================

/**
 * Get theme application for a specific chapter
 * Returns null if not yet generated
 */
export async function getChapterTheme(
  book: string,
  chapter: number,
  theme: string
): Promise<ChapterTheme | null> {
  try {
    const { data, error } = await supabase
      .from('chapter_themes')
      .select('*')
      .eq('book', book)
      .eq('chapter', chapter)
      .eq('theme', theme)
      .maybeSingle();

    if (error) {
      console.error('[Themes] Error fetching chapter theme:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('[Themes] getChapterTheme failed:', err);
    return null;
  }
}

/**
 * Get all theme applications for a chapter (all themes)
 */
export async function getAllChapterThemes(book: string, chapter: number): Promise<ChapterTheme[]> {
  try {
    const { data, error } = await supabase
      .from('chapter_themes')
      .select('*')
      .eq('book', book)
      .eq('chapter', chapter)
      .order('theme');

    if (error) {
      console.error('[Themes] Error fetching all chapter themes:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('[Themes] getAllChapterThemes failed:', err);
    return [];
  }
}

/**
 * Get chapters that have a specific theme application
 */
export async function getChaptersWithTheme(
  theme: string,
  limit: number = 50
): Promise<ChapterTheme[]> {
  try {
    const { data, error } = await supabase
      .from('chapter_themes')
      .select('*')
      .eq('theme', theme)
      .order('book')
      .order('chapter')
      .limit(limit);

    if (error) {
      console.error('[Themes] Error fetching chapters with theme:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('[Themes] getChaptersWithTheme failed:', err);
    return [];
  }
}

// ============================================
// THEME DISCOVERY FUNCTIONS
// ============================================

/**
 * Get all sub-themes user has discovered for a theme
 */
export async function getUserThemeDiscoveries(
  userId: string,
  theme: string
): Promise<ThemeDiscovery[]> {
  try {
    const { data, error } = await supabase
      .from('user_theme_discoveries')
      .select('*')
      .eq('user_id', userId)
      .eq('theme', theme)
      .order('discovered_at', { ascending: false });

    if (error) {
      console.error('[Themes] Error fetching theme discoveries:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('[Themes] getUserThemeDiscoveries failed:', err);
    return [];
  }
}

/**
 * Get all discoveries for a user (all themes)
 */
export async function getAllUserDiscoveries(userId: string): Promise<ThemeDiscovery[]> {
  try {
    const { data, error } = await supabase
      .from('user_theme_discoveries')
      .select('*')
      .eq('user_id', userId)
      .order('discovered_at', { ascending: false });

    if (error) {
      console.error('[Themes] Error fetching all discoveries:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('[Themes] getAllUserDiscoveries failed:', err);
    return [];
  }
}

/**
 * Record a new sub-theme discovery
 * Idempotent - won't error if already exists
 */
export async function recordThemeDiscovery(
  userId: string,
  theme: string,
  subTheme: string,
  book: string,
  chapter: number
): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_theme_discoveries').upsert(
      {
        user_id: userId,
        theme,
        sub_theme: subTheme,
        first_encountered_book: book,
        first_encountered_chapter: chapter,
        discovered_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,theme,sub_theme',
        ignoreDuplicates: true,
      }
    );

    if (error) {
      console.error('[Themes] Error recording theme discovery:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Themes] recordThemeDiscovery failed:', err);
    return false;
  }
}

/**
 * Get count of discoveries per theme for a user
 */
export async function getDiscoveryCountsByTheme(
  userId: string
): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('user_theme_discoveries')
      .select('theme')
      .eq('user_id', userId);

    if (error) {
      console.error('[Themes] Error counting discoveries:', error);
      throw error;
    }

    const counts: Record<string, number> = {};
    (data || []).forEach((d) => {
      counts[d.theme] = (counts[d.theme] || 0) + 1;
    });

    return counts;
  } catch (err) {
    console.error('[Themes] getDiscoveryCountsByTheme failed:', err);
    return {};
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get list of available themes
 */
export function getAvailableThemes(): readonly string[] {
  return CORE_THEMES;
}

/**
 * Check if a theme is valid
 */
export function isValidTheme(theme: string): theme is CoreTheme {
  return CORE_THEMES.includes(theme as CoreTheme);
}

/**
 * Get theme description
 */
export function getThemeDescription(theme: string): string {
  if (isValidTheme(theme)) {
    return THEME_DESCRIPTIONS[theme];
  }
  return '';
}

/**
 * Get theme colors
 */
export function getThemeColors(
  theme: string
): { primary: string; light: string; dark: string } | null {
  if (isValidTheme(theme)) {
    return THEME_COLORS[theme];
  }
  return null;
}

/**
 * Get current quarter (1-4)
 */
export function getCurrentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

/**
 * Get user's active theme (yearly or quarterly if set)
 * Quarterly overrides yearly if present
 */
export async function getUserActiveTheme(userId: string): Promise<string | null> {
  const year = new Date().getFullYear();
  const quarter = getCurrentQuarter();

  // Check quarterly first
  const quarterly = await getUserQuarterlyTheme(userId, year, quarter);
  if (quarterly?.theme) {
    return quarterly.theme;
  }

  // Fall back to yearly
  const yearly = await getUserYearlyTheme(userId, year);
  return yearly?.theme || null;
}

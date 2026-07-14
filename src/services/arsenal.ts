// Arsenal Service Layer
// Handles saving, retrieving, and managing user's saved theme applications

import { supabase } from '../lib/supabaseClient';

// ============================================
// TYPES
// ============================================

export interface SavedApplication {
  id: string;
  user_id: string;
  chapter_theme_id: string;
  book: string;
  chapter: number;
  theme_tag: string;
  sub_theme_tag: string | null;
  character_tag: string | null;
  user_note: string | null;
  is_favorite: boolean;
  shared_with_fire: boolean;
  fire_id: string | null;
  saved_at: string;
  updated_at: string;

  // Joined from chapter_themes
  application?: string;
  key_insight?: string;
  action_step?: string;
}

export interface SaveApplicationParams {
  userId: string;
  chapterThemeId: string;
  book: string;
  chapter: number;
  themeTag: string;
  subThemeTag?: string | null;
  characterTag?: string | null;
  userNote?: string | null;
}

export interface UpdateSavedApplicationParams {
  savedAppId: string;
  userNote?: string | null;
  subThemeTag?: string | null;
  characterTag?: string | null;
  isFavorite?: boolean;
}

export interface ArsenalFilters {
  themeTag?: string;
  subThemeTag?: string;
  characterTag?: string;
  favoritesOnly?: boolean;
}

export interface ArsenalStats {
  totalSaved: number;
  favoriteCount: number;
  themeBreakdown: { theme: string; count: number }[];
  subThemeBreakdown: { subTheme: string; count: number }[];
  recentlySaved: SavedApplication[];
}

// ============================================
// SAVE APPLICATION
// ============================================

/**
 * Save a chapter theme application to user's Arsenal
 */
export async function saveApplication(
  params: SaveApplicationParams
): Promise<SavedApplication> {
  const { data, error } = await supabase
    .from('user_saved_applications')
    .insert({
      user_id: params.userId,
      chapter_theme_id: params.chapterThemeId,
      book: params.book,
      chapter: params.chapter,
      theme_tag: params.themeTag,
      sub_theme_tag: params.subThemeTag || null,
      character_tag: params.characterTag || null,
      user_note: params.userNote || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[Arsenal] Error saving application:', error);
    throw error;
  }

  return data;
}

// ============================================
// CHECK IF SAVED
// ============================================

/**
 * Check if a chapter theme is already saved
 */
export async function isApplicationSaved(
  userId: string,
  chapterThemeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_saved_applications')
    .select('id')
    .eq('user_id', userId)
    .eq('chapter_theme_id', chapterThemeId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[Arsenal] Error checking if saved:', error);
    throw error;
  }

  return !!data;
}

/**
 * Get saved application ID if it exists
 */
export async function getSavedApplicationId(
  userId: string,
  chapterThemeId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_saved_applications')
    .select('id')
    .eq('user_id', userId)
    .eq('chapter_theme_id', chapterThemeId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[Arsenal] Error getting saved app ID:', error);
    throw error;
  }

  return data?.id || null;
}

// ============================================
// GET SAVED APPLICATIONS
// ============================================

/**
 * Get all saved applications for a user with optional filters
 */
export async function getSavedApplications(
  userId: string,
  filters?: ArsenalFilters
): Promise<SavedApplication[]> {
  let query = supabase
    .from('user_saved_applications')
    .select(`
      *,
      chapter_themes (
        application,
        key_insight,
        action_step
      )
    `)
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (filters?.themeTag) {
    query = query.eq('theme_tag', filters.themeTag);
  }

  if (filters?.subThemeTag) {
    query = query.eq('sub_theme_tag', filters.subThemeTag);
  }

  if (filters?.characterTag) {
    query = query.eq('character_tag', filters.characterTag);
  }

  if (filters?.favoritesOnly) {
    query = query.eq('is_favorite', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Arsenal] Error fetching saved applications:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    ...item,
    application: item.chapter_themes?.application,
    key_insight: item.chapter_themes?.key_insight,
    action_step: item.chapter_themes?.action_step,
  }));
}

/**
 * Get a single saved application by ID
 */
export async function getSavedApplication(
  savedAppId: string
): Promise<SavedApplication | null> {
  const { data, error } = await supabase
    .from('user_saved_applications')
    .select(`
      *,
      chapter_themes (
        application,
        key_insight,
        action_step
      )
    `)
    .eq('id', savedAppId)
    .maybeSingle();

  if (error) {
    console.error('[Arsenal] Error fetching saved application:', error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    application: (data as any).chapter_themes?.application,
    key_insight: (data as any).chapter_themes?.key_insight,
    action_step: (data as any).chapter_themes?.action_step,
  };
}

// ============================================
// UPDATE SAVED APPLICATION
// ============================================

/**
 * Update a saved application
 */
export async function updateSavedApplication(
  params: UpdateSavedApplicationParams
): Promise<SavedApplication> {
  const updates: Record<string, any> = {};

  if (params.userNote !== undefined) {
    updates.user_note = params.userNote;
  }

  if (params.subThemeTag !== undefined) {
    updates.sub_theme_tag = params.subThemeTag;
  }

  if (params.characterTag !== undefined) {
    updates.character_tag = params.characterTag;
  }

  if (params.isFavorite !== undefined) {
    updates.is_favorite = params.isFavorite;
  }

  const { data, error } = await supabase
    .from('user_saved_applications')
    .update(updates)
    .eq('id', params.savedAppId)
    .select()
    .single();

  if (error) {
    console.error('[Arsenal] Error updating saved application:', error);
    throw error;
  }

  return data;
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(
  savedAppId: string,
  currentFavoriteStatus: boolean
): Promise<SavedApplication> {
  return updateSavedApplication({
    savedAppId,
    isFavorite: !currentFavoriteStatus,
  });
}

// ============================================
// DELETE SAVED APPLICATION
// ============================================

/**
 * Delete a saved application
 */
export async function deleteSavedApplication(
  savedAppId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_saved_applications')
    .delete()
    .eq('id', savedAppId);

  if (error) {
    console.error('[Arsenal] Error deleting saved application:', error);
    throw error;
  }
}

// ============================================
// ARSENAL STATISTICS
// ============================================

/**
 * Get Arsenal statistics for a user
 */
export async function getArsenalStats(
  userId: string
): Promise<ArsenalStats> {
  const { data: allSaved, error } = await supabase
    .from('user_saved_applications')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (error) {
    console.error('[Arsenal] Error fetching arsenal stats:', error);
    throw error;
  }

  const saved = allSaved || [];

  // Theme breakdown
  const themeCount = new Map<string, number>();
  saved.forEach((app: any) => {
    themeCount.set(app.theme_tag, (themeCount.get(app.theme_tag) || 0) + 1);
  });

  const themeBreakdown = Array.from(themeCount.entries())
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count);

  // Sub-theme breakdown
  const subThemeCount = new Map<string, number>();
  saved.forEach((app: any) => {
    if (app.sub_theme_tag) {
      subThemeCount.set(
        app.sub_theme_tag,
        (subThemeCount.get(app.sub_theme_tag) || 0) + 1
      );
    }
  });

  const subThemeBreakdown = Array.from(subThemeCount.entries())
    .map(([subTheme, count]) => ({ subTheme, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalSaved: saved.length,
    favoriteCount: saved.filter((app: any) => app.is_favorite).length,
    themeBreakdown,
    subThemeBreakdown,
    recentlySaved: saved.slice(0, 5),
  };
}

/**
 * Get unique sub-themes for a theme
 */
export async function getSubThemesForTheme(
  userId: string,
  themeTag: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_saved_applications')
    .select('sub_theme_tag')
    .eq('user_id', userId)
    .eq('theme_tag', themeTag)
    .not('sub_theme_tag', 'is', null);

  if (error) {
    console.error('[Arsenal] Error fetching sub-themes:', error);
    throw error;
  }

  const subThemes = new Set<string>();
  (data || []).forEach((item: any) => {
    if (item.sub_theme_tag) {
      subThemes.add(item.sub_theme_tag);
    }
  });

  return Array.from(subThemes).sort();
}

/**
 * Get unique characters from saved applications
 */
export async function getCharactersFromArsenal(
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_saved_applications')
    .select('character_tag')
    .eq('user_id', userId)
    .not('character_tag', 'is', null);

  if (error) {
    console.error('[Arsenal] Error fetching characters:', error);
    throw error;
  }

  const characters = new Set<string>();
  (data || []).forEach((item: any) => {
    if (item.character_tag) {
      characters.add(item.character_tag);
    }
  });

  return Array.from(characters).sort();
}

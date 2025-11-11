// Armor of God Service Layer
import { supabase } from '../lib/supabaseClient';
import type {
  ArmorPiece,
  UserBattle,
  UserWeeklyReflection,
  UserBattleVerse,
  BattleVerseResult,
  BattleTag,
} from '../types/armor';

/**
 * Get the current week number and year
 */
export function getCurrentWeekAndYear(): { week: number; year: number } {
  const now = new Date();
  const year = now.getFullYear();

  // Get week number (ISO week)
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
  const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

  return { week, year };
}

/**
 * Get the current armor piece based on week rotation (1-6)
 */
export async function getCurrentArmorPiece(): Promise<ArmorPiece | null> {
  try {
    const { week } = getCurrentWeekAndYear();

    // Rotate through 6 armor pieces
    const weekOrder = ((week - 1) % 6) + 1;

    const { data, error } = await supabase
      .from('armor_pieces')
      .select('*')
      .eq('week_order', weekOrder)
      .single();

    if (error) {
      console.error('[Armor] Get current armor piece error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[Armor] Get current armor piece failed:', err);
    return null;
  }
}

/**
 * Get all armor pieces
 */
export async function getAllArmorPieces(): Promise<ArmorPiece[]> {
  try {
    const { data, error } = await supabase
      .from('armor_pieces')
      .select('*')
      .order('week_order', { ascending: true });

    if (error) {
      console.error('[Armor] Get all armor pieces error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[Armor] Get all armor pieces failed:', err);
    return [];
  }
}

/**
 * Get user's active battle for the current week
 */
export async function getActiveBattle(userId: string): Promise<UserBattle | null> {
  try {
    const { week, year } = getCurrentWeekAndYear();

    const { data, error } = await supabase
      .from('user_battles')
      .select('*')
      .eq('user_id', userId)
      .eq('week_number', week)
      .eq('year', year)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[Armor] Get active battle error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[Armor] Get active battle failed:', err);
    return null;
  }
}

/**
 * Create a new battle for the current week
 */
export async function createBattle(
  userId: string,
  battleText: string,
  battleTag: BattleTag,
  verse?: {
    book_name: string;
    chapter_number: number;
    verse_number: number;
    verse_reference: string;
    verse_text: string;
  }
): Promise<UserBattle | null> {
  try {
    const { week, year } = getCurrentWeekAndYear();
    const armorPiece = await getCurrentArmorPiece();

    // Deactivate any existing battles for this week
    await supabase
      .from('user_battles')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('week_number', week)
      .eq('year', year);

    const { data, error } = await supabase
      .from('user_battles')
      .insert({
        user_id: userId,
        week_number: week,
        year,
        battle_text: battleText,
        battle_tag: battleTag,
        armor_piece_id: armorPiece?.id || null,
        is_active: true,
        verse_book: verse?.book_name || null,
        verse_chapter: verse?.chapter_number || null,
        verse_number: verse?.verse_number || null,
        verse_reference: verse?.verse_reference || null,
        verse_text: verse?.verse_text || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Armor] Create battle error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[Armor] Create battle failed:', err);
    return null;
  }
}

/**
 * Get a battle verse for a specific tag using RPC function
 */
export async function getBattleVerse(
  battleTag: BattleTag,
  userId: string,
  translation: string = 'KJV'
): Promise<BattleVerseResult | null> {
  try {
    const { data, error } = await supabase.rpc('get_battle_verse_for_tag', {
      p_battle_tag: battleTag,
      p_user_id: userId,
      p_translation: translation,
    });

    if (error) {
      console.error('[Armor] Get battle verse error:', error);
      return null;
    }

    // RPC returns an array, get first result
    return data?.[0] || null;
  } catch (err) {
    console.error('[Armor] Get battle verse failed:', err);
    return null;
  }
}

/**
 * Save a verse to user's battle verses collection
 */
export async function saveBattleVerse(
  userId: string,
  bookName: string,
  chapterNumber: number,
  verseNumber: number,
  verseReference: string,
  verseText: string,
  battleTag?: BattleTag,
  notes?: string
): Promise<UserBattleVerse | null> {
  try {
    const { data, error } = await supabase
      .from('user_battle_verses')
      .insert({
        user_id: userId,
        book_name: bookName,
        chapter_number: chapterNumber,
        verse_number: verseNumber,
        verse_reference: verseReference,
        verse_text: verseText,
        battle_tag: battleTag || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate (unique constraint violation)
      if (error.code === '23505') {
        console.log('[Armor] Battle verse already saved');
        return null;
      }
      console.error('[Armor] Save battle verse error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[Armor] Save battle verse failed:', err);
    return null;
  }
}

/**
 * Get all user's saved battle verses
 */
export async function getUserBattleVerses(userId: string): Promise<UserBattleVerse[]> {
  try {
    const { data, error } = await supabase
      .from('user_battle_verses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Armor] Get user battle verses error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[Armor] Get user battle verses failed:', err);
    return [];
  }
}

/**
 * Delete a saved battle verse
 */
export async function deleteBattleVerse(verseId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_battle_verses')
      .delete()
      .eq('id', verseId);

    if (error) {
      console.error('[Armor] Delete battle verse error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Armor] Delete battle verse failed:', err);
    return false;
  }
}

/**
 * Create a reflection for the current battle
 */
export async function createReflection(
  userId: string,
  battleId: string,
  reflectionText: string,
  reflectionType: 'daily' | 'midweek' | 'victory',
  dayOfWeek?: number
): Promise<UserWeeklyReflection | null> {
  try {
    const { week, year } = getCurrentWeekAndYear();
    const armorPiece = await getCurrentArmorPiece();

    const { data, error } = await supabase
      .from('user_weekly_reflections')
      .insert({
        user_id: userId,
        battle_id: battleId,
        armor_piece_id: armorPiece?.id || null,
        week_number: week,
        year,
        day_of_week: dayOfWeek || null,
        reflection_text: reflectionText,
        reflection_type: reflectionType,
      })
      .select()
      .single();

    if (error) {
      console.error('[Armor] Create reflection error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[Armor] Create reflection failed:', err);
    return null;
  }
}

/**
 * Get reflections for a specific battle
 */
export async function getBattleReflections(battleId: string): Promise<UserWeeklyReflection[]> {
  try {
    const { data, error } = await supabase
      .from('user_weekly_reflections')
      .select('*')
      .eq('battle_id', battleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Armor] Get battle reflections error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[Armor] Get battle reflections failed:', err);
    return [];
  }
}

/**
 * Get user's battle history
 */
export async function getBattleHistory(
  userId: string,
  limit: number = 10
): Promise<UserBattle[]> {
  try {
    const { data, error } = await supabase
      .from('user_battles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Armor] Get battle history error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[Armor] Get battle history failed:', err);
    return [];
  }
}

/**
 * Complete current battle and mark as inactive
 */
export async function completeBattle(battleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_battles')
      .update({ is_active: false })
      .eq('id', battleId);

    if (error) {
      console.error('[Armor] Complete battle error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Armor] Complete battle failed:', err);
    return false;
  }
}

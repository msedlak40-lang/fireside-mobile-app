// src/services/devotionInteractions.ts
import { supabase } from '../lib/supabaseClient';

export interface DevotionInteraction {
  id: string;
  user_id: string;
  devotion_id: number;
  is_starred: boolean;
  starred_at: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

/**
 * Get the interaction record for a devotion (or null if none)
 */
export async function getDevotionInteraction(
  devotionId: number,
): Promise<DevotionInteraction | null> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('user_devotion_interactions')
    .select('*')
    .eq('user_id', userId)
    .eq('devotion_id', devotionId)
    .maybeSingle();
  if (error) {
    console.error('[DevotionInteractions] get error:', error);
    return null;
  }
  return data;
}

/**
 * Toggle the star on a devotion. Returns the new is_starred value.
 */
export async function toggleDevotionStar(devotionId: number): Promise<boolean> {
  const userId = await getUserId();
  const existing = await getDevotionInteraction(devotionId);

  if (existing) {
    const newStarred = !existing.is_starred;
    const { error } = await supabase
      .from('user_devotion_interactions')
      .update({
        is_starred: newStarred,
        starred_at: newStarred ? new Date().toISOString() : null,
      })
      .eq('id', existing.id);
    if (error) throw error;
    return newStarred;
  } else {
    const { error } = await supabase
      .from('user_devotion_interactions')
      .insert({
        user_id: userId,
        devotion_id: devotionId,
        is_starred: true,
        starred_at: new Date().toISOString(),
        is_read: false,
      });
    if (error) throw error;
    return true;
  }
}

/**
 * Mark a devotion as read (idempotent).
 */
export async function markDevotionRead(devotionId: number): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('user_devotion_interactions')
    .upsert(
      {
        user_id: userId,
        devotion_id: devotionId,
        is_read: true,
        read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,devotion_id' },
    );
  if (error) console.error('[DevotionInteractions] markRead error:', error);
}

/**
 * Get starred devotions (with full devotion data).
 */
export async function getStarredDevotions(): Promise<any[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('user_devotion_interactions')
    .select('devotion_id, starred_at, daily_devotions(*)')
    .eq('user_id', userId)
    .eq('is_starred', true)
    .order('starred_at', { ascending: false });

  if (error) {
    console.error('[DevotionInteractions] getStarred error:', error);
    return [];
  }
  // Flatten: return devotion objects with starred_at attached
  return (data || [])
    .filter(d => d.daily_devotions)
    .map(d => ({
      ...d.daily_devotions,
      _starred_at: d.starred_at,
    }));
}

/**
 * Get starred devotion IDs for quick lookup (used in list views).
 */
export async function getStarredDevotionIds(): Promise<Set<number>> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('user_devotion_interactions')
    .select('devotion_id')
    .eq('user_id', userId)
    .eq('is_starred', true);

  if (error) {
    console.error('[DevotionInteractions] getStarredIds error:', error);
    return new Set();
  }
  return new Set((data || []).map(d => d.devotion_id));
}

// src/services/devotionHighlights.ts
import { supabase } from '../lib/supabaseClient';

export interface DevotionHighlight {
  id: string;
  user_id: string;
  devotion_id: number;
  start_pos: number;
  length: number;
  selected_text: string;
  color: string;
  created_at: string;
}

/**
 * Save devotion highlight with positional tracking.
 */
export async function saveDevotionHighlight(
  devotionId: number,
  startPos: number,
  length: number,
  selectedText: string,
  color: string = 'yellow',
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('daily_devotion_highlights')
    .insert({
      user_id: session.user.id,
      devotion_id: devotionId,
      start_pos: startPos,
      length,
      selected_text: selectedText,
      color,
    });

  if (error) throw error;
}

/**
 * Get highlights for a specific devotion.
 */
export async function getDevotionHighlights(devotionId: number): Promise<DevotionHighlight[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('daily_devotion_highlights')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('devotion_id', devotionId)
    .order('start_pos', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get all user's devotion highlights.
 */
export async function getAllDevotionHighlights(): Promise<DevotionHighlight[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('daily_devotion_highlights')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Delete a highlight by ID.
 */
export async function deleteDevotionHighlight(highlightId: string): Promise<void> {
  const { error } = await supabase
    .from('daily_devotion_highlights')
    .delete()
    .eq('id', highlightId);

  if (error) throw error;
}

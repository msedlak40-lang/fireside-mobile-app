// src/services/battleVerses.ts
import { supabase } from '../lib/supabaseClient';

export interface BattleVerse {
  id: string;
  user_id: string;
  book_name: string;
  chapter_number: number;
  verse_number: number;
  verse_reference: string;
  verse_text: string;
  notes: string | null;
  battle_tag: string | null;
  is_favorite: boolean;
  created_at: string;
}

export const BATTLE_TAGS = [
  'fear',
  'anger',
  'temptation',
  'doubt',
  'loneliness',
  'identity',
  'purpose',
  'general',
] as const;

export type BattleTag = (typeof BATTLE_TAGS)[number];

/**
 * Save verse to battle verses. Returns true if saved, false if duplicate.
 */
export async function saveBattleVerse(
  bookName: string,
  chapterNumber: number,
  verseNumber: number,
  verseText: string,
  battleTag?: string,
  notes?: string,
): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_battle_verses')
    .insert({
      user_id: session.user.id,
      book_name: bookName,
      chapter_number: chapterNumber,
      verse_number: verseNumber,
      verse_reference: `${bookName} ${chapterNumber}:${verseNumber}`,
      verse_text: verseText,
      battle_tag: battleTag || null,
      notes: notes || null,
    });

  if (error) {
    if (error.code === '23505') return false; // duplicate
    throw error;
  }
  return true;
}

/**
 * Get all user's battle verses, optionally filtered by tag.
 */
export async function getUserBattleVerses(tag?: string): Promise<BattleVerse[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  let query = supabase
    .from('user_battle_verses')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (tag) {
    query = query.eq('battle_tag', tag);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Delete a battle verse.
 */
export async function deleteBattleVerse(verseId: string): Promise<void> {
  const { error } = await supabase
    .from('user_battle_verses')
    .delete()
    .eq('id', verseId);

  if (error) throw error;
}

/**
 * Update battle verse tag.
 */
export async function updateBattleVerseTag(verseId: string, tag: string): Promise<void> {
  const { error } = await supabase
    .from('user_battle_verses')
    .update({ battle_tag: tag })
    .eq('id', verseId);

  if (error) throw error;
}

/**
 * Save multiple verses to battle verses at once. Returns count of newly saved.
 */
export async function saveBattleVersesBatch(
  verses: Array<{
    book_name: string;
    chapter_number: number;
    verse_number: number;
    verse_text: string;
  }>,
  battleTag?: string,
): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const rows = verses.map(v => ({
    user_id: session.user.id,
    book_name: v.book_name,
    chapter_number: v.chapter_number,
    verse_number: v.verse_number,
    verse_reference: `${v.book_name} ${v.chapter_number}:${v.verse_number}`,
    verse_text: v.verse_text,
    battle_tag: battleTag || null,
    notes: null,
  }));

  const { data, error } = await supabase
    .from('user_battle_verses')
    .upsert(rows, {
      onConflict: 'user_id,book_name,chapter_number,verse_number',
      ignoreDuplicates: true,
    })
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * Toggle favorite status.
 */
export async function toggleBattleVerseFavorite(verseId: string): Promise<void> {
  const { data } = await supabase
    .from('user_battle_verses')
    .select('is_favorite')
    .eq('id', verseId)
    .single();

  if (data) {
    await supabase
      .from('user_battle_verses')
      .update({ is_favorite: !data.is_favorite })
      .eq('id', verseId);
  }
}

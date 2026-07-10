// src/services/verseReviewQueue.ts
import { supabase } from '../lib/supabaseClient';

export interface ReviewQueueVerse {
  id: string;
  user_id: string;
  book_name: string;
  chapter_number: number;
  verse_number: number;
  verse_reference: string;
  verse_text: string;
  personal_notes: string | null;
  is_studied: boolean;
  studied_at: string | null;
  created_at: string;
}

/**
 * Add a verse to the user's review queue. Returns true if added, false if already exists.
 */
export async function addToReviewQueue(
  bookName: string,
  chapterNumber: number,
  verseNumber: number,
  verseText: string,
): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_verse_review_queue')
    .insert({
      user_id: session.user.id,
      book_name: bookName,
      chapter_number: chapterNumber,
      verse_number: verseNumber,
      verse_reference: `${bookName} ${chapterNumber}:${verseNumber}`,
      verse_text: verseText,
    });

  if (error) {
    if (error.code === '23505') return false; // duplicate
    throw error;
  }
  return true;
}

/**
 * Get the user's review queue, optionally filtered by studied status.
 */
export async function getReviewQueue(
  studiedFilter?: boolean,
): Promise<ReviewQueueVerse[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  let query = supabase
    .from('user_verse_review_queue')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (studiedFilter !== undefined) {
    query = query.eq('is_studied', studiedFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get count of unstudied verses in the queue.
 */
export async function getUnstudiedCount(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return 0;

  const { count, error } = await supabase
    .from('user_verse_review_queue')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_studied', false);

  if (error) return 0;
  return count || 0;
}

/**
 * Mark a verse as studied.
 */
export async function markAsStudied(verseId: string): Promise<void> {
  const { error } = await supabase
    .from('user_verse_review_queue')
    .update({
      is_studied: true,
      studied_at: new Date().toISOString(),
    })
    .eq('id', verseId);

  if (error) throw error;
}

/**
 * Mark a verse as unstudied (move back to queue).
 */
export async function markAsUnstudied(verseId: string): Promise<void> {
  const { error } = await supabase
    .from('user_verse_review_queue')
    .update({
      is_studied: false,
      studied_at: null,
    })
    .eq('id', verseId);

  if (error) throw error;
}

/**
 * Update personal notes for a queued verse.
 */
export async function updateVerseNotes(
  verseId: string,
  notes: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_verse_review_queue')
    .update({ personal_notes: notes })
    .eq('id', verseId);

  if (error) throw error;
}

/**
 * Remove a verse from the review queue.
 */
export async function removeFromQueue(verseId: string): Promise<void> {
  const { error } = await supabase
    .from('user_verse_review_queue')
    .delete()
    .eq('id', verseId);

  if (error) throw error;
}

/**
 * Check if a specific verse is already in the queue.
 */
export async function isVerseInQueue(
  bookName: string,
  chapterNumber: number,
  verseNumber: number,
): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;

  const { data } = await supabase
    .from('user_verse_review_queue')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('book_name', bookName)
    .eq('chapter_number', chapterNumber)
    .eq('verse_number', verseNumber)
    .maybeSingle();

  return !!data;
}

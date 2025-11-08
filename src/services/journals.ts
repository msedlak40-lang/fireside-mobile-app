// src/services/journals.ts
import { supabase } from '../lib/supabaseClient'

/** ------------ Types ------------ */
export type JournalEntry = {
  id: string
  user_id: string
  book_name: string | null
  chapter_number: number | null
  verse_reference: string | null
  devotion_id: number | null
  character_id: number | null
  title: string | null
  prompt_used: string | null
  digital_notes: string | null
  photo_url: string | null
  photo_thumbnail_url: string | null
  journal_date: string
  tags: string[] | null
  mood: string | null
  is_private: boolean
  word_count: number | null
  time_spent_minutes: number | null
  created_at: string
  updated_at: string
}

export type JournalPrompt = {
  id: number
  category: string
  prompt_text: string
  context: string | null
  tags: string[] | null
  difficulty_level: string
}

/** ------------ Functions ------------ */

/**
 * Get a random journal prompt
 */
export async function fetchJournalPrompt(
  context: string = 'general',
  difficulty: string = 'basic'
): Promise<JournalPrompt | null> {
  const { data, error } = await supabase
    .rpc('rpc_get_journal_prompt', {
      p_context: context,
      p_difficulty: difficulty
    })
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as JournalPrompt | null
}

/**
 * Create a new journal entry
 */
export async function createJournalEntry(params: {
  title?: string
  promptUsed?: string
  digitalNotes?: string
  photoUrl?: string
  photoThumbnailUrl?: string
  bookName?: string
  chapterNumber?: number
  verseReference?: string
  devotionId?: number
  characterId?: number
  tags?: string[]
  mood?: string
  journalDate?: string
  timeSpentMinutes?: number
}): Promise<JournalEntry> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('journals')
    .insert({
      user_id: user.id,
      title: params.title || null,
      prompt_used: params.promptUsed || null,
      digital_notes: params.digitalNotes || null,
      photo_url: params.photoUrl || null,
      photo_thumbnail_url: params.photoThumbnailUrl || null,
      book_name: params.bookName || null,
      chapter_number: params.chapterNumber || null,
      verse_reference: params.verseReference || null,
      devotion_id: params.devotionId || null,
      character_id: params.characterId || null,
      tags: params.tags || null,
      mood: params.mood || null,
      journal_date: params.journalDate || new Date().toISOString().split('T')[0],
      time_spent_minutes: params.timeSpentMinutes || null,
      is_private: true
    })
    .select()
    .single()

  if (error) throw error
  
  // Update streak when journal entry is created
  await supabase.rpc('update_user_streak', { p_user_id: user.id })
  
  return data as JournalEntry
}

/**
 * Upload journal photo to Supabase Storage
 */
export async function uploadJournalPhoto(
  file: File | Blob,
  journalId: string
): Promise<{ url: string; thumbnailUrl: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const fileExt = 'jpg'
  const fileName = `${user.id}/${journalId}.${fileExt}`
  const thumbnailName = `${user.id}/${journalId}_thumb.${fileExt}`

  // Upload original
  const { error: uploadError } = await supabase.storage
    .from('journal-photos')
    .upload(fileName, file, { upsert: true })

  if (uploadError) throw uploadError

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('journal-photos')
    .getPublicUrl(fileName)

  // TODO: Generate thumbnail (you may want to use a service or do client-side resizing)
  const { data: thumbUrlData } = supabase.storage
    .from('journal-photos')
    .getPublicUrl(thumbnailName)

  return {
    url: urlData.publicUrl,
    thumbnailUrl: thumbUrlData.publicUrl
  }
}

/**
 * List user's journal entries
 */
export async function fetchJournalEntries(params?: {
  limit?: number
  offset?: number
  bookName?: string
  tags?: string[]
}): Promise<JournalEntry[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('journals')
    .select('*')
    .eq('user_id', user.id)
    .order('journal_date', { ascending: false })

  if (params?.bookName) {
    query = query.eq('book_name', params.bookName)
  }

  if (params?.tags && params.tags.length > 0) {
    query = query.contains('tags', params.tags)
  }

  if (params?.limit) {
    query = query.limit(params.limit)
  }

  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []) as JournalEntry[]
}

/**
 * Get a single journal entry
 */
export async function fetchJournalEntry(id: string): Promise<JournalEntry | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('journals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as JournalEntry | null
}

/**
 * Update a journal entry
 */
export async function updateJournalEntry(
  id: string,
  updates: Partial<Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('journals')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntry(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Delete associated photos from storage
  const entry = await fetchJournalEntry(id)
  if (entry?.photo_url) {
    const fileName = entry.photo_url.split('/').pop()
    if (fileName) {
      await supabase.storage
        .from('journal-photos')
        .remove([`${user.id}/${fileName}`])
    }
  }

  const { error } = await supabase
    .from('journals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}
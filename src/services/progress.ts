// src/services/progress.ts
import { supabase } from '../lib/supabaseClient'

function isInt(v: any): v is number {
  return Number.isInteger(v) && Number.isFinite(v)
}

export type UserDashboard = {
  chapters: { total_read: number; total_available: number; percentage: number }
  devotions: { total_completed: number }
  characters: { total_studied: number; total_available: number }
  streak: { current: number; longest: number; last_read_date: string | null }
}
async function _writeChapterCompletion(book_name: string, chapter_number: number) {
  const { data: auth } = await supabase.auth.getUser()
  const user_id = auth?.user?.id
  if (!user_id) throw new Error('Not signed in')
  const nowIso = new Date().toISOString()

  const { data: existing, error: selErr } = await supabase
    .from('user_reading_progress')
    .select('user_id')
    .eq('user_id', user_id).eq('book_name', book_name).eq('chapter_number', chapter_number)
    .limit(1)
  if (selErr) throw selErr

  if (existing?.length) {
    const { error: updErr } = await supabase
      .from('user_reading_progress')
      .update({ completed_at: nowIso })
      .eq('user_id', user_id).eq('book_name', book_name).eq('chapter_number', chapter_number)
    if (updErr) throw updErr
  } else {
    const { error: insErr } = await supabase
      .from('user_reading_progress')
      .insert([{ user_id, book_name, chapter_number, completed_at: nowIso }])
    if (insErr) throw insErr
  }
}

/** INTERNAL: write summary completion by composite keys */
async function _writeSummaryCompletion(book_name: string, chapter_number: number, study_tier: 'basic'|'advanced') {
  const { data: auth } = await supabase.auth.getUser()
  const user_id = auth?.user?.id
  if (!user_id) throw new Error('Not signed in')
  const nowIso = new Date().toISOString()

  const { data: existing, error: selErr } = await supabase
    .from('user_summary_progress')
    .select('user_id')
    .eq('user_id', user_id).eq('book_name', book_name).eq('chapter_number', chapter_number).eq('study_tier', study_tier)
    .limit(1)
  if (selErr) throw selErr

  if (existing?.length) {
    const { error: updErr } = await supabase
      .from('user_summary_progress')
      .update({ completed_at: nowIso })
      .eq('user_id', user_id).eq('book_name', book_name).eq('chapter_number', chapter_number).eq('study_tier', study_tier)
    if (updErr) throw updErr
  } else {
    const { error: insErr } = await supabase
      .from('user_summary_progress')
      .insert([{ user_id, book_name, chapter_number, study_tier, completed_at: nowIso }])
    if (insErr) throw insErr
  }
}

/**
 * Fetch the user dashboard using the SQL RPC for streaks & counts,
 * then enrich with totals for chapters & characters.
 */
export async function fetchUserDashboard(): Promise<UserDashboard> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) throw new Error('Not signed in')

  // 1) Call your server-side function (returns the user_reading_stats row, refreshed)
  const { data: rpc, error: rpcErr } = await supabase.rpc('refresh_user_reading_stats', {
    p_user_id: userId,
  })
  if (rpcErr) {
    console.error('[progress.fetchUserDashboard] rpc error:', rpcErr)
    throw rpcErr
  }
  const s = (rpc ?? [])[0] as {
    user_id: string
    current_streak_days: number
    longest_streak_days: number
    total_chapters_read: number
    total_books_completed: number
    last_read_date: string | null
    ot_chapters_read: number
    nt_chapters_read: number
    updated_at: string
    total_devotions_completed: number
    total_character_studies: number
  } | undefined

  // 2) Totals (chapters & characters) — computed live from your tables
  // Chapters total available (sum of bible_books.total_chapters)
  let totalChaptersAvailable = 0
  {
    const { data, error } = await supabase.from('bible_books').select('total_chapters')
    if (!error) {
      totalChaptersAvailable =
        (data ?? []).reduce((sum, r) => sum + (Number((r as any).total_chapters) || 0), 0) || 0
    } else {
      console.warn('[progress.fetchUserDashboard] bible_books total_chapters error:', error)
    }
    // Fallback if table is empty/unavailable
    if (!totalChaptersAvailable) totalChaptersAvailable = 1189
  }

  // Characters total available (prefer `characters`, fallback to `character_studies`, else 29)
  let totalCharactersAvailable = 0
  {
    const { count, error } = await supabase
      .from('characters')
      .select('id', { count: 'exact', head: true })
    if (!error && typeof count === 'number') totalCharactersAvailable = count || 0

    if (!totalCharactersAvailable) {
      const { count: c2, error: e2 } = await supabase
        .from('character_studies')
        .select('id', { count: 'exact', head: true })
      if (!e2 && typeof c2 === 'number') totalCharactersAvailable = c2 || 0
    }
    if (!totalCharactersAvailable) totalCharactersAvailable = 29
  }

  const totalRead = s?.total_chapters_read ?? 0
  const percentage =
    totalChaptersAvailable > 0 ? Math.round((totalRead / totalChaptersAvailable) * 100) : 0

  return {
    chapters: {
      total_read: totalRead,
      total_available: totalChaptersAvailable,
      percentage,
    },
    devotions: {
      total_completed: s?.total_devotions_completed ?? 0,
    },
    characters: {
      total_studied: s?.total_character_studies ?? 0,
      total_available: totalCharactersAvailable,
    },
    streak: {
      current: s?.current_streak_days ?? 0,
      longest: s?.longest_streak_days ?? 0,
      last_read_date: (s?.last_read_date as string | null) ?? null,
    },
  }
}

/** ================= Mutations (unchanged, ensure completed_at is set) ================= */

export async function trackChapterProgress(arg1: any, arg2?: any) {
  // Old signature: trackChapterProgress({ bookName/book_name, chapter, completed })
  if (typeof arg1 === 'object' && arg1 !== null && arg2 === undefined) {
    const input = arg1 as {
      bookName?: string | null
      book_name?: string | null
      chapter?: number
      completed?: boolean
    }
    if (input.completed === false) return // old behavior: only persist on completion
    const name = (input.book_name ?? input.bookName ?? '').toString().trim()
    const chap = Number(input.chapter)
    if (!name || !isInt(chap)) {
      console.warn('[trackChapterProgress] bad args (legacy object)', { name, chap, input })
      throw new Error('Invalid book_name/chapter_number')
    }
    return _writeChapterCompletion(name, chap)
  }

  // New signature: trackChapterProgress('Genesis', 22)
  const book_name = String(arg1 ?? '').trim()
  const chapter_number = Number(arg2)
  if (!book_name || !isInt(chapter_number)) {
    console.warn('[trackChapterProgress] bad args', { book_name, chapter_number })
    throw new Error('Invalid book_name/chapter_number')
  }
  return _writeChapterCompletion(book_name, chapter_number)
}

/** MARK SUMMARY COMPLETE — accepts either object or (book_name, chapter_number, tier) */
export async function completeSummaryProgress(arg1: any, arg2?: any, arg3?: any) {
  // Legacy object
  if (typeof arg1 === 'object' && arg1 !== null && arg2 === undefined) {
    const input = arg1 as {
      bookName?: string | null
      book_name?: string | null
      chapter?: number
      chapter_number?: number
      studyTier?: 'basic'|'advanced'
      study_tier?: 'basic'|'advanced'
    }
    const name = (input.book_name ?? input.bookName ?? '').toString().trim()
    const chap = Number(input.chapter_number ?? input.chapter)
    const tier = (input.study_tier ?? input.studyTier) as 'basic'|'advanced' | undefined
    if (!name || !isInt(chap) || (tier !== 'basic' && tier !== 'advanced')) {
      console.warn('[completeSummaryProgress] bad args (legacy object)', { name, chap, tier, input })
      throw new Error('Invalid arguments')
    }
    return _writeSummaryCompletion(name, chap, tier)
  }

  // New form
  const book_name = String(arg1 ?? '').trim()
  const chapter_number = Number(arg2)
  const tier = arg3 as 'basic'|'advanced'
  if (!book_name || !isInt(chapter_number) || (tier !== 'basic' && tier !== 'advanced')) {
    console.warn('[completeSummaryProgress] bad args', { book_name, chapter_number, tier })
    throw new Error('Invalid arguments')
  }
  return _writeSummaryCompletion(book_name, chapter_number, tier)
}

/** DEVOTION COMPLETE — current callers use the simple signature; keeping as-is with guards */
export async function completeDevotionProgress(devotion_id: number) {
  const { data: auth } = await supabase.auth.getUser()
  const user_id = auth?.user?.id
  if (!user_id) throw new Error('Not signed in')
  if (!isInt(devotion_id)) {
    console.warn('[completeDevotionProgress] bad args', { devotion_id })
    throw new Error('Invalid devotion_id')
  }

  const nowIso = new Date().toISOString()
  const { data: existing, error: selErr } = await supabase
    .from('user_devotion_progress')
    .select('user_id')
    .eq('user_id', user_id)
    .eq('devotion_id', devotion_id)
    .limit(1)
  if (selErr) throw selErr

  if (existing?.length) {
    const { error: updErr } = await supabase
      .from('user_devotion_progress')
      .update({ completed_at: nowIso })
      .eq('user_id', user_id).eq('devotion_id', devotion_id)
    if (updErr) throw updErr
  } else {
    const { error: insErr } = await supabase
      .from('user_devotion_progress')
      .insert([{ user_id, devotion_id, completed_at: nowIso }])
    if (insErr) throw insErr
  }
}
// --- Character study tracking helpers (legacy stub) ---
export async function fetchCharacterProgress(character_id?: number) {
  const { data: auth } = await supabase.auth.getUser()
  const user_id = auth?.user?.id
  if (!user_id || !character_id) return { completed: false }

  const { data, error } = await supabase
    .from('user_character_progress')
    .select('completed_at')
    .eq('user_id', user_id)
    .eq('character_id', character_id)
    .maybeSingle()

  if (error) {
    console.warn('[fetchCharacterProgress] error', error)
    return { completed: false }
  }

  return { completed: !!data?.completed_at }
}

export async function completeCharacterProgress(character_id: number) {
  const { data: auth } = await supabase.auth.getUser()
  const user_id = auth?.user?.id
  if (!user_id || !character_id) return

  const nowIso = new Date().toISOString()
  await supabase
    .from('user_character_progress')
    .upsert({ user_id, character_id, completed_at: nowIso }, { onConflict: 'user_id,character_id' })
}

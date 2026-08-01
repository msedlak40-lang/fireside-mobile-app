// src/services/scripture.ts — COMPLETE FIXED VERSION
import { supabase } from '../lib/supabaseClient'
import { getCurrentCycle } from './readingCycle'
import { cleanVerseText } from '../utils/verseText'

/** ------------ Types ------------ */
export type Book = {
  id: number
  book_name: string
  testament: string
  total_chapters: number
}

export type KeyVerse = {
  verse_number: number
  text: string
}

export type ChapterSummary = {
  summary_title: string
  summary_content: string
  key_verses?: KeyVerse[]
}

export type VerseInsight = {
  id: number
  verse_number: number | null
  insight_title: string
  insight_detail: string
  insight_type: string
  related_verses: string[] | null
}

export type ChapterPage = {
  book_id: number
  chapter_number: number
  book_name: string
  summary?: ChapterSummary | null
  insights: VerseInsight[]
}

export type VersePage = {
  book_id: number
  chapter_number: number
  verse_number: number
  book_name: string
  insights: VerseInsight[]
}

export type VerseLine = { verse_number: number; text: string }

export type BiblicalTerm = { 
  id: number
  term: string
  simple_definition?: string
  detailed_explanation?: string
  definition?: string
}

export type ChapterTerm = { 
  term_id: number
  term: string
  simple_definition?: string
  detailed_explanation?: string
  definition?: string
  matched_verses: number[]
}

export type SimpleTerm = { 
  term: string
  simple_definition?: string
  detailed_explanation?: string
  definition?: string
}

export type TranslationCode = string // e.g. 'KJV', 'WEB'

export type AdvancedChapterSummary = {
  summary_title?: string | null
  // Accepts: single markdown string, object map, or array of titled sections
  summary_advanced:
    | string
    | Record<string, string>
    | Array<{ title?: string; section?: string; content?: string; body?: string }>

  discussion_questions?: Array<
    | string
    | {
        question?: string
        related_verses?: string[]
      }
  > | null

  practical_applications?: string[] | string | null

  cross_references?: Array<
    | string
    | {
        from?: string
        to?: string
        note?: string
      }
  > | null

  word_studies?: Array<{
    term?: string
    word?: string
    gloss?: string
    detail?: string // markdown
    verses?: string[]
  }> | null

  theological_themes?: string[] | null
}

/** ------------ Bible metadata & pages ------------ */
export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('bible_books_metadata')
    .select('id,book_name,testament,total_chapters')
    .order('id', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Per-book count of distinct read chapters for the signed-in user (book_name → count). */
export async function fetchReadChapterCounts(): Promise<Record<string, number>> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return {}
  const cycle = await getCurrentCycle()
  const { data } = await supabase
    .from('user_reading_progress')
    .select('book_name,chapter_number')
    .eq('user_id', userId)
    .eq('cycle', cycle)
  const byBook: Record<string, Set<number>> = {}
  for (const r of data ?? []) {
    const bn = (r as any).book_name
    const cn = (r as any).chapter_number
    if (bn == null || cn == null) continue
    ;(byBook[bn] ??= new Set<number>()).add(cn)
  }
  const out: Record<string, number> = {}
  for (const k in byBook) out[k] = byBook[k].size
  return out
}

/** Distinct read chapter numbers for one book for the signed-in user. */
export async function fetchReadChapters(bookName: string): Promise<Set<number>> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return new Set<number>()
  const cycle = await getCurrentCycle()
  const { data } = await supabase
    .from('user_reading_progress')
    .select('chapter_number')
    .eq('user_id', userId)
    .eq('book_name', bookName)
    .eq('cycle', cycle)
  const out = new Set<number>()
  for (const r of data ?? []) {
    const cn = (r as any).chapter_number
    if (cn != null) out.add(cn)
  }
  return out
}

export async function fetchChapterPage(bookId: number, chapter: number): Promise<ChapterPage> {
  try {
    // Try the RPC function first
    const { data, error } = await supabase
      .rpc('rpc_get_chapter_page', { p_book_id: bookId, p_chapter: chapter })
      .single()
    
    if (!error && data) {
      return data as ChapterPage
    }

    // Fallback: build the page manually from individual queries
    console.log('[fetchChapterPage] RPC not available, using fallback')
    
    const { data: bookData } = await supabase
      .from('bible_books_metadata')
      .select('book_name')
      .eq('id', bookId)
      .single()

    const book_name = bookData?.book_name || ''

    // Fetch insights for this chapter
    const { data: insightsData } = await supabase
      .from('bible_verse_insights')
      .select('*')
      .eq('book_id', bookId)
      .eq('chapter_number', chapter)

    const insights = (insightsData ?? []).map((row: any) => ({
      id: row.id,
      verse_number: row.verse_number,
      insight_title: row.insight_title || '',
      insight_detail: row.insight_detail || row.insight || '',
      insight_type: row.insight_type || 'general',
      related_verses: row.related_verses || null
    }))

    return {
      book_id: bookId,
      chapter_number: chapter,
      book_name,
      insights
    }
  } catch (err) {
    console.error('[fetchChapterPage] error:', err)
    return {
      book_id: bookId,
      chapter_number: chapter,
      book_name: '',
      insights: []
    }
  }
}

export async function fetchAvailableTranslations(): Promise<TranslationCode[]> {
  const { data, error } = await supabase
    .from('bible_verses')
    .select('translation') // duplicates OK, we'll uniq in JS
  if (error) throw error
  const uniq = Array.from(new Set((data ?? []).map(r => (r as any).translation).filter(Boolean)))
  return uniq.sort()
}

/** Fetch a chapter by book_name + chapter + translation (preferred) */
export async function fetchChapterTextByNameAndTranslation(
  book_name: string,
  chapter: number,
  translation: TranslationCode
): Promise<{ verse_number: number; verse_text: string }[]> {
  const { data, error } = await supabase
    .from('bible_verses')
    .select('verse_number, verse_text')
    .eq('book_name', book_name)
    .eq('chapter_number', chapter)
    .eq('translation', translation)
    .order('verse_number', { ascending: true })
  if (error) throw error
  // Normalize whitespace/newlines so consumers wrap naturally (same fix as the reader).
  return (data ?? []).map((row: any) => ({
    verse_number: row.verse_number,
    verse_text: cleanVerseText(row.verse_text),
  })) as { verse_number: number; verse_text: string }[]
}

export async function fetchVersePage(bookId: number, chapter: number, verse: number): Promise<VersePage> {
  const { data, error } = await supabase
    .rpc('rpc_get_verse_page', { p_book_id: bookId, p_chapter: chapter, p_verse: verse })
    .single()
  if (error) throw error
  return (data ?? {}) as VersePage
}

export async function fetchChapterKeyVerses(bookId: number, chapter: number): Promise<KeyVerse[]> {
  const { data, error } = await supabase
    .rpc('rpc_get_chapter_key_verses', { p_book_id: bookId, p_chapter: chapter })
    .single()
  if (error) throw error
  const arr = (data as any) ?? []
  return Array.isArray(arr) ? (arr as KeyVerse[]) : []
}

export async function searchScripture(query: string) {
  const { data, error } = await supabase.rpc('rpc_search_scripture', { p_query: query })
  if (error) throw error
  return data ?? []
}

export async function fetchChapterSummary(bookId: number, chapter: number) {
  const { data, error } = await supabase
    .from('bible_chapter_summaries')
    .select('summary_title, summary_content')
    .eq('book_id', bookId)
    .eq('chapter_number', chapter)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchAdvancedChapterSummary(
  bookId: number, 
  chapter: number
): Promise<AdvancedChapterSummary | null> {
  try {
    // First, get the book name from metadata
    const { data: bookData, error: bookError } = await supabase
      .from('bible_books_metadata')
      .select('book_name')
      .eq('id', bookId)
      .single()
    
    if (bookError || !bookData) {
      console.warn('[fetchAdvancedChapterSummary] Could not find book:', bookError)
      return null
    }

    const { data, error } = await supabase
      .from('bible_chapter_summaries_strongs')
      .select(`
        summary_advanced,
        discussion_questions,
        practical_applications,
        cross_references,
        word_studies
      `)
      .eq('book_name', bookData.book_name)
      .eq('chapter_number', chapter)
      .maybeSingle()
    
    if (error) {
      console.warn('[fetchAdvancedChapterSummary] error:', error)
      return null
    }
    
    // Return data without expecting summary_title
    return data as AdvancedChapterSummary | null
  } catch (err) {
    console.error('[fetchAdvancedChapterSummary] unexpected error:', err)
    return null
  }
}

/** Full chapter text - uses direct table query instead of RPC */
export async function fetchChapterText(
  bookId: number, 
  chapter: number, 
  translation?: string
): Promise<VerseLine[]> {
  try {
    // First, get the book name from metadata
    const { data: bookData, error: bookError } = await supabase
      .from('bible_books_metadata')
      .select('book_name')
      .eq('id', bookId)
      .single()
    
    if (bookError || !bookData) {
      console.warn('[fetchChapterText] Could not find book:', bookError)
      return []
    }

    // Use direct table query instead of RPC
    const query = supabase
      .from('bible_verses')
      .select('verse_number, verse_text')
      .eq('book_name', bookData.book_name)
      .eq('chapter_number', chapter)
      .order('verse_number', { ascending: true })

    // Add translation filter if provided
    if (translation) {
      query.eq('translation', translation.toUpperCase())
    }

    const { data, error } = await query

    if (error) throw error

    // Map to VerseLine format and dedupe. Normalize whitespace/newlines so the
    // reader wraps naturally (same fix as the Verse of the Day card).
    const rows = (data ?? []).map((row: any) => ({
      verse_number: row.verse_number,
      text: cleanVerseText(row.verse_text)
    })) as VerseLine[]

    // Dedupe by verse_number, keep first occurrence
    const seen = new Set<number>()
    const unique: VerseLine[] = []
    for (const row of rows) {
      if (!seen.has(row.verse_number)) {
        seen.add(row.verse_number)
        unique.push(row)
      }
    }
    return unique
  } catch (err) {
    console.error('[fetchChapterText] error:', err)
    return []
  }
}

/** ------------ Terms (keywords) ------------ */
export async function fetchTermsInChapter(bookId: number, chapter: number): Promise<ChapterTerm[]> {
  try {
    // First try the RPC function if it exists
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('rpc_get_terms_in_chapter', { p_book_id: bookId, p_chapter: chapter })
    
    if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
      return (rpcData ?? []).map((t: any) => ({
        term_id: t.term_id ?? t.id ?? -1,
        term: String(t.term ?? '').trim(),
        simple_definition: t.simple_definition ?? '',
        detailed_explanation: t.detailed_explanation ?? '',
        definition: t.definition ?? '',
        matched_verses: Array.isArray(t.matched_verses) ? t.matched_verses : [],
      })).filter((t: ChapterTerm) => t.term.length > 0)
    }
    
    // Fallback: fetch all terms from the table (they'll apply to all chapters)
    const { data: allTermsData, error: termsError } = await supabase
      .from('biblical_terms')
      .select('id, term, simple_definition, detailed_explanation, definition')
      .order('term', { ascending: true })
    
    if (termsError) {
      console.warn('[fetchTermsInChapter] Error fetching terms:', termsError)
      return []
    }

    const terms = (allTermsData ?? []).map((t: any) => ({
      term_id: t.id ?? -1,
      term: String(t.term ?? '').trim(),
      simple_definition: t.simple_definition ?? '',
      detailed_explanation: t.detailed_explanation ?? '',
      definition: t.definition ?? '',
      matched_verses: [], // No chapter-specific matching in fallback
    })).filter((t: ChapterTerm) => t.term.length > 0)

    return terms
  } catch (err) {
    console.error('[fetchTermsInChapter] Unexpected error:', err)
    return []
  }
}

/** ------------ Life Application (verse summary) & Deep Dive (chapter) ------------ */
export type VerseLifeApplication = {
  plain_truth: string
  deeper_layer: string
  reflection_question: string
}

export type ChapterDeepDive = {
  short_summary: string
  deep_dive: string
}

/** Verse summary card content. Null when the verse has no row. */
export async function getVerseLifeApplication(
  bookName: string,
  chapter: number,
  verse: number
): Promise<VerseLifeApplication | null> {
  const { data, error } = await supabase
    .from('verse_life_application')
    .select('plain_truth, deeper_layer, reflection_question')
    .eq('book_name', bookName)
    .eq('chapter_number', chapter)
    .eq('verse_number', verse)
    .maybeSingle()
  if (error) { console.warn('[getVerseLifeApplication] error:', error); return null }
  return (data as VerseLifeApplication | null) ?? null
}

/** Chapter Deep Dive content. Null when the chapter isn't authored yet (blank tab). */
export async function getChapterDeepDive(
  bookName: string,
  chapter: number
): Promise<ChapterDeepDive | null> {
  const { data, error } = await supabase
    .from('chapter_deep_dives')
    .select('short_summary, deep_dive')
    .eq('book_name', bookName)
    .eq('chapter_number', chapter)
    .maybeSingle()
  if (error) { console.warn('[getChapterDeepDive] error:', error); return null }
  return (data as ChapterDeepDive | null) ?? null
}

/** Fallback: fetch all terms for client-side matching */
export async function fetchAllTerms(): Promise<SimpleTerm[]> {
  const { data, error } = await supabase
    .from('biblical_terms')
    .select('term, simple_definition, detailed_explanation, definition')
    .order('term', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    term: String(row.term ?? '').trim(),
    simple_definition: row.simple_definition ?? '',
    detailed_explanation: row.detailed_explanation ?? '',
    definition: row.definition ?? '',
  })).filter((t: SimpleTerm) => t.term.length > 0)
}

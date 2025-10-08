// services/scripture.ts
import { supabase } from '../supabaseClient'

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

export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('bible_books_metadata')
    .select('id,book_name,testament,total_chapters')
    .order('id', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchChapterPage(bookId: number, chapter: number): Promise<ChapterPage> {
  const { data, error } = await supabase
    .rpc('rpc_get_chapter_page', { p_book_id: bookId, p_chapter: chapter })
    .single()
  if (error) throw error
  return data as ChapterPage
}

export async function fetchVersePage(bookId: number, chapter: number, verse: number): Promise<VersePage> {
  const { data, error } = await supabase
    .rpc('rpc_get_verse_page', { p_book_id: bookId, p_chapter: chapter, p_verse: verse })
    .single()
  if (error) throw error
  return data as VersePage
}

export async function fetchChapterKeyVerses(bookId: number, chapter: number): Promise<KeyVerse[]> {
  const { data, error } = await supabase
    .rpc('rpc_get_chapter_key_verses', { p_book_id: bookId, p_chapter: chapter })
    .single()
  if (error) throw error
  // rpc returns jsonb; ensure array
  const arr = (data as any) ?? []
  return Array.isArray(arr) ? arr : []
}

export async function searchScripture(query: string) {
  const { data, error } = await supabase
    .rpc('rpc_search_scripture', { p_query: query })
  if (error) throw error
  return data ?? []
}

// Optional direct read (we’re mostly using the RPCs above)
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

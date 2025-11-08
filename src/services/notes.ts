import { supabase } from '../lib/supabaseClient'

export type ChapterEntry = {
  id: string
  book_name: string
  chapter_number: number
  context_type: 'verse' | 'summary'
  context_key: string       // e.g., 'v:12' or 's:Word Studies'
  entry_type: 'note' | 'highlight'
  note_markdown: string | null
  highlight_color: string | null
  created_at: string
  preview?: string | null
}

export type ChapterEntryByChapter = {
  book_name: string
  chapter_number: number
  notes: number
  highlights: number
}

export async function listRecentEntries(limit = 10): Promise<ChapterEntry[]> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id ?? ''
  try {
    const { data } = await supabase
      .from('user_chapter_entries')
      .select('id,book_name,chapter_number,context_type,context_key,entry_type,note_markdown,highlight_color,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data ?? []).map(r => ({
      ...r,
      preview: r.note_markdown ? r.note_markdown.replace(/\s+/g, ' ').slice(0, 100) : null
    })) as ChapterEntry[]
  } catch {
    return []
  }
}

export async function listEntriesByBook(book_name: string): Promise<ChapterEntryByChapter[]> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id ?? ''
  try {
    const { data } = await supabase
      .from('user_chapter_entries')
      .select('book_name,chapter_number,entry_type')
      .eq('user_id', userId)
      .eq('book_name', book_name)

    const map = new Map<string, { notes: number; highlights: number }>()
    for (const r of data ?? []) {
      const key = `${r.book_name}#${r.chapter_number}`
      if (!map.has(key)) map.set(key, { notes: 0, highlights: 0 })
      const obj = map.get(key)!
      if (r.entry_type === 'note') obj.notes++
      if (r.entry_type === 'highlight') obj.highlights++
    }
    const rows: ChapterEntryByChapter[] = Array.from(map.entries()).map(([k, v]) => {
      const [bn, ch] = k.split('#')
      return { book_name: bn, chapter_number: Number(ch), ...v }
    })
    rows.sort((a, b) => a.chapter_number - b.chapter_number)
    return rows
  } catch {
    return []
  }
}

// (optional) creators you can call from Chapter screen later:
export async function addVerseNote(params: {
  book_name: string; chapter_number: number; verse: number; markdown: string
}) {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return
  await supabase.from('user_chapter_entries').insert({
    user_id: userId,
    book_name: params.book_name,
    chapter_number: params.chapter_number,
    context_type: 'verse',
    context_key: `v:${params.verse}`,
    entry_type: 'note',
    note_markdown: params.markdown
  })
}

export async function addSummaryNote(params: {
  book_name: string; chapter_number: number; tier: 'basic' | 'advanced'; section_key: string; markdown: string
}) {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return
  await supabase.from('user_chapter_entries').insert({
    user_id: userId,
    book_name: params.book_name,
    chapter_number: params.chapter_number,
    context_type: 'summary',
    context_key: `s:${params.section_key}`,
    study_tier: params.tier,
    entry_type: 'note',
    note_markdown: params.markdown
  })
}

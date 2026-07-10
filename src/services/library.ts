import { supabase } from '../lib/supabaseClient'
import { getCurrentCycle } from './readingCycle'

export type BookProgressRow = {
  book_name: string
  total_chapters: number
  chapters_read: number
  basic_summaries: number
  advanced_summaries: number
}

export async function getPerBookProgress(): Promise<BookProgressRow[]> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id ?? ''

  // Chapters read (scoped to the current reading cycle)
  const cycle = await getCurrentCycle()
  const { data: chRows, error: chErr } = await supabase
    .from('user_reading_progress')
    .select('book_name,chapter_number')
    .eq('user_id', userId)
    .eq('cycle', cycle)
    .not('completed_at', 'is', null)

  if (chErr) console.warn('[library] reading_progress error:', chErr)

  const chaptersByBook = new Map<string, Set<number>>()
  for (const r of chRows ?? []) {
    const bn = r.book_name ?? ''
    if (!chaptersByBook.has(bn)) chaptersByBook.set(bn, new Set())
    chaptersByBook.get(bn)!.add(Number(r.chapter_number) || 0)
  }

  // Summaries read (handle tier casing)
  const basicsByBook = new Map<string, number>()
  const advByBook = new Map<string, number>()
  const { data: sumRows, error: sumErr } = await supabase
    .from('user_summary_progress')
    .select('book_name, study_tier, chapter_number')
    .eq('user_id', userId)

  if (sumErr) {
    // If you hit this, it's almost certainly an RLS/policy issue
    console.warn('[library] summary_progress error:', sumErr)
  } else {
    const tmp = new Map<string, { basic: Set<number>; adv: Set<number> }>()
    for (const r of sumRows ?? []) {
      const bn = r.book_name ?? ''
      const tier = String(r.study_tier ?? '').toLowerCase()
      if (!tmp.has(bn)) tmp.set(bn, { basic: new Set(), adv: new Set() })
      if (tier === 'advanced') tmp.get(bn)!.adv.add(Number(r.chapter_number) || 0)
      else if (tier === 'basic') tmp.get(bn)!.basic.add(Number(r.chapter_number) || 0)
      // unknown tiers are ignored
    }
    for (const [bn, v] of tmp.entries()) {
      basicsByBook.set(bn, v.basic.size)
      advByBook.set(bn, v.adv.size)
    }
  }

  // Total chapters
  const totals = new Map<string, number>()
  const { data: meta } = await supabase
    .from('bible_books_metadata')
    .select('book_name,total_chapters')
  for (const m of meta ?? []) totals.set(m.book_name, Number(m.total_chapters) || 0)

  const bookNames = new Set<string>([
    ...Array.from(chaptersByBook.keys()),
    ...Array.from(basicsByBook.keys()),
    ...Array.from(advByBook.keys()),
    ...Array.from(totals.keys()),
  ])

  const rows: BookProgressRow[] = Array.from(bookNames).map(bn => ({
    book_name: bn,
    total_chapters: totals.get(bn) ?? 0,
    chapters_read: chaptersByBook.get(bn)?.size ?? 0,
    basic_summaries: basicsByBook.get(bn) ?? 0,
    advanced_summaries: advByBook.get(bn) ?? 0,
  }))

  rows.sort((a, b) => a.book_name.localeCompare(b.book_name))
  return rows
}


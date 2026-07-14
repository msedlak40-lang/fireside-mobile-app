// src/services/readingBreakdown.ts
// Testament / section reading breakdown for the home-screen progress drill-down.
// Scoped to the CURRENT reading cycle (same as the book grid: completed_at IS NOT NULL),
// plus an HONEST full-Bible completion count derived per-cycle against the canonical
// 1189-chapter set. computeBreakdown() is a pure function so the milestone logic can be
// verified with synthetic rows, independent of the DB.
import { supabase } from '../lib/supabaseClient'
import { getCurrentCycle } from './readingCycle'

export type MetaBook = {
  book_name: string
  testament: 'OT' | 'NT'
  book_category: string
  total_chapters: number
  book_order: number
}
export type ProgRow = { book_name: string; chapter_number: number; cycle: number }

export type BookProgress = { name: string; read: number; total: number; pct: number; complete: boolean }
export type SectionProgress = { name: string; read: number; total: number; pct: number; complete: boolean; books: BookProgress[] }
export type TestamentProgress = {
  key: 'OT' | 'NT'
  label: string
  read: number
  total: number
  pct: number
  complete: boolean
  sections: SectionProgress[]
}
export type ReadingBreakdown = {
  cycle: number
  overall: { read: number; total: number; pct: number; complete: boolean }
  testaments: TestamentProgress[]
  /** Honest full-Bible completions: cycles whose completed reading covered all 1189 chapters. */
  completionsCount: number
  /** The section closest to done (strictly > 60% and < 100%), else null. */
  closestWin: { name: string; pct: number } | null
  /** book_name → testament, for auto-expanding the testament holding the last read position. */
  testamentByBook: Record<string, 'OT' | 'NT'>
}

// Canonical display order of sections within each testament.
const SECTION_ORDER: Record<'OT' | 'NT', string[]> = {
  OT: ['Law', 'History', 'Poetry', 'Prophets'],
  NT: ['Gospels', 'Acts', 'Epistles', 'Revelation'],
}

const pctOf = (read: number, total: number) => (total > 0 ? Math.round((read / total) * 100) : 0)

/**
 * PURE rollup. Given all completed reading rows (any cycle), the book metadata, and the
 * current cycle, produce the breakdown. The completion count intersects each cycle's read
 * chapters with the canonical set, so duplicates / invalid chapters / unknown books cannot
 * inflate it — a cycle counts as a completion ONLY at full 1189-chapter coverage.
 */
export function computeBreakdown(rows: ProgRow[], meta: MetaBook[], currentCycle: number): ReadingBreakdown {
  // Canonical chapter set + per-book totals from metadata.
  const canonical = new Set<string>()
  const testamentByBook: Record<string, 'OT' | 'NT'> = {}
  for (const b of meta) {
    testamentByBook[b.book_name] = b.testament
    for (let c = 1; c <= b.total_chapters; c++) canonical.add(b.book_name + ':' + c)
  }
  const CANON_TOTAL = canonical.size // 1189 for a full canon

  // Group rows by cycle → set of canonical keys (intersection clamp).
  const byCycle = new Map<number, Set<string>>()
  for (const r of rows) {
    const key = r.book_name + ':' + r.chapter_number
    if (!canonical.has(key)) continue
    let s = byCycle.get(r.cycle)
    if (!s) { s = new Set(); byCycle.set(r.cycle, s) }
    s.add(key)
  }

  // Honest completions: any cycle that fully covered the canon.
  let completionsCount = 0
  if (CANON_TOTAL > 0) for (const s of byCycle.values()) if (s.size === CANON_TOTAL) completionsCount++

  // Current-cycle read set → per-book counts.
  const cur = byCycle.get(currentCycle) ?? new Set<string>()
  const readByBook = new Map<string, number>()
  for (const key of cur) {
    const bn = key.slice(0, key.lastIndexOf(':'))
    readByBook.set(bn, (readByBook.get(bn) ?? 0) + 1)
  }

  // Roll up testaments and their sections.
  const testaments: TestamentProgress[] = (['OT', 'NT'] as const).map((tk) => {
    const sections: SectionProgress[] = SECTION_ORDER[tk].map((cat) => {
      const books: BookProgress[] = meta
        .filter((b) => b.testament === tk && b.book_category === cat)
        .sort((a, b) => a.book_order - b.book_order)
        .map((b) => {
          const read = readByBook.get(b.book_name) ?? 0 // ≤ total_chapters by canonical construction
          return { name: b.book_name, read, total: b.total_chapters, pct: pctOf(read, b.total_chapters), complete: b.total_chapters > 0 && read >= b.total_chapters }
        })
      const total = books.reduce((s, b) => s + b.total, 0)
      const read = books.reduce((s, b) => s + b.read, 0)
      return { name: cat, read, total, pct: pctOf(read, total), complete: total > 0 && read >= total, books }
    })
    const total = sections.reduce((s, x) => s + x.total, 0)
    const read = sections.reduce((s, x) => s + x.read, 0)
    return {
      key: tk,
      label: tk === 'OT' ? 'Old Testament' : 'New Testament',
      read, total, pct: pctOf(read, total), complete: total > 0 && read >= total,
      sections,
    }
  })

  const overallRead = cur.size
  const overall = {
    read: overallRead, total: CANON_TOTAL, pct: pctOf(overallRead, CANON_TOTAL),
    complete: CANON_TOTAL > 0 && overallRead >= CANON_TOTAL,
  }

  // Closest win: strictly > 60% and < 100%, pick the highest.
  let closestWin: { name: string; pct: number } | null = null
  for (const t of testaments) for (const s of t.sections) {
    if (s.total > 0 && s.read < s.total && s.read / s.total > 0.6) {
      if (!closestWin || s.pct > closestWin.pct) closestWin = { name: s.name, pct: s.pct }
    }
  }

  return { cycle: currentCycle, overall, testaments, completionsCount, closestWin, testamentByBook }
}

/** IO wrapper: fetches metadata + the user's completed rows across ALL cycles, then rolls up. */
export async function getReadingBreakdown(): Promise<ReadingBreakdown> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  const currentCycle = await getCurrentCycle()

  const { data: meta, error: metaErr } = await supabase
    .from('bible_books_metadata')
    .select('book_name,testament,book_category,total_chapters,book_order')
  if (metaErr) console.warn('[readingBreakdown] metadata error:', metaErr)
  const metaRows = (meta ?? []) as MetaBook[]

  if (!userId) return computeBreakdown([], metaRows, currentCycle)

  // All-cycles completed rows (match the grid: completed_at IS NOT NULL). Paginate so a
  // multi-cycle reader past 1000 rows still evaluates completion correctly.
  const rows: ProgRow[] = []
  let from = 0
  const PAGE = 1000
  for (;;) {
    const { data, error } = await supabase
      .from('user_reading_progress')
      .select('book_name,chapter_number,cycle')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) { console.warn('[readingBreakdown] progress error:', error); break }
    const chunk = (data ?? []) as ProgRow[]
    rows.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }

  return computeBreakdown(rows, metaRows, currentCycle)
}

// src/services/readingProgressRows.ts
// The ONE place user_reading_progress rows are read in bulk.
//
// WHY THIS EXISTS. Supabase caps an unpaginated select() at 1000 rows server-side
// (PostgREST max_rows). .limit() cannot raise it -- only .range() gets past it. Four call
// sites used to fetch every progress row and count client-side; three of them had no
// pagination, so once a reader crossed 1000 rows the home total froze just under 1000 and
// the per-book counts were computed from an arbitrary 1000-row slice. Only
// readingBreakdown.ts paginated, which is exactly why the drill-down stayed correct while
// the summaries did not.
//
// Fetching lives here so there is no fifth call site to forget.
import { supabase } from '../lib/supabaseClient'

export type ProgressRow = { book_name: string; chapter_number: number; cycle: number }

const PAGE = 1000

/**
 * Every completed progress row for a user, paginated past the 1000-row cap.
 * Pass a cycle to scope to it; omit for all cycles.
 *
 * completed_at IS NOT NULL is applied HERE for every caller. It used to be applied by
 * library.ts and readingBreakdown.ts but not by progress.ts, so the home total and the
 * drill-down could disagree by any rows with a null completed_at.
 *
 * THROWS on a failed page. The old code swallowed errors and returned whatever it had,
 * which produced a silently low count -- the same failure this module exists to remove.
 * Callers already catch: Home.tsx and ReadingProgressModal wrap their loads, and
 * BibleScreen / BookChapterSheet use .catch().
 */
export async function fetchAllProgressRows(userId: string, cycle?: number): Promise<ProgressRow[]> {
  const rows: ProgressRow[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from('user_reading_progress')
      .select('book_name,chapter_number,cycle')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      // A stable sort is REQUIRED for .range() paging to be coherent. Without ORDER BY,
      // Postgres may return rows in a different order per request, so page boundaries can
      // shift and rows can be duplicated or skipped between pages. The previous pagination
      // in readingBreakdown.ts had no order clause and carried this latent fault.
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (cycle != null) q = q.eq('cycle', cycle)

    const { data, error } = await q
    if (error) throw error
    const chunk = (data ?? []) as ProgressRow[]
    rows.push(...chunk)
    if (chunk.length < PAGE) return rows
  }
}

/**
 * book_name -> set of distinct chapter numbers. Deduplicates, which matters: one duplicate
 * (book_name, chapter_number) pair is what made a 1000-row slice read as 999.
 */
export function chaptersByBook(rows: ProgressRow[]): Map<string, Set<number>> {
  const byBook = new Map<string, Set<number>>()
  for (const r of rows) {
    if (r.book_name == null || r.chapter_number == null) continue
    let set = byBook.get(r.book_name)
    if (!set) byBook.set(r.book_name, (set = new Set<number>()))
    set.add(Number(r.chapter_number))
  }
  return byBook
}

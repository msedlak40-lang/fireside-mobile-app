// src/services/annotations.ts
import { supabase } from '../lib/supabaseClient'
import { fetchChapterText, fetchChapterSummary, fetchAdvancedChapterSummary } from './scripture'

type Entry = {
  id: string
  book_name: string
  chapter_number: number
  context_type: 'verse' | 'summary' | string | null
  context_key: string | null
  entry_type: 'note' | 'highlight'
  note_markdown?: string | null
  highlight_color?: 'yellow' | 'green' | 'pink' | 'blue' | null
  study_tier?: 'basic' | 'advanced' | null
  created_at: string
}

const slugify = (s?: string) =>
  String(s ?? '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')

const splitBlocks = (md: string) => {
  const out: string[] = []
  let buf: string[] = []
  let code = false
  for (const line of String(md ?? '').split('\n')) {
    if (line.trim().startsWith('```')) { code = !code; buf.push(line); continue }
    if (!code && line.trim() === '') { const t = buf.join('\n').trim(); if (t) out.push(t); buf = [] } else buf.push(line)
  }
  const t = buf.join('\n').trim(); if (t) out.push(t)
  return out
}

const parseCtx = (ck?: string | null) => {
  const s = String(ck ?? '')
  if (s.startsWith('v:')) {
    const n = parseInt(s.slice(2), 10)
    return { kind: 'verse' as const, verse: isFinite(n) ? n : null }
  }
  const pTier = s.match(/^p:(basic|advanced):([^:]+):(\d+)$/) // new
  if (pTier) return { kind: 'para' as const, tier: pTier[1] as 'basic'|'advanced', slug:pTier[2], idx:Number(pTier[3]) }
  const sTier = s.match(/^s:(basic|advanced):([^:]+)$/)
  if (sTier) return { kind: 'section' as const, tier: sTier[1] as 'basic'|'advanced', slug:sTier[2] }
  const pLegacy = s.match(/^p:([^:]+):(\d+)$/) // legacy
  if (pLegacy) return { kind: 'para' as const, tier: undefined, slug:pLegacy[1], idx:Number(pLegacy[2]) }
  if (s.startsWith('s:')) return { kind: 'section' as const, tier: undefined, slug:s.slice(2) || 'summary' }
  return { kind: 'unknown' as const }
}

async function getSummaryParagraphText(
  bookName: string, chapterNum: number, slug: string, idx: number | null, tier?: 'basic'|'advanced'|null
) {
  const { data: b } = await supabase.from('bible_books').select('id').eq('book_name', bookName).maybeSingle()
  if (!b?.id) return null
  if (tier === 'basic') {
    const basic = await fetchChapterSummary(b.id, chapterNum)
    if (!basic?.summary_content || slug !== 'summary' || idx == null) return null
    return splitBlocks(String(basic.summary_content))[idx] ?? null
  }
  // advanced or fallback
  const adv = await fetchAdvancedChapterSummary(b.id, chapterNum)
  const raw = adv?.summary_advanced
  let sections: { title: string; body: string }[] = []
  if (typeof raw === 'string') sections = [{ title: 'Summary', body: raw }]
  else if (Array.isArray(raw)) sections = raw.map((r: any) => ({ title: r?.title || r?.section || 'Section', body: String(r?.content || r?.body || '') }))
  else if (raw && typeof raw === 'object') sections = Object.entries(raw).map(([k,v]) => ({ title: String(k), body: String(v ?? '') }))
  const sec = sections.find(s => slugify(s.title) === slug)
  if (!sec) return null
  if (idx == null) return sec.body
  return splitBlocks(sec.body)[idx] ?? null
}

export async function fetchAnnotationsSummary() {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return { verses: [], summaries: [] }

  const { data, error } = await supabase
    .from('user_chapter_entries')
    .select('id,book_name,chapter_number,context_type,context_key,entry_type,note_markdown,highlight_color,study_tier,created_at')
    .eq('user_id', userId)
    .in('entry_type', ['note','highlight'])
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw error
  const entries = (data ?? []) as Entry[]

  const verses: Array<{ id: string; label: string; text?: string; type: 'note'|'highlight'; created_at: string }> = []
  const summaries: Array<{ id: string; label: string; text?: string; type: 'note'|'highlight'; created_at: string }> = []

  for (const e of entries) {
    if (e.context_type === 'verse') {
      const ctx = parseCtx(e.context_key)
      const label = `${e.book_name} ${e.chapter_number}${ctx.kind==='verse' && ctx.verse ? ':'+ctx.verse : ''}`
      if (e.entry_type === 'note') {
        verses.push({ id:e.id, label, text:e.note_markdown ?? undefined, type:'note', created_at: e.created_at })
      } else {
        try {
          const { data: b } = await supabase.from('bible_books').select('id').eq('book_name', e.book_name).maybeSingle()
          const vlist = await fetchChapterText(b?.id as number, e.chapter_number)
          const verseObj = Array.isArray(vlist) ? vlist.find((rv: any) => Number(rv?.number ?? rv?.verse_number) === (ctx as any).verse) : null
          verses.push({ id:e.id, label, text: verseObj?.text ?? undefined, type:'highlight', created_at: e.created_at })
        } catch { verses.push({ id:e.id, label, type:'highlight', created_at: e.created_at }) }
      }
    } else {
      const ctx = parseCtx(e.context_key)
      const secLabel =
        ctx.kind === 'para' ? `${e.book_name} ${e.chapter_number} • ${ctx.slug} p.${(ctx.idx ?? 0)+1} ${ctx.tier ?? ''}`.trim()
      : ctx.kind === 'section' ? `${e.book_name} ${e.chapter_number} • ${ctx.slug} ${ctx.tier ?? ''}`.trim()
      : `${e.book_name} ${e.chapter_number} • summary`
      if (e.entry_type === 'note') {
        summaries.push({ id:e.id, label: secLabel, text:e.note_markdown ?? undefined, type:'note', created_at: e.created_at })
      } else {
        try {
          let paragraph: string | null = null
          if (ctx.kind === 'para') paragraph = await getSummaryParagraphText(e.book_name, e.chapter_number, String(ctx.slug), ctx.idx ?? null, ctx.tier ?? e.study_tier ?? undefined)
          else if (ctx.kind === 'section') paragraph = await getSummaryParagraphText(e.book_name, e.chapter_number, String(ctx.slug), 0, ctx.tier ?? e.study_tier ?? undefined)
          summaries.push({ id:e.id, label: secLabel, text: paragraph ?? undefined, type:'highlight', created_at: e.created_at })
        } catch { summaries.push({ id:e.id, label: secLabel, type:'highlight', created_at: e.created_at }) }
      }
    }
  }

  return { verses, summaries }
}

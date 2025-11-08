// src/components/BookChapterPicker.tsx — COMPLETE CLEAN VERSION
import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../theme/colors'

export type Book = { id: number; book_name: string }

export type Entry = {
  id: string
  user_id: string
  book_name: string
  chapter_number: number | null
  context_type: 'verse' | 'summary' | string | null
  context_key: string | null
  entry_type: 'note' | 'highlight'
  note_markdown?: string | null
  highlight_color?: 'yellow' | 'green' | 'pink' | 'blue' | null
  study_tier?: 'basic' | 'advanced' | null
  created_at: string
}

type Props = {
  books: Book[]
  initialBookName?: string
  initialChapter?: number
  onGo?: (book: Book, chapter: number, translation?: string) => void
  onSelectionChange?: (sel: { book: Book | null; chapter: number; translation: string | null }) => void
}

const parseContextKey = (ck?: string | null) => {
  const s = String(ck ?? '')
  if (s.startsWith('v:')) {
    const n = parseInt(s.slice(2), 10)
    return { type: 'verse' as const, label: `v.${isFinite(n) ? n : '?'}`, verse: isFinite(n) ? n : null }
  }
  if (s.startsWith('p:')) {
    // Format: p:tier:section:index (e.g., p:onepager:summary:0)
    const m = s.match(/^p:([^:]+):([^:]+):(\d+)$/)
    if (m) {
      const [, tier, section, index] = m
      const sectionLabel = section.replace(/-/g, ' ')
      return { type: 'paragraph' as const, label: `${sectionLabel} • p.${index}`, tier, section, paraIndex: parseInt(index, 10) }
    }
    return { type: 'paragraph' as const, label: s.slice(2) || 'paragraph' }
  }
  if (s.startsWith('s:')) {
    const m = s.match(/^s:([^:]+)(?::p(\d+))?$/)
    if (m) {
      const [, section, p] = m
      const paraIndex = p ? parseInt(p, 10) : null
      return {
        type: 'section' as const,
        label: p ? `${section} • p.${p}` : section,
        section,
        paraIndex
      }
    }
    return { type: 'section' as const, label: s.slice(2) || 'summary' }
  }
  return { type: 'unknown' as const, label: s || 'summary' }
}

const contextDisplay = (ck?: string | null) => parseContextKey(ck).label

// Helper to extract a section from markdown
const extractSection = (markdown: string | null, sectionName: string): string | null => {
  if (!markdown) return null
  const content = String(markdown)
  const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`##\\s*${escapedName}([\\s\\S]*?)(?=\\n\\n---\\n\\n|\\n##\\s|$)`, 'i')
  const match = content.match(regex)
  return match && match[1] ? match[1].trim() : null
}

// Helper to split markdown into blocks (paragraphs)
const splitMarkdownIntoBlocks = (markdown: string | null): string[] => {
  const src = String(markdown ?? '')
  if (!src.trim()) return []
  const lines = src.split('\n')

  const blocks: string[] = []
  let buf: string[] = []
  let inCode = false

  const flush = () => {
    if (buf.length) blocks.push(buf.join('\n').trim())
    buf = []
  }

  for (const line of lines) {
    const isFence = /^```/.test(line)
    if (isFence) {
      inCode = !inCode
      buf.push(line)
      if (!inCode) flush()
      continue
    }
    if (!inCode && /^\s*$/.test(line)) {
      flush()
      continue
    }
    buf.push(line)
  }
  flush()

  // Merge solitary headings with the next para for nicer reading
  const merged: string[] = []
  for (let i = 0; i < blocks.length; i++) {
    const cur = blocks[i]
    if (/^#{1,6}\s+/.test(cur) && (i + 1) < blocks.length && !/^```/.test(blocks[i + 1])) {
      merged.push([cur, blocks[i + 1]].join('\n'))
      i++
    } else {
      merged.push(cur)
    }
  }
  return merged
}

export default function BookChapterPicker({ books, initialBookName, initialChapter, onGo, onSelectionChange }: Props) {
  const [bookPickerOpen, setBookPickerOpen] = useState(false)
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false)
  const [translationPickerOpen, setTranslationPickerOpen] = useState(false)

  const [selectedBook, setSelectedBook] = useState<Book | null>(
    initialBookName ? books.find(b => b.book_name === initialBookName) ?? null : null
  )
  const [totalChapters, setTotalChapters] = useState(0)
  const [chapter, setChapter] = useState<number>(initialChapter || 1)

  const [translations, setTranslations] = useState<string[]>([])
  const [translation, setTranslation] = useState<string | null>(null)

  const [loadingCounts, setLoadingCounts] = useState(false)
  const [chaptersCount, setChaptersCount] = useState<{ read: number; total: number }>({ read: 0, total: 0 })
  const [summaryBasic, setSummaryBasic] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 })
  const [summaryAdvanced, setSummaryAdvanced] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 })

  const [recent, setRecent] = useState<Entry[]>([])
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [entryModalTitle, setEntryModalTitle] = useState('')
  const [entryModalBody, setEntryModalBody] = useState('')
  const [entryModalLoading, setEntryModalLoading] = useState(false)

  const colorDot = (c?: Entry['highlight_color']) =>
    c === 'green' ? '#86efac' : c === 'pink' ? '#f9a8d4' : c === 'blue' ? '#93c5fd' : c === 'yellow' ? '#fde68a' : '#d1d5db'

  const loadTranslations = useCallback(async () => {
    const { data, error } = await supabase
      .from('bible_verses')
      .select('translation')
      .not('translation', 'is', null)
      .limit(5000)

    const dbTranslations = Array.from(new Set((data ?? []).map(r => String((r as any).translation).toUpperCase())))
      .sort((a, b) => a.localeCompare(b))

    // Always include both KJV and WEB, plus any other translations from the database
    const allTranslations = Array.from(new Set(['KJV', 'WEB', ...dbTranslations]))
      .sort((a, b) => a.localeCompare(b))

    setTranslations(allTranslations)
    if (!translation) setTranslation(allTranslations.includes('KJV') ? 'KJV' : allTranslations[0])
  }, [translation])

  useEffect(() => { loadTranslations() }, [])

  const resolveChapters = useCallback(async (book: Book | null) => {
    if (!book) { setTotalChapters(0); return }

    const { data: bb } = await supabase
      .from('bible_books')
      .select('total_chapters')
      .eq('book_name', book.book_name)
      .maybeSingle()

    if (Number(bb?.total_chapters) > 0) {
      setTotalChapters(Number(bb!.total_chapters))
      return
    }

    const { data: chapters } = await supabase
      .from('bible_chapters')
      .select('chapter_number')
      .eq('book_name', book.book_name)
    const max = Math.max(...(chapters ?? []).map(r => Number((r as any).chapter_number) || 0))
    setTotalChapters(isFinite(max) ? max : 50)
  }, [])

  useEffect(() => { resolveChapters(selectedBook) }, [selectedBook])

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        if (!selectedBook) return
        setLoadingCounts(true)
        try {
          const { data: auth } = await supabase.auth.getUser()
          const userId = auth?.user?.id
          if (!userId) return

          const total = totalChapters
          const { data: chRows } = await supabase
            .from('user_reading_progress')
            .select('chapter_number')
            .eq('user_id', userId)
            .eq('book_name', selectedBook.book_name)
          const chaptersRead = new Set((chRows ?? []).map(r => Number((r as any).chapter_number))).size
          setChaptersCount({ read: chaptersRead, total })

          const { data: sumRows } = await supabase
            .from('user_summary_progress')
            .select('study_tier')
            .eq('user_id', userId)
            .eq('book_name', selectedBook.book_name)
          const basicDone = (sumRows ?? []).filter(r => (r as any).study_tier === 'basic').length
          const advDone = (sumRows ?? []).filter(r => (r as any).study_tier === 'advanced').length
          setSummaryBasic({ completed: basicDone, total })
          setSummaryAdvanced({ completed: advDone, total })
        } finally {
          setLoadingCounts(false)
        }
      }
      run()
    }, [selectedBook, totalChapters])
  )

  const loadRecent = useCallback(async () => {
    if (!selectedBook || !chapter) return
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth?.user?.id
    if (!userId) return

    const { data: d1 } = await supabase
      .from('user_chapter_entries')
      .select('id,book_name,chapter_number,context_type,context_key,entry_type,note_markdown,highlight_color,study_tier,created_at')
      .eq('user_id', userId)
      .eq('book_name', selectedBook.book_name)
      .eq('chapter_number', chapter)
      .in('entry_type', ['note', 'highlight'])
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: d2 } = await supabase
      .from('user_chapter_entries')
      .select('id,book_name,chapter_number,context_type,context_key,entry_type,note_markdown,highlight_color,study_tier,created_at')
      .eq('user_id', userId)
      .eq('book_name', selectedBook.book_name)
      .is('chapter_number', null)
      .like('context_key', 's:%')
      .in('entry_type', ['note', 'highlight'])
      .order('created_at', { ascending: false })
      .limit(50)

    const data = [...(d1 ?? []), ...(d2 ?? [])]
    console.log(`[BookChapterPicker] Loaded ${data.length} recent entries`)
    console.log('[BookChapterPicker] Sample entries:', data.slice(0, 3).map(e => ({
      context_key: e.context_key,
      study_tier: e.study_tier,
      entry_type: e.entry_type
    })))
    setRecent(data ?? [])
  }, [selectedBook, chapter])

  useEffect(() => {
    onSelectionChange?.({ book: selectedBook, chapter, translation })
    loadRecent()
  }, [selectedBook, chapter, translation])

  const go = useCallback(() => {
    if (selectedBook && chapter) {
      const chNum = Number(chapter)
      onGo?.(selectedBook, chNum, translation ?? undefined)
    }
  }, [selectedBook, chapter, translation, onGo])

  const openEntryModal = useCallback(async (item: Entry) => {
    const chapterLabel = item.chapter_number != null ? String(item.chapter_number) : '—'
    const label = `${item.book_name} ${chapterLabel} • ${contextDisplay(item.context_key)}`
    setEntryModalTitle(label)
    setEntryModalLoading(true)
    setEntryModalOpen(true)

    const ctx = parseContextKey(item.context_key)

    if (item.entry_type === 'note' && item.note_markdown) {
      setEntryModalBody(item.note_markdown)
      setEntryModalLoading(false)
      return
    }

    if (ctx.type === 'verse' && typeof ctx.verse === 'number' && item.chapter_number != null) {
      const tr = (translation ?? 'KJV').toUpperCase()
      const { data: row } = await supabase
        .from('bible_verses')
        .select('verse_text')
        .eq('book_name', item.book_name)
        .eq('chapter_number', item.chapter_number)
        .eq('verse_number', ctx.verse)
        .eq('translation', tr)
        .maybeSingle()

      const verseText = (row as any)?.verse_text || ''
      setEntryModalBody(verseText || '(Highlighted verse)')
      setEntryModalLoading(false)
      return
    }

    if (ctx.type === 'section') {
      // Check if this is a One Pager section (format: onepager-summary, onepager-theological-themes, etc.)
      if ('section' in ctx && ctx.section?.startsWith('onepager-')) {
        const sectionName = ctx.section.replace('onepager-', '')
        const paraIndex = 'paraIndex' in ctx && typeof ctx.paraIndex === 'number' ? ctx.paraIndex : null
        let content = '(Highlighted section)'

        if (sectionName === 'summary') {
          // Fetch from advanced summary - Original Summary section
          const { data: summaryData } = await supabase
            .from('bible_chapter_summaries_strongs')
            .select('summary_advanced')
            .eq('book_name', item.book_name)
            .eq('chapter_number', item.chapter_number ?? chapter)
            .maybeSingle()

          if (typeof summaryData?.summary_advanced === 'string') {
            const sectionContent = extractSection(summaryData.summary_advanced, 'Original Summary')
            if (sectionContent && paraIndex !== null) {
              const blocks = splitMarkdownIntoBlocks(sectionContent)
              content = blocks[paraIndex] || sectionContent
            } else {
              content = sectionContent || '(Section not found)'
            }
          }
        } else if (sectionName === 'theological-themes' || sectionName === 'key-verses') {
          // Fetch from basic summary
          const { data: summaryData } = await supabase
            .from('bible_chapter_summaries')
            .select('summary_content')
            .eq('book_id', selectedBook?.id)
            .eq('chapter_number', item.chapter_number ?? chapter)
            .maybeSingle()

          if (summaryData?.summary_content) {
            const sectionTitle = sectionName === 'theological-themes' ? 'Theological Themes' : 'Key Verses'
            const sectionContent = extractSection(summaryData.summary_content, sectionTitle)
            if (sectionContent && paraIndex !== null) {
              const blocks = splitMarkdownIntoBlocks(sectionContent)
              content = blocks[paraIndex] || sectionContent
            } else {
              content = sectionContent || '(Section not found)'
            }
          }
        } else if (sectionName === 'practical-applications') {
          // Fetch from advanced summary - Practical Applications section
          const { data: summaryData } = await supabase
            .from('bible_chapter_summaries_strongs')
            .select('summary_advanced')
            .eq('book_name', item.book_name)
            .eq('chapter_number', item.chapter_number ?? chapter)
            .maybeSingle()

          if (typeof summaryData?.summary_advanced === 'string') {
            const sectionContent = extractSection(summaryData.summary_advanced, 'Practical Applications')
            if (sectionContent && paraIndex !== null) {
              const blocks = splitMarkdownIntoBlocks(sectionContent)
              content = blocks[paraIndex] || sectionContent
            } else {
              content = sectionContent || '(Section not found)'
            }
          }
        }

        setEntryModalBody(content)
        setEntryModalLoading(false)
        return
      }

      // Handle regular basic/advanced sections
      const tier = item.study_tier || 'basic'

      if (tier === 'basic') {
        const { data: summaryData } = await supabase
          .from('bible_chapter_summaries')
          .select('summary_content')
          .eq('book_id', selectedBook?.id)
          .eq('chapter_number', item.chapter_number ?? chapter)
          .maybeSingle()

        setEntryModalBody(summaryData?.summary_content || '(Highlighted section)')
      } else {
        const { data: summaryData } = await supabase
          .from('bible_chapter_summaries_strongs')
          .select('summary_advanced')
          .eq('book_name', item.book_name)
          .eq('chapter_number', item.chapter_number ?? chapter)
          .maybeSingle()

        const content = typeof summaryData?.summary_advanced === 'string'
          ? summaryData.summary_advanced
          : '(Highlighted section)'
        setEntryModalBody(content)
      }
      setEntryModalLoading(false)
      return
    }

    setEntryModalBody(item.entry_type === 'highlight' ? '(Highlighted)' : '')
    setEntryModalLoading(false)
  }, [translation, selectedBook, chapter])

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Translation</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setTranslationPickerOpen(true)}>
        <Text style={styles.dropdownText}>{translation ?? 'Select translation'}</Text>
        <Text style={styles.dropdownChevron}>▾</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: 16 }]}>Book</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setBookPickerOpen(true)}>
        <Text style={styles.dropdownText}>{selectedBook?.book_name ?? 'Select book'}</Text>
        <Text style={styles.dropdownChevron}>▾</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { marginTop: 16 }]}>Chapter</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setChapterPickerOpen(true)}>
        <Text style={styles.dropdownText}>{chapter}</Text>
        <Text style={styles.dropdownChevron}>▾</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Progress</Text>
        <Text style={styles.cardText}>Read: {chaptersCount.read}/{chaptersCount.total}</Text>
        <Text style={styles.cardText}>Basic: {summaryBasic.completed}/{summaryBasic.total} • Advanced: {summaryAdvanced.completed}/{summaryAdvanced.total}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent notes & highlights</Text>
        {recent.length === 0 ? (
          <Text style={styles.cardTextMuted}>None yet</Text>
        ) : (
          recent.map(item => (
            <TouchableOpacity key={item.id} style={styles.row} onPress={() => openEntryModal(item)}>
              <View style={[styles.dot, { backgroundColor: colorDot(item.highlight_color) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.context_type === 'summary' ? 'Summary' : 'Verse'} • {contextDisplay(item.context_key)}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {item.entry_type === 'note' ? (item.note_markdown ?? '') : 'Highlight'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <Modal visible={entryModalOpen} animationType="slide" transparent onRequestClose={() => setEntryModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{entryModalTitle}</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {entryModalLoading ? <ActivityIndicator /> : <Text style={styles.modalBody}>{entryModalBody || '(No content)'}</Text>}
            </ScrollView>
            <TouchableOpacity style={[styles.goBtn, { marginTop: 12 }]} onPress={() => setEntryModalOpen(false)}>
              <Text style={styles.goBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={translationPickerOpen} animationType="fade" transparent onRequestClose={() => setTranslationPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Translation</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {(translations.length ? translations : ['KJV', 'WEB']).map(t => (
                <TouchableOpacity key={t} style={styles.pickerRow} onPress={() => { setTranslation(t); setTranslationPickerOpen(false) }}>
                  <Text style={styles.pickerRowText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.goBtn, { marginTop: 12 }]} onPress={() => setTranslationPickerOpen(false)}>
              <Text style={styles.goBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={bookPickerOpen} animationType="fade" transparent onRequestClose={() => setBookPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Book</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {books.map(b => (
                <TouchableOpacity key={b.id} style={styles.pickerRow} onPress={() => { setSelectedBook(b); setBookPickerOpen(false) }}>
                  <Text style={styles.pickerRowText}>{b.book_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.goBtn, { marginTop: 12 }]} onPress={() => setBookPickerOpen(false)}>
              <Text style={styles.goBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={chapterPickerOpen} animationType="fade" transparent onRequestClose={() => setChapterPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Chapter</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {Array.from({ length: totalChapters || 50 }, (_, i) => i + 1).map(n => (
                <TouchableOpacity key={n} style={styles.pickerRow} onPress={() => { setChapter(n); setChapterPickerOpen(false) }}>
                  <Text style={styles.pickerRowText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.goBtn, { marginTop: 12 }]} onPress={() => setChapterPickerOpen(false)}>
              <Text style={styles.goBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, backgroundColor: colors.background.primary },
  label: { fontSize: 12, color: colors.text.secondary, marginBottom: 6 },
  dropdown: { borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.tertiary, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { color: colors.text.primary, fontWeight: '700' },
  dropdownChevron: { color: colors.text.muted },
  card: { backgroundColor: colors.background.tertiary, borderWidth: 1, borderColor: colors.border.default, borderRadius: 12, padding: 12 },
  cardTitle: { fontWeight: '800', color: colors.text.primary, marginBottom: 6 },
  cardText: { color: colors.text.secondary },
  cardTextMuted: { color: colors.text.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowTitle: { fontWeight: '800', color: colors.text.primary },
  rowSub: { color: colors.text.secondary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border.default },
  goBtn: { backgroundColor: colors.accent.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  goBtnText: { color: colors.text.primary, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', backgroundColor: colors.background.elevated, borderRadius: 14, padding: 16 },
  modalTitle: { fontWeight: '800', color: colors.text.primary, marginBottom: 6 },
  modalBody: { color: colors.text.secondary },
  pickerRow: { paddingVertical: 10 },
  pickerRowText: { color: colors.text.primary, fontWeight: '700' },
})
// src/components/ChapterScreen.tsx — FIXED VERSION
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native'
import { useRoute } from '@react-navigation/native'
import {
  fetchChapterText,
  fetchChapterSummary,
  fetchAdvancedChapterSummary,
  fetchChapterPage,
  fetchTermsInChapter,
} from '../services/scripture'
import ChapterText from './ChapterText'
import ExpandableSection from './ExpandableSection'
import { supabase } from '../lib/supabaseClient'

type RouteParams = { bookId: number; chapter: number; bookName?: string; translation?: string }

type Verse = { number: number; text: string }

type Section = { title: string; body: string }

type OutlineNode = { title: string; body?: string; children?: Section[] }

export default function ChapterScreen() {
  const route = useRoute<any>() as { params?: Partial<RouteParams> }
  const initialBookId = route?.params?.bookId ?? null
  const initialChapter = route?.params?.chapter ?? 1
  const paramBookName = route?.params?.bookName ?? null
  const paramTranslation = route?.params?.translation ?? null

  const [bookId] = useState<number | null>(Number(initialBookId) || null)
  const [chapter] = useState<number>(Number(initialChapter) || 1)
  const [bookNameResolved, setBookNameResolved] = useState<string | null>(paramBookName ?? null)
  const [translation] = useState<string | null>(paramTranslation ?? null)

  const [tab, setTab] = useState<'read' | 'summary'>('read')
  const [studyTier, setStudyTier] = useState<'basic' | 'advanced'>('basic')

  const [verses, setVerses] = useState<Verse[]>([])
  const [basic, setBasic] = useState<{ summary_title?: string; summary_content?: string; book_name?: string } | null>(null)
  const [advRaw, setAdvRaw] = useState<any>(null)

  const [verseInsightsByVerse, setVerseInsightsByVerse] = useState<Record<number, string>>({})
  const [biblicalTerms, setBiblicalTerms] = useState<Array<{ word: string; insight?: string; related_verses?: string[] }>>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const mountTimeRef = useRef<number>(Date.now())

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }, [])

  // Split helpers ------------------------------------------------------------
  const splitOnH2 = useCallback((md: string): Section[] => {
    const src = String(md ?? '').trim()
    if (!src) return []
    const parts = src.split(/\n(?=##\s)/g).map(p => p.trim()).filter(Boolean)
    if (parts.length <= 1 && !/^##\s/.test(parts[0] || '')) {
      return [{ title: 'Summary', body: src }]
    }
    const out: Section[] = []
    for (const block of parts) {
      const [first, ...rest] = block.split('\n')
      const title = first.replace(/^##\s+/, '').trim() || 'Section'
      const body = rest.join('\n').trim()
      if (body) out.push({ title, body })
    }
    return out
  }, [])

  const normalizeAdvanced = useCallback((raw: any) => {
    const s = raw?.summary_advanced
    // Don't expect a title from advanced summaries
    const title = undefined
    const out: Section[] = []

    if (typeof s === 'string') {
      out.push(...splitOnH2(s))
    } else if (Array.isArray(s)) {
      for (const it of s) {
        const h = it?.title || it?.section || 'Section'
        const body = (it?.content || it?.body || '').trim()
        if (body) out.push({ title: String(h), body })
      }
    } else if (s && typeof s === 'object') {
      for (const [k, v] of Object.entries(s)) {
        const body = String(v ?? '').trim()
        if (body) out.push({ title: String(k), body })
      }
    } else if (raw?.summary_content) {
      out.push(...splitOnH2(String(raw.summary_content)))
    }

    return { title, sections: out }
  }, [splitOnH2])

  const normalizeBasic = useCallback((raw: any) => {
    const title = typeof raw?.summary_title === 'string' ? raw.summary_title : undefined
    const body = String(raw?.summary_content ?? '').trim()
    const sections = body ? splitOnH2(body) : []
    return { title, sections }
  }, [splitOnH2])

  const splitOnH3 = useCallback((md: string): Section[] | null => {
    if (!md || !md.includes('###')) return null
    const parts = String(md).split(/\n(?=###\s)/g).map(p => p.trim()).filter(Boolean)
    const result: Section[] = []
    for (const part of parts) {
      const [first, ...rest] = part.split('\n')
      if (!/^###\s/.test(first)) {
        result.push({ title: first || 'Section', body: rest.join('\n').trim() })
        continue
      }
      const title = first.replace(/^###\s+/, '').trim() || 'Section'
      const body = rest.join('\n').trim()
      if (body) result.push({ title, body })
    }
    return result
  }, [])

  // Data load ---------------------------------------------------------------
  const loadAll = useCallback(async () => {
    if (!bookId || !chapter) return
    setLoading(true)
    setError(null)

    try {
      const [textRes, basicRes, advRes, pageRes, termsRes] = await Promise.all([
        fetchChapterText(bookId, chapter, translation ?? undefined),
        fetchChapterSummary(bookId, chapter),
        fetchAdvancedChapterSummary(bookId, chapter),
        fetchChapterPage(bookId, chapter),
        fetchTermsInChapter(bookId, chapter),
      ])

      // normalize verses
      const rawVerses: any = textRes
      let nextVerses: Verse[] = []
      if (Array.isArray(rawVerses?.verses)) nextVerses = rawVerses.verses
      else if (Array.isArray(rawVerses?.chapter_verses)) nextVerses = rawVerses.chapter_verses
      else if (Array.isArray(rawVerses)) nextVerses = rawVerses
      else if (Array.isArray(rawVerses?.text)) nextVerses = rawVerses.text.map((t: any, i: number) => ({ number: i + 1, text: String(t) }))
      else if (typeof rawVerses?.chapter_text === 'string') nextVerses = String(rawVerses.chapter_text).split('\n').filter(Boolean).map((t: string, i: number) => ({ number: i + 1, text: t }))
      setVerses(nextVerses)

      setBasic(basicRes ?? null)
      setAdvRaw(advRes ?? null)

      const nameFromText = (rawVerses?.book_name || rawVerses?.book || rawVerses?.name) ?? null
      if (!bookNameResolved && nameFromText) setBookNameResolved(String(nameFromText))

      // Build verse insights map from page data
      const mappedInsights: Record<number, string> = {}
      for (const it of pageRes?.insights ?? []) {
        if ((it as any)?.verse_number == null) continue
        const body = (it as any).insight_detail ?? (it as any).insight ?? ''
        const title = (it as any).insight_title ?? ''
        mappedInsights[(it as any).verse_number] = body || title || ''
      }
      setVerseInsightsByVerse(mappedInsights)

      // Build biblical terms with insights
      const terms = (termsRes ?? []).map((t: any) => ({
        word: String(t.term ?? '').trim(),
        insight: t.simple_definition || '',
        detailed_explanation: t.detailed_explanation || '',
      })).filter((t: any) => t.word.length > 0)
      
      console.log('[ChapterScreen] Fetched', terms.length, 'biblical terms')
      if (terms.length > 0) {
        console.log('[ChapterScreen] Sample term:', terms[0])
      }
      setBiblicalTerms(terms)

    } catch (e: any) {
      setError(e?.message ?? 'Failed to load chapter.')
    } finally {
      setLoading(false)
    }
  }, [bookId, chapter, translation, bookNameResolved])

  useEffect(() => {
    loadAll()
    mountTimeRef.current = Date.now()
  }, [loadAll])

  const advanced = useMemo(() => normalizeAdvanced(advRaw || {}), [advRaw, normalizeAdvanced])
  const basicParsed = useMemo(() => normalizeBasic(basic || {}), [basic, normalizeBasic])

  const advancedOutline: OutlineNode[] = useMemo(() => {
    const nodes: OutlineNode[] = []
    for (const sec of advanced.sections) {
      const children = splitOnH3(sec.body)
      if (children && children.length) nodes.push({ title: sec.title, children })
      else nodes.push({ title: sec.title, body: sec.body })
    }
    return nodes
  }, [advanced.sections, splitOnH3])

  const basicOutline: OutlineNode[] = useMemo(() => {
    const nodes: OutlineNode[] = []
    for (const sec of basicParsed.sections) {
      const children = splitOnH3(sec.body)
      if (children && children.length) nodes.push({ title: sec.title, children })
      else nodes.push({ title: sec.title, body: sec.body })
    }
    return nodes
  }, [basicParsed.sections, splitOnH3])

  // ---- Progress: direct DB writes ----
  const markChapterRead = useCallback(async () => {
    try {
      if (!bookNameResolved) {
        Alert.alert('Error', 'Book name not available')
        return
      }
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) {
        Alert.alert('Error', 'Not signed in')
        return
      }

      // Check if row exists first
      const { data: existing } = await supabase
        .from('user_reading_progress')
        .select('user_id')
        .eq('user_id', userId)
        .eq('book_name', bookNameResolved)
        .eq('chapter_number', chapter)
        .maybeSingle()

      if (existing) {
        // Update existing row
        const { error } = await supabase
          .from('user_reading_progress')
          .update({ completed_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('book_name', bookNameResolved)
          .eq('chapter_number', chapter)

        if (error) throw error
      } else {
        // Insert new row
        const { error } = await supabase
          .from('user_reading_progress')
          .insert({
            user_id: userId,
            book_name: bookNameResolved,
            chapter_number: chapter,
            completed_at: new Date().toISOString(),
          })

        if (error) throw error
      }

      Alert.alert('✓ Marked Read', `${bookNameResolved} ${chapter} marked as read`)
    } catch (e: any) {
      console.error('[markChapterRead] error:', e)
      Alert.alert('Error', e?.message ?? 'Unable to mark as read')
    }
  }, [bookNameResolved, chapter])

  const markSummaryComplete = useCallback(async () => {
    try {
      if (!bookNameResolved) {
        Alert.alert('Error', 'Book name not available')
        return
      }
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) {
        Alert.alert('Error', 'Not signed in')
        return
      }

      // Check if row exists first
      const { data: existing } = await supabase
        .from('user_summary_progress')
        .select('user_id')
        .eq('user_id', userId)
        .eq('book_name', bookNameResolved)
        .eq('chapter_number', chapter)
        .eq('study_tier', studyTier)
        .maybeSingle()

      if (existing) {
        // Update existing row - only update completed_at (no seconds_spent column)
        const { error } = await supabase
          .from('user_summary_progress')
          .update({ completed_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('book_name', bookNameResolved)
          .eq('chapter_number', chapter)
          .eq('study_tier', studyTier)

        if (error) throw error
      } else {
        // Insert new row - only include columns that exist
        const { error } = await supabase
          .from('user_summary_progress')
          .insert({
            user_id: userId,
            book_name: bookNameResolved,
            chapter_number: chapter,
            study_tier: studyTier,
            completed_at: new Date().toISOString(),
          })

        if (error) throw error
      }

      Alert.alert('✓ Complete!', `${studyTier === 'basic' ? 'Basic' : 'Advanced'} summary marked complete`)
    } catch (e: any) {
      console.error('[markSummaryComplete] error:', e)
      Alert.alert('Error', e?.message ?? 'Unable to mark complete')
    }
  }, [bookNameResolved, chapter, studyTier])

  const noVerses = !verses || verses.length === 0

  return (
    <View style={styles.screen}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => setTab('read')} style={[styles.tab, tab === 'read' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'read' && styles.tabTextActive]}>Read</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('summary')} style={[styles.tab, tab === 'summary' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'summary' && styles.tabTextActive]}>Summary</Text>
        </TouchableOpacity>

        {tab === 'summary' && (
          <View style={styles.tierToggle}>
            <TouchableOpacity onPress={() => setStudyTier('basic')} style={[styles.tierBtn, studyTier === 'basic' && styles.tierBtnActive]}>
              <Text style={[styles.tierText, studyTier === 'basic' && styles.tierTextActive]}>Basic</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStudyTier('advanced')} style={[styles.tierBtn, studyTier === 'advanced' && styles.tierBtnActive]}>
              <Text style={[styles.tierText, studyTier === 'advanced' && styles.tierTextActive]}>Advanced</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>          
          {tab === 'read' ? (
            <>
              {noVerses ? (
                <Text style={styles.muted}>No verses available for this chapter{translation ? ` (${translation})` : ''}.</Text>
              ) : (
                <ChapterText
                  verses={verses}
                  verseInsightsByVerse={verseInsightsByVerse}
                  biblicalTerms={biblicalTerms}
                  bookName={bookNameResolved ?? undefined}
                  chapter={chapter}
                />
              )}

              <View style={{ height: 12 }} />
              <TouchableOpacity style={[styles.completeBtn, { backgroundColor: '#111827' }]} onPress={markChapterRead}>
                <Text style={styles.completeText}>✓ Mark Chapter Read</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {studyTier === 'basic' ? (
                <View>
                  {typeof basicParsed.title === 'string' ? <Text style={styles.title}>{basicParsed.title}</Text> : null}
                  {basicOutline.length === 0 ? (
                    <Text style={styles.muted}>No summary available.</Text>
                  ) : (
                    <View>
                      {basicOutline.map((node, idx) => {
                        const baseKey = `${bookNameResolved ?? 'book'}-${chapter}-${node.title}-basic-${idx}`
                        if (node.children?.length) {
                          return (
                            <ExpandableSection
                              key={baseKey}
                              title={node.title}
                              initiallyExpanded={idx === 0}
                              enableAnnotations
                              book_name={bookNameResolved ?? undefined}
                              chapter={chapter}
                              studyTier="basic"
                              sectionKey={node.title}
                            >
                              <View style={{ gap: 8 }}>
                                {node.children.map((c, cIdx) => (
                                  <ExpandableSection
                                    key={`${baseKey}-child-${cIdx}`}
                                    title={c.title}
                                    initiallyExpanded={false}
                                    enableAnnotations
                                    book_name={bookNameResolved ?? undefined}
                                    chapter={chapter}
                                    studyTier="basic"
                                    sectionKey={`${node.title}::${c.title}`}
                                    markdown={String(c.body ?? '')}
                                  />
                                ))}
                              </View>
                            </ExpandableSection>
                          )
                        }
                        return (
                          <ExpandableSection
                            key={baseKey}
                            title={node.title}
                            initiallyExpanded={idx === 0}
                            enableAnnotations
                            book_name={bookNameResolved ?? undefined}
                            chapter={chapter}
                            studyTier="basic"
                            sectionKey={node.title}
                            markdown={String(node.body ?? '')}
                          />
                        )
                      })}
                    </View>
                  )}
                </View>
              ) : (
                <View>
                  {typeof advanced.title === 'string' ? <Text style={styles.title}>{advanced.title}</Text> : null}
                  {advancedOutline.length === 0 ? (
                    <Text style={styles.muted}>No advanced content available.</Text>
                  ) : (
                    <View>
                      {advancedOutline.map((node, idx) => {
                        const baseKey = `${bookNameResolved ?? 'book'}-${chapter}-${node.title}-${idx}`
                        if (node.children?.length) {
                          return (
                            <ExpandableSection
                              key={baseKey}
                              title={node.title}
                              initiallyExpanded={idx === 0}
                              enableAnnotations
                              book_name={bookNameResolved ?? undefined}
                              chapter={chapter}
                              studyTier={studyTier}
                              sectionKey={node.title}
                            >
                              <View style={{ gap: 8 }}>
                                {node.children.map((c, cIdx) => (
                                  <ExpandableSection
                                    key={`${baseKey}-child-${cIdx}`}
                                    title={c.title}
                                    initiallyExpanded={false}
                                    enableAnnotations
                                    book_name={bookNameResolved ?? undefined}
                                    chapter={chapter}
                                    studyTier={studyTier}
                                    sectionKey={`${node.title}::${c.title}`}
                                    markdown={String(c.body ?? '')}
                                  />
                                ))}
                              </View>
                            </ExpandableSection>
                          )
                        }
                        return (
                          <ExpandableSection
                            key={baseKey}
                            title={node.title}
                            initiallyExpanded={idx === 0}
                            enableAnnotations
                            book_name={bookNameResolved ?? undefined}
                            chapter={chapter}
                            studyTier={studyTier}
                            sectionKey={node.title}
                            markdown={String(node.body ?? '')}
                          />
                        )
                      })}
                    </View>
                  )}
                </View>
              )}

              <View style={{ height: 12 }} />
              <TouchableOpacity style={styles.completeBtn} onPress={markSummaryComplete}>
                <Text style={styles.completeText}>✓ Mark Summary Complete</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' },
  tabBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  tab: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f3f4f6' },
  tabActive: { backgroundColor: '#111827' },
  tabText: { color: '#111827', fontWeight: '700' },
  tabTextActive: { color: '#fff' },

  tierToggle: { marginLeft: 'auto', flexDirection: 'row', gap: 8 },
  tierBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f3f4f6' },
  tierBtnActive: { backgroundColor: '#2563eb' },
  tierText: { color: '#111827', fontWeight: '700' },
  tierTextActive: { color: '#fff' },

  body: { paddingHorizontal: 12, paddingBottom: 80 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#111827' },
  muted: { color: '#6b7280' },
  error: { color: '#b91c1c' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  completeBtn: { backgroundColor: '#10b981', height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  completeText: { color: 'white', fontWeight: '700' },
})
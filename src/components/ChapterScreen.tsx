// src/components/ChapterScreen.tsx — UPDATED WITH NEW TABS
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native'
import { useRoute } from '@react-navigation/native'
import {
  fetchChapterText,
  fetchChapterSummary,
  fetchAdvancedChapterSummary,
  fetchChapterPage,
  fetchTermsInChapter,
  fetchChapterKeyVerses,
} from '../services/scripture'
import ChapterText from './ChapterText'
import OnePagerTab from './OnePagerTab'
import CrossReferencesTab from './CrossReferencesTab'
import DiscussionQuestionsTab from './DiscussionQuestionsTab'
import KeyHebrewWordsTab from './KeyHebrewWordsTab'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../theme/colors'

type RouteParams = { bookId: number; chapter: number; bookName?: string; translation?: string }
type Verse = { number: number; text: string }
type TabType = 'read' | 'onepager' | 'crossrefs' | 'discussion' | 'hebrew'

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

  const [tab, setTab] = useState<TabType>('read')

  const [verses, setVerses] = useState<Verse[]>([])
  const [basic, setBasic] = useState<{ summary_title?: string; summary_content?: string } | null>(null)
  const [advRaw, setAdvRaw] = useState<any>(null)
  const [keyVerses, setKeyVerses] = useState<Array<{ verse_number: number; text: string }>>([])

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

  // Helper: Extract a section from markdown by heading
  const extractSection = useCallback((markdown: string | null, sectionName: string): string | null => {
    if (!markdown) return null
    const content = String(markdown)

    // Escape special regex characters in section name
    const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Sections end at either:
    // - \n\n---\n\n (horizontal rules in advanced summary)
    // - \n## (next main section - NOT ### which are subsections within a section)
    // - End of string
    const regex = new RegExp(`##\\s*${escapedName}([\\s\\S]*?)(?=\\n\\n---\\n\\n|\\n##\\s|$)`, 'i')
    const match = content.match(regex)
    if (match && match[1]) {
      return match[1].trim()
    }
    return null
  }, [])

  // Extract theological themes from basic summary_content
  const extractTheologicalThemes = useCallback((summaryContent: string | null): string | null => {
    return extractSection(summaryContent, 'Theological Themes')
  }, [extractSection])

  // Extract key verses from basic summary_content
  const extractKeyVersesFromBasic = useCallback((summaryContent: string | null): string | null => {
    return extractSection(summaryContent, 'Key Verses')
  }, [extractSection])

  // Data load ---------------------------------------------------------------
  const loadAll = useCallback(async () => {
    if (!bookId || !chapter) return
    setLoading(true)
    setError(null)

    try {
      const [textRes, basicRes, advRes, pageRes, termsRes, keyVersesRes] = await Promise.all([
        fetchChapterText(bookId, chapter, translation ?? undefined),
        fetchChapterSummary(bookId, chapter),
        fetchAdvancedChapterSummary(bookId, chapter),
        fetchChapterPage(bookId, chapter),
        fetchTermsInChapter(bookId, chapter),
        fetchChapterKeyVerses(bookId, chapter),
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
      setKeyVerses(Array.isArray(keyVersesRes) ? keyVersesRes : [])

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

  // Get advanced summary as string
  const advancedSummaryString = useMemo(() => {
    const adv = advRaw?.summary_advanced
    if (typeof adv === 'string') return adv
    if (Array.isArray(adv)) {
      return adv.map((s: any) => {
        const title = s?.title || s?.section || ''
        const body = s?.content || s?.body || ''
        return title ? `## ${title}\n\n${body}` : body
      }).join('\n\n')
    }
    if (adv && typeof adv === 'object') {
      return Object.entries(adv).map(([k, v]) => `## ${k}\n\n${v}`).join('\n\n')
    }
    return null
  }, [advRaw])

  // One Pager data preparation - extract only specific sections
  const onePagerData = useMemo(() => {
    // Extract ONLY the "Original Summary" section from advanced (not the entire advanced)
    const summaryText = extractSection(advancedSummaryString, 'Original Summary')

    // Extract theological themes from basic
    const theologicalThemes = extractTheologicalThemes(basic?.summary_content || null)

    // Extract key verses from basic summary (already formatted as markdown)
    const keyVersesText = extractKeyVersesFromBasic(basic?.summary_content || null)

    // Extract practical applications from advanced summary markdown
    const practicalApplications = extractSection(advancedSummaryString, 'Practical Applications')

    return {
      summary: summaryText,
      theologicalThemes,
      keyVersesText,
      practicalApplications,
    }
  }, [advancedSummaryString, basic, extractTheologicalThemes, extractKeyVersesFromBasic, extractSection])

  // Extract data for other tabs from advanced summary sections
  const crossRefsData = useMemo(() => {
    return extractSection(advancedSummaryString, 'Cross-References')
  }, [advancedSummaryString, extractSection])

  const discussionData = useMemo(() => {
    return extractSection(advancedSummaryString, 'Discussion Questions')
  }, [advancedSummaryString, extractSection])

  const hebrewWordsData = useMemo(() => {
    return extractSection(advancedSummaryString, 'Key Hebrew Words & Insights')
  }, [advancedSummaryString, extractSection])

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

  const noVerses = !verses || verses.length === 0

  // Tab button helper
  const TabButton = ({ tabKey, label }: { tabKey: TabType; label: string }) => (
    <TouchableOpacity onPress={() => setTab(tabKey)} style={[styles.tab, tab === tabKey && styles.tabActive]}>
      <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.screen}>
      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
      >
        <TabButton tabKey="read" label="Read" />
        <TabButton tabKey="onepager" label="One Pager" />
        <TabButton tabKey="crossrefs" label="Cross-Refs" />
        <TabButton tabKey="discussion" label="Discussion" />
        <TabButton tabKey="hebrew" label="Hebrew" />
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent.primary} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {tab === 'read' && (
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
              <TouchableOpacity style={styles.completeBtn} onPress={markChapterRead}>
                <Text style={styles.completeText}>✓ Mark Chapter Read</Text>
              </TouchableOpacity>
            </>
          )}

          {tab === 'onepager' && (
            <OnePagerTab
              summary={onePagerData.summary}
              theologicalThemes={onePagerData.theologicalThemes}
              keyVersesText={onePagerData.keyVersesText}
              practicalApplications={onePagerData.practicalApplications}
            />
          )}

          {tab === 'crossrefs' && (
            <CrossReferencesTab markdownContent={crossRefsData} />
          )}

          {tab === 'discussion' && (
            <DiscussionQuestionsTab markdownContent={discussionData} />
          )}

          {tab === 'hebrew' && (
            <KeyHebrewWordsTab markdownContent={hebrewWordsData} />
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default
  },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.background.tertiary },
  tabActive: { backgroundColor: colors.accent.primary },
  tabText: { color: colors.text.secondary, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: colors.text.primary },

  body: { paddingBottom: 80 },
  muted: { color: colors.text.muted, padding: 16 },
  error: { color: colors.error, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  completeBtn: { backgroundColor: colors.accent.primary, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginHorizontal: 12, marginTop: 12 },
  completeText: { color: colors.text.primary, fontWeight: '700' },
})

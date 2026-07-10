// src/components/ChapterScreen.tsx — UPDATED WITH NEW TABS
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import {
  fetchChapterText,
  fetchChapterSummary,
  fetchAdvancedChapterSummary,
  fetchChapterPage,
  fetchChapterKeyVerses,
  fetchBooks,
  getChapterDeepDive,
} from '../services/scripture'
import type { Book, ChapterDeepDive } from '../services/scripture'
import { getStudyDepth, setStudyDepth, setLastReadingPosition, type StudyDepth } from '../services/userPrefs'
import { getCurrentCycle } from '../services/readingCycle'
import ChapterText from './ChapterText'
import DeepDiveTab from './DeepDiveTab'
import BookChapterSheet from './BookChapterSheet'
import CrossReferencesTab from './CrossReferencesTab'
import DiscussionQuestionsTab from './DiscussionQuestionsTab'
import KeyHebrewWordsTab from './KeyHebrewWordsTab'
import MyThemeTab from './MyThemeTab'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../theme/colors'

type RouteParams = { bookId: number; chapter: number; bookName?: string; translation?: string }
type Verse = { number: number; text: string }
type TabType = 'read' | 'deepdive' | 'mytheme' | 'crossrefs' | 'discussion'

export default function ChapterScreen() {
  const route = useRoute<any>() as { params?: Partial<RouteParams> }
  const navigation = useNavigation<any>()
  const initialBookId = route?.params?.bookId ?? null
  const initialChapter = route?.params?.chapter ?? 1
  const paramBookName = route?.params?.bookName ?? null
  const paramTranslation = route?.params?.translation ?? null

  const [bookId, setBookId] = useState<number | null>(Number(initialBookId) || null)
  const [chapter, setChapter] = useState<number>(Number(initialChapter) || 1)
  const [bookNameResolved, setBookNameResolved] = useState<string | null>(paramBookName ?? null)
  const [translation, setTranslation] = useState<string | null>(paramTranslation ?? null)

  const [tab, setTab] = useState<TabType>('read')
  const [books, setBooks] = useState<Book[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)

  const [verses, setVerses] = useState<Verse[]>([])
  const [basic, setBasic] = useState<{ summary_title?: string; summary_content?: string } | null>(null)
  const [advRaw, setAdvRaw] = useState<any>(null)
  const [keyVerses, setKeyVerses] = useState<Array<{ verse_number: number; text: string }>>([])

  const [significantVerses, setSignificantVerses] = useState<Set<number>>(new Set())
  const [deepDive, setDeepDive] = useState<ChapterDeepDive | null>(null)
  const [depth, setDepthState] = useState<StudyDepth>('summary')

  // Load the global sticky depth preference once.
  useEffect(() => {
    getStudyDepth().then(setDepthState).catch(() => {})
  }, [])

  // Change depth from the Deep Dive toggle — persist globally.
  const changeDepth = useCallback((d: StudyDepth) => {
    setDepthState(d)
    setStudyDepth(d)
  }, [])

  // Persist last reading position whenever the reader opens or changes chapter.
  // Both entry paths converge here: home navigate() mounts this screen with route
  // params, and the header sheet's setParams flows through the sync effect into the
  // same state (as do prev/next and cross-ref jumps). bookId may resolve async from
  // bookName, so this refires once all three are set. Nothing reads it yet.
  useEffect(() => {
    if (bookId && bookNameResolved && chapter) {
      setLastReadingPosition({ bookId, bookName: bookNameResolved, chapter })
    }
  }, [bookId, bookNameResolved, chapter])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [chapterReadDate, setChapterReadDate] = useState<string | null>(null)

  const mountTimeRef = useRef<number>(Date.now())

  // Fetch books for chapter navigation + resolve bookName → bookId if needed
  useEffect(() => {
    fetchBooks().then((bks) => {
      setBooks(bks)
      if (!bookId && paramBookName && bks.length > 0) {
        const match = bks.find(b => b.book_name.toLowerCase() === paramBookName.toLowerCase())
        if (match) {
          setBookId(match.id)
          if (!bookNameResolved) setBookNameResolved(match.book_name)
        }
      }
    }).catch(() => {})
  }, [])

  // Sync state when route params change (e.g. cross-ref navigation reuses this screen)
  useEffect(() => {
    const newBookId = Number(route?.params?.bookId) || null
    const newChapter = Number(route?.params?.chapter) || 1
    const newBookName = route?.params?.bookName ?? null
    const newTranslation = route?.params?.translation ?? null

    if (newBookId && newBookId !== bookId) setBookId(newBookId)
    if (newChapter !== chapter) setChapter(newChapter)
    if (newBookName && newBookName !== bookNameResolved) setBookNameResolved(newBookName)
    if (newTranslation !== translation) setTranslation(newTranslation)

    // If no bookId but bookName provided, resolve from books list
    if (!newBookId && newBookName && books.length > 0) {
      const match = books.find(b => b.book_name.toLowerCase() === newBookName.toLowerCase())
      if (match && match.id !== bookId) {
        setBookId(match.id)
        setBookNameResolved(match.book_name)
      }
    }
  }, [route?.params?.bookId, route?.params?.chapter, route?.params?.bookName, route?.params?.translation])

  // Update header title + ensure back button when book/chapter changes
  useEffect(() => {
    if (bookNameResolved) {
      navigation.setOptions({
        headerTitle: () => (
          <TouchableOpacity
            onPress={() => setSheetOpen(true)}
            style={{ flexDirection: 'row', alignItems: 'center' }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>
              {bookNameResolved} {chapter}
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.secondary, marginLeft: 6 }}>{'▾'}</Text>
          </TouchableOpacity>
        ),
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('BibleHome')}
            style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 12 }}
          >
            <Text style={{ fontSize: 28, color: colors.accent.primary, lineHeight: 28 }}>{'\u2039'}</Text>
            <Text style={{ fontSize: 16, color: colors.accent.primary, fontWeight: '600', marginLeft: 2 }}>Bible</Text>
          </TouchableOpacity>
        ),
        headerRight: chapterReadDate ? () => (
          <View style={styles.readBadge}>
            <Text style={styles.readBadgeCheck}>{'\u2713'}</Text>
            <Text style={styles.readBadgeText}>{formatReadDate(chapterReadDate)}</Text>
          </View>
        ) : undefined,
      })
    }
  }, [navigation, bookNameResolved, chapter, chapterReadDate])

  // Compute previous/next chapter
  const previousChapter = useMemo(() => {
    if (!bookId || books.length === 0) return null
    if (chapter > 1) {
      return { bookId, chapter: chapter - 1, bookName: bookNameResolved }
    }
    const currentIdx = books.findIndex(b => b.id === bookId)
    if (currentIdx > 0) {
      const prevBook = books[currentIdx - 1]
      return { bookId: prevBook.id, chapter: prevBook.total_chapters, bookName: prevBook.book_name }
    }
    return null // Genesis 1
  }, [bookId, chapter, books, bookNameResolved])

  const nextChapter = useMemo(() => {
    if (!bookId || books.length === 0) return null
    const currentBook = books.find(b => b.id === bookId)
    if (currentBook && chapter < currentBook.total_chapters) {
      return { bookId, chapter: chapter + 1, bookName: bookNameResolved }
    }
    const currentIdx = books.findIndex(b => b.id === bookId)
    if (currentIdx >= 0 && currentIdx < books.length - 1) {
      const nextBook = books[currentIdx + 1]
      return { bookId: nextBook.id, chapter: 1, bookName: nextBook.book_name }
    }
    return null // Revelation 22
  }, [bookId, chapter, books, bookNameResolved])

  const navigateToChapter = useCallback((target: { bookId: number; chapter: number; bookName: string | null }) => {
    // Update the current reader in place (like the header sheet) — never push a new
    // screen, so a long reading session stays at one reader, not a deep stack.
    navigation.setParams({
      bookId: target.bookId,
      chapter: target.chapter,
      bookName: target.bookName,
      book_name: target.bookName,
      translation,
    })
  }, [navigation, translation])

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

  // Data load ---------------------------------------------------------------
  const loadAll = useCallback(async () => {
    if (!bookId || !chapter) return
    setLoading(true)
    setError(null)

    try {
      const [textRes, basicRes, advRes, pageRes, keyVersesRes] = await Promise.all([
        fetchChapterText(bookId, chapter, translation ?? undefined),
        fetchChapterSummary(bookId, chapter),
        fetchAdvancedChapterSummary(bookId, chapter),
        fetchChapterPage(bookId, chapter),
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

      // Significance flags: verses present in bible_verse_insights (content dropped — underline only)
      const sig = new Set<number>()
      for (const it of pageRes?.insights ?? []) {
        const vn = (it as any)?.verse_number
        if (vn != null) sig.add(vn)
      }
      setSignificantVerses(sig)

      // Chapter Deep Dive (keyed on book_name; null → blank tab on unauthored chapters)
      const effectiveName = bookNameResolved ?? (nameFromText ? String(nameFromText) : null)
      setDeepDive(effectiveName ? await getChapterDeepDive(effectiveName, chapter) : null)

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

  // Fetch chapter read status
  const loadReadStatus = useCallback(async () => {
    if (!bookNameResolved) return
    try {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) return
      const cycle = await getCurrentCycle()
      const { data } = await supabase
        .from('user_reading_progress')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('book_name', bookNameResolved)
        .eq('chapter_number', chapter)
        .eq('cycle', cycle)
        .maybeSingle()
      setChapterReadDate(data?.completed_at ?? null)
    } catch {}
  }, [bookNameResolved, chapter])

  useEffect(() => {
    setChapterReadDate(null)
    loadReadStatus()
  }, [loadReadStatus])

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

      const cycle = await getCurrentCycle()

      // Check if row exists first (scoped to the current cycle)
      const { data: existing } = await supabase
        .from('user_reading_progress')
        .select('user_id')
        .eq('user_id', userId)
        .eq('book_name', bookNameResolved)
        .eq('chapter_number', chapter)
        .eq('cycle', cycle)
        .maybeSingle()

      if (existing) {
        // Update existing row
        const { error } = await supabase
          .from('user_reading_progress')
          .update({ completed_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('book_name', bookNameResolved)
          .eq('chapter_number', chapter)
          .eq('cycle', cycle)

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
            cycle,
          })

        if (error) throw error
      }

      setChapterReadDate(new Date().toISOString())
      Alert.alert('✓ Marked Read', `${bookNameResolved} ${chapter} marked as read`)
    } catch (e: any) {
      console.error('[markChapterRead] error:', e)
      Alert.alert('Error', e?.message ?? 'Unable to mark as read')
    }
  }, [bookNameResolved, chapter])

  const noVerses = !verses || verses.length === 0

  function formatReadDate(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

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
        <TabButton tabKey="deepdive" label="Deep Dive" />
        <TabButton tabKey="mytheme" label="My Theme" />
        <TabButton tabKey="crossrefs" label="Cross-Refs" />
        <TabButton tabKey="discussion" label="Discussion" />
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
                  significantVerses={significantVerses}
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

          {tab === 'deepdive' && (
            <DeepDiveTab
              deepDive={deepDive}
              depth={depth}
              onChangeDepth={changeDepth}
              bookName={bookNameResolved}
              chapter={chapter}
            />
          )}

          {tab === 'mytheme' && bookNameResolved && (
            <MyThemeTab bookName={bookNameResolved} chapter={chapter} />
          )}

          {tab === 'crossrefs' && (
            <CrossReferencesTab markdownContent={crossRefsData} />
          )}

          {tab === 'discussion' && (
            <DiscussionQuestionsTab markdownContent={discussionData} />
          )}

          {/* Chapter Navigation */}
          {books.length > 0 && (
            <View style={styles.chapterNav}>
              <TouchableOpacity
                style={[styles.navBtn, !previousChapter && styles.navBtnDisabled]}
                onPress={() => previousChapter && navigateToChapter(previousChapter)}
                disabled={!previousChapter}
              >
                <Text style={[styles.navBtnText, !previousChapter && styles.navBtnTextDisabled]}>
                  Previous
                </Text>
                {previousChapter && (
                  <Text style={styles.navBtnSub}>
                    {previousChapter.bookName} {previousChapter.chapter}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtn, !nextChapter && styles.navBtnDisabled]}
                onPress={() => nextChapter && navigateToChapter(nextChapter)}
                disabled={!nextChapter}
              >
                <Text style={[styles.navBtnText, !nextChapter && styles.navBtnTextDisabled]}>
                  Next
                </Text>
                {nextChapter && (
                  <Text style={styles.navBtnSub}>
                    {nextChapter.bookName} {nextChapter.chapter}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <BookChapterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        books={books}
        currentBookName={bookNameResolved}
        onSelect={(book, ch) => {
          navigation.setParams({
            bookId: book.id,
            bookName: book.book_name,
            book_name: book.book_name,
            chapter: ch,
          })
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
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

  chapterNav: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: colors.border.default, marginTop: 16 },
  navBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: colors.border.default, alignItems: 'center' },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  navBtnTextDisabled: { color: colors.text.tertiary },
  navBtnSub: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },

  // Read status badge in header
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.3)',
    marginRight: 4,
  },
  readBadgeCheck: { fontSize: 12, color: colors.success, marginRight: 4, fontWeight: '700' },
  readBadgeText: { fontSize: 11, color: colors.success, fontWeight: '600' },
})

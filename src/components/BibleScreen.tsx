// src/components/BibleScreen.tsx
// Bible tab root: full-screen book -> chapter tile picker with a Continue button
// above the book grid. Shares BookChapterTiles with the reader's BookChapterSheet.
import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { fetchBooks, fetchReadChapterCounts, fetchReadChapters, type Book } from '../services/scripture'
import { getPreferredTranslation, getLastReadingPosition, getBookSort, setBookSort, type LastReadingPosition, type BookSort } from '../services/userPrefs'
import { getCurrentCycle } from '../services/readingCycle'
import BookChapterTiles, { type SheetBook } from './BookChapterTiles'
import { colors } from '../theme/colors'

export default function BibleScreen() {
  const navigation = useNavigation<any>()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [pickedBook, setPickedBook] = useState<SheetBook | null>(null)
  const [lastPos, setLastPos] = useState<LastReadingPosition | null>(null)
  const [readCounts, setReadCounts] = useState<Record<string, number>>({})
  const [readChapters, setReadChapters] = useState<Set<number>>(new Set())
  const [cycle, setCycle] = useState(1)
  const [sort, setSort] = useState<BookSort>('traditional')

  useEffect(() => {
    (async () => {
      try {
        setBooks(await fetchBooks())
      } finally {
        setLoading(false)
      }
    })()
    getBookSort().then(setSort).catch(() => {})
  }, [])

  const changeSort = useCallback((s: BookSort) => {
    setSort(s)
    setBookSort(s)
  }, [])

  // Reload the last reading position on focus — the tab stays mounted while the
  // user reads, so a mount-only fetch would leave Continue pointing at a stale chapter.
  useFocusEffect(
    useCallback(() => {
      getLastReadingPosition().then(setLastPos).catch(() => {})
      fetchReadChapterCounts().then(setReadCounts).catch(() => {})
      getCurrentCycle().then(setCycle).catch(() => {})
    }, []),
  )

  // Fetch the picked book's read chapters on selection; clear when backing out to books.
  useEffect(() => {
    if (!pickedBook) { setReadChapters(new Set()); return }
    fetchReadChapters(pickedBook.book_name).then(setReadChapters).catch(() => {})
  }, [pickedBook])

  const openChapter = useCallback(
    async (book: SheetBook, chapter: number) => {
      const translation = (await getPreferredTranslation()) ?? undefined
      navigation.navigate('Chapter', {
        bookId: book.id,
        book_name: book.book_name,
        bookName: book.book_name,
        chapter: Number(chapter),
        translation,
      })
    },
    [navigation],
  )

  const resume = useCallback(
    async (pos: LastReadingPosition) => {
      const translation = (await getPreferredTranslation()) ?? undefined
      navigation.navigate('Chapter', {
        bookId: pos.bookId,
        book_name: pos.bookName,
        bookName: pos.bookName,
        chapter: pos.chapter,
        translation,
      })
    },
    [navigation],
  )

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />

  // "Reading cycle N" only surfaces once the user is past their first cycle.
  const topSlot = (cycle > 1 || lastPos) ? (
    <>
      {cycle > 1 && (
        <View style={styles.cycleBanner}>
          <Text style={styles.cycleBannerText}>Reading cycle {cycle}</Text>
        </View>
      )}
      {lastPos && (
        <TouchableOpacity style={styles.continueBtn} onPress={() => resume(lastPos)}>
          <Text style={styles.continueBtnText}>Continue — {lastPos.bookName} {lastPos.chapter}</Text>
        </TouchableOpacity>
      )}
    </>
  ) : undefined

  return (
    <View style={styles.container}>
      <BookChapterTiles
        books={books}
        pickedBook={pickedBook}
        setPickedBook={setPickedBook}
        onSelect={openChapter}
        presentation="screen"
        readCounts={readCounts}
        readChapters={readChapters}
        sort={sort}
        onSortChange={changeSort}
        topSlot={topSlot}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  continueBtn: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  continueBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cycleBanner: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  cycleBannerText: { color: colors.text.secondary, fontWeight: '700', fontSize: 13 },
})

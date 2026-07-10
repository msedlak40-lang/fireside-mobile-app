// src/components/BookChapterSheet.tsx
// Modal (bottom-sheet) presentation of the book -> chapter tile picker, opened from
// the reader's header title. Tab-root full-screen presentation lives in BibleScreen.
import React, { useEffect, useState } from 'react'
import { Modal, View, StyleSheet, Pressable } from 'react-native'
import { colors } from '../theme/colors'
import { fetchReadChapterCounts, fetchReadChapters } from '../services/scripture'
import BookChapterTiles, { type SheetBook } from './BookChapterTiles'

type Props = {
  visible: boolean
  onClose: () => void
  books: SheetBook[]
  onSelect: (book: SheetBook, chapter: number) => void
  currentBookName?: string | null
}

export default function BookChapterSheet({ visible, onClose, books, onSelect, currentBookName }: Props) {
  const [pickedBook, setPickedBook] = useState<SheetBook | null>(null)
  const [readCounts, setReadCounts] = useState<Record<string, number>>({})
  const [readChapters, setReadChapters] = useState<Set<number>>(new Set())

  // Always reopen on the book step.
  useEffect(() => {
    if (!visible) setPickedBook(null)
  }, [visible])

  // Fetch read-chapter counts only when the sheet opens — not on every reader mount.
  useEffect(() => {
    if (visible) fetchReadChapterCounts().then(setReadCounts).catch(() => {})
  }, [visible])

  // Fetch the picked book's read chapters on selection; clear when backing out to books.
  useEffect(() => {
    if (!pickedBook) { setReadChapters(new Set()); return }
    fetchReadChapters(pickedBook.book_name).then(setReadChapters).catch(() => {})
  }, [pickedBook])

  function handleClose() {
    setPickedBook(null)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={pickedBook ? () => setPickedBook(null) : handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <BookChapterTiles
            books={books}
            pickedBook={pickedBook}
            setPickedBook={setPickedBook}
            onSelect={(book, ch) => { onSelect(book, ch); handleClose() }}
            presentation="sheet"
            currentBookName={currentBookName}
            readCounts={readCounts}
            readChapters={readChapters}
            onClose={handleClose}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border.light,
    alignSelf: 'center', marginTop: 10, marginBottom: 8,
  },
})

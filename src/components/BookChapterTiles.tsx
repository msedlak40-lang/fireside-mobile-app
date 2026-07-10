// src/components/BookChapterTiles.tsx
// Shared two-step book -> chapter tile grid. Controlled: the parent owns pickedBook.
// Used by BookChapterSheet (modal presentation) and BibleScreen (tab-root presentation).
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { colors } from '../theme/colors'
import type { BookSort } from '../services/userPrefs'

export type SheetBook = { id: number; book_name: string; total_chapters: number }

type Props = {
  books: SheetBook[]
  pickedBook: SheetBook | null
  setPickedBook: (b: SheetBook | null) => void
  onSelect: (book: SheetBook, chapter: number) => void
  presentation: 'sheet' | 'screen'
  /** Highlight the book currently being read (optional). */
  currentBookName?: string | null
  /** Rendered above the book grid (book step only) — e.g. the Continue button. */
  topSlot?: React.ReactNode
  /** Close affordance — sheet presentation only. */
  onClose?: () => void
  /** Per-book count of distinct read chapters (book_name → count). Fills in async. */
  readCounts?: Record<string, number>
  /** Read chapter numbers for the picked book. Fills in async on book selection. */
  readChapters?: Set<number>
  /** Book display order. Screen presentation only; drives the sort footer. */
  sort?: BookSort
  onSortChange?: (sort: BookSort) => void
}

// Pad the tail row with nulls so tiles keep a uniform width (flex:1 would otherwise stretch a short last row).
function padTo<T>(arr: T[], cols: number): (T | null)[] {
  const out: (T | null)[] = [...arr]
  while (out.length % cols !== 0) out.push(null)
  return out
}

export default function BookChapterTiles({
  books, pickedBook, setPickedBook, onSelect, presentation, currentBookName, topSlot, onClose, readCounts, readChapters,
  sort = 'traditional', onSortChange,
}: Props) {
  const chapters = pickedBook
    ? padTo(Array.from({ length: pickedBook.total_chapters || 1 }, (_, i) => i + 1), 5)
    : []
  // Sort is display-only: read counts / green tiles key off book_name and follow each book.
  const orderedBooks = sort === 'az'
    ? [...books].sort((a, b) => a.book_name.localeCompare(b.book_name))
    : books
  const bookData = padTo(orderedBooks, 2)

  // The screen presentation carries its own nav header, so it only needs the
  // in-body header on the chapter step (for the "‹ Books" back affordance).
  const showHeader = presentation === 'sheet' || !!pickedBook

  const booksList = (
    <FlatList
      key="books"
      data={bookData}
      keyExtractor={(b, i) => (b ? `bk-${b.id}` : `bk-pad-${i}`)}
      numColumns={2}
      columnWrapperStyle={styles.bookRow}
      contentContainerStyle={styles.grid}
      style={presentation === 'screen' ? styles.booksListScreen : undefined}
      ListHeaderComponent={topSlot ? <>{topSlot}</> : null}
      renderItem={({ item }) => {
        if (item == null) return <View style={[styles.bookTile, styles.tilePlaceholder]} />
        const isCurrent = !!currentBookName && item.book_name === currentBookName
        return (
          <TouchableOpacity
            style={[styles.bookTile, isCurrent && styles.bookTileCurrent]}
            onPress={() => setPickedBook(item)}
          >
            <Text style={[styles.bookTileText, isCurrent && styles.bookTileTextCurrent]} numberOfLines={2}>
              {item.book_name}
            </Text>
            <Text style={styles.bookTileProgress}>
              {readCounts?.[item.book_name] ?? 0}/{item.total_chapters}
            </Text>
          </TouchableOpacity>
        )
      }}
    />
  )

  // Sticky sort footer — screen presentation, book step only (this const is only rendered there).
  const sortFooter = (
    <View style={styles.sortFooter}>
      {([['traditional', 'Traditional'], ['az', 'A–Z']] as const).map(([value, label]) => {
        const active = sort === value
        return (
          <TouchableOpacity
            key={value}
            style={[styles.sortOption, active && styles.sortOptionActive]}
            onPress={() => onSortChange?.(value)}
          >
            <Text style={[styles.sortOptionText, active && styles.sortOptionTextActive]}>{label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )

  return (
    <>
      {showHeader && (
        <View style={styles.header}>
          {pickedBook ? (
            <TouchableOpacity onPress={() => setPickedBook(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backText}>{'‹'} Books</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
          <Text style={styles.title} numberOfLines={1}>
            {pickedBook ? pickedBook.book_name : 'Choose a book'}
          </Text>
          {presentation === 'sheet' ? (
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
      )}

      {pickedBook ? (
        <FlatList
          key="chapters"
          data={chapters}
          keyExtractor={(_, i) => `ch-${i}`}
          numColumns={5}
          columnWrapperStyle={styles.chapterRow}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            item == null ? (
              <View style={[styles.chapterTile, styles.tilePlaceholder]} />
            ) : (
              (() => {
                const isRead = !!readChapters?.has(item)
                return (
                  <TouchableOpacity
                    style={[styles.chapterTile, isRead && styles.chapterTileRead]}
                    onPress={() => onSelect(pickedBook, item)}
                  >
                    <Text style={[styles.chapterTileText, isRead && styles.chapterTileTextRead]}>{item}</Text>
                  </TouchableOpacity>
                )
              })()
            )
          )}
        />
      ) : presentation === 'screen' ? (
        // Bounded scroll region + pinned sort footer (full-bleed FlatList can't pin a footer).
        <View style={styles.screenBookWrap}>
          {booksList}
          {sortFooter}
        </View>
      ) : (
        booksList
      )}
    </>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingVertical: 8,
  },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.text.primary, paddingHorizontal: 8 },
  backText: { color: colors.accent.primary, fontWeight: '700', fontSize: 15, width: 60 },
  closeText: { color: colors.text.secondary, fontWeight: '700', fontSize: 15, width: 60, textAlign: 'right' },

  grid: { paddingVertical: 8, paddingHorizontal: 4 },
  bookRow: { gap: 8, marginBottom: 8 },
  bookTile: {
    flex: 1, minHeight: 56, borderRadius: 10,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  bookTileCurrent: { borderColor: colors.accent.primary, borderWidth: 2 },
  bookTileText: { color: colors.text.primary, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  bookTileTextCurrent: { color: colors.accent.primary },
  bookTileProgress: { color: colors.text.muted, fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  chapterRow: { gap: 8, marginBottom: 8 },
  chapterTile: {
    flex: 1, height: 52, borderRadius: 10,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  chapterTileText: { color: colors.text.primary, fontWeight: '700', fontSize: 15 },
  chapterTileRead: { backgroundColor: 'rgba(39, 174, 96, 0.15)', borderColor: colors.success },
  chapterTileTextRead: { color: colors.success },
  tilePlaceholder: { backgroundColor: 'transparent', borderColor: 'transparent' },

  screenBookWrap: { flex: 1 },
  booksListScreen: { flex: 1 },
  sortFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background.primary,
  },
  sortOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.tertiary,
  },
  sortOptionActive: { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  sortOptionText: { color: colors.text.secondary, fontWeight: '700', fontSize: 13 },
  sortOptionTextActive: { color: '#fff' },
})

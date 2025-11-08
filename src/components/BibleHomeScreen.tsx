import React, { useEffect, useState, useCallback } from 'react'
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/AppNavigator'
import { fetchBooks, type Book } from '../services/scripture'
import BookChapterPicker from '../components/BookChapterPicker'
import { colors } from '../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'BibleHome'>

export default function BibleHomeScreen({ navigation }: Props) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  // selection coming from the picker
  const [selBook, setSelBook] = useState<Book | null>(null)
  const [selChapter, setSelChapter] = useState<number>(1)
  const [selTranslation, setSelTranslation] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchBooks()
        setBooks(data)
        if (data.length && !selBook) setSelBook(data[0])
      } finally {
        setLoading(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openSelected = useCallback(() => {
    if (!selBook || !selChapter) return
    navigation.navigate('Chapter', {
      bookId: selBook.id,
      book_name: selBook.book_name,
      bookName: selBook.book_name,
      chapter: Number(selChapter),
      translation: selTranslation ?? undefined,
    })
  }, [navigation, selBook, selChapter, selTranslation])

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />

  return (
    <View style={styles.container}>
      <BookChapterPicker
        books={books}
        onSelectionChange={({ book, chapter, translation }) => {
          if (book) setSelBook(book)
          setSelChapter(chapter)
          setSelTranslation(translation)
        }}
        onGo={(book, chapter, translation) => {
          navigation.navigate('Chapter', {
            bookId: book.id,
            book_name: book.book_name,
            bookName: book.book_name,
            chapter: Number(chapter),
            translation: translation ?? undefined,
          })
        }}
      />

      {/* RESTORED: Open Chapter button */}
      <TouchableOpacity style={styles.openBtn} onPress={openSelected} disabled={!selBook}>
        <Text style={styles.openBtnText}>
          Open Chapter{selBook ? `: ${selBook.book_name} ${selChapter}${selTranslation ? ` • ${selTranslation}` : ''}` : ''}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, gap: 12 },
  openBtn: {
    marginTop: 8,
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  openBtnText: { color: '#fff', fontWeight: '800' }
})

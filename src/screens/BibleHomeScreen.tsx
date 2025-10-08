import React, { useEffect, useState } from 'react'
import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../AppNavigator'
import { fetchBooks, type Book } from '../../services/scripture'
import BookChapterPicker from '../../components/scripture/BookChapterPicker'

type Props = NativeStackScreenProps<RootStackParamList, 'BibleHome'>

export default function BibleHomeScreen({ navigation }: Props) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [bookName, setBookName] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchBooks()
        setBooks(data)
        if (data.length) {
          setSelectedBookId(data[0].id)
          setBookName(data[0].book_name)
          setSelectedChapter(1)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    const b = books.find(x => x.id === selectedBookId)
    if (b) setBookName(b.book_name)
  }, [selectedBookId, books])

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />

  return (
    <View style={styles.container}>
      <BookChapterPicker
        books={books}
        selectedBookId={selectedBookId}
        onChangeBook={(id) => { setSelectedBookId(id); setSelectedChapter(1) }}
        selectedChapter={selectedChapter}
        onChangeChapter={setSelectedChapter}
      />
      <Button
        title="Open Chapter"
        disabled={!selectedBookId || !selectedChapter}
        onPress={() => {
          navigation.navigate('Chapter', {
            bookId: selectedBookId!,
            bookName,
            chapter: selectedChapter!
          })
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, gap: 12 }
})

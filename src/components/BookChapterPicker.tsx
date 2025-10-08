import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import type { Book } from '../../services/scripture'

type Props = {
  books: Book[]
  selectedBookId: number | null
  onChangeBook: (bookId: number) => void
  selectedChapter: number | null
  onChangeChapter: (chapter: number) => void
}

export default function BookChapterPicker({
  books, selectedBookId, onChangeBook, selectedChapter, onChangeChapter
}: Props) {
  const book = books.find(b => b.id === selectedBookId)
  const totalChapters = book?.total_chapters ?? 0

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Book</Text>
      <Picker
        selectedValue={selectedBookId ?? undefined}
        onValueChange={(v) => onChangeBook(Number(v))}
        style={styles.picker}
      >
        {books.map(b => (
          <Picker.Item key={b.id} label={`${b.id}. ${b.book_name}`} value={b.id} />
        ))}
      </Picker>

      <Text style={styles.label}>Chapter</Text>
      <Picker
        selectedValue={selectedChapter ?? undefined}
        onValueChange={(v) => onChangeChapter(Number(v))}
        enabled={!!selectedBookId}
        style={styles.picker}
      >
        {[...Array(totalChapters)].map((_, i) => {
          const ch = i + 1
          return <Picker.Item key={ch} label={`${ch}`} value={ch} />
        })}
      </Picker>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 12, gap: 8 },
  label: { fontWeight: '600' },
  picker: { backgroundColor: '#fff' }
})

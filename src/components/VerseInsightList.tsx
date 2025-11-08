import React from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import type { VerseInsight } from '../services/scripture'

type Props = {
  insights: VerseInsight[]
  ListHeaderComponent?: React.ReactElement | null
  ListFooterComponent?: React.ReactElement | null
  onPressInsight?: (it: VerseInsight) => void
}

export default function VerseInsightList({ insights, ListHeaderComponent, ListFooterComponent, onPressInsight }: Props) {
  return (
    <FlatList
      data={insights}
      keyExtractor={(_it, index) => String(index)} // avoids duplicate "null" keys
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onPressInsight?.(item)}
          style={styles.card}
        >
          <Text style={styles.verse}>
            {item.verse_number ? `v${item.verse_number}` : 'Chapter'} • {item.insight_type}
          </Text>
          <Text style={styles.title}>{item.insight_title}</Text>
          <Text style={styles.detail}>{item.insight_detail}</Text>
          {!!item.related_verses?.length && (
            <Text style={styles.related}>Related: {item.related_verses.join(', ')}</Text>
          )}
        </TouchableOpacity>
      )}
      ListHeaderComponent={ListHeaderComponent ?? null}
      ListFooterComponent={ListFooterComponent ?? null}
      contentContainerStyle={{ padding: 12, gap: 12 }}
    />
  )
}

const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 12, backgroundColor: '#f7f7f7' },
  verse: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  title: { fontWeight: '700', marginBottom: 6 },
  detail: { lineHeight: 20 },
  related: { marginTop: 8, fontSize: 12, opacity: 0.8 }
})

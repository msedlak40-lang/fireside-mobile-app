import React from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import type { VerseInsight } from '../../services/scripture'

export default function VerseInsightList({ insights }: { insights: VerseInsight[] }) {
  return (
    <FlatList
      data={insights}
      keyExtractor={(it) => String(it.id)}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.verse}>
            {item.verse_number ? `v${item.verse_number}` : 'Chapter'} • {item.insight_type}
          </Text>
          <Text style={styles.title}>{item.insight_title}</Text>
          <Text style={styles.detail}>{item.insight_detail}</Text>
          {!!item.related_verses?.length && (
            <Text style={styles.related}>Related: {item.related_verses.join(', ')}</Text>
          )}
        </View>
      )}
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

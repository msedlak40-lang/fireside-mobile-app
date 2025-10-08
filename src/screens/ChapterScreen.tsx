import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, ScrollView, StyleSheet, Button } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../AppNavigator'
import { fetchChapterPage, fetchChapterSummary, type VerseInsight } from '../../services/scripture'
import VerseInsightList from '../../components/scripture/VerseInsightList'

type Props = NativeStackScreenProps<RootStackParamList, 'Chapter'>

export default function ChapterScreen({ route, navigation }: Props) {
  const { bookId, bookName, chapter } = route.params
  const [loading, setLoading] = useState(true)
  const [summaryTitle, setSummaryTitle] = useState('')
  const [summaryContent, setSummaryContent] = useState('')
  const [insights, setInsights] = useState<VerseInsight[]>([])

  useEffect(() => {
    (async () => {
      try {
        const [{ summary, insights }, sum2] = await Promise.all([
          fetchChapterPage(bookId, chapter),
          fetchChapterSummary(bookId, chapter)
        ])
        if (sum2) {
          setSummaryTitle(sum2.summary_title)
          setSummaryContent(sum2.summary_content)
        } else if (summary) {
          setSummaryTitle(summary.summary_title)
          setSummaryContent(summary.summary_content)
        }
        setInsights(insights)
      } finally {
        setLoading(false)
      }
    })()
  }, [bookId, chapter])

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {!!summaryTitle && <Text style={styles.h1}>{summaryTitle}</Text>}
      {!!summaryContent && <Text style={styles.summary}>{summaryContent}</Text>}

      <View style={{ marginTop: 12 }}>
        <Text style={styles.h2}>Insights</Text>
        <VerseInsightList insights={insights} />
      </View>

      <View style={{ height: 20 }} />
      <Button
        title="Go to Verse 1"
        onPress={() => navigation.navigate('Verse', { bookId, bookName, chapter, verse: 1 })}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 12 },
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  summary: { lineHeight: 20, opacity: 0.9 }
})

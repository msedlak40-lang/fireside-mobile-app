import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../AppNavigator'
import { supabase } from '../../lib/supabaseClient'

type Props = NativeStackScreenProps<RootStackParamList, 'Verse'>

export default function VerseScreen({ route }: Props) {
  const { bookId, chapter, verse } = route.params
  const [loading, setLoading] = useState(true)
  const [insight, setInsight] = useState<any>(null)

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('vw_chapter_verse_insights')
          .select('insight_title,insight_detail,insight_type,related_verses')
          .eq('book_id', bookId).eq('chapter_number', chapter).eq('verse_number', verse)
          .maybeSingle()
        if (error) throw error
        setInsight(data)
      } finally {
        setLoading(false)
      }
    })()
  }, [bookId, chapter, verse])

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />
  if (!insight) return <Text style={{ margin: 20 }}>No insight for this verse.</Text>

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>{insight.insight_title}</Text>
      <Text style={styles.meta}>{insight.insight_type}</Text>
      <Text style={styles.body}>{insight.insight_detail}</Text>
      {!!insight.related_verses?.length && (
        <Text style={styles.meta}>Related: {insight.related_verses.join(', ')}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 12 },
  h1: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  meta: { fontSize: 12, opacity: 0.7, marginBottom: 8 },
  body: { lineHeight: 20 }
})

// src/components/AnnotationsSummaryScreen.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { fetchAnnotationsSummary } from '../services/annotations'

export default function AnnotationsSummaryScreen() {
  const [loading, setLoading] = useState(true)
  const [verses, setVerses] = useState<any[]>([])
  const [summaries, setSummaries] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAnnotationsSummary()
        setVerses(res.verses)
        setSummaries(res.summaries)
      } finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <View style={s.center}><ActivityIndicator /></View>

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h}>Highlights & Notes — Verses</Text>
      {verses.length === 0 ? <Text style={s.muted}>Nothing yet.</Text> : verses.map(v => (
        <View key={v.id} style={s.card}>
          <Text style={s.title}>{v.label}</Text>
          {v.text ? <Text style={s.body}>{v.text}</Text> : null}
          <Text style={s.tag}>{v.type}</Text>
        </View>
      ))}

      <Text style={[s.h, { marginTop: 20 }]}>Highlights & Notes — Summaries</Text>
      {summaries.length === 0 ? <Text style={s.muted}>Nothing yet.</Text> : summaries.map(v => (
        <View key={v.id} style={s.card}>
          <Text style={s.title}>{v.label}</Text>
          {v.text ? <Text style={s.body}>{v.text}</Text> : null}
          <Text style={s.tag}>{v.type}</Text>
        </View>
      ))}
    </ScrollView>
  )
}
const s = StyleSheet.create({
  wrap:{ padding:12, paddingBottom:40 },
  center:{ flex:1, alignItems:'center', justifyContent:'center' },
  h:{ fontWeight:'800', color:'#111827', marginBottom:8 },
  muted:{ color:'#6b7280' },
  card:{ backgroundColor:'#fff', borderWidth:1, borderColor:'#e5e7eb', borderRadius:12, padding:12, marginBottom:10 },
  title:{ fontWeight:'700', color:'#111827', marginBottom:6 },
  body:{ color:'#111827' },
  tag:{ marginTop:6, color:'#6b7280', fontSize:12 },
})

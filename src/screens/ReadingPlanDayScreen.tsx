// ReadingPlanDayScreen.tsx — only differences vs your current file are:
// 1) VerseRow type uses verse_text
// 2) SELECT includes verse_text
// 3) Renderer prints r.verse_text

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { completeReadingPlanDay } from '../services/readingPlans';

type PlanDayRow = {
  id: number;
  plan_id: number;
  day_number: number;
  day_title?: string | null;
  full_reference?: string | null;
  daily_theme?: string | null;
  reflection_questions?: any;
  prayer_prompt?: string | null;
  verse_insight?: string | null;
};

type VerseRow = {
  verse_number: number;
  verse_text: string;     // <-- use verse_text
  book_name: string;
  chapter_number: number;
  translation: string | null;
};

// Normalize book names to handle variations like Psalm/Psalms
function normalizeBookName(bookName: string): string {
  const normalized = bookName.trim();
  // Handle Psalm/Psalms variation
  if (normalized.toLowerCase() === 'psalm') {
    return 'Psalms';
  }
  // Add other common variations here if needed
  return normalized;
}

function parseReferences(ref?: string): Array<{ book: string; chapter: number; v1?: number; v2?: number }> {
  if (!ref) return [];
  const cleaned = ref.replace(/\u2013|\u2014/g, '-');
  const chunks = cleaned.split(/[;,]/).map(s => s.trim()).filter(Boolean);
  const out: Array<{ book: string; chapter: number; v1?: number; v2?: number }> = [];
  for (const c of chunks) {
    const m = c.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
    if (!m) continue;
    const book = normalizeBookName(m[1].trim());
    const chapter = Number(m[2]);
    const v1 = m[3] ? Number(m[3]) : undefined;
    const v2 = m[4] ? Number(m[4]) : undefined;
    out.push({ book, chapter, v1, v2 });
  }
  return out;
}

function toArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v));
  try {
    const parsed = JSON.parse(String(value));
    if (Array.isArray(parsed)) return parsed.map(v => String(v));
  } catch {}
  return String(value).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

export default function ReadingPlanDayScreen({ route, navigation }: any) {
  const { dayId } = route.params as { dayId: number };

  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<PlanDayRow | null>(null);
  const [verses, setVerses] = useState<VerseRow[]>([]);
  const [translation, setTranslation] = useState<string>('KJV');
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('fireside.translation');
        if (saved) setTranslation(saved.toUpperCase());
      } catch {}
    })();
  }, []);

  // robust verse fetch with chapter-only support + fallback sequence
  const fetchVersesForParts = async (
    parts: Array<{ book: string; chapter: number; v1?: number; v2?: number }>,
    preferred: string
  ): Promise<VerseRow[]> => {
    const results: VerseRow[] = [];
    const tryOrder = Array.from(new Set([preferred?.toUpperCase(), 'KJV', 'WEB', 'ANY'])).filter(Boolean) as string[];

    for (const p of parts) {
      let fetched = false;
      for (const t of tryOrder) {
        let q = supabase
          .from('bible_verses')
          .select('book_name,chapter_number,verse_number,verse_text,translation') // <-- verse_text here
          .eq('book_name', p.book)
          .eq('chapter_number', p.chapter);

        if (t !== 'ANY') q = q.eq('translation', t);

        if (p.v1 != null && p.v2 != null) {
          q = q.gte('verse_number', p.v1).lte('verse_number', p.v2);
        } else if (p.v1 != null) {
          q = q.eq('verse_number', p.v1);
        } // else: full chapter

        const { data, error } = await q.order('verse_number', { ascending: true });
        if (!error && data && data.length) {
          results.push(...(data as VerseRow[]));
          fetched = true;
          break;
        }
      }
      // if not fetched, skip silently
    }
    return results;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('reading_plan_days')
          .select('id, plan_id, day_number, day_title, full_reference, daily_theme, reflection_questions, prayer_prompt, verse_insight')
          .eq('id', dayId)
          .maybeSingle();

        if (error) throw error;
        const row = data as PlanDayRow;
        setDay(row);

        const ref = (row?.full_reference ?? '').toString().trim();
        const parts = parseReferences(ref);
        if (parts.length > 0) {
          const out = await fetchVersesForParts(parts, translation);
          setVerses(out);
        } else {
          setVerses([]);
        }
      } catch (e) {
        console.warn('[ReadingPlanDay] load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [dayId, translation]);

  const scriptureBlocks = useMemo(() => {
    if (!verses.length) return null;
    const byChapter = new Map<string, VerseRow[]>();
    for (const v of verses) {
      const key = `${v.book_name} ${v.chapter_number} • ${v.translation ?? ''}`.trim();
      if (!byChapter.has(key)) byChapter.set(key, []);
      byChapter.get(key)!.push(v);
    }
    return Array.from(byChapter.entries()).map(([key, rows]) => (
      <View key={key} style={styles.scriptureCard}>
        <Text style={styles.scriptureHeader}>{key}</Text>
        <Text style={styles.scriptureText}>
          {rows.map(r => `${r.verse_number} ${r.verse_text}`).join(' ')}
          {/*                       ^^^^^^^^^^ use verse_text */}
        </Text>
      </View>
    ));
  }, [verses]);

  const questions = useMemo(() => toArray(day?.reflection_questions), [day?.reflection_questions]);

  const markDayComplete = async () => {
    if (!day) return;
    try {
      setCompleting(true);
      await completeReadingPlanDay(undefined as any, day.id, day.day_number);
      Alert.alert('✓ Day Complete', 'Nice work!');
      navigation.goBack();
    } catch (e) {
      console.warn('[ReadingPlanDay] complete error', e);
      Alert.alert('Error', 'Could not mark complete.');
    } finally {
      setCompleting(false);
    }
  };

  if (loading || !day) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>{day.day_title ?? `Day ${day.day_number}`}</Text>
      {!!day.daily_theme && <Text style={styles.theme}>{day.daily_theme}</Text>}
      {!!day.full_reference && <Text style={styles.sub}>{day.full_reference}</Text>}

      {/* Scripture */}
      {scriptureBlocks ? (
        <>
          <Text style={[styles.section, { marginTop: 16 }]}>Scripture</Text>
          {scriptureBlocks}
        </>
      ) : (
        <Text style={{ color: colors.text.secondary, marginTop: 12 }}>No scripture text found for this reference.</Text>
      )}

      {!!day.verse_insight && (
        <>
          <Text style={[styles.section, { marginTop: 16 }]}>Verse Insight</Text>
          <Text style={styles.body}>{String(day.verse_insight)}</Text>
        </>
      )}

      {questions.length > 0 && (
        <>
          <Text style={[styles.section, { marginTop: 16 }]}>Reflection Questions</Text>
          <View style={{ gap: 8 }}>
            {questions.map((q, idx) => (
              <View key={`q-${idx}`} style={{ flexDirection: 'row' }}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.body, { flex: 1 }]}>{q}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {!!day.prayer_prompt && (
        <>
          <Text style={[styles.section, { marginTop: 16 }]}>Prayer Prompt</Text>
          <Text style={styles.body}>{String(day.prayer_prompt)}</Text>
        </>
      )}

      <TouchableOpacity
        onPress={markDayComplete}
        disabled={completing}
        style={[styles.btn, { backgroundColor: completing ? colors.text.tertiary : colors.accent.primary }]}
      >
        <Text style={styles.btnText}>{completing ? 'Saving…' : '✓ Mark Day Complete'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28, gap: 10, backgroundColor: colors.background.primary },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text.primary },
  theme: { marginTop: 4, color: colors.text.secondary, fontStyle: 'italic' },
  sub: { color: colors.text.secondary, marginTop: 4 },
  section: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  body: { color: colors.text.primary, lineHeight: 22 },
  bullet: { marginRight: 8, color: colors.text.primary, fontSize: 16, lineHeight: 22 },
  scriptureCard: { marginTop: 8, borderWidth: 1, borderColor: colors.border.default, borderRadius: 10, padding: 10, backgroundColor: colors.background.secondary },
  scriptureHeader: { fontWeight: '700', marginBottom: 6, color: colors.text.primary },
  scriptureText: { color: colors.text.primary, lineHeight: 22 },
  btn: { marginTop: 20, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: colors.text.primary, fontWeight: '800' },
});

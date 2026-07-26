// ReadingPlanDayScreen.tsx — Per-passage completion with auto day-complete
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { markPassageComplete, fetchPassageProgress, completeReadingPlanDay } from '../services/readingPlans';
import { useGuestMode } from '../context/GuestModeContext';

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
  verse_text: string;
  book_name: string;
  chapter_number: number;
  translation: string | null;
};

type ReadingBlock = {
  label: string;
  book: string;
  chapter: number;
  verses: VerseRow[];
};

// Normalize book names to handle variations like Psalm/Psalms
function normalizeBookName(bookName: string): string {
  const normalized = bookName.trim();
  if (normalized.toLowerCase() === 'psalm') return 'Psalms';
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
  const { dayId, passageIndex, totalPassages } = route.params as {
    dayId: number;
    passageIndex?: number;
    totalPassages?: number;
  };
  const hasSinglePassage = passageIndex != null;
  const { isGuest, promptSignIn } = useGuestMode();

  console.log('════════════════════════════════════');
  console.log('[ReadingPlanDayScreen] RENDER params:', {
    dayId, passageIndex, totalPassages, hasSinglePassage
  });

  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<PlanDayRow | null>(null);
  const [readingBlocks, setReadingBlocks] = useState<ReadingBlock[]>([]);
  const [translation, setTranslation] = useState<string>('KJV');
  const [completedPassages, setCompletedPassages] = useState<Set<number>>(new Set());
  const [completingIndex, setCompletingIndex] = useState<number | null>(null);
  const [dayMarkedComplete, setDayMarkedComplete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('fireside.translation');
        if (saved) setTranslation(saved.toUpperCase());
      } catch {}
    })();
  }, []);

  // Fetch verses for a single reference part
  const fetchVersesForPart = async (
    p: { book: string; chapter: number; v1?: number; v2?: number },
    preferred: string
  ): Promise<VerseRow[]> => {
    const tryOrder = Array.from(new Set([preferred?.toUpperCase(), 'KJV', 'WEB', 'ANY'])).filter(Boolean) as string[];

    for (const t of tryOrder) {
      let q = supabase
        .from('bible_verses')
        .select('book_name,chapter_number,verse_number,verse_text,translation')
        .eq('book_name', p.book)
        .eq('chapter_number', p.chapter);

      if (t !== 'ANY') q = q.eq('translation', t);

      if (p.v1 != null && p.v2 != null) {
        q = q.gte('verse_number', p.v1).lte('verse_number', p.v2);
      } else if (p.v1 != null) {
        q = q.eq('verse_number', p.v1);
      }

      const { data, error } = await q.order('verse_number', { ascending: true });
      if (!error && data && data.length) return data as VerseRow[];
    }
    return [];
  };

  // Load passage completion status and day completion status
  const loadCompletionStatus = async (planDayId: number) => {
    console.log('[loadCompletionStatus] START planDayId:', planDayId);
    try {
      // Load passage-level progress
      const passageProgress = await fetchPassageProgress(planDayId);
      const completed = new Set<number>();
      for (const pp of passageProgress) {
        if (pp.completed) completed.add(pp.passage_index);
      }
      console.log('[loadCompletionStatus] completedPassages from DB:', [...completed]);
      console.log('[loadCompletionStatus] passageIndex param:', passageIndex, 'isInCompleted:', completed.has(passageIndex!));
      setCompletedPassages(completed);

      // Also check day-level completion
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { console.log('[loadCompletionStatus] NO USER'); return; }

      const { data: dayRow } = await supabase
        .from('reading_plan_days')
        .select('plan_id, day_number')
        .eq('id', planDayId)
        .single();
      if (!dayRow) { console.log('[loadCompletionStatus] NO dayRow'); return; }

      const { data: progressRow } = await supabase
        .from('user_reading_plan_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_id', dayRow.plan_id)
        .eq('is_active', true)
        .maybeSingle();
      if (!progressRow) { console.log('[loadCompletionStatus] NO progressRow'); return; }

      // Look up by day_number (not plan_day_id) for robustness across multi-row days
      const { data: dayProgress } = await supabase
        .from('user_reading_plan_day_progress')
        .select('completed')
        .eq('user_progress_id', progressRow.id)
        .eq('day_number', dayRow.day_number)
        .maybeSingle();

      console.log('[loadCompletionStatus] dayProgress:', dayProgress);
      if (dayProgress?.completed) {
        console.log('[loadCompletionStatus] DAY IS COMPLETE — setting dayMarkedComplete=true');
        setDayMarkedComplete(true);
      }
    } catch (e) {
      console.warn('[loadCompletionStatus] ERROR:', e);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setDayMarkedComplete(false);
      setCompletedPassages(new Set());
      try {
        // 1. Fetch the primary row to get plan_id and day_number
        const { data, error } = await supabase
          .from('reading_plan_days')
          .select('id, plan_id, day_number, day_title, full_reference, daily_theme, reflection_questions, prayer_prompt, verse_insight')
          .eq('id', dayId)
          .maybeSingle();

        if (error) throw error;
        const primaryRow = data as PlanDayRow;

        // 2. Fetch ALL rows for this day (DB has multiple rows per day, one per passage)
        const { data: siblingData } = await supabase
          .from('reading_plan_days')
          .select('id, plan_id, day_number, day_title, full_reference, daily_theme, reflection_questions, prayer_prompt, verse_insight')
          .eq('plan_id', primaryRow.plan_id)
          .eq('day_number', primaryRow.day_number)
          .order('id', { ascending: true });

        const allRows = (siblingData || [primaryRow]) as PlanDayRow[];
        const canonicalRow = allRows[0];

        // 3. Pick rows: single passage or all
        const rowsToShow = hasSinglePassage && passageIndex < allRows.length
          ? [allRows[passageIndex]]
          : allRows;

        const combinedDay: PlanDayRow = {
          id: canonicalRow.id,
          plan_id: canonicalRow.plan_id,
          day_number: canonicalRow.day_number,
          day_title: canonicalRow.day_title,
          daily_theme: canonicalRow.daily_theme,
          full_reference: rowsToShow.map(r => r.full_reference).filter(Boolean).join('; '),
          verse_insight: rowsToShow.map(r => r.verse_insight).filter(Boolean).join('\n\n') || null,
          reflection_questions: rowsToShow.reduce((acc: any[], r) => acc.concat(toArray(r.reflection_questions)), []),
          prayer_prompt: rowsToShow.map(r => r.prayer_prompt).filter(Boolean).join('\n\n') || null,
        };
        setDay(combinedDay);

        // 4. Load completion status using canonical (first) row ID
        await loadCompletionStatus(canonicalRow.id);

        // 5. Build reading blocks from selected rows' references
        const blocks: ReadingBlock[] = [];
        for (const row of rowsToShow) {
          const ref = (row.full_reference ?? '').toString().trim();
          const parts = parseReferences(ref);
          for (const p of parts) {
            const verses = await fetchVersesForPart(p, translation);
            const trans = verses.length > 0 ? verses[0].translation : translation;
            const rangeLabel = p.v1 != null
              ? (p.v2 != null ? `${p.book} ${p.chapter}:${p.v1}-${p.v2}` : `${p.book} ${p.chapter}:${p.v1}`)
              : `${p.book} ${p.chapter}`;
            blocks.push({
              label: `${rangeLabel} • ${trans ?? ''}`.trim(),
              book: p.book,
              chapter: p.chapter,
              verses,
            });
          }
        }
        setReadingBlocks(blocks);
      } catch (e) {
        console.warn('[ReadingPlanDay] load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [dayId, passageIndex, translation]);

  const handleMarkPassageComplete = useCallback(async (index: number) => {
    if (isGuest) { promptSignIn('track your reading plan progress'); return; }
    if (!day || completingIndex !== null) return;
    setCompletingIndex(index);
    try {
      const { allComplete } = await markPassageComplete(
        day.id,
        index,
        readingBlocks.length,
        day.day_number
      );

      // Update local state
      setCompletedPassages(prev => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });

      if (allComplete) {
        setDayMarkedComplete(true);
      }
    } catch (e: any) {
      console.warn('[ReadingPlanDay] passage complete error', e);
      Alert.alert('Error', e?.message ?? 'Could not mark passage complete.');
    } finally {
      setCompletingIndex(null);
    }
  }, [day, readingBlocks.length, completingIndex, isGuest, promptSignIn]);

  // Mark complete: single passage or entire day depending on context
  const handleMarkDayComplete = useCallback(async () => {
    if (isGuest) { promptSignIn('track your reading plan progress'); return; }
    if (!day) return;
    setCompletingIndex(-1);
    try {
      if (hasSinglePassage && totalPassages != null) {
        // Mark just this passage complete
        const { allComplete } = await markPassageComplete(
          day.id,
          passageIndex!,
          totalPassages,
          day.day_number
        );
        // Update local passage state
        setCompletedPassages(prev => {
          const next = new Set(prev);
          next.add(passageIndex!);
          return next;
        });
        if (allComplete) {
          setDayMarkedComplete(true);
        }
      } else {
        // Mark the entire day complete
        await completeReadingPlanDay(undefined, day.id, day.day_number);
        setDayMarkedComplete(true);
      }
    } catch (e: any) {
      console.warn('[ReadingPlanDay] complete error', e);
      Alert.alert('Error', e?.message ?? 'Could not mark complete.');
    } finally {
      setCompletingIndex(null);
    }
  }, [day, hasSinglePassage, passageIndex, totalPassages, isGuest, promptSignIn]);

  // In single-passage mode, compare against totalPassages (real count), not readingBlocks.length (always 1)
  const effectiveTotal = hasSinglePassage ? (totalPassages ?? 1) : readingBlocks.length;
  const allPassagesComplete = effectiveTotal > 0 && completedPassages.size >= effectiveTotal;
  // For single passage view, check if this specific passage is already complete
  const passageAlreadyComplete = hasSinglePassage && completedPassages.has(passageIndex!);
  const questions = useMemo(() => toArray(day?.reflection_questions), [day?.reflection_questions]);

  console.log('[ReadingPlanDayScreen] BUTTON DECISION:', {
    loading,
    dayMarkedComplete,
    passageAlreadyComplete,
    allPassagesComplete,
    hasSinglePassage,
    passageIndex,
    completedPassagesArray: [...completedPassages],
    completedPassagesSize: completedPassages.size,
    effectiveTotal,
    showMarkButton: !dayMarkedComplete && !passageAlreadyComplete && !allPassagesComplete,
    showDoneButton: dayMarkedComplete || passageAlreadyComplete,
  });

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

      {/* Complete banner */}
      {(dayMarkedComplete || passageAlreadyComplete) && (
        <View style={styles.dayCompleteBanner}>
          <Text style={styles.dayCompleteText}>
            {hasSinglePassage ? 'Passage Complete!' : 'Day Complete!'}
          </Text>
        </View>
      )}

      {/* Scripture Readings with per-passage completion */}
      {readingBlocks.length > 0 ? (
        <>
          <Text style={[styles.section, { marginTop: 16 }]}>Readings</Text>
          {readingBlocks.map((block, idx) => {
            const isPassageComplete = completedPassages.has(idx) || dayMarkedComplete;
            const isCompleting = completingIndex === idx;
            return (
              <View key={idx} style={[styles.scriptureCard, isPassageComplete && styles.scriptureCardComplete]}>
                <View style={styles.readingHeader}>
                  <Text style={styles.scriptureHeader}>{block.label}</Text>
                  {isPassageComplete && <Text style={{ fontSize: 18, color: colors.success }}>✓</Text>}
                </View>
                {block.verses.length > 0 ? (
                  <Text style={styles.scriptureText}>
                    {block.verses.map(r => `${r.verse_number} ${r.verse_text}`).join(' ')}
                  </Text>
                ) : (
                  <Text style={{ color: colors.text.muted, fontStyle: 'italic' }}>No text found for this reference.</Text>
                )}
              </View>
            );
          })}
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

      {/* Single button at the bottom to mark complete */}
      {!dayMarkedComplete && !passageAlreadyComplete && !allPassagesComplete && (
        <TouchableOpacity
          onPress={handleMarkDayComplete}
          disabled={completingIndex !== null}
          style={[styles.btn, { backgroundColor: completingIndex !== null ? colors.text.tertiary : colors.accent.primary }]}
        >
          <Text style={styles.btnText}>
            {completingIndex === -1 ? 'Saving...' : '✓ Mark Activity Complete'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Done button when complete */}
      {(dayMarkedComplete || passageAlreadyComplete) && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.btn, { backgroundColor: colors.success }]}
        >
          <Text style={styles.btnText}>Done</Text>
        </TouchableOpacity>
      )}
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
  scriptureCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.background.secondary,
  },
  scriptureCardComplete: {
    borderColor: colors.success,
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scriptureHeader: { fontWeight: '700', color: colors.text.primary },
  scriptureText: { color: colors.text.primary, lineHeight: 22 },
  passageBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
  },
  passageBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dayCompleteBanner: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(39, 174, 96, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success,
    alignItems: 'center',
  },
  dayCompleteText: { color: colors.success, fontWeight: '800', fontSize: 16 },
  btn: { marginTop: 20, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

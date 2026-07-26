// src/components/ReadingPlans/ReadingPlanDetailScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Pressable } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import {
  fetchReadingPlanDetails,
  startReadingPlan,
  fetchUserPlanProgress,
  completeReadingPlanDay,
  fetchPlanDayProgress,
  fetchAllPassageProgressForPlan,
  markPassageComplete
} from '../../services/readingPlans';
import type {
  ReadingPlan,
  ReadingPlanDay,
  UserReadingPlanProgress,
  ReadingPlanDayProgress
} from '../../services/readingPlans';
import { useGuestMode } from '../../context/GuestModeContext';

type GroupedDay = {
  day_number: number;
  day_title: string;
  daily_theme: string | null;
  first_day_id: number;
  passages: Array<{
    id: number;
    passage_index: number;
    full_reference: string;
  }>;
};

export default function ReadingPlanDetailScreen() {
  const { planId } = useRoute<any>().params as { planId: number };
  const navigation = useNavigation<any>();
  const { isGuest, promptSignIn } = useGuestMode();

  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [groupedDays, setGroupedDays] = useState<GroupedDay[]>([]);
  const [userProgress, setUserProgress] = useState<UserReadingPlanProgress | null>(null);
  const [dayProgress, setDayProgress] = useState<ReadingPlanDayProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  // Map: dayId -> Set of completed passage indices
  const [passageCompletion, setPassageCompletion] = useState<Map<number, Set<number>>>(new Map());

  // Reload when screen gains focus (e.g. returning from day screen after marking complete)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [planId])
  );

  const load = async () => {
    try {
      const [planData, progressData] = await Promise.all([
        fetchReadingPlanDetails(planId),
        fetchUserPlanProgress(planId)
      ]);

      setPlan(planData.plan);

      // Group raw rows by day_number (DB has multiple rows per day, one per passage)
      const dayMap = new Map<number, GroupedDay>();
      const grouped: GroupedDay[] = [];
      for (const d of planData.days) {
        if (!dayMap.has(d.day_number)) {
          const g: GroupedDay = {
            day_number: d.day_number,
            day_title: d.day_title,
            daily_theme: d.daily_theme,
            first_day_id: d.id,
            passages: [],
          };
          dayMap.set(d.day_number, g);
          grouped.push(g);
        }
        const g = dayMap.get(d.day_number)!;
        g.passages.push({
          id: d.id,
          passage_index: g.passages.length,
          full_reference: d.full_reference,
        });
      }
      setGroupedDays(grouped);

      setUserProgress(progressData);

      if (progressData) {
        const dayProgressData = await fetchPlanDayProgress(progressData.id);
        setDayProgress(dayProgressData);

        // Load passage-level completion for the entire plan
        try {
          const allPassageProgress = await fetchAllPassageProgressForPlan(progressData.id);
          const completionMap = new Map<number, Set<number>>();
          for (const pp of allPassageProgress) {
            if (!completionMap.has(pp.plan_day_id)) {
              completionMap.set(pp.plan_day_id, new Set());
            }
            completionMap.get(pp.plan_day_id)!.add(pp.passage_index);
          }
          setPassageCompletion(completionMap);
        } catch {
          setPassageCompletion(new Map());
        }
      } else {
        setDayProgress([]);
        setPassageCompletion(new Map());
      }
    } catch (err) {
      console.error('[ReadingPlanDetail] Load failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPlan = async () => {
    if (isGuest) { promptSignIn('start this reading plan'); return; }
    if (starting) return;
    try {
      setStarting(true);
      await startReadingPlan(planId);
      Alert.alert('Plan Started! 📖', 'Your reading plan has begun. Check back daily to track your progress!', [
        { text: 'Got it!' }
      ]);
      await load();
    } catch (err: any) {
      console.error('[ReadingPlanDetail] Failed to start', err);
      Alert.alert('Error', 'Failed to start plan. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleCompleteDay = async (day: GroupedDay) => {
    if (isGuest) { promptSignIn('track your reading plan progress'); return; }
    if (!userProgress) return;
    try {
      await completeReadingPlanDay(userProgress.id, day.first_day_id, day.day_number);
      Alert.alert('Day Complete! ✓', 'Great progress!', [{ text: 'Continue' }]);
      await load();
    } catch (err: any) {
      console.error('[ReadingPlanDetail] Failed to complete day', err);
      Alert.alert('Error', 'Failed to mark day complete.');
    }
  };

  const isDayComplete = (dayNumber: number) =>
    dayProgress.some((dp) => dp.day_number === dayNumber && dp.completed);

  // Open a dedicated Day screen for a specific passage
  const openDayReading = useCallback(
    (day: GroupedDay, passageIndex?: number) => {
      navigation.navigate('ReadingPlanDay', {
        dayId: day.first_day_id,
        passageIndex: passageIndex ?? undefined,
        totalPassages: day.passages.length,
      });
    },
    [navigation]
  );

  const handleMarkPassage = async (day: GroupedDay, passageIndex: number, totalPassages: number) => {
    if (isGuest) { promptSignIn('track your reading plan progress'); return; }
    try {
      const { allComplete } = await markPassageComplete(day.first_day_id, passageIndex, totalPassages, day.day_number);
      await load(); // Refresh all state
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to mark passage complete.');
    }
  };

  if (loading || !plan) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, backgroundColor: colors.background.primary }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>{plan.plan_name}</Text>

      {plan.theme_name && <Text style={{ marginTop: 4, fontSize: 14, color: colors.text.secondary }}>Theme: {plan.theme_name}</Text>}

      {plan.plan_description && <Text style={{ marginTop: 12, fontSize: 16, lineHeight: 24, color: colors.text.primary }}>{plan.plan_description}</Text>}

      <View style={{ marginTop: 12, flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: 14, color: colors.text.secondary }}>📅 {plan.total_days} days</Text>
        {plan.difficulty_level && (
          <>
            <Text style={{ fontSize: 14, color: colors.text.secondary }}>•</Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary }}>{plan.difficulty_level}</Text>
          </>
        )}
      </View>

      {/* Progress */}
      {userProgress ? (
        <View style={{ marginTop: 16, padding: 12, backgroundColor: colors.background.tertiary, borderRadius: 10, borderWidth: 1, borderColor: colors.accent.primary }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent.primary }}>YOUR PROGRESS</Text>
          <Text style={{ marginTop: 4, fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
            Day {userProgress.current_day} of {plan.total_days}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 14, color: colors.text.secondary }}>
            {dayProgress.filter((dp) => dp.completed).length} days completed
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleStartPlan}
          disabled={starting}
          style={{
            marginTop: 16,
            padding: 16,
            backgroundColor: starting ? colors.text.tertiary : colors.accent.primary,
            borderRadius: 12,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 16 }}>
            {starting ? 'Starting...' : '🚀 Start This Plan'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Days List — grouped by day_number (DB has multiple rows per day, one per passage) */}
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: colors.text.primary }}>Daily Readings</Text>
        {groupedDays.map((gDay) => {
          const isComplete = isDayComplete(gDay.day_number);
          const isCurrent = userProgress?.current_day === gDay.day_number;
          const isExpanded = expandedDays.has(gDay.day_number);
          const dayCompletedPassages = passageCompletion.get(gDay.first_day_id) || new Set<number>();

          // Completed days: collapsed by default, expandable
          if (isComplete && !isExpanded) {
            return (
              <Pressable
                key={gDay.first_day_id}
                onPress={() => setExpandedDays(prev => { const next = new Set(prev); next.add(gDay.day_number); return next; })}
                style={{
                  marginBottom: 8,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.success,
                  borderRadius: 10,
                  backgroundColor: 'rgba(39, 174, 96, 0.1)',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                    ✓ Day {gDay.day_number}: {gDay.day_title}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.text.muted }}>Show Details</Text>
              </Pressable>
            );
          }

          return (
            <View
              key={gDay.first_day_id}
              style={{
                marginBottom: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: isComplete ? colors.success : (isCurrent ? colors.accent.primary : colors.border.default),
                borderRadius: 10,
                backgroundColor: isComplete ? 'rgba(39, 174, 96, 0.1)' : colors.background.secondary
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                    {isComplete ? '✓ ' : ''}Day {gDay.day_number}: {gDay.day_title}
                  </Text>
                  {gDay.daily_theme && (
                    <Text style={{ marginTop: 4, fontSize: 12, color: colors.text.secondary }}>Theme: {gDay.daily_theme}</Text>
                  )}
                </View>
                {isComplete && (
                  <TouchableOpacity onPress={() => setExpandedDays(prev => { const next = new Set(prev); next.delete(gDay.day_number); return next; })}>
                    <Text style={{ fontSize: 12, color: colors.text.muted }}>Collapse</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Individual passages from grouped DB rows */}
              {gDay.passages.length > 0 && (
                <View style={{ marginTop: 10, gap: 8 }}>
                  {gDay.passages.map((p) => {
                    const isPassageComplete = isComplete || dayCompletedPassages.has(p.passage_index);
                    return (
                      <View key={p.id} style={{
                        padding: 10,
                        backgroundColor: isPassageComplete ? 'rgba(39, 174, 96, 0.08)' : colors.background.tertiary,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isPassageComplete ? colors.success : colors.border.default,
                      }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>{p.full_reference}</Text>
                        <View style={{ marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TouchableOpacity
                            onPress={() => openDayReading(gDay, p.passage_index)}
                            style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.accent.primary, borderRadius: 6 }}
                          >
                            <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 12 }}>Open Reading</Text>
                          </TouchableOpacity>
                          {isPassageComplete ? (
                            <Text style={{ fontSize: 12, color: colors.success, fontWeight: '700' }}>✓ Complete</Text>
                          ) : userProgress ? (
                            <TouchableOpacity
                              onPress={() => handleMarkPassage(gDay, p.passage_index, gDay.passages.length)}
                              style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.success, borderRadius: 6 }}
                            >
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>✓ Mark Complete</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

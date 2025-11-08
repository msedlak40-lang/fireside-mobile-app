// src/components/ReadingPlans/ReadingPlanDetailScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  fetchReadingPlanDetails,
  startReadingPlan,
  fetchUserPlanProgress,
  completeReadingPlanDay,
  fetchPlanDayProgress
} from '../../services/readingPlans';
import type {
  ReadingPlan,
  ReadingPlanDay,
  UserReadingPlanProgress,
  ReadingPlanDayProgress
} from '../../services/readingPlans';

export default function ReadingPlanDetailScreen() {
  const { planId } = useRoute<any>().params as { planId: number };
  const navigation = useNavigation<any>();

  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [days, setDays] = useState<ReadingPlanDay[]>([]);
  const [userProgress, setUserProgress] = useState<UserReadingPlanProgress | null>(null);
  const [dayProgress, setDayProgress] = useState<ReadingPlanDayProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    load();
  }, [planId]);

  const load = async () => {
    try {
      const [planData, progressData] = await Promise.all([
        fetchReadingPlanDetails(planId),
        fetchUserPlanProgress(planId)
      ]);

      setPlan(planData.plan);
      setDays(planData.days);
      setUserProgress(progressData);

      if (progressData) {
        const dayProgressData = await fetchPlanDayProgress(progressData.id);
        setDayProgress(dayProgressData);
      } else {
        setDayProgress([]);
      }
    } catch (err) {
      console.error('[ReadingPlanDetail] Load failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPlan = async () => {
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

  const handleCompleteDay = async (day: ReadingPlanDay) => {
    if (!userProgress) return;
    try {
      await completeReadingPlanDay(userProgress.id, day.id, day.day_number);
      Alert.alert('Day Complete! ✓', 'Great progress!', [{ text: 'Continue' }]);
      await load();
    } catch (err: any) {
      console.error('[ReadingPlanDetail] Failed to complete day', err);
      Alert.alert('Error', 'Failed to mark day complete.');
    }
  };

  const isDayComplete = (dayNumber: number) =>
    dayProgress.some((dp) => dp.day_number === dayNumber && dp.completed);

  // ⬇️ Changed: open a dedicated Day screen that will render the day's content and/or verses
  const openDayReading = useCallback(
    (day: ReadingPlanDay) => {
      navigation.navigate('ReadingPlanDay', { dayId: day.id });
    },
    [navigation]
  );

  if (loading || !plan) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <Text style={{ fontSize: 22, fontWeight: '800' }}>{plan.plan_name}</Text>

      {plan.theme_name && <Text style={{ marginTop: 4, fontSize: 14, color: '#6b7280' }}>Theme: {plan.theme_name}</Text>}

      {plan.plan_description && <Text style={{ marginTop: 12, fontSize: 16, lineHeight: 24 }}>{plan.plan_description}</Text>}

      <View style={{ marginTop: 12, flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: 14, color: '#6b7280' }}>📅 {plan.total_days} days</Text>
        {plan.difficulty_level && (
          <>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>•</Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>{plan.difficulty_level}</Text>
          </>
        )}
      </View>

      {/* Progress */}
      {userProgress ? (
        <View style={{ marginTop: 16, padding: 12, backgroundColor: '#dbeafe', borderRadius: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e40af' }}>YOUR PROGRESS</Text>
          <Text style={{ marginTop: 4, fontSize: 16, fontWeight: '600' }}>
            Day {userProgress.current_day} of {plan.total_days}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 14, color: '#6b7280' }}>
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
            backgroundColor: starting ? '#9ca3af' : '#2563eb',
            borderRadius: 12,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            {starting ? 'Starting...' : '🚀 Start This Plan'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Days List */}
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Daily Readings</Text>
        {days.map((day) => {
          const isComplete = isDayComplete(day.day_number);
          const isCurrent = userProgress?.current_day === day.day_number;

          return (
            <Pressable
              key={day.id}
              onPress={() => openDayReading(day)}
              style={{
                marginBottom: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: isCurrent ? '#3b82f6' : '#e5e7eb',
                borderRadius: 10,
                backgroundColor: isComplete ? '#f0fdf4' : '#fff'
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700' }}>
                    Day {day.day_number}: {day.day_title}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 14, color: '#6b7280' }}>{day.full_reference}</Text>
                  {day.daily_theme && (
                    <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>Theme: {day.daily_theme}</Text>
                  )}
                </View>
                {isComplete && <Text style={{ fontSize: 20 }}>✓</Text>}
              </View>

              <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => openDayReading(day)}
                  style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#111827', borderRadius: 8 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Open Reading</Text>
                </TouchableOpacity>

                {isCurrent && userProgress && !isComplete ? (
                  <TouchableOpacity
                    onPress={() => handleCompleteDay(day)}
                    style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#10b981', borderRadius: 8 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>✓ Mark Complete</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

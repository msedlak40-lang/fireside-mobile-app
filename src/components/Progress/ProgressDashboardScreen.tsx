// src/components/Progress/ProgressDashboardScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabaseClient';
import { fetchUserDashboard, fetchActiveCharacterStudy } from '../../services/progress';
import { fetchActiveReadingPlan } from '../../services/readingPlans';
import { fetchVerseOfTheDay, type VerseOfTheDay } from '../../services/scripture';
import type { UserDashboard, ActiveCharacterStudy } from '../../services/progress';
import type { ActivePlanWithReading } from '../../services/readingPlans';
import { colors } from '../../theme/colors';

const CACHE_KEY = 'fireside.dashboard';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

type CachedData = {
  dashboard: UserDashboard | null;
  activePlan: ActivePlanWithReading | null;
  activeCharacterStudy: ActiveCharacterStudy | null;
  todayDevotion: any | null;
  verseOfTheDay: VerseOfTheDay | null;
  timestamp: number;
};

function getLocalISODate(tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value ?? '1970';
  const m = parts.find(p => p.type === 'month')?.value ?? '01';
  const d = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

function formatISODateYYYYMMDD(iso?: string | null) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return iso;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[Math.max(1, Math.min(12, parseInt(m, 10))) - 1]} ${parseInt(d, 10)}, ${y}`;
}

export default function ProgressDashboardScreen() {
  const navigation = useNavigation<any>();

  const [dashboard, setDashboard] = useState<UserDashboard | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlanWithReading | null>(null);
  const [activeCharacterStudy, setActiveCharacterStudy] = useState<ActiveCharacterStudy | null>(null);
  const [todayDevotion, setTodayDevotion] = useState<any | null>(null);
  const [verseOfTheDay, setVerseOfTheDay] = useState<VerseOfTheDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load cached data from AsyncStorage
  const loadFromCache = async (): Promise<CachedData | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedData = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_DURATION) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[ProgressDashboard] Cache load failed', err);
    }
    return null;
  };

  // Save data to cache
  const saveToCache = async (data: Omit<CachedData, 'timestamp'>) => {
    try {
      const cacheData: CachedData = {
        ...data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.warn('[ProgressDashboard] Cache save failed', err);
    }
  };

  // Fetch fresh data from API
  const fetchFreshData = async () => {
    try {
      const [dashData, planData, characterStudyData, verseData] = await Promise.all([
        fetchUserDashboard(),
        fetchActiveReadingPlan(),
        fetchActiveCharacterStudy(),
        fetchVerseOfTheDay('KJV'),
      ]);

      // today's devotion
      const today = getLocalISODate('America/Chicago');
      const { data } = await supabase
        .from('daily_devotions')
        .select('id,title,devotion_date')
        .eq('devotion_date', today)
        .maybeSingle();

      const freshData = {
        dashboard: dashData,
        activePlan: planData,
        activeCharacterStudy: characterStudyData,
        todayDevotion: data ?? null,
        verseOfTheDay: verseData,
      };

      setDashboard(freshData.dashboard);
      setActivePlan(freshData.activePlan);
      setActiveCharacterStudy(freshData.activeCharacterStudy);
      setTodayDevotion(freshData.todayDevotion);
      setVerseOfTheDay(freshData.verseOfTheDay);

      // Save to cache
      await saveToCache(freshData);
    } catch (err) {
      console.error('[ProgressDashboard] Fetch failed', err);
    }
  };

  // Initial load - try cache first, then fetch if needed
  const load = async () => {
    setLoading(true);
    try {
      const cached = await loadFromCache();
      if (cached) {
        // Use cached data immediately
        setDashboard(cached.dashboard);
        setActivePlan(cached.activePlan);
        setActiveCharacterStudy(cached.activeCharacterStudy);
        setTodayDevotion(cached.todayDevotion);
        setVerseOfTheDay(cached.verseOfTheDay);
        setLoading(false);
        // Don't fetch fresh data on initial load if cache is valid
        return;
      }
      // No valid cache, fetch fresh data
      await fetchFreshData();
    } catch (err) {
      console.error('[ProgressDashboard] Load failed', err);
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFreshData();
    setRefreshing(false);
  };

  // Load data only once on mount
  useEffect(() => {
    load();
  }, []);

  const openPlans = useCallback(() => {
    // ✅ just switch to the Plans tab — avoids nested hook issues
    navigation.navigate('PlansTab', { screen: 'ReadingPlansHome' });
  }, [navigation]);

  const openCharacters = useCallback(() => {
    navigation.navigate('CharactersTab', { screen: 'CharactersHome' });
  }, [navigation]);

  const openNotesSummary = useCallback(() => {
    navigation.navigate('NotesHighlightsSummary'); // make sure this route exists in your Progress/Home stack
  }, [navigation]);

// ProgressDashboardScreen.tsx
const openTodayDevotion = useCallback(() => {
  if (todayDevotion?.id != null) {
    const idNum = typeof todayDevotion.id === 'string' ? Number(todayDevotion.id) : todayDevotion.id;
    navigation.navigate('DevotionDetail', { id: idNum });
  }
}, [navigation, todayDevotion]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator color={colors.accent.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
      >
        <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 20 }}>Your Progress</Text>

        {/* Streak Card */}
        <View
          style={{
            marginBottom: 16,
            padding: 20,
            backgroundColor: '#fef3c7',
            borderRadius: 16,
            borderWidth: 3,
            borderColor: '#fbbf24',
          }}
        >
          <Text style={{ fontSize: 14, color: '#92400e', fontWeight: '700' }}>STUDY STREAK</Text>
          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Text style={{ fontSize: 48, fontWeight: '800', color: '#92400e' }}>
              {dashboard?.streak?.current || 0}
            </Text>
            <Text style={{ fontSize: 32, marginBottom: 6 }}>🔥</Text>
          </View>
          <Text style={{ marginTop: 4, fontSize: 14, color: '#92400e' }}>
            Longest streak: {dashboard?.streak?.longest || 0} days
          </Text>
          {dashboard?.streak?.last_read_date && (
   <Text style={{ marginTop: 2, fontSize: 12, color: '#92400e' }}>
     Last activity: {formatISODateYYYYMMDD(dashboard.streak.last_read_date)}
            </Text>
          )}
        </View>

        {/* Verse of the Day */}
        {verseOfTheDay && (
          <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#dbeafe', borderRadius: 12 }}>
            <Text style={{ fontSize: 12, color: '#1e40af', fontWeight: '700' }}>VERSE OF THE DAY</Text>
            <Text style={{ marginTop: 8, fontSize: 16, fontStyle: 'italic', lineHeight: 24, color: '#1e3a8a' }}>
              "{verseOfTheDay.verse_text}"
            </Text>
            <Text style={{ marginTop: 8, fontSize: 14, fontWeight: '600', color: '#1e40af' }}>
              — {verseOfTheDay.reference}
            </Text>
          </View>
        )}

        {/* Today's Devotion */}
        <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#e9d5ff', borderRadius: 12 }}>
          <Text style={{ fontSize: 12, color: '#6b21a8', fontWeight: '700' }}>TODAY’S DEVOTION</Text>
          {todayDevotion ? (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 4 }}>{todayDevotion.title}</Text>
              <TouchableOpacity
                onPress={openTodayDevotion}
                style={{ marginTop: 12, padding: 12, backgroundColor: '#7c3aed', borderRadius: 8, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Open Devotion →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>
              No devotion scheduled for today.
            </Text>
          )}
        </View>

        {/* Chapter Progress */}
        <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>📖 Bible Reading</Text>
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>Chapters Read</Text>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>
                {dashboard?.chapters?.total_read || 0} / {dashboard?.chapters?.total_available || 0}
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${dashboard?.chapters?.percentage || 0}%`,
                  backgroundColor: '#3b82f6',
                }}
              />
            </View>
            <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
              {dashboard?.chapters?.percentage || 0}% complete
            </Text>
          </View>
        </View>

        {/* Reading Plan Progress */}
        {activePlan ? (
          <TouchableOpacity
            onPress={openPlans}
            style={{ marginBottom: 16, padding: 16, backgroundColor: '#dbeafe', borderRadius: 12 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>📅 Active Reading Plan</Text>
            <View style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, color: '#374151' }}>Progress</Text>
                <Text style={{ fontSize: 14, fontWeight: '600' }}>
                  Day {activePlan.current_day} / {activePlan.total_days}
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#bfdbfe', borderRadius: 4, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${activePlan.percentage}%`,
                    backgroundColor: '#2563eb',
                  }}
                />
              </View>
              <Text style={{ marginTop: 4, fontSize: 12, color: '#374151', textAlign: 'right' }}>
                {Math.round(activePlan.percentage)}% complete
              </Text>
            </View>
            <Text style={{ marginTop: 8, fontSize: 12, color: activePlan.on_track ? '#059669' : '#dc2626', fontWeight: '600' }}>
              {activePlan.on_track ? '✓ On track' : '⚠ Behind schedule'}
            </Text>
            <Text style={{ marginTop: 8, fontSize: 12, color: '#2563eb', fontWeight: '600' }}>Tap to view plan →</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#f3f4f6', borderRadius: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>📅 Reading Plans</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
              No active reading plan. Start one to track your daily Bible reading!
            </Text>
            <TouchableOpacity
              onPress={openPlans}
              style={{
                padding: 12,
                backgroundColor: '#2563eb',
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Browse Reading Plans</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Character Study Progress */}
        {activeCharacterStudy ? (
          <TouchableOpacity
            onPress={openCharacters}
            style={{ marginBottom: 16, padding: 16, backgroundColor: '#fef3c7', borderRadius: 12 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>✨ Active Character Study</Text>
            <View style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, color: '#374151' }}>Progress</Text>
                <Text style={{ fontSize: 14, fontWeight: '600' }}>
                  {activeCharacterStudy.completed_lessons} / {activeCharacterStudy.total_lessons} lessons
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#fde68a', borderRadius: 4, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${activeCharacterStudy.percentage}%`,
                    backgroundColor: '#f59e0b',
                  }}
                />
              </View>
              <Text style={{ marginTop: 4, fontSize: 12, color: '#374151', textAlign: 'right' }}>
                {activeCharacterStudy.percentage}% complete
              </Text>
            </View>
            <Text style={{ marginTop: 8, fontSize: 12, color: '#f59e0b', fontWeight: '600' }}>Tap to view study →</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#f3f4f6', borderRadius: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>✨ Character Studies</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
              No active character study. Start one to learn from Biblical characters!
            </Text>
            <TouchableOpacity
              onPress={openCharacters}
              style={{
                padding: 12,
                backgroundColor: '#f59e0b',
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Browse Characters</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

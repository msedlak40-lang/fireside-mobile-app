// src/components/Progress/ProgressDashboardScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView, RefreshControl, Modal, Pressable, TouchableWithoutFeedback } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabaseClient';
import { fetchUserDashboard, fetchActiveCharacterStudy } from '../../services/progress';
import { fetchActiveReadingPlan } from '../../services/readingPlans';
import { fetchVerseOfTheDay, type VerseOfTheDay } from '../../services/verseOfTheDay';
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
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [showRelatedVerseModal, setShowRelatedVerseModal] = useState(false);
  const [selectedRelatedVerse, setSelectedRelatedVerse] = useState<string | null>(null);
  const [relatedVerseText, setRelatedVerseText] = useState<string>('');

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
        <Text style={{ fontSize: 26, fontWeight: '800', marginBottom: 20, color: colors.text.primary }}>Your Progress</Text>

        {/* Streak Card */}
        <View
          style={{
            marginBottom: 16,
            padding: 20,
            backgroundColor: '#fef3c7',
            borderRadius: 16,
            borderLeftWidth: 6,
            borderLeftColor: '#f59e0b',
            // iOS shadow
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            // Android shadow
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 11, color: '#92400e', fontWeight: '800', letterSpacing: 1.5 }}>STUDY STREAK</Text>
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Text style={{ fontSize: 52, fontWeight: '900', color: '#92400e', lineHeight: 52 }}>
              {dashboard?.streak?.current || 0}
            </Text>
            <Text style={{ fontSize: 36, marginBottom: 4 }}>🔥</Text>
          </View>
          <Text style={{ marginTop: 8, fontSize: 15, color: '#92400e', fontWeight: '600' }}>
            Longest streak: {dashboard?.streak?.longest || 0} days
          </Text>
          {dashboard?.streak?.last_read_date && (
   <Text style={{ marginTop: 4, fontSize: 13, color: '#78350f', opacity: 0.8 }}>
     Last activity: {formatISODateYYYYMMDD(dashboard.streak.last_read_date)}
            </Text>
          )}
        </View>

        {/* Verse of the Day */}
        {verseOfTheDay && (
          <Pressable
            onPress={() => {
              if (verseOfTheDay.insight_title || verseOfTheDay.insight_detail) {
                setShowInsightModal(true);
              }
            }}
            disabled={!verseOfTheDay.insight_title && !verseOfTheDay.insight_detail}
            style={{
              marginBottom: 16,
              padding: 18,
              backgroundColor: '#dbeafe',
              borderRadius: 16,
              borderLeftWidth: 6,
              borderLeftColor: '#2563eb',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}>
            <Text style={{ fontSize: 11, color: '#1e40af', fontWeight: '800', letterSpacing: 1.5 }}>VERSE OF THE DAY</Text>
            <Text style={{ marginTop: 12, fontSize: 17, fontStyle: 'italic', lineHeight: 26, color: '#1e3a8a', fontWeight: '500' }}>
              "{verseOfTheDay.verse_text}"
            </Text>
            <Text style={{ marginTop: 10, fontSize: 15, fontWeight: '700', color: '#1e40af' }}>
              — {verseOfTheDay.reference}
            </Text>
            {(verseOfTheDay.insight_title || verseOfTheDay.insight_detail) && (
              <Text style={{ marginTop: 8, fontSize: 13, color: '#2563eb', fontWeight: '600' }}>
                💡 Tap to view insight
              </Text>
            )}
          </Pressable>
        )}

        {/* Today's Devotion */}
        <View style={{
          marginBottom: 16,
          padding: 18,
          backgroundColor: '#e9d5ff',
          borderRadius: 16,
          borderLeftWidth: 6,
          borderLeftColor: '#9333ea',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}>
          <Text style={{ fontSize: 11, color: '#6b21a8', fontWeight: '800', letterSpacing: 1.5 }}>TODAY'S DEVOTION</Text>
          {todayDevotion ? (
            <>
              <Text style={{ fontSize: 19, fontWeight: '800', marginTop: 8, color: '#581c87' }}>{todayDevotion.title}</Text>
              <TouchableOpacity
                onPress={openTodayDevotion}
                style={{
                  marginTop: 12,
                  padding: 14,
                  backgroundColor: '#7c3aed',
                  borderRadius: 10,
                  alignItems: 'center',
                  shadowColor: '#7c3aed',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Open Devotion →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={{ fontSize: 14, color: '#7c2d92', marginTop: 6 }}>
              No devotion scheduled for today.
            </Text>
          )}
        </View>

        {/* Chapter Progress */}
        <View style={{
          marginBottom: 16,
          padding: 18,
          backgroundColor: colors.background.secondary,
          borderRadius: 16,
          borderLeftWidth: 6,
          borderLeftColor: '#3b82f6',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: colors.text.secondary, marginBottom: 12 }}>BIBLE READING</Text>
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: colors.text.secondary }}>Chapters Read</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                {dashboard?.chapters?.total_read || 0} / {dashboard?.chapters?.total_available || 0}
              </Text>
            </View>
            <View style={{ height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${dashboard?.chapters?.percentage || 0}%`,
                  backgroundColor: '#3b82f6',
                }}
              />
            </View>
            <Text style={{ marginTop: 6, fontSize: 13, color: colors.text.secondary, textAlign: 'right', fontWeight: '600' }}>
              {dashboard?.chapters?.percentage || 0}% complete
            </Text>
          </View>
        </View>

        {/* Reading Plan Progress */}
        {activePlan ? (
          <TouchableOpacity
            onPress={openPlans}
            style={{
              marginBottom: 16,
              padding: 18,
              backgroundColor: '#dbeafe',
              borderRadius: 16,
              borderLeftWidth: 6,
              borderLeftColor: '#2563eb',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: '#1e40af', marginBottom: 8 }}>ACTIVE READING PLAN</Text>
            <View style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 14, color: '#374151' }}>Progress</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e3a8a' }}>
                  Day {activePlan.current_day} / {activePlan.total_days}
                </Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#bfdbfe', borderRadius: 5, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${activePlan.percentage}%`,
                    backgroundColor: '#2563eb',
                  }}
                />
              </View>
              <Text style={{ marginTop: 6, fontSize: 13, color: '#374151', textAlign: 'right', fontWeight: '600' }}>
                {Math.round(activePlan.percentage)}% complete
              </Text>
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: activePlan.on_track ? '#059669' : '#dc2626', fontWeight: '700' }}>
                {activePlan.on_track ? '✓ On track' : '⚠ Behind schedule'}
              </Text>
              <Text style={{ fontSize: 13, color: '#2563eb', fontWeight: '700' }}>Tap to view →</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{
            marginBottom: 16,
            padding: 18,
            backgroundColor: colors.background.secondary,
            borderRadius: 16,
            borderLeftWidth: 6,
            borderLeftColor: '#9ca3af',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: colors.text.secondary, marginBottom: 8 }}>READING PLANS</Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 14, lineHeight: 20 }}>
              No active reading plan. Start one to track your daily Bible reading!
            </Text>
            <TouchableOpacity
              onPress={openPlans}
              style={{
                padding: 14,
                backgroundColor: '#2563eb',
                borderRadius: 10,
                alignItems: 'center',
                shadowColor: '#2563eb',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Browse Reading Plans</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Character Study Progress */}
        {activeCharacterStudy ? (
          <TouchableOpacity
            onPress={openCharacters}
            style={{
              marginBottom: 16,
              padding: 18,
              backgroundColor: '#fef3c7',
              borderRadius: 16,
              borderLeftWidth: 6,
              borderLeftColor: '#f59e0b',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: '#92400e', marginBottom: 8 }}>ACTIVE CHARACTER STUDY</Text>
            <View style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 14, color: '#78350f' }}>Progress</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#92400e' }}>
                  {activeCharacterStudy.completed_lessons} / {activeCharacterStudy.total_lessons} lessons
                </Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#fde68a', borderRadius: 5, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${activeCharacterStudy.percentage}%`,
                    backgroundColor: '#f59e0b',
                  }}
                />
              </View>
              <Text style={{ marginTop: 6, fontSize: 13, color: '#78350f', textAlign: 'right', fontWeight: '600' }}>
                {activeCharacterStudy.percentage}% complete
              </Text>
            </View>
            <Text style={{ marginTop: 12, fontSize: 13, color: '#f59e0b', fontWeight: '700', textAlign: 'right' }}>Tap to view study →</Text>
          </TouchableOpacity>
        ) : (
          <View style={{
            marginBottom: 16,
            padding: 18,
            backgroundColor: colors.background.secondary,
            borderRadius: 16,
            borderLeftWidth: 6,
            borderLeftColor: '#9ca3af',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: colors.text.secondary, marginBottom: 8 }}>CHARACTER STUDIES</Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 14, lineHeight: 20 }}>
              No active character study. Start one to learn from Biblical characters!
            </Text>
            <TouchableOpacity
              onPress={openCharacters}
              style={{
                padding: 14,
                backgroundColor: '#f59e0b',
                borderRadius: 10,
                alignItems: 'center',
                shadowColor: '#f59e0b',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Browse Characters</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Insight Modal */}
      <Modal
        visible={showInsightModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInsightModal(false)}
        statusBarTranslucent={false}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            activeOpacity={1}
            onPress={() => setShowInsightModal(false)}
          />
          <View
            style={{
              backgroundColor: colors.background.primary,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 20,
              paddingBottom: 40,
              maxHeight: '80%',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary, flex: 1 }}>
                {verseOfTheDay?.insight_title || 'Verse Insight'}
              </Text>
              <TouchableOpacity onPress={() => setShowInsightModal(false)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 24, color: colors.text.secondary }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20 }}>
              {/* Verse Reference */}
              <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#dbeafe', borderRadius: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e40af' }}>
                  {verseOfTheDay?.reference}
                </Text>
                <Text style={{ marginTop: 8, fontSize: 15, fontStyle: 'italic', color: '#1e3a8a' }}>
                  "{verseOfTheDay?.verse_text}"
                </Text>
              </View>

              {/* Insight Detail */}
              {verseOfTheDay?.insight_detail && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, lineHeight: 24, color: colors.text.primary }}>
                    {verseOfTheDay.insight_detail}
                  </Text>
                </View>
              )}

              {/* Related Verses */}
              {verseOfTheDay?.related_verses && verseOfTheDay.related_verses.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
                    Related Verses:
                  </Text>
                  {verseOfTheDay.related_verses.map((ref, index) => (
                    <Pressable
                      key={index}
                      onPress={async () => {
                        setSelectedRelatedVerse(ref);
                        setRelatedVerseText('Loading...');
                        setShowRelatedVerseModal(true);

                        // Parse the reference and fetch the verse
                        try {
                          // Parse reference like "John 3:16" or "Romans 8:28"
                          const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
                          if (match) {
                            const [, bookName, chapterNum, verseNum] = match;
                            const { data } = await supabase
                              .from('bible_verses')
                              .select('verse_text')
                              .eq('book_name', bookName.trim())
                              .eq('chapter_number', parseInt(chapterNum))
                              .eq('verse_number', parseInt(verseNum))
                              .eq('translation', 'KJV')
                              .maybeSingle();

                            if (data?.verse_text) {
                              setRelatedVerseText(data.verse_text);
                            } else {
                              setRelatedVerseText('Verse not found');
                            }
                          } else {
                            setRelatedVerseText('Could not parse verse reference');
                          }
                        } catch (err) {
                          console.error('[VOTD] Failed to fetch related verse:', err);
                          setRelatedVerseText('Failed to load verse');
                        }
                      }}
                      style={{
                        marginBottom: 8,
                        padding: 12,
                        backgroundColor: colors.background.secondary,
                        borderRadius: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: colors.accent.primary,
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.accent.primary }}>
                        📖 {ref}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Related Verse Modal */}
      <Modal
        visible={showRelatedVerseModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRelatedVerseModal(false)}
      >
        <Pressable
          onPress={() => setShowRelatedVerseModal(false)}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20 }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.background.primary,
              borderRadius: 16,
              padding: 20,
              width: '100%',
              maxWidth: 400,
              maxHeight: '70%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, flex: 1 }}>
                {selectedRelatedVerse}
              </Text>
              <TouchableOpacity onPress={() => setShowRelatedVerseModal(false)}>
                <Text style={{ fontSize: 24, color: colors.text.secondary }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={{ fontSize: 15, lineHeight: 22, color: colors.text.primary, fontStyle: relatedVerseText === 'Loading...' ? 'italic' : 'normal' }}>
                {relatedVerseText || 'Select a verse to view'}
              </Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

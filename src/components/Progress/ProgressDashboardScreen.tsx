// src/components/Progress/ProgressDashboardScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView, RefreshControl, Modal, Pressable, TouchableWithoutFeedback, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabaseClient';
import { fetchUserDashboard, fetchActiveCharacterStudy } from '../../services/progress';
import { fetchActiveReadingPlan } from '../../services/readingPlans';
import { fetchVerseOfTheDay, logVotdView, type VerseOfTheDay } from '../../services/verseOfTheDay';
import { getUserBattleVerses, deleteBattleVerse, saveBattleVerse, BATTLE_TAGS, type BattleVerse } from '../../services/battleVerses';
import type { UserDashboard, ActiveCharacterStudy } from '../../services/progress';
import type { ActivePlanWithReading } from '../../services/readingPlans';
import VerseSummaryCard from '../VerseSummaryCard';
import { getVerseLifeApplication, type VerseLifeApplication } from '../../services/scripture';
import { setStudyDepth } from '../../services/userPrefs';
import { colors } from '../../theme/colors';
import { CHROME_MAX_SCALE } from '../../lib/textScaling';

interface HighlightWithDevotion {
  id: string;
  devotion_id: number;
  selected_text: string;
  color: string;
  created_at: string;
  devotion_title: string;
  devotion_date: string;
}

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
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryContent, setSummaryContent] = useState<VerseLifeApplication | null>(null);
  const [showRelatedVerseModal, setShowRelatedVerseModal] = useState(false);
  const [selectedRelatedVerse, setSelectedRelatedVerse] = useState<string | null>(null);
  const [relatedVerseText, setRelatedVerseText] = useState<string>('');
  const [showHighlightsModal, setShowHighlightsModal] = useState(false);
  const [highlights, setHighlights] = useState<HighlightWithDevotion[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [showBattleVersesModal, setShowBattleVersesModal] = useState(false);
  const [battleVerses, setBattleVerses] = useState<BattleVerse[]>([]);
  const [battleVersesLoading, setBattleVersesLoading] = useState(false);
  const [battleTagFilter, setBattleTagFilter] = useState<string | null>(null);
  const [votdBattleState, setVotdBattleState] = useState<'idle' | 'saving' | 'saved'>('idle');
  // Generalized source for the shared VerseSummaryCard (VOTD tap or a Battle Verse row tap).
  const [summaryVerse, setSummaryVerse] = useState<{
    bookName: string; chapter: number; verseNumber: number; verseText: string; reference: string;
  } | null>(null);
  const [summaryIsVotd, setSummaryIsVotd] = useState(false);

  // VOTD tap → same summary surface as an in-chapter verse tap (verse_life_application).
  const openVotdSummary = useCallback(async () => {
    if (!verseOfTheDay) return;
    setSummaryVerse({
      bookName: verseOfTheDay.book_name,
      chapter: verseOfTheDay.chapter_number,
      verseNumber: verseOfTheDay.verse_number,
      verseText: verseOfTheDay.verse_text,
      reference: verseOfTheDay.reference,
    });
    setSummaryIsVotd(true);
    setSummaryContent(null);
    setSummaryLoading(true);
    setSummaryOpen(true);
    try {
      const content = await getVerseLifeApplication(
        verseOfTheDay.book_name,
        verseOfTheDay.chapter_number,
        verseOfTheDay.verse_number,
      );
      setSummaryContent(content);
    } catch {
      setSummaryContent(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [verseOfTheDay]);

  // Battle verse row tap → same summary card, fed from the row's structured refs.
  // No battle-save button (it's already saved); summaryIsVotd stays false.
  const openBattleVerseSummary = useCallback(async (v: BattleVerse) => {
    // Option B: close the Battle Verses modal first so the card (a native Modal) isn't
    // occluded by a second stacked native modal. Trade-off: closing the card returns to
    // the dashboard, not the list. See fire/battle-verses ledger for the browse-in-place path.
    setShowBattleVersesModal(false);
    setSummaryVerse({
      bookName: v.book_name,
      chapter: v.chapter_number,
      verseNumber: v.verse_number,
      verseText: v.verse_text,
      reference: v.verse_reference,
    });
    setSummaryIsVotd(false);
    setSummaryContent(null);
    setSummaryLoading(true);
    setSummaryOpen(true);
    try {
      const content = await getVerseLifeApplication(v.book_name, v.chapter_number, v.verse_number);
      setSummaryContent(content);
    } catch {
      setSummaryContent(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Save the VOTD to Battle Verses — shared state drives BOTH the corner control and the
  // summary-card button. saveBattleVerse dedups via the unique constraint (false = already
  // saved); both outcomes mean "in the list", so both collapse to 'saved'. No duplicate possible.
  const saveVotdBattle = useCallback(async () => {
    if (!verseOfTheDay || votdBattleState !== 'idle') return;
    setVotdBattleState('saving');
    try {
      await saveBattleVerse(
        verseOfTheDay.book_name,
        verseOfTheDay.chapter_number,
        verseOfTheDay.verse_number,
        verseOfTheDay.verse_text,
      );
      setVotdBattleState('saved');
    } catch {
      setVotdBattleState('idle');
      Alert.alert('Error', 'Could not save verse.');
    }
  }, [verseOfTheDay, votdBattleState]);

  // Reset the shared Battle-save state when the verse changes (new day / refresh) — not on card close.
  useEffect(() => {
    setVotdBattleState('idle');
  }, [verseOfTheDay?.book_name, verseOfTheDay?.chapter_number, verseOfTheDay?.verse_number]);

  // Deeper affordance → Strong's deep-study surface (registered in this ProgressStack).
  // Drives off the generalized summaryVerse, so it works for VOTD and Battle Verse alike.
  // Closes the summary card before navigating so DeepStudy isn't fighting an open modal.
  const handleDeeper = useCallback(() => {
    if (!summaryVerse) return;
    setStudyDepth('deeper');
    setSummaryOpen(false);
    navigation.navigate('DeepStudy', {
      bookName: summaryVerse.bookName,
      chapter: summaryVerse.chapter,
      verseNumber: summaryVerse.verseNumber,
      verseText: summaryVerse.verseText,
    });
  }, [summaryVerse, navigation]);

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

      // Log VOTD view
      if (verseData) {
        logVotdView(verseData).catch(() => {});
      }

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
    navigation.navigate('StudyTab', { screen: 'ReadingPlansHome' });
  }, [navigation]);

  const openCharacters = useCallback(() => {
    navigation.navigate('StudyTab', { screen: 'CharactersHome' });
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

  const loadHighlights = async () => {
    try {
      setHighlightsLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setHighlightsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('daily_devotion_highlights')
        .select(`
          id,
          devotion_id,
          selected_text,
          color,
          created_at,
          daily_devotions!inner (
            title,
            devotion_date
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ProgressDashboard] Load highlights error:', error);
        setHighlightsLoading(false);
        return;
      }

      const transformed = (data || []).map((item: any) => ({
        id: item.id,
        devotion_id: item.devotion_id,
        selected_text: item.selected_text,
        color: item.color,
        created_at: item.created_at,
        devotion_title: item.daily_devotions?.title || 'Unknown Devotion',
        devotion_date: item.daily_devotions?.devotion_date || '',
      }));

      setHighlights(transformed);
    } catch (err) {
      console.error('[ProgressDashboard] Failed to load highlights:', err);
    } finally {
      setHighlightsLoading(false);
    }
  };

  const openHighlightsModal = () => {
    setShowHighlightsModal(true);
    loadHighlights();
  };

  const openDevotion = (devotionId: number) => {
    setShowHighlightsModal(false);
    navigation.navigate('DevotionDetail', { id: devotionId });
  };

  const deleteHighlight = async (highlightId: string) => {
    try {
      const { error } = await supabase
        .from('daily_devotion_highlights')
        .delete()
        .eq('id', highlightId);

      if (error) {
        console.error('[ProgressDashboard] Delete highlight error:', error);
        return;
      }

      setHighlights(highlights.filter(h => h.id !== highlightId));
    } catch (err) {
      console.error('[ProgressDashboard] Failed to delete highlight:', err);
    }
  };

  const loadBattleVerses = async (tag?: string | null) => {
    try {
      setBattleVersesLoading(true);
      const verses = await getUserBattleVerses(tag || undefined);
      setBattleVerses(verses);
    } catch (err) {
      console.error('[ProgressDashboard] Load battle verses error:', err);
    } finally {
      setBattleVersesLoading(false);
    }
  };

  const openBattleVersesModal = () => {
    setShowBattleVersesModal(true);
    setBattleTagFilter(null);
    loadBattleVerses();
  };

  const handleDeleteBattleVerse = async (verseId: string) => {
    try {
      await deleteBattleVerse(verseId);
      setBattleVerses(battleVerses.filter(v => v.id !== verseId));
    } catch (err) {
      console.error('[ProgressDashboard] Delete battle verse error:', err);
    }
  };

  const filterBattleVerses = (tag: string | null) => {
    setBattleTagFilter(tag);
    loadBattleVerses(tag);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mm = Math.max(1, Math.min(12, parseInt(m, 10))) - 1;
    return `${monthNames[mm]} ${parseInt(d, 10)}, ${y}`;
  };

  // Group highlights by devotion
  const groupedHighlights = highlights.reduce((acc, highlight) => {
    const key = `${highlight.devotion_id}`;
    if (!acc[key]) {
      acc[key] = {
        devotion_id: highlight.devotion_id,
        devotion_title: highlight.devotion_title,
        devotion_date: highlight.devotion_date,
        highlights: [],
      };
    }
    acc[key].highlights.push(highlight);
    return acc;
  }, {} as Record<string, { devotion_id: number; devotion_title: string; devotion_date: string; highlights: HighlightWithDevotion[] }>);

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
        <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 26, fontWeight: '800', marginBottom: 20, color: colors.text.primary }}>Your Progress</Text>

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
          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 11, color: '#92400e', fontWeight: '800', letterSpacing: 1.5 }}>STUDY STREAK</Text>
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 52, fontWeight: '900', color: '#92400e', lineHeight: 52 }}>
              {dashboard?.streak?.current || 0}
            </Text>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 36, marginBottom: 4 }}>🔥</Text>
          </View>
          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ marginTop: 8, fontSize: 15, color: '#92400e', fontWeight: '600' }}>
            Longest streak: {dashboard?.streak?.longest || 0} days
          </Text>
          {dashboard?.streak?.last_read_date && (
   <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ marginTop: 4, fontSize: 13, color: '#78350f', opacity: 0.8 }}>
     Last activity: {formatISODateYYYYMMDD(dashboard.streak.last_read_date)}
            </Text>
          )}
        </View>

        {/* Verse of the Day */}
        {verseOfTheDay && (
          <Pressable
            onPress={openVotdSummary}
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
            {/* Header row: label + theme + star */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 11, color: '#1e40af', fontWeight: '800', letterSpacing: 1.5 }}>VERSE OF THE DAY</Text>
                {verseOfTheDay.theme ? (
                  <View style={{ backgroundColor: '#bfdbfe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 10, color: '#1e40af', fontWeight: '700' }}>{verseOfTheDay.theme.toUpperCase()}</Text>
                  </View>
                ) : null}
              </View>
              {/* Corner Battle-save \u2014 same action + shared state as the summary-card button */}
              <TouchableOpacity
                onPress={saveVotdBattle}
                disabled={votdBattleState !== 'idle'}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
                  backgroundColor: votdBattleState === 'saved' ? 'rgba(39,174,96,0.15)' : '#bfdbfe',
                }}
              >
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 13, fontWeight: '700', color: votdBattleState === 'saved' ? '#1b7a43' : '#1e40af' }}>
                  {votdBattleState === 'saving' ? 'Saving\u2026' : votdBattleState === 'saved' ? '\u2713 Saved' : '\u2694\uFE0F Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={{ marginTop: 12, fontSize: 17, fontStyle: 'italic', lineHeight: 26, color: '#1e3a8a', fontWeight: '500' }}>
              "{verseOfTheDay.verse_text}"
            </Text>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ marginTop: 10, fontSize: 15, fontWeight: '700', color: '#1e40af' }}>
              — {verseOfTheDay.reference}
            </Text>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ marginTop: 8, fontSize: 13, color: '#2563eb', fontWeight: '600' }}>
              Tap for summary
            </Text>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={openBattleVersesModal}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor: '#1e40af',
                  borderRadius: 8,
                }}
              >
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>View Battle Verses</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('VOTDArchive')}
                style={{ paddingVertical: 10 }}
              >
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ color: '#2563eb', fontWeight: '600', fontSize: 13 }}>View Archive</Text>
              </TouchableOpacity>
            </View>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 11, color: '#6b21a8', fontWeight: '800', letterSpacing: 1.5 }}>TODAY'S DEVOTION</Text>
            <TouchableOpacity
              onPress={openHighlightsModal}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: '#7c3aed',
                borderRadius: 6,
              }}
            >
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>📝 Highlights</Text>
            </TouchableOpacity>
          </View>
          {todayDevotion ? (
            <>
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 19, fontWeight: '800', marginTop: 8, color: '#581c87' }}>{todayDevotion.title}</Text>
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
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Open Devotion →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 14, color: '#7c2d92', marginTop: 6 }}>
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
          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: colors.text.secondary, marginBottom: 12 }}>BIBLE READING</Text>
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 14, color: colors.text.secondary }}>Chapters Read</Text>
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
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
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ marginTop: 6, fontSize: 13, color: colors.text.secondary, textAlign: 'right', fontWeight: '600' }}>
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
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: '#1e40af', marginBottom: 8 }}>ACTIVE READING PLAN</Text>
            <View style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 14, color: '#374151' }}>Progress</Text>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 15, fontWeight: '700', color: '#1e3a8a' }}>
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
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ marginTop: 6, fontSize: 13, color: '#374151', textAlign: 'right', fontWeight: '600' }}>
                {Math.round(activePlan.percentage)}% complete
              </Text>
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 13, color: activePlan.on_track ? '#059669' : '#dc2626', fontWeight: '700' }}>
                {activePlan.on_track ? '✓ On track' : '⚠ Behind schedule'}
              </Text>
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 13, color: '#2563eb', fontWeight: '700' }}>Tap to view →</Text>
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
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: colors.text.secondary, marginBottom: 8 }}>READING PLANS</Text>
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
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Browse Reading Plans</Text>
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
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: '#92400e', marginBottom: 8 }}>ACTIVE CHARACTER STUDY</Text>
            <View style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 14, color: '#78350f' }}>Progress</Text>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 15, fontWeight: '700', color: '#92400e' }}>
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
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ marginTop: 6, fontSize: 13, color: '#78350f', textAlign: 'right', fontWeight: '600' }}>
                {activeCharacterStudy.percentage}% complete
              </Text>
            </View>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ marginTop: 12, fontSize: 13, color: '#f59e0b', fontWeight: '700', textAlign: 'right' }}>Tap to view study →</Text>
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
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: colors.text.secondary, marginBottom: 8 }}>CHARACTER STUDIES</Text>
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
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Browse Characters</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* VOTD verse summary — same card as an in-chapter verse tap (content only).
          Primary-action region intentionally left open for the upcoming Battle Verses feature. */}
      <VerseSummaryCard
        visible={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        reference={summaryVerse?.reference ?? ''}
        loading={summaryLoading}
        content={summaryContent}
        onDeeper={handleDeeper}
        onSaveBattleVerse={summaryIsVotd ? saveVotdBattle : undefined}
        battleState={summaryIsVotd ? votdBattleState : undefined}
      />

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
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, flex: 1 }}>
                {selectedRelatedVerse}
              </Text>
              <TouchableOpacity onPress={() => setShowRelatedVerseModal(false)}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 24, color: colors.text.secondary }}>×</Text>
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

      {/* Highlights Modal */}
      <Modal
        visible={showHighlightsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHighlightsModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: colors.background.primary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingBottom: 40,
            maxHeight: '80%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 }}>
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                Devotion Highlights
              </Text>
              <TouchableOpacity onPress={() => setShowHighlightsModal(false)} style={{ padding: 8 }}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 24, color: colors.text.secondary }}>×</Text>
              </TouchableOpacity>
            </View>

            {highlightsLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent.primary} />
              </View>
            ) : (
              <ScrollView style={{ paddingHorizontal: 20 }}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 20 }}>
                  {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} saved
                </Text>

                {highlights.length === 0 ? (
                  <View style={{ marginTop: 20, alignItems: 'center' }}>
                    <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 48, marginBottom: 16 }}>📝</Text>
                    <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 16, color: colors.text.secondary, textAlign: 'center' }}>
                      No highlights yet. Long-press paragraphs in devotions to save them!
                    </Text>
                  </View>
                ) : (
                  Object.values(groupedHighlights).map((group) => (
                    <View key={group.devotion_id} style={{ marginBottom: 24 }}>
                      <TouchableOpacity
                        onPress={() => openDevotion(group.devotion_id)}
                        style={{
                          padding: 12,
                          backgroundColor: colors.background.secondary,
                          borderRadius: 8,
                          marginBottom: 12,
                          borderLeftWidth: 3,
                          borderLeftColor: colors.accent.primary,
                        }}
                      >
                        <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                          {group.devotion_title}
                        </Text>
                        <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 12, color: colors.text.secondary, marginTop: 4 }}>
                          {formatDate(group.devotion_date)} • {group.highlights.length} highlight{group.highlights.length !== 1 ? 's' : ''}
                        </Text>
                      </TouchableOpacity>

                      {group.highlights.map((highlight) => (
                        <View
                          key={highlight.id}
                          style={{
                            padding: 12,
                            marginBottom: 12,
                            backgroundColor: '#fffbeb',
                            borderRadius: 8,
                            borderLeftWidth: 3,
                            borderLeftColor: '#f59e0b',
                            position: 'relative',
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => deleteHighlight(highlight.id)}
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: '#dc2626',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>×</Text>
                          </TouchableOpacity>
                          <Text style={{ fontSize: 15, lineHeight: 22, color: '#78350f', paddingRight: 32 }}>
                            {highlight.selected_text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Battle Verses Modal */}
      <Modal
        visible={showBattleVersesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBattleVersesModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: colors.background.primary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingBottom: 40,
            maxHeight: '85%',
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                Battle Verses
              </Text>
              <TouchableOpacity onPress={() => setShowBattleVersesModal(false)} style={{ padding: 8 }}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 24, color: colors.text.secondary }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Tag Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 12, maxHeight: 40 }}>
              <TouchableOpacity
                onPress={() => filterBattleVerses(null)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  marginRight: 8,
                  backgroundColor: battleTagFilter === null ? '#1e40af' : colors.background.tertiary,
                }}
              >
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ color: battleTagFilter === null ? '#fff' : colors.text.secondary, fontWeight: '600', fontSize: 13 }}>All</Text>
              </TouchableOpacity>
              {BATTLE_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => filterBattleVerses(tag)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    marginRight: 8,
                    backgroundColor: battleTagFilter === tag ? '#1e40af' : colors.background.tertiary,
                  }}
                >
                  <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{
                    color: battleTagFilter === tag ? '#fff' : colors.text.secondary,
                    fontWeight: '600',
                    fontSize: 13,
                    textTransform: 'capitalize',
                  }}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Content */}
            {battleVersesLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent.primary} />
              </View>
            ) : (
              <ScrollView style={{ paddingHorizontal: 20 }}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 16 }}>
                  {battleVerses.length} verse{battleVerses.length !== 1 ? 's' : ''} saved
                </Text>

                {battleVerses.length === 0 ? (
                  <View style={{ marginTop: 20, alignItems: 'center' }}>
                    <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 48, marginBottom: 16 }}>⚔️</Text>
                    <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 16, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 }}>
                      No battle verses yet. Long-press a verse while reading the Bible to save it here!
                    </Text>
                  </View>
                ) : (
                  battleVerses.map((verse) => (
                    <TouchableOpacity
                      key={verse.id}
                      activeOpacity={0.7}
                      onPress={() => openBattleVerseSummary(verse)}
                      style={{
                        marginBottom: 16,
                        padding: 14,
                        backgroundColor: colors.background.secondary,
                        borderRadius: 10,
                        borderLeftWidth: 4,
                        borderLeftColor: '#1e40af',
                        position: 'relative',
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handleDeleteBattleVerse(verse.id)}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: '#dc2626',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>×</Text>
                      </TouchableOpacity>
                      <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 6 }}>
                        {verse.verse_reference}
                      </Text>
                      <Text style={{ fontSize: 15, lineHeight: 22, color: colors.text.primary, paddingRight: 28, fontStyle: 'italic' }}>
                        "{verse.verse_text}"
                      </Text>
                      {verse.battle_tag && (
                        <View style={{
                          marginTop: 8,
                          alignSelf: 'flex-start',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          backgroundColor: '#1e40af',
                          borderRadius: 12,
                        }}>
                          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                            {verse.battle_tag}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

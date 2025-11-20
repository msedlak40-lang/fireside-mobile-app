// src/components/Progress/ProgressDashboardScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView, RefreshControl, Modal, Pressable, TouchableWithoutFeedback, Alert, TextInput, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabaseClient';
import { fetchUserDashboard, fetchActiveCharacterStudy } from '../../services/progress';
import { fetchActiveReadingPlan } from '../../services/readingPlans';
import { fetchVerseOfTheDay, type VerseOfTheDay } from '../../services/verseOfTheDay';
import { saveBattleVerse, getUserBattleVerses, deleteBattleVerse, toggleBattleVerseFavorite, updateBattleVerseTag, getCurrentArmorPiece, getTodaysArmorPiece, getActiveBattle } from '../../services/armor';
import type { UserDashboard, ActiveCharacterStudy } from '../../services/progress';
import type { ActivePlanWithReading } from '../../services/readingPlans';
import { colors } from '../../theme/colors';

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
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [showRelatedVerseModal, setShowRelatedVerseModal] = useState(false);
  const [selectedRelatedVerse, setSelectedRelatedVerse] = useState<string | null>(null);
  const [relatedVerseText, setRelatedVerseText] = useState<string>('');
  const [showHighlightsModal, setShowHighlightsModal] = useState(false);
  const [highlights, setHighlights] = useState<HighlightWithDevotion[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [isSavingBattleVerse, setIsSavingBattleVerse] = useState(false);
  const [votdSaved, setVotdSaved] = useState(false);
  const [showBattleVersesModal, setShowBattleVersesModal] = useState(false);
  const [battleVerses, setBattleVerses] = useState<any[]>([]);
  const [battleVersesLoading, setBattleVersesLoading] = useState(false);
  const [currentArmor, setCurrentArmor] = useState<any | null>(null);
  const [activeBattle, setActiveBattle] = useState<any | null>(null);
  const [battleVerseSearch, setBattleVerseSearch] = useState('');
  const [selectedBattleFilter, setSelectedBattleFilter] = useState<string | null>(null);

  // Close modal with a delay to let React Native clean up touch handlers
  const closeInsightModal = () => {
    setTimeout(() => {
      setShowInsightModal(false);
    }, 100);
  };

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
      const [dashData, planData, characterStudyData, verseData, armorData] = await Promise.all([
        fetchUserDashboard(),
        fetchActiveReadingPlan(),
        fetchActiveCharacterStudy(),
        fetchVerseOfTheDay('KJV'),
        getTodaysArmorPiece(),
      ]);

      // today's devotion
      const today = getLocalISODate('America/Chicago');
      const { data } = await supabase
        .from('daily_devotions')
        .select('id,title,devotion_date')
        .eq('devotion_date', today)
        .maybeSingle();

      // Get active battle
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      const battleData = userId ? await getActiveBattle(userId) : null;

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
      setCurrentArmor(armorData);
      setActiveBattle(battleData);

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
    await Promise.all([fetchFreshData(), loadBattleVerses()]);
    setRefreshing(false);
  };

  // Load data only once on mount
  useEffect(() => {
    load();
    loadBattleVerses();
  }, []);

  // Check if VoTD is already saved when it loads
  useEffect(() => {
    if (verseOfTheDay) {
      checkIfVotdSaved();
    }
  }, [verseOfTheDay]);

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

  const checkIfVotdSaved = async () => {
    try {
      if (!verseOfTheDay) return;

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const savedVerses = await getUserBattleVerses(userId);

      // Parse verse reference to extract book, chapter, verse
      const match = verseOfTheDay.reference.match(/^(.+?)\s+(\d+):(\d+)$/);
      if (!match) return;

      const [, bookName, chapter, verse] = match;
      const isAlreadySaved = savedVerses.some(
        v => v.book_name === bookName &&
             v.chapter_number === parseInt(chapter) &&
             v.verse_number === parseInt(verse)
      );

      setVotdSaved(isAlreadySaved);
    } catch (err) {
      console.error('[ProgressDashboard] Check VoTD saved failed:', err);
    }
  };

  const loadBattleVerses = async () => {
    try {
      setBattleVersesLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setBattleVersesLoading(false);
        return;
      }

      const verses = await getUserBattleVerses(userId);
      setBattleVerses(verses);
    } catch (err) {
      console.error('[ProgressDashboard] Failed to load battle verses:', err);
    } finally {
      setBattleVersesLoading(false);
    }
  };

  const openBattleVersesModal = () => {
    setShowBattleVersesModal(true);
    loadBattleVerses();
  };

  const deleteBattleVerseHandler = async (verseId: string) => {
    try {
      const success = await deleteBattleVerse(verseId);
      if (success) {
        setBattleVerses(battleVerses.filter(v => v.id !== verseId));
      } else {
        Alert.alert('Error', 'Failed to delete verse');
      }
    } catch (err) {
      console.error('[ProgressDashboard] Failed to delete battle verse:', err);
      Alert.alert('Error', 'Failed to delete verse. Please try again.');
    }
  };

  const toggleFavoriteHandler = async (verseId: string, currentFavoriteStatus: boolean) => {
    try {
      const newStatus = !currentFavoriteStatus;
      const success = await toggleBattleVerseFavorite(verseId, newStatus);
      if (success) {
        // Update local state
        setBattleVerses(battleVerses.map(v =>
          v.id === verseId ? { ...v, is_favorite: newStatus } : v
        ));
      } else {
        Alert.alert('Error', 'Failed to update favorite status');
      }
    } catch (err) {
      console.error('[ProgressDashboard] Failed to toggle favorite:', err);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    }
  };

  const editBattleVerseTagHandler = async (verse: any) => {
    try {
      const updateTag = async (tag: string | null) => {
        try {
          const success = await updateBattleVerseTag(verse.id, tag as any);
          if (success) {
            // Update local state
            setBattleVerses(battleVerses.map(v =>
              v.id === verse.id ? { ...v, battle_tag: tag } : v
            ));
            Alert.alert('Updated!', 'Battle verse tag updated successfully');
          } else {
            Alert.alert('Error', 'Failed to update tag');
          }
        } catch (err) {
          console.error('[ProgressDashboard] Failed to update tag:', err);
          Alert.alert('Error', 'Failed to update tag. Please try again.');
        }
      };

      Alert.alert(
        'Edit Tag',
        `Current tag: ${verse.battle_tag || 'None'}\n\nChoose a new category:`,
        [
          { text: 'Fear', onPress: () => updateTag('fear') },
          { text: 'Anger', onPress: () => updateTag('anger') },
          { text: 'Temptation', onPress: () => updateTag('temptation') },
          { text: 'Doubt', onPress: () => updateTag('doubt') },
          { text: 'Loneliness', onPress: () => updateTag('loneliness') },
          { text: 'Identity', onPress: () => updateTag('identity') },
          { text: 'Purpose', onPress: () => updateTag('purpose') },
          { text: 'Remove Tag', onPress: () => updateTag(null) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (err) {
      console.error('[ProgressDashboard] Edit tag handler failed:', err);
      Alert.alert('Error', 'Failed to process request. Please try again.');
    }
  };

  const shareVerseHandler = async (verse: any) => {
    try {
      const message = `${verse.verse_reference}\n\n"${verse.verse_text}"${verse.battle_tag ? `\n\n#${verse.battle_tag}` : ''}`;

      await Share.share({
        message,
        title: verse.verse_reference,
      });
    } catch (err) {
      console.error('[ProgressDashboard] Failed to share verse:', err);
    }
  };

  const saveBattleVerseHandler = async () => {
    try {
      if (!verseOfTheDay || isSavingBattleVerse) return;

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        Alert.alert('Error', 'You must be signed in to save battle verses');
        return;
      }

      // Parse verse reference
      const match = verseOfTheDay.reference.match(/^(.+?)\s+(\d+):(\d+)$/);
      if (!match) {
        Alert.alert('Error', 'Invalid verse reference format');
        return;
      }

      const [, bookName, chapter, verse] = match;

      // Show battle tag selection
      const battleTagOptions: any[] = [
        { text: 'Fear', onPress: () => saveWithTag('fear') },
        { text: 'Anger', onPress: () => saveWithTag('anger') },
        { text: 'Temptation', onPress: () => saveWithTag('temptation') },
        { text: 'Doubt', onPress: () => saveWithTag('doubt') },
        { text: 'Loneliness', onPress: () => saveWithTag('loneliness') },
        { text: 'Identity', onPress: () => saveWithTag('identity') },
        { text: 'Purpose', onPress: () => saveWithTag('purpose') },
        { text: 'General (no tag)', onPress: () => saveWithTag(null) },
        { text: 'Cancel', style: 'cancel' },
      ];

      const saveWithTag = async (tag: string | null) => {
        try {
          setIsSavingBattleVerse(true);

          const result = await saveBattleVerse(
            userId,
            bookName,
            parseInt(chapter),
            parseInt(verse),
            verseOfTheDay.reference,
            verseOfTheDay.verse_text,
            tag as any
          );

          if (result) {
            Alert.alert('Saved!', 'Verse added to your Battle Verses collection');
            setVotdSaved(true);
            // Refresh battle verses if modal is open
            if (showBattleVersesModal) {
              loadBattleVerses();
            }
          } else {
            Alert.alert('Already Saved', 'This verse is already in your Battle Verses');
          }
        } catch (err) {
          console.error('[ProgressDashboard] Save battle verse failed:', err);
          Alert.alert('Error', 'Failed to save verse. Please try again.');
        } finally {
          setIsSavingBattleVerse(false);
        }
      };

      Alert.alert(
        'Tag this verse',
        'Choose a battle category for this verse:',
        battleTagOptions
      );
    } catch (err) {
      console.error('[ProgressDashboard] Save battle verse handler failed:', err);
      Alert.alert('Error', 'Failed to process request. Please try again.');
    }
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

  // Filter and organize battle verses
  const battleTags = ['fear', 'anger', 'temptation', 'doubt', 'loneliness', 'identity', 'purpose'];

  const filteredBattleVerses = battleVerses.filter(verse => {
    // Apply search filter
    const searchLower = battleVerseSearch.toLowerCase();
    const matchesSearch = !battleVerseSearch ||
      verse.verse_reference.toLowerCase().includes(searchLower) ||
      verse.verse_text.toLowerCase().includes(searchLower) ||
      (verse.battle_tag && verse.battle_tag.toLowerCase().includes(searchLower));

    // Apply tag filter
    const matchesTag = !selectedBattleFilter ||
      (selectedBattleFilter === 'general' ? !verse.battle_tag : verse.battle_tag === selectedBattleFilter);

    return matchesSearch && matchesTag;
  });

  // Separate favorites
  const favoriteVerses = filteredBattleVerses.filter(v => v.is_favorite);
  const nonFavoriteVerses = filteredBattleVerses.filter(v => !v.is_favorite);

  // Group non-favorites by battle tag
  const groupedBattleVerses: Record<string, any[]> = {};
  nonFavoriteVerses.forEach(verse => {
    const tag = verse.battle_tag || 'general';
    if (!groupedBattleVerses[tag]) {
      groupedBattleVerses[tag] = [];
    }
    groupedBattleVerses[tag].push(verse);
  });

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
        key={`scroll-${showInsightModal ? 'modal' : 'normal'}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
        scrollEnabled={!showInsightModal}
        pointerEvents={showInsightModal ? 'none' : 'auto'}
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

        {/* Armor of God Card */}
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('ArmorUpHome');
          }}
          style={{
            marginBottom: 16,
            padding: 20,
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
          <Text style={{ fontSize: 11, color: '#92400e', fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 }}>
            ⚔️ ARMOR OF GOD
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 8, color: '#92400e' }}>
            Your Spiritual Arsenal
          </Text>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 15, color: '#78350f', fontWeight: '600', marginBottom: 4 }}>
              {battleVerses.length} Battle {battleVerses.length === 1 ? 'Verse' : 'Verses'} Saved
            </Text>
            {activeBattle && (
              <Text style={{ fontSize: 13, color: '#92400e', marginTop: 4 }}>
                Active Battle: {activeBattle.battle_name}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 12, color: '#92400e', fontStyle: 'italic', marginBottom: 12 }}>
            Daily applications update every 24 hours
          </Text>
          <View style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: '#f59e0b',
            borderRadius: 8,
            alignSelf: 'flex-start',
          }}>
            <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>View All 7 Pieces →</Text>
          </View>
        </TouchableOpacity>

        {/* Verse of the Day */}
        {verseOfTheDay && (
          <View
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: '#1e40af', fontWeight: '800', letterSpacing: 1.5 }}>VERSE OF THE DAY</Text>
              <TouchableOpacity
                onPress={openBattleVersesModal}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: '#2563eb',
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>⚔️ Battle Verses</Text>
              </TouchableOpacity>
            </View>
            <Pressable
              onPress={() => {
                if (verseOfTheDay.insight_title || verseOfTheDay.insight_detail) {
                  setShowInsightModal(true);
                }
              }}
              disabled={!verseOfTheDay.insight_title && !verseOfTheDay.insight_detail}
            >
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
          </View>
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
            <Text style={{ fontSize: 11, color: '#6b21a8', fontWeight: '800', letterSpacing: 1.5 }}>TODAY'S DEVOTION</Text>
            <TouchableOpacity
              onPress={openHighlightsModal}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: '#7c3aed',
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>📝 Highlights</Text>
            </TouchableOpacity>
          </View>
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
      {showInsightModal && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={closeInsightModal}
        >
          <Pressable
            style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={closeInsightModal}
          >
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
                <TouchableOpacity onPress={closeInsightModal} style={{ padding: 8 }}>
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
                    <View
                      key={index}
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
                    </View>
                  ))}
                </View>
              )}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}

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
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                Devotion Highlights
              </Text>
              <TouchableOpacity onPress={() => setShowHighlightsModal(false)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 24, color: colors.text.secondary }}>×</Text>
              </TouchableOpacity>
            </View>

            {highlightsLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent.primary} />
              </View>
            ) : (
              <ScrollView style={{ paddingHorizontal: 20 }}>
                <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 20 }}>
                  {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} saved
                </Text>

                {highlights.length === 0 ? (
                  <View style={{ marginTop: 20, alignItems: 'center' }}>
                    <Text style={{ fontSize: 48, marginBottom: 16 }}>📝</Text>
                    <Text style={{ fontSize: 16, color: colors.text.secondary, textAlign: 'center' }}>
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
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                          {group.devotion_title}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 4 }}>
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
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>×</Text>
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                Battle Verses
              </Text>
              <TouchableOpacity onPress={() => setShowBattleVersesModal(false)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 24, color: colors.text.secondary }}>×</Text>
              </TouchableOpacity>
            </View>

            {battleVersesLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent.primary} />
              </View>
            ) : (
              <>
                {/* Fixed Header Area - Search + Filters */}
                <View style={{ backgroundColor: colors.background.primary }}>
                  {/* Search Bar */}
                  <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                    <TextInput
                      value={battleVerseSearch}
                      onChangeText={setBattleVerseSearch}
                      placeholder="Search verses..."
                      placeholderTextColor={colors.text.secondary}
                      style={{
                        backgroundColor: colors.background.secondary,
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 15,
                        color: colors.text.primary,
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                      }}
                    />
                  </View>

                  {/* Filter Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, marginBottom: 16 }} contentContainerStyle={{ paddingRight: 20 }}>
                    <TouchableOpacity
                      onPress={() => setSelectedBattleFilter(null)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        backgroundColor: !selectedBattleFilter ? '#2563eb' : colors.background.secondary,
                        borderRadius: 20,
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: !selectedBattleFilter ? '#2563eb' : '#d1d5db',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: !selectedBattleFilter ? '#fff' : colors.text.secondary }}>
                        All
                      </Text>
                    </TouchableOpacity>
                    {battleTags.map(tag => (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => setSelectedBattleFilter(tag)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          backgroundColor: selectedBattleFilter === tag ? '#2563eb' : colors.background.secondary,
                          borderRadius: 20,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: selectedBattleFilter === tag ? '#2563eb' : '#d1d5db',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: selectedBattleFilter === tag ? '#fff' : colors.text.secondary }}>
                          {tag.charAt(0).toUpperCase() + tag.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => setSelectedBattleFilter('general')}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        backgroundColor: selectedBattleFilter === 'general' ? '#2563eb' : colors.background.secondary,
                        borderRadius: 20,
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: selectedBattleFilter === 'general' ? '#2563eb' : '#d1d5db',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: selectedBattleFilter === 'general' ? '#fff' : colors.text.secondary }}>
                        General
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* Scrollable Content Area */}
                <ScrollView
                  style={{ paddingHorizontal: 20 }}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {/* Add VOTD Button */}
                  {verseOfTheDay && !votdSaved && (
                    <TouchableOpacity
                      onPress={saveBattleVerseHandler}
                      disabled={isSavingBattleVerse}
                      style={{
                        marginTop: 8,
                        marginBottom: 20,
                        padding: 16,
                        backgroundColor: '#dbeafe',
                        borderRadius: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: '#2563eb',
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, color: '#1e40af', fontWeight: '700', marginBottom: 6 }}>
                            TODAY'S VERSE
                          </Text>
                          <Text style={{ fontSize: 15, color: '#1e3a8a', fontWeight: '600' }}>
                            {verseOfTheDay.reference}
                          </Text>
                        </View>
                        <View style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          backgroundColor: '#2563eb',
                          borderRadius: 8,
                        }}>
                          <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>
                            {isSavingBattleVerse ? '...' : '+ Add'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}

                  <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 20 }}>
                    {filteredBattleVerses.length} verse{filteredBattleVerses.length !== 1 ? 's' : ''} {battleVerseSearch || selectedBattleFilter ? 'found' : 'saved'}
                  </Text>

                  {filteredBattleVerses.length === 0 ? (
                    <View style={{ marginTop: 20, alignItems: 'center' }}>
                      <Text style={{ fontSize: 48, marginBottom: 16 }}>⚔️</Text>
                      <Text style={{ fontSize: 16, color: colors.text.secondary, textAlign: 'center', paddingHorizontal: 20 }}>
                        {battleVerses.length === 0
                          ? 'No battle verses yet. Save verses to build your arsenal for spiritual warfare!'
                          : 'No verses match your search or filter.'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Favorites Section */}
                      {favoriteVerses.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 12,
                            paddingBottom: 8,
                            borderBottomWidth: 2,
                            borderBottomColor: '#fbbf24',
                          }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#92400e', letterSpacing: 0.5 }}>
                              ⭐ FAVORITES
                            </Text>
                            <View style={{
                              marginLeft: 8,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              backgroundColor: '#fbbf24',
                              borderRadius: 10,
                            }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>
                                {favoriteVerses.length}
                              </Text>
                            </View>
                          </View>
                          {favoriteVerses.map((verse) => (
                            <View
                              key={verse.id}
                              style={{
                                marginBottom: 16,
                                padding: 14,
                                backgroundColor: '#fffbeb',
                                borderRadius: 12,
                                borderLeftWidth: 4,
                                borderLeftColor: '#fbbf24',
                                position: 'relative',
                              }}
                            >
                              <View style={{ flexDirection: 'row', position: 'absolute', top: 10, right: 10, gap: 8 }}>
                                <TouchableOpacity
                                  onPress={() => editBattleVerseTagHandler(verse)}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: '#3b82f6',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Text style={{ color: '#fff', fontSize: 16 }}>✎</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => toggleFavoriteHandler(verse.id, verse.is_favorite)}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: '#fbbf24',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Text style={{ fontSize: 16 }}>⭐</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => deleteBattleVerseHandler(verse.id)}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: '#dc2626',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>×</Text>
                                </TouchableOpacity>
                              </View>

                              <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 8, paddingRight: 104 }}>
                                {verse.verse_reference}
                              </Text>
                              <Text style={{ fontSize: 15, lineHeight: 22, color: '#78350f', marginBottom: 8 }}>
                                "{verse.verse_text}"
                              </Text>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                {verse.battle_tag ? (
                                  <View style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    backgroundColor: '#fde68a',
                                    borderRadius: 6,
                                  }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e' }}>
                                      {verse.battle_tag}
                                    </Text>
                                  </View>
                                ) : <View />}
                                <TouchableOpacity onPress={() => shareVerseHandler(verse)}>
                                  <Text style={{ fontSize: 13, color: '#3b82f6', fontWeight: '600' }}>
                                    Share 📤
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Grouped Sections by Battle Tag */}
                      {[...battleTags, 'general'].map(tag => {
                        const versesInTag = groupedBattleVerses[tag];
                        if (!versesInTag || versesInTag.length === 0) return null;

                        return (
                          <View key={tag} style={{ marginBottom: 24 }}>
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginBottom: 12,
                              paddingBottom: 8,
                              borderBottomWidth: 2,
                              borderBottomColor: '#2563eb',
                            }}>
                              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e40af', letterSpacing: 0.5 }}>
                                {tag === 'general' ? '📖 GENERAL' : `⚔️ ${tag.toUpperCase()}`}
                              </Text>
                              <View style={{
                                marginLeft: 8,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                backgroundColor: '#2563eb',
                                borderRadius: 10,
                              }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>
                                  {versesInTag.length}
                                </Text>
                              </View>
                            </View>
                            {versesInTag.map((verse) => (
                              <View
                                key={verse.id}
                                style={{
                                  marginBottom: 16,
                                  padding: 14,
                                  backgroundColor: '#fef3c7',
                                  borderRadius: 12,
                                  borderLeftWidth: 4,
                                  borderLeftColor: '#f59e0b',
                                  position: 'relative',
                                }}
                              >
                                <View style={{ flexDirection: 'row', position: 'absolute', top: 10, right: 10, gap: 8 }}>
                                  <TouchableOpacity
                                    onPress={() => editBattleVerseTagHandler(verse)}
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      backgroundColor: '#3b82f6',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Text style={{ color: '#fff', fontSize: 16 }}>✎</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => toggleFavoriteHandler(verse.id, verse.is_favorite)}
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      backgroundColor: '#e5e7eb',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Text style={{ fontSize: 16 }}>☆</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => deleteBattleVerseHandler(verse.id)}
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      backgroundColor: '#dc2626',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>×</Text>
                                  </TouchableOpacity>
                                </View>

                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 8, paddingRight: 104 }}>
                                  {verse.verse_reference}
                                </Text>
                                <Text style={{ fontSize: 15, lineHeight: 22, color: '#78350f', marginBottom: 8 }}>
                                  "{verse.verse_text}"
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  {verse.battle_tag ? (
                                    <View style={{
                                      paddingHorizontal: 10,
                                      paddingVertical: 4,
                                      backgroundColor: '#fde68a',
                                      borderRadius: 6,
                                    }}>
                                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e' }}>
                                        {verse.battle_tag}
                                      </Text>
                                    </View>
                                  ) : <View />}
                                  <TouchableOpacity onPress={() => shareVerseHandler(verse)}>
                                    <Text style={{ fontSize: 13, color: '#3b82f6', fontWeight: '600' }}>
                                      Share 📤
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </View>
                        );
                      })}
                    </>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

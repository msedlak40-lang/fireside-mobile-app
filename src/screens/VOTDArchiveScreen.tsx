// src/screens/VOTDArchiveScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getVotdHistory, getStarredVotd, toggleVotdStar } from '../services/verseOfTheDay';
import { colors } from '../theme/colors';

type VotdEntry = {
  id: string;
  date: string;
  book_name: string;
  chapter_number: number;
  verse_number: number;
  verse_reference: string;
  verse_text: string;
  theme: string | null;
  source: string | null;
  is_starred: boolean;
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mi = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${months[mi]} ${parseInt(d, 10)}, ${y}`;
}

export default function VOTDArchiveScreen() {
  const [filter, setFilter] = useState<'all' | 'starred'>('all');
  const [verses, setVerses] = useState<VotdEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVerses = useCallback(async () => {
    setLoading(true);
    try {
      const data = filter === 'starred'
        ? await getStarredVotd()
        : await getVotdHistory(60);
      setVerses(data as VotdEntry[]);
    } catch (err) {
      console.error('[VOTDArchive] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadVerses();
    }, [loadVerses]),
  );

  const handleToggleStar = async (date: string) => {
    const newState = await toggleVotdStar(date);
    setVerses(prev =>
      prev
        .map(v => (v.date === date ? { ...v, is_starred: newState } : v))
        .filter(v => filter !== 'starred' || v.is_starred),
    );
  };

  const renderItem = ({ item }: { item: VotdEntry }) => (
    <View style={s.card}>
      <View style={{ flex: 1 }}>
        <Text style={s.date}>{formatDate(item.date)}</Text>
        {item.theme ? (
          <View style={s.themeTag}>
            <Text style={s.themeTagText}>{item.theme}</Text>
          </View>
        ) : null}
        <Text style={s.verseText} numberOfLines={3}>
          "{item.verse_text}"
        </Text>
        <Text style={s.reference}>{item.verse_reference}</Text>
      </View>
      <TouchableOpacity
        onPress={() => handleToggleStar(item.date)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ paddingLeft: 12 }}
      >
        <Text style={{ fontSize: 26 }}>{item.is_starred ? '\u2B50' : '\u2606'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Filter tabs */}
      <View style={s.filterRow}>
        <TouchableOpacity
          onPress={() => setFilter('all')}
          style={[s.tab, filter === 'all' && s.tabActive]}
        >
          <Text style={filter === 'all' ? s.tabTextActive : s.tabText}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter('starred')}
          style={[s.tab, filter === 'starred' && s.tabActive]}
        >
          <Text style={filter === 'starred' ? s.tabTextActive : s.tabText}>Favorites</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent.primary} />
        </View>
      ) : (
        <FlatList
          data={verses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>
                {filter === 'starred' ? '\u2B50' : '\uD83D\uDCD6'}
              </Text>
              <Text style={{ fontSize: 16, color: colors.text.secondary, textAlign: 'center', lineHeight: 24 }}>
                {filter === 'starred'
                  ? 'No favorites yet.\nStar a verse of the day to save it here!'
                  : 'No verse history yet.\nCheck back after viewing your first Verse of the Day.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.accent.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  date: {
    fontSize: 12,
    color: colors.text.muted,
    fontWeight: '600',
    marginBottom: 6,
  },
  themeTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  themeTagText: {
    fontSize: 11,
    color: '#1e40af',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verseText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  reference: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent.primary,
  },
});

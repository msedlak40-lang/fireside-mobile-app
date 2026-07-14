// src/screens/DevotionArchiveScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import {
  getStarredDevotions,
  getStarredDevotionIds,
  toggleDevotionStar,
} from '../services/devotionInteractions';
import { colors } from '../theme/colors';
import type { Devotion } from '../types/supabase-devotions';

type Filter = 'all' | 'starred';

function formatDate(iso: string | null): string {
  if (!iso) return 'Undated';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mm = Math.max(1, Math.min(12, parseInt(m, 10))) - 1;
  return `${months[mm]} ${parseInt(d, 10)}, ${y}`;
}

export default function DevotionArchiveScreen() {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<Filter>('all');
  const [devotions, setDevotions] = useState<Devotion[]>([]);
  const [starredIds, setStarredIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (filter === 'starred') {
        const starred = await getStarredDevotions();
        setDevotions(starred as Devotion[]);
        setStarredIds(new Set(starred.map((d: any) => d.id)));
      } else {
        const [allResult, ids] = await Promise.all([
          supabase
            .from('daily_devotions')
            .select('*')
            .not('devotion_date', 'is', null)
            .lte('devotion_date', new Date().toISOString().slice(0, 10))
            .order('devotion_date', { ascending: false })
            .limit(100),
          getStarredDevotionIds(),
        ]);
        setDevotions((allResult.data || []) as Devotion[]);
        setStarredIds(ids);
      }
    } catch (err) {
      console.error('[DevotionArchive] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleStar = async (devotionId: number) => {
    try {
      const newStarred = await toggleDevotionStar(devotionId);
      setStarredIds(prev => {
        const next = new Set(prev);
        if (newStarred) next.add(devotionId);
        else next.delete(devotionId);
        return next;
      });
      // If on starred tab, remove unstarred items
      if (filter === 'starred' && !newStarred) {
        setDevotions(prev => prev.filter(d => d.id !== devotionId));
      }
    } catch (err) {
      console.error('[DevotionArchive] star toggle error:', err);
    }
  };

  const renderItem = ({ item }: { item: Devotion }) => {
    const starred = starredIds.has(item.id);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DevotionDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.cardDate}>{formatDate(item.devotion_date)}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          {item.key_verse_reference ? (
            <Text style={styles.cardVerse}>{item.key_verse_reference}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => handleToggleStar(item.id)}
          style={styles.starBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ fontSize: 24 }}>{starred ? '\u2B50' : '\u2606'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'starred' && styles.tabActive]}
          onPress={() => setFilter('starred')}
        >
          <Text style={[styles.tabText, filter === 'starred' && styles.tabTextActive]}>
            Favorites
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
        </View>
      ) : devotions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {filter === 'starred'
              ? 'No favorite devotions yet.\nTap the star on any devotion to save it here.'
              : 'No devotions found.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={devotions}
          keyExtractor={d => String(d.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  tabRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  tabActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  cardDate: {
    fontSize: 12,
    color: colors.text.muted,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 4,
  },
  cardVerse: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
  },
  starBtn: {
    marginLeft: 12,
    padding: 4,
  },
});

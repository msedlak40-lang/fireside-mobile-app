// src/components/Devotions/DailyListScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import type { Devotion } from '../../types/supabase-devotions';

export default function DailyListScreen() {
  const [today, setToday] = useState<Devotion | null>(null);
  const [items, setItems] = useState<Devotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const load = async () => {
    setLoading(true);
    try {
      const todayISO = new Date().toISOString().slice(0, 10);

      // Today’s devotion (if any)
      const { data: todayRows, error: tErr } = await supabase
        .from('daily_devotions')
        .select('*')
        .eq('devotion_date', todayISO)
        .limit(1);
      if (tErr) throw tErr;
      setToday(todayRows?.[0] ?? null);

      // Recent dated devotions
      const { data: list, error: lErr } = await supabase
        .from('daily_devotions')
        .select('*')
        .not('devotion_date', 'is', null)
        .order('devotion_date', { ascending: false })
        .limit(60);
      if (lErr) throw lErr;
      setItems((list ?? []) as Devotion[]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator/></View>;

  const renderRow = ({ item }: { item: Devotion }) => (
    <Pressable onPress={() => navigation.navigate('DevotionDetail', { id: item.id })} style={{ padding:16, borderBottomWidth:1, borderBottomColor:'#eee' }}>
      <Text style={{ fontSize:16, fontWeight:'600' }}>{item.title}</Text>
      <Text style={{ marginTop:4, fontSize:13, color:'#6b7280' }}>
        {item.devotion_date ? new Date(item.devotion_date).toDateString() : 'Undated'} • {item.key_verse_reference}
      </Text>
    </Pressable>
  );

  return (
    <FlatList
      ListHeaderComponent={today ? (
        <Pressable onPress={() => navigation.navigate('DevotionDetail', { id: today.id })}
          style={{ padding:16, backgroundColor:'#f8fafc', borderBottomWidth:1, borderBottomColor:'#e5e7eb' }}>
          <Text style={{ fontSize:12, color:'#2563eb', fontWeight:'700' }}>TODAY</Text>
          <Text style={{ marginTop:6, fontSize:18, fontWeight:'700' }}>{today.title}</Text>
          <Text style={{ marginTop:4, fontSize:13, color:'#64748b' }}>{today.key_verse_reference}</Text>
        </Pressable>
      ) : null}
      data={items}
      keyExtractor={(d) => String(d.id)}
      renderItem={renderRow}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

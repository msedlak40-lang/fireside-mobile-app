// src/screens/AllDevotionHighlights.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';

interface HighlightWithDevotion {
  id: string;
  devotion_id: number;
  selected_text: string;
  color: string;
  created_at: string;
  devotion_title: string;
  devotion_date: string;
}

export default function AllDevotionHighlights() {
  const navigation = useNavigation<any>();
  const [highlights, setHighlights] = useState<HighlightWithDevotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllHighlights();
  }, []);

  const loadAllHighlights = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      // Join highlights with devotions to get titles and dates
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
        console.error('[AllHighlights] Load error:', error);
        setLoading(false);
        return;
      }

      // Transform the data
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
      console.error('[AllHighlights] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mm = Math.max(1, Math.min(12, parseInt(m, 10))) - 1;
    return `${monthNames[mm]} ${parseInt(d, 10)}, ${y}`;
  };

  const openDevotion = (devotionId: number) => {
    navigation.navigate('DevotionDetail', { devotionId });
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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text.primary, marginBottom: 8 }}>
          All Devotion Highlights
        </Text>
        <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 24 }}>
          {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} saved
        </Text>

        {highlights.length === 0 ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📝</Text>
            <Text style={{ fontSize: 16, color: colors.text.secondary, textAlign: 'center' }}>
              No highlights yet. Tap paragraphs in devotions to save them!
            </Text>
          </View>
        ) : (
          Object.values(groupedHighlights).map((group) => (
            <View key={group.devotion_id} style={{ marginBottom: 24 }}>
              {/* Devotion Header */}
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

              {/* Highlights for this devotion */}
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
                  }}
                >
                  <Text style={{ fontSize: 15, lineHeight: 22, color: '#78350f' }}>
                    {highlight.selected_text}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

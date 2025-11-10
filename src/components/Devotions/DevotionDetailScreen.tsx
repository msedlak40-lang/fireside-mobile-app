// src/components/Devotions/DevotionDetailScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TouchableOpacity, Alert, Share } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { colors } from '../../theme/colors';
import { completeDevotionProgress } from '../../services/progress';
import type { Devotion } from '../../types/supabase-devotions';

export default function DevotionDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // Be flexible about param name and type
  const rawParam = route.params?.id ?? route.params?.devotionId ?? route.params?.devotion?.id;
  const devotionId: number | null = useMemo(() => {
    if (typeof rawParam === 'number' && Number.isFinite(rawParam)) return rawParam;
    if (typeof rawParam === 'string' && rawParam.trim() !== '' && Number.isFinite(Number(rawParam))) {
      return Number(rawParam);
    }
    return null; // invalid / missing
  }, [rawParam]);

  const [devotion, setDevotion] = useState<Devotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

 function formatISODateYYYYMMDD(iso?: string | null) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return iso;
  // e.g., "Oct 17, 2025" without using Date()
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mm = Math.max(1, Math.min(12, parseInt(m, 10))) - 1;
  return `${monthNames[mm]} ${parseInt(d, 10)}, ${y}`;
}
  const bailWithError = useCallback((msg: string) => {
    console.error('[DevotionDetail] ' + msg, { params: route.params });
    Alert.alert('Oops', 'Unable to open this devotion.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }, [navigation, route.params]);

  useEffect(() => {
    (async () => {
      try {
        if (devotionId == null) {
          bailWithError('Missing or invalid devotion id');
          return;
        }

        // Load devotion
        const { data, error } = await supabase
          .from('daily_devotions')
          .select('*')
          .eq('id', devotionId) // integer id
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          bailWithError('Devotion not found');
          return;
        }
        setDevotion(data as Devotion);

        // Check completion for this user + devotion
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (userId) {
          const { data: progressData } = await supabase
            .from('user_devotion_progress')
            .select('completed_at')
            .eq('user_id', userId)
            .eq('devotion_id', devotionId)
            .maybeSingle();

          if (progressData?.completed_at) {
            setIsCompleted(true);
          }
        }
      } catch (err) {
        console.error('[DevotionDetail] Load failed', err);
        Alert.alert('Error', 'Could not load the devotion. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [devotionId, bailWithError]);

  // Mark devotion as complete
  const markDevotionComplete = async () => {
    if (isCompleting || devotionId == null) return;
    try {
      setIsCompleting(true);
      await completeDevotionProgress(devotionId);
      setIsCompleted(true);

      Alert.alert(
        'Devotion Complete! 🙏',
        'Keep up your daily streak!',
        [{ text: 'Continue', onPress: () => {} }]
      );
    } catch (err: any) {
      console.error('[DevotionDetail] Failed to complete', err);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Share devotion
  const shareDevotion = async () => {
    if (!devotion) return;

    const dateText = formatISODateYYYYMMDD(devotion.devotion_date);
    const keyRangeOrNum = devotion.key_verse_range ?? String(devotion.key_verse_number);

    let message = `${devotion.title}\n`;
    if (dateText) message += `${dateText}\n`;
    message += `\n`;

    // Key verse
    message += `"${devotion.key_verse_text}"\n`;
    message += `— ${devotion.key_verse_book} ${devotion.key_verse_chapter}:${keyRangeOrNum}\n\n`;

    // Devotional text
    if (devotion.devotional_text) {
      message += `${devotion.devotional_text}\n`;
    }

    // Hard truth
    if (devotion.hard_truth) {
      message += `\nHARD TRUTH\n${devotion.hard_truth}\n`;
    }

    // Today's challenge
    if (devotion.today_challenge) {
      message += `\nTODAY'S CHALLENGE\n${devotion.today_challenge}\n`;
    }

    // Prayer starter
    if (devotion.prayer_starter) {
      message += `\nPRAYER STARTER\n${devotion.prayer_starter}\n`;
    }

    try {
      await Share.share({
        message: message.trim(),
      });
    } catch (error) {
      console.error('[DevotionDetail] Share failed', error);
    }
  };

  if (loading || !devotion) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  const dateText = formatISODateYYYYMMDD(devotion.devotion_date);
  const keyRef = devotion.key_verse_reference ?? '';
  const keyRangeOrNum = devotion.key_verse_range ?? String(devotion.key_verse_number);
  const tags = Array.isArray(devotion.tags) ? devotion.tags : [];
  const situations = Array.isArray(devotion.situation_tags) ? devotion.situation_tags : [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, backgroundColor: colors.background.primary }}>
      {/* Title & Share button */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', flex: 1, color: colors.text.primary }}>{devotion.title}</Text>
        <TouchableOpacity
          onPress={shareDevotion}
          style={{
            marginLeft: 12,
            padding: 8,
            backgroundColor: colors.background.secondary,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 16 }}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Meta line */}
      {(dateText || keyRef) ? (
        <Text style={{ marginTop: 6, fontSize: 14, color: colors.text.secondary }}>
          {dateText ? `${dateText} • ` : ''}{keyRef}
        </Text>
      ) : null}

      {/* Key verse box */}
      <View
        style={{
          marginTop: 14,
          padding: 12,
          borderLeftWidth: 3,
          borderLeftColor: colors.accent.primary,
          backgroundColor: colors.background.secondary,
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 15, fontStyle: 'italic', color: colors.text.primary }}>{devotion.key_verse_text}</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: colors.text.secondary }}>
          {devotion.key_verse_book} {devotion.key_verse_chapter}:{keyRangeOrNum}
        </Text>
      </View>

      {/* Body */}
      {devotion.devotional_text ? (
        <View style={{ marginTop: 16 }}>
          {devotion.devotional_text.split('\n\n').map((paragraph, index) => (
            <Text key={index} style={{ fontSize: 16, lineHeight: 24, color: colors.text.primary, marginBottom: 12 }}>
              {paragraph.trim()}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Hard truth */}
      {devotion.hard_truth ? (
        <View style={{ marginTop: 16, padding: 12, backgroundColor: '#fff7ed', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#9a3412', fontWeight: '700' }}>HARD TRUTH</Text>
          <Text style={{ marginTop: 6, fontSize: 15, color: '#9a3412' }}>{devotion.hard_truth}</Text>
        </View>
      ) : null}

      {/* Today's challenge */}
      {devotion.today_challenge ? (
        <View style={{ marginTop: 16, padding: 12, backgroundColor: '#ecfeff', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#155e75', fontWeight: '700' }}>TODAY'S CHALLENGE</Text>
          <Text style={{ marginTop: 6, fontSize: 15, color: '#155e75' }}>{devotion.today_challenge}</Text>
        </View>
      ) : null}

      {/* Prayer starter */}
      {devotion.prayer_starter ? (
        <View style={{ marginTop: 16, padding: 12, backgroundColor: '#eef2ff', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#3730a3', fontWeight: '700' }}>PRAYER STARTER</Text>
          <Text style={{ marginTop: 6, fontSize: 15, color: '#3730a3' }}>{devotion.prayer_starter}</Text>
        </View>
      ) : null}

      {/* Tags */}
      {tags.length ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 12, color: colors.text.secondary, fontWeight: '700' }}>TAGS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {tags.map((t) => (
              <View
                key={`tag-${t}`}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 9999,
                  backgroundColor: colors.background.secondary,
                  marginRight: 6,
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.text.primary }}>#{t}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Situation tags */}
      {situations.length ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: colors.text.secondary, fontWeight: '700' }}>SITUATIONS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {situations.map((t) => (
              <View
                key={`sit-${t}`}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 9999,
                  backgroundColor: colors.background.secondary,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  marginRight: 6,
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.text.primary }}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Related character link */}
      {typeof devotion.related_character_id === 'number' ? (
        <Pressable
          onPress={() => navigation.navigate('CharacterDetail', { id: devotion.related_character_id })}
          style={{ marginTop: 16, padding: 12, backgroundColor: colors.background.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default }}
        >
          <Text style={{ fontSize: 12, color: colors.accent.primary, fontWeight: '700' }}>RELATED CHARACTER</Text>
          <Text style={{ marginTop: 6, fontSize: 15, color: colors.text.primary }}>Open character profile</Text>
        </Pressable>
      ) : null}

      {/* Complete button / status */}
      {!isCompleted ? (
        <TouchableOpacity
          onPress={markDevotionComplete}
          disabled={isCompleting}
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: isCompleting ? colors.text.tertiary : colors.accent.primary,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 16 }}>
            {isCompleting ? 'Saving...' : '✓ Mark as Complete'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={{ marginTop: 24, padding: 16, backgroundColor: '#d1fae5', borderRadius: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#065f46', textAlign: 'center' }}>
            ✓ You completed this devotion
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

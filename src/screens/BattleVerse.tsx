// BattleVerse - Display Assigned Battle Verse
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { getBattleVerse, saveBattleVerse as saveToCollection } from '../services/armor';
import { colors } from '../theme/colors';

export default function BattleVerse() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { battleId, battleTag, verse: initialVerse } = route.params || {};

  const [verse, setVerse] = useState<any>(initialVerse || null);
  const [loading, setLoading] = useState(!initialVerse);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialVerse) {
      loadVerse();
    }
  }, []);

  const loadVerse = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId || !battleTag) {
        setLoading(false);
        return;
      }

      const verseData = await getBattleVerse(battleTag, userId);
      setVerse(verseData);
    } catch (err) {
      console.error('[BattleVerse] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCollection = async () => {
    if (!verse) return;

    try {
      setSaving(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        Alert.alert('Error', 'You must be signed in');
        setSaving(false);
        return;
      }

      const result = await saveToCollection(
        userId,
        verse.book_name,
        verse.chapter_number,
        verse.verse_number,
        verse.verse_reference,
        verse.verse_text,
        battleTag
      );

      if (result) {
        Alert.alert('Saved!', 'Verse added to your Battle Verses collection');
      } else {
        Alert.alert('Already Saved', 'This verse is already in your collection');
      }
    } catch (err) {
      console.error('[BattleVerse] Save failed:', err);
      Alert.alert('Error', 'Failed to save verse');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('ArmorUpHome');
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={{ marginTop: 16, color: colors.text.secondary }}>Finding your battle verse...</Text>
      </SafeAreaView>
    );
  }

  if (!verse) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📖</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12, color: colors.text.primary }}>
            No Verse Found
          </Text>
          <Text style={{ fontSize: 15, color: colors.text.secondary, textAlign: 'center', marginBottom: 24 }}>
            We couldn't find a verse for this battle tag yet. Check back later!
          </Text>
          <TouchableOpacity
            onPress={handleContinue}
            style={{
              padding: 16,
              backgroundColor: colors.accent.primary,
              borderRadius: 12,
              paddingHorizontal: 32,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8, color: colors.text.primary }}>
          Your Battle Verse
        </Text>
        <Text style={{ fontSize: 15, color: colors.text.secondary, marginBottom: 32, lineHeight: 22 }}>
          God has given you this word for your battle this week.
        </Text>

        {/* Armor Piece */}
        {verse.armor_name && (
          <View style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: '#fef3c7',
            borderRadius: 12,
            borderLeftWidth: 4,
            borderLeftColor: '#f59e0b',
          }}>
            <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '700', marginBottom: 4 }}>
              PART OF YOUR ARMOR
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#92400e' }}>
              {verse.armor_name}
            </Text>
          </View>
        )}

        {/* Verse Card */}
        <View style={{
          marginBottom: 32,
          padding: 24,
          backgroundColor: '#dbeafe',
          borderRadius: 16,
          borderLeftWidth: 6,
          borderLeftColor: '#2563eb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 5,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e40af', marginBottom: 16 }}>
            {verse.verse_reference}
          </Text>
          <Text style={{ fontSize: 18, lineHeight: 28, color: '#1e3a8a', marginBottom: 16, fontStyle: 'italic' }}>
            "{verse.verse_text}"
          </Text>
          {verse.context_summary && (
            <View style={{
              marginTop: 16,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#93c5fd',
            }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 8 }}>
                Context
              </Text>
              <Text style={{ fontSize: 14, color: '#1e3a8a', lineHeight: 20 }}>
                {verse.context_summary}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={{ marginBottom: 24, gap: 12 }}>
          <TouchableOpacity
            onPress={handleSaveToCollection}
            disabled={saving}
            style={{
              padding: 16,
              backgroundColor: colors.accent.secondary,
              borderRadius: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
              {saving ? 'Saving...' : '⚔️ Save to Battle Verses'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleContinue}
            style={{
              padding: 16,
              backgroundColor: colors.accent.primary,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
              Continue to Dashboard
            </Text>
          </TouchableOpacity>
        </View>

        {/* Encouragement */}
        <View style={{
          padding: 16,
          backgroundColor: colors.background.tertiary,
          borderRadius: 12,
        }}>
          <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 20, fontStyle: 'italic', textAlign: 'center' }}>
            Meditate on this verse throughout the week. Let it be your sword and shield in battle.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

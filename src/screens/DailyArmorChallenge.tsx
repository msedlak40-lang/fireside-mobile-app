// src/screens/DailyArmorChallenge.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import {
  getTodaysArmorPiece,
  getDailyApplication,
  getActiveBattle,
  markApplicationSeen,
  createReflection,
} from '../services/armor';
import { supabase } from '../lib/supabaseClient';
import type { ArmorPiece, UserBattle } from '../types/armor';

type DailyApplication = {
  id: number;
  application_text: string;
  book_name: string;
  chapter_number: number;
  armor_piece_name: string;
  confidence_score: number;
};

export default function DailyArmorChallengeScreen() {
  const navigation = useNavigation<any>();
  const [armorPiece, setArmorPiece] = useState<ArmorPiece | null>(null);
  const [application, setApplication] = useState<DailyApplication | null>(null);
  const [battle, setBattle] = useState<UserBattle | null>(null);
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDailyChallenge();
  }, []);

  async function loadDailyChallenge() {
    try {
      setLoading(true);

      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        Alert.alert('Error', 'You must be signed in to view your daily challenge');
        navigation.goBack();
        return;
      }

      // Get today's armor piece
      const armor = await getTodaysArmorPiece();
      setArmorPiece(armor);

      // Get user's active battle
      const userBattle = await getActiveBattle(userId);
      setBattle(userBattle);

      if (!userBattle) {
        Alert.alert(
          'No Active Battle',
          'You need to start a weekly battle first!',
          [
            {
              text: 'Start Battle',
              onPress: () => navigation.navigate('BattleIdentification'),
            },
            { text: 'Cancel', onPress: () => navigation.goBack() },
          ]
        );
        return;
      }

      // Get daily application
      if (armor && userBattle) {
        const app = await getDailyApplication(
          userId,
          armor.id,
          userBattle.battle_tag,
          userBattle.id
        );
        setApplication(app);
      }
    } catch (error) {
      console.error('[DailyArmorChallenge] Load error:', error);
      Alert.alert('Error', 'Failed to load daily challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function saveReflection() {
    if (!reflection.trim()) {
      Alert.alert('Required', 'Please add your reflection before saving.');
      return;
    }

    if (!battle || !application) {
      Alert.alert('Error', 'Missing battle or application data');
      return;
    }

    try {
      setSaving(true);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        Alert.alert('Error', 'You must be signed in');
        return;
      }

      // Mark application as seen
      await markApplicationSeen(userId, application.id, battle.id);

      // Save reflection
      const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      await createReflection(
        userId,
        battle.id,
        reflection,
        'daily',
        dayOfWeek
      );

      Alert.alert(
        'Saved!',
        'Your daily reflection has been saved.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('[DailyArmorChallenge] Save error:', error);
      Alert.alert('Error', 'Failed to save reflection. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={{ marginTop: 16, color: colors.text.secondary }}>
            Loading today's challenge...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const getDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getReflectionPrompt = () => {
    if (!armorPiece || !battle) return 'How does this armor piece help you in your battle?';

    const prompts: { [key: string]: string } = {
      'Belt of Truth': `How does truth help you fight ${battle.battle_tag}?`,
      'Breastplate of Righteousness': `How does holy living protect you from ${battle.battle_tag}?`,
      'Shoes of Peace': `How can you find God's peace in the midst of ${battle.battle_tag}?`,
      'Shield of Faith': `What promise of God can you trust today regarding ${battle.battle_tag}?`,
      'Helmet of Salvation': `How does your salvation give you security against ${battle.battle_tag}?`,
      'Sword of the Spirit': `What Scripture can you use to fight ${battle.battle_tag} today?`,
      'Prayer': `How can you pray through your battle with ${battle.battle_tag}?`,
    };

    return prompts[armorPiece.armor_name] || 'How does this armor piece help you today?';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 4 }}>
            {getDayName()}'s Challenge
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text.primary }}>
            {armorPiece?.armor_name || 'Daily Armor'}
          </Text>
          <Text style={{ fontSize: 14, color: colors.accent.primary, marginTop: 4 }}>
            {armorPiece?.scripture_reference}
          </Text>
        </View>

        {/* Armor Description */}
        {armorPiece && (
          <View
            style={{
              padding: 16,
              backgroundColor: colors.background.secondary,
              borderRadius: 12,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.border.default,
            }}
          >
            <Text style={{ fontSize: 15, lineHeight: 22, color: colors.text.primary }}>
              {armorPiece.description}
            </Text>
          </View>
        )}

        {/* Battle Verse (Weekly) */}
        {battle?.verse_text && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>
              Your Battle Verse This Week
            </Text>
            <View
              style={{
                padding: 16,
                backgroundColor: colors.accent.secondary,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: colors.accent.primary,
              }}
            >
              <Text style={{ fontSize: 15, lineHeight: 22, color: colors.text.primary, marginBottom: 8 }}>
                "{battle.verse_text}"
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>
                — {battle.verse_reference}
              </Text>
            </View>
          </View>
        )}

        {/* Daily Practical Application */}
        {application ? (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>
              Today's Application
            </Text>
            <View
              style={{
                padding: 16,
                backgroundColor: colors.background.secondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border.default,
              }}
            >
              <Text style={{ fontSize: 15, lineHeight: 24, color: colors.text.primary, marginBottom: 12 }}>
                {application.application_text}
              </Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary, fontStyle: 'italic' }}>
                Source: {application.book_name} {application.chapter_number}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={{
              padding: 20,
              backgroundColor: colors.background.secondary,
              borderRadius: 12,
              marginBottom: 24,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, color: colors.text.secondary, textAlign: 'center' }}>
              No application available for today.
            </Text>
          </View>
        )}

        {/* Reflection Prompt */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>
            Daily Reflection
          </Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 12, lineHeight: 20 }}>
            {getReflectionPrompt()}
          </Text>
          <TextInput
            multiline
            numberOfLines={6}
            placeholder="Share your thoughts, prayers, or insights..."
            placeholderTextColor={colors.text.tertiary}
            value={reflection}
            onChangeText={setReflection}
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border.default,
              borderRadius: 10,
              backgroundColor: colors.background.secondary,
              color: colors.text.primary,
              fontSize: 15,
              textAlignVertical: 'top',
              minHeight: 120,
            }}
          />
        </View>

        {/* Save Button */}
        <Pressable
          onPress={saveReflection}
          disabled={saving || !reflection.trim()}
          style={{
            padding: 16,
            backgroundColor: reflection.trim() && !saving ? colors.accent.primary : colors.text.tertiary,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          {saving ? (
            <ActivityIndicator color={colors.text.primary} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
              Save Reflection
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

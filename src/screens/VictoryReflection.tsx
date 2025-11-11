// VictoryReflection - Weekend Testimony & Week Completion
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { createReflection, completeBattle } from '../services/armor';
import { colors } from '../theme/colors';

export default function VictoryReflection() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { battleId, armorName } = route.params || {};

  const [victoryText, setVictoryText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCompleteWeek = async () => {
    if (!victoryText.trim()) {
      Alert.alert('Required', 'Please share your testimony or insights from this week');
      return;
    }

    try {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        Alert.alert('Error', 'You must be signed in');
        setLoading(false);
        return;
      }

      // Create victory reflection
      const reflection = await createReflection(
        userId,
        battleId,
        victoryText.trim(),
        'victory'
      );

      if (!reflection) {
        Alert.alert('Error', 'Failed to save victory reflection. Please try again.');
        setLoading(false);
        return;
      }

      // Mark battle as complete
      const completed = await completeBattle(battleId);

      if (!completed) {
        console.warn('[VictoryReflection] Failed to complete battle, but reflection saved');
      }

      Alert.alert(
        '🏆 Week Complete!',
        "You've finished this week's battle! God is faithful and has strengthened you through His armor.",
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('ArmorUpHome'),
          },
        ]
      );
    } catch (err) {
      console.error('[VictoryReflection] Error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏆</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8, color: colors.text.primary }}>
              Victory Reflection
            </Text>
            <Text style={{ fontSize: 15, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 }}>
              Celebrate what God has done through you this week
            </Text>
          </View>

          {/* Armor Reminder */}
          {armorName && (
            <View style={{
              marginBottom: 24,
              padding: 16,
              backgroundColor: '#fef3c7',
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#f59e0b',
            }}>
              <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '700', marginBottom: 4 }}>
                THIS WEEK'S ARMOR
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#92400e' }}>
                {armorName}
              </Text>
            </View>
          )}

          {/* Victory Prompt */}
          <View style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: '#dcfce7',
            borderRadius: 12,
            borderLeftWidth: 4,
            borderLeftColor: '#10b981',
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#065f46', marginBottom: 8 }}>
              This Week's Prompt:
            </Text>
            <Text style={{ fontSize: 15, color: '#047857', lineHeight: 22 }}>
              "Where did you see God give you strength this week?"
            </Text>
          </View>

          {/* Victory Input */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12, color: colors.text.primary }}>
              Share Your Testimony
            </Text>
            <TextInput
              style={{
                minHeight: 200,
                padding: 16,
                backgroundColor: colors.background.secondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border.default,
                color: colors.text.primary,
                fontSize: 15,
                lineHeight: 22,
                textAlignVertical: 'top',
              }}
              placeholder="Where did you see victory? What did God teach you?"
              placeholderTextColor={colors.text.muted}
              multiline
              value={victoryText}
              onChangeText={setVictoryText}
              maxLength={1000}
              autoFocus
            />
            <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 6, textAlign: 'right' }}>
              {victoryText.length}/1000
            </Text>
          </View>

          {/* Reflection Prompts */}
          <View style={{
            marginBottom: 32,
            padding: 16,
            backgroundColor: colors.background.tertiary,
            borderRadius: 12,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
              Reflection prompts:
            </Text>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                • What victories did you experience?
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                • How did God strengthen you?
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                • What did this armor piece teach you?
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                • How has your perspective changed?
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                • What are you grateful for?
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={{ gap: 12, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={handleCompleteWeek}
              disabled={loading || !victoryText.trim()}
              style={{
                padding: 18,
                backgroundColor: (loading || !victoryText.trim()) ? colors.border.default : '#10b981',
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontSize: 17,
                fontWeight: '700',
                color: (loading || !victoryText.trim()) ? colors.text.secondary : '#fff',
              }}>
                {loading ? 'Completing...' : '🏆 Complete This Week'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={loading}
              style={{
                padding: 16,
                backgroundColor: colors.background.secondary,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.secondary }}>
                Save for Later
              </Text>
            </TouchableOpacity>
          </View>

          {/* Encouragement */}
          <View style={{
            padding: 16,
            backgroundColor: '#dbeafe',
            borderRadius: 12,
          }}>
            <Text style={{ fontSize: 13, color: '#1e40af', lineHeight: 20, fontStyle: 'italic', textAlign: 'center' }}>
              "But thanks be to God! He gives us the victory through our Lord Jesus Christ." - 1 Corinthians 15:57
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

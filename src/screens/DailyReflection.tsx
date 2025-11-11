// DailyReflection - Midweek Guided Journaling
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { createReflection } from '../services/armor';
import { colors } from '../theme/colors';

export default function DailyReflection() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { battleId, armorName, battleTag } = route.params || {};

  const [reflectionText, setReflectionText] = useState('');
  const [loading, setLoading] = useState(false);

  const getDayOfWeek = () => {
    const now = new Date();
    return now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  };

  const handleSaveReflection = async () => {
    if (!reflectionText.trim()) {
      Alert.alert('Required', 'Please write your reflection');
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

      const dayOfWeek = getDayOfWeek();

      const reflection = await createReflection(
        userId,
        battleId,
        reflectionText.trim(),
        'daily',
        dayOfWeek
      );

      if (!reflection) {
        Alert.alert('Error', 'Failed to save reflection. Please try again.');
        setLoading(false);
        return;
      }

      Alert.alert('Saved!', 'Your reflection has been recorded', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('ArmorUpHome'),
        },
      ]);
    } catch (err) {
      console.error('[DailyReflection] Error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPrompt = () => {
    if (armorName && battleTag) {
      return `How can you use the ${armorName} in your battle with ${battleTag} today?`;
    }
    return "How did you see God's strength in your battle today?";
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Header */}
          <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8, color: colors.text.primary }}>
            Daily Reflection
          </Text>
          <Text style={{ fontSize: 15, color: colors.text.secondary, marginBottom: 24, lineHeight: 22 }}>
            Take a moment to reflect on your battle and how God is equipping you.
          </Text>

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
                YOUR ARMOR
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#92400e', marginBottom: 8 }}>
                {armorName}
              </Text>
              {battleTag && (
                <View style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: '#fde68a',
                  borderRadius: 6,
                  alignSelf: 'flex-start',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e' }}>
                    {battleTag}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Reflection Prompt */}
          <View style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: '#dbeafe',
            borderRadius: 12,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e40af', marginBottom: 8 }}>
              Today's Prompt:
            </Text>
            <Text style={{ fontSize: 15, color: '#1e3a8a', lineHeight: 22 }}>
              {getPrompt()}
            </Text>
          </View>

          {/* Reflection Input */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12, color: colors.text.primary }}>
              Your Reflection
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
              placeholder="Write your thoughts here..."
              placeholderTextColor={colors.text.muted}
              multiline
              value={reflectionText}
              onChangeText={setReflectionText}
              maxLength={1000}
              autoFocus
              autoCorrect={true}
              spellCheck={true}
            />
            <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 6, textAlign: 'right' }}>
              {reflectionText.length}/1000
            </Text>
          </View>

          {/* Example Questions */}
          <View style={{
            marginBottom: 32,
            padding: 16,
            backgroundColor: colors.background.tertiary,
            borderRadius: 12,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
              Questions to consider:
            </Text>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                • Where did you see God's strength today?
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                • How did this armor piece help you?
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                • What Scripture came to mind?
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                • What are you learning in this battle?
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={{ gap: 12, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={handleSaveReflection}
              disabled={loading || !reflectionText.trim()}
              style={{
                padding: 18,
                backgroundColor: (loading || !reflectionText.trim()) ? colors.border.default : colors.accent.primary,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontSize: 17,
                fontWeight: '700',
                color: (loading || !reflectionText.trim()) ? colors.text.secondary : colors.text.primary,
              }}>
                {loading ? 'Saving...' : '✅ Save Reflection'}
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
                Skip for Now
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

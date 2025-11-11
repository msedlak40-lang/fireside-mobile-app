// BattleIdentification - Monday Prompt to Name Your Battle
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { createBattle, getBattleVerse } from '../services/armor';
import { BATTLE_TAGS, type BattleTag } from '../types/armor';
import { colors } from '../theme/colors';

export default function BattleIdentification() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { armorId, armorName } = route.params || {};

  const [battleText, setBattleText] = useState('');
  const [selectedTag, setSelectedTag] = useState<BattleTag | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLockInBattle = async () => {
    if (!battleText.trim()) {
      Alert.alert('Required', 'Please describe your battle');
      return;
    }

    if (!selectedTag) {
      Alert.alert('Required', 'Please select a battle tag');
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

      // Get battle verse FIRST (before creating battle)
      const verse = await getBattleVerse(selectedTag, userId);

      if (!verse) {
        Alert.alert('No Verse Found', 'No battle verse found for this tag yet. Please try a different tag or contact support.');
        setLoading(false);
        return;
      }

      // Now create the battle
      const battle = await createBattle(userId, battleText.trim(), selectedTag);

      if (!battle) {
        Alert.alert('Error', 'Failed to create battle. Please try again.');
        setLoading(false);
        return;
      }

      // Navigate to BattleVerse screen
      navigation.navigate('BattleVerse', {
        battleId: battle.id,
        battleTag: selectedTag,
        verse,
      });
    } catch (err) {
      console.error('[BattleIdentification] Error:', err);
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
          <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8, color: colors.text.primary }}>
            Identify Your Battle
          </Text>
          <Text style={{ fontSize: 15, color: colors.text.secondary, marginBottom: 24, lineHeight: 22 }}>
            Brother, what's the battle on your heart this week?
          </Text>

          {/* Current Armor Reminder */}
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

          {/* Battle Input */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12, color: colors.text.primary }}>
              Describe Your Battle
            </Text>
            <TextInput
              style={{
                minHeight: 120,
                padding: 16,
                backgroundColor: colors.background.secondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border.default,
                color: colors.text.primary,
                fontSize: 15,
                textAlignVertical: 'top',
              }}
              placeholder="I'm struggling with..."
              placeholderTextColor={colors.text.muted}
              multiline
              value={battleText}
              onChangeText={setBattleText}
              maxLength={500}
            />
            <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 6, textAlign: 'right' }}>
              {battleText.length}/500
            </Text>
          </View>

          {/* Battle Tags */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12, color: colors.text.primary }}>
              What type of battle is this?
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {BATTLE_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag.tag}
                  onPress={() => setSelectedTag(tag.tag)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: selectedTag === tag.tag ? colors.accent.primary : colors.background.secondary,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: selectedTag === tag.tag ? colors.accent.primary : colors.border.default,
                    minWidth: '45%',
                  }}
                >
                  <Text style={{
                    fontSize: 20,
                    marginBottom: 4,
                    textAlign: 'center',
                  }}>
                    {tag.emoji}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: selectedTag === tag.tag ? colors.text.primary : colors.text.secondary,
                    textAlign: 'center',
                    marginBottom: 4,
                  }}>
                    {tag.label}
                  </Text>
                  <Text style={{
                    fontSize: 11,
                    color: colors.text.secondary,
                    textAlign: 'center',
                  }}>
                    {tag.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Encouragement */}
          <View style={{
            padding: 16,
            backgroundColor: '#dbeafe',
            borderRadius: 12,
            marginBottom: 24,
          }}>
            <Text style={{ fontSize: 13, color: '#1e40af', lineHeight: 20, fontStyle: 'italic' }}>
              "We wrestle not against flesh and blood, but against principalities, against powers, against the rulers of the darkness of this world." - Ephesians 6:12
            </Text>
          </View>

          {/* Lock In Button */}
          <TouchableOpacity
            onPress={handleLockInBattle}
            disabled={loading || !battleText.trim() || !selectedTag}
            style={{
              padding: 18,
              backgroundColor: (loading || !battleText.trim() || !selectedTag) ? colors.border.default : colors.accent.primary,
              borderRadius: 12,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{
              fontSize: 17,
              fontWeight: '700',
              color: (loading || !battleText.trim() || !selectedTag) ? colors.text.secondary : colors.text.primary,
            }}>
              {loading ? 'Creating Battle...' : '🛡️ Lock In Battle'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

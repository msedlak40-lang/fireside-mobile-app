// ArmorUpHome - Weekly Armor Dashboard
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { getCurrentArmorPiece, getActiveBattle, getBattleReflections } from '../services/armor';
import { colors } from '../theme/colors';

export default function ArmorUpHome() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentArmor, setCurrentArmor] = useState<any | null>(null);
  const [activeBattle, setActiveBattle] = useState<any | null>(null);
  const [reflections, setReflections] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        console.error('[ArmorUpHome] No user ID');
        setLoading(false);
        return;
      }
      setUserId(uid);

      const [armorData, battleData] = await Promise.all([
        getCurrentArmorPiece(),
        getActiveBattle(uid),
      ]);

      setCurrentArmor(armorData);
      setActiveBattle(battleData);

      // Load reflections if there's an active battle
      if (battleData) {
        const reflectionsData = await getBattleReflections(battleData.id);
        setReflections(reflectionsData);
      } else {
        setReflections([]);
      }
    } catch (err) {
      console.error('[ArmorUpHome] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const startBattle = () => {
    navigation.navigate('BattleIdentification', {
      armorId: currentArmor?.id,
      armorName: currentArmor?.armor_name,
    });
  };

  const viewBattleVerse = () => {
    if (activeBattle) {
      navigation.navigate('BattleVerse', {
        battleId: activeBattle.id,
        battleTag: activeBattle.battle_tag,
      });
    }
  };

  const addReflection = () => {
    if (activeBattle) {
      navigation.navigate('DailyReflection', {
        battleId: activeBattle.id,
        armorName: currentArmor?.armor_name,
        battleTag: activeBattle.battle_tag,
      });
    }
  };

  const completeWeek = () => {
    if (activeBattle) {
      navigation.navigate('VictoryReflection', {
        battleId: activeBattle.id,
        armorName: currentArmor?.armor_name,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8, color: colors.text.primary }}>
          ⚔️ Armor of God
        </Text>
        <Text style={{ fontSize: 15, color: colors.text.secondary, marginBottom: 24, lineHeight: 22 }}>
          Put on the full armor of God, so that you can take your stand against the devil's schemes.
        </Text>

        {/* Current Armor Piece */}
        {currentArmor && (
          <View style={{
            marginBottom: 20,
            padding: 20,
            backgroundColor: '#fef3c7',
            borderRadius: 16,
            borderLeftWidth: 6,
            borderLeftColor: '#f59e0b',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <Text style={{ fontSize: 11, color: '#92400e', fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 }}>
              THIS WEEK'S ARMOR
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 8, color: '#92400e' }}>
              {currentArmor.armor_name}
            </Text>
            <Text style={{ fontSize: 14, color: '#78350f', marginBottom: 8, lineHeight: 20 }}>
              {currentArmor.description}
            </Text>
            <Text style={{ fontSize: 13, color: '#92400e', fontWeight: '600', fontStyle: 'italic' }}>
              {currentArmor.scripture_reference}
            </Text>
          </View>
        )}

        {/* Active Battle or Start Battle */}
        {!activeBattle ? (
          <View style={{
            marginBottom: 20,
            padding: 20,
            backgroundColor: colors.background.secondary,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border.default,
          }}>
            <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12, color: colors.text.primary }}>
              Ready for Battle?
            </Text>
            <Text style={{ fontSize: 15, color: colors.text.secondary, marginBottom: 16, lineHeight: 22 }}>
              Start this week's battle by identifying what you're facing. God will provide His word to strengthen you.
            </Text>
            <TouchableOpacity
              onPress={startBattle}
              style={{
                padding: 16,
                backgroundColor: colors.accent.primary,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                🛡️ Start This Week's Battle
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Active Battle Card */}
            <View style={{
              marginBottom: 20,
              padding: 20,
              backgroundColor: '#dcfce7',
              borderRadius: 16,
              borderLeftWidth: 6,
              borderLeftColor: '#10b981',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: '#065f46', fontWeight: '800', letterSpacing: 1.5 }}>
                  ACTIVE BATTLE
                </Text>
                <View style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: '#10b981',
                  borderRadius: 6,
                }}>
                  <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>✓ In Progress</Text>
                </View>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#065f46' }}>
                {activeBattle.battle_text}
              </Text>
              <View style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: '#6ee7b7',
                borderRadius: 6,
                alignSelf: 'flex-start',
              }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#065f46' }}>
                  {activeBattle.battle_tag}
                </Text>
              </View>
            </View>

            {/* Battle Verse */}
            <TouchableOpacity
              onPress={viewBattleVerse}
              style={{
                marginBottom: 20,
                padding: 18,
                backgroundColor: '#dbeafe',
                borderRadius: 16,
                borderLeftWidth: 6,
                borderLeftColor: '#2563eb',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: '#1e40af', fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 }}>
                YOUR BATTLE VERSE
              </Text>
              <Text style={{ fontSize: 15, color: '#1e3a8a', marginBottom: 8 }}>
                Tap to view your assigned verse for this battle
              </Text>
              <Text style={{ fontSize: 13, color: '#2563eb', fontWeight: '600' }}>
                View Verse →
              </Text>
            </TouchableOpacity>

            {/* Weekly Progress */}
            <View style={{
              marginBottom: 20,
              padding: 18,
              backgroundColor: colors.background.secondary,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border.default,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: colors.text.primary }}>
                This Week's Reflections
              </Text>
              {reflections.length === 0 ? (
                <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 16 }}>
                  No reflections yet this week. Add your first reflection to track your spiritual journey.
                </Text>
              ) : (
                <View style={{ marginBottom: 16 }}>
                  {reflections.map((reflection, index) => (
                    <View
                      key={reflection.id}
                      style={{
                        marginBottom: 8,
                        padding: 12,
                        backgroundColor: colors.background.primary,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.border.default,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 4 }}>
                        {reflection.reflection_type === 'daily' ? '📝 Daily' : reflection.reflection_type === 'victory' ? '🎉 Victory' : '💭 Midweek'}
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.text.primary, lineHeight: 20 }} numberOfLines={2}>
                        {reflection.reflection_text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                onPress={addReflection}
                style={{
                  padding: 14,
                  backgroundColor: colors.accent.secondary,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                  + Add Daily Reflection
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={completeWeek}
                style={{
                  padding: 14,
                  backgroundColor: '#10b981',
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                  🏆 Complete This Week
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Ephesians 6 Reference */}
        <View style={{
          padding: 16,
          backgroundColor: colors.background.tertiary,
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <Text style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 18, fontStyle: 'italic' }}>
            "Finally, be strong in the Lord and in his mighty power. Put on the full armor of God, so that you can take your stand against the devil's schemes." - Ephesians 6:10-11
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

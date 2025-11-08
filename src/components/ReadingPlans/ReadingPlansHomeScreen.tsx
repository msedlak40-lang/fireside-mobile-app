// src/components/ReadingPlans/ReadingPlansHomeScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { fetchReadingPlans, fetchActiveReadingPlan } from '../../services/readingPlans';
import type { ReadingPlan, ActivePlanWithReading } from '../../services/readingPlans';

export default function ReadingPlansHomeScreen() {
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [activePlan, setActivePlan] = useState<ActivePlanWithReading | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  const load = async () => {
    setLoading(true);
    try {
      const [plansData, activeData] = await Promise.all([
        fetchReadingPlans(),
        fetchActiveReadingPlan()
      ]);
      setPlans(plansData);
      setActivePlan(activeData);
    } catch (err) {
      console.error('[ReadingPlansHome] Load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <FlatList
        ListHeaderComponent={
          <>
            {/* Active Plan Card */}
            {activePlan ? (
              <Pressable
                onPress={() => navigation.navigate('ReadingPlanDetail', { planId: activePlan.plan_id })}
                style={{
                  margin: 16,
                  padding: 16,
                  backgroundColor: '#dbeafe',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: colors.accent.primary
                }}
              >
                <Text style={{ fontSize: 12, color: '#1e40af', fontWeight: '700' }}>ACTIVE PLAN</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 4, color: '#1e40af' }}>{activePlan.plan_name}</Text>
                <View style={{ marginTop: 8, flexDirection: 'row', gap: 12 }}>
                  <Text style={{ fontSize: 14, color: '#1e40af' }}>
                    Day {activePlan.current_day}/{activePlan.total_days}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#1e40af' }}>•</Text>
                  <Text style={{ fontSize: 14, color: '#1e40af' }}>
                    {Math.round(activePlan.percentage)}% complete
                  </Text>
                </View>
                {activePlan.on_track ? (
                  <Text style={{ marginTop: 4, fontSize: 12, color: '#059669', fontWeight: '600' }}>✓ On track</Text>
                ) : (
                  <Text style={{ marginTop: 4, fontSize: 12, color: '#dc2626', fontWeight: '600' }}>⚠ Behind schedule</Text>
                )}
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#bfdbfe' }}>
                  <Text style={{ fontSize: 13, color: '#1e40af', fontWeight: '600' }}>Today's Reading:</Text>
                  {activePlan.todays_reading?.map((r, i) => (
                    <Text key={i} style={{ fontSize: 13, color: '#1e40af', marginTop: 4 }}>
                      • {r.full_reference}
                    </Text>
                  ))}
                </View>
              </Pressable>
            ) : (
              <View style={{ margin: 16, padding: 16, backgroundColor: colors.background.secondary, borderRadius: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>No Active Plan</Text>
                <Text style={{ marginTop: 4, fontSize: 14, color: colors.text.secondary }}>
                  Choose a reading plan below to get started!
                </Text>
              </View>
            )}

            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>Browse Reading Plans</Text>
            </View>
          </>
        }
        data={plans}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('ReadingPlanDetail', { planId: item.id })}
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border.default,
              borderRadius: 12,
              backgroundColor: colors.background.secondary
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>{item.plan_name}</Text>
            {item.theme_name && (
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.text.secondary }}>
                Theme: {item.theme_name}
              </Text>
            )}
            {item.plan_description && (
              <Text style={{ marginTop: 6, fontSize: 14, color: colors.text.primary, lineHeight: 20 }}>
                {item.plan_description}
              </Text>
            )}
            <View style={{ marginTop: 8, flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                📅 {item.total_days} days
              </Text>
              {item.difficulty_level && (
                <>
                  <Text style={{ fontSize: 12, color: colors.text.secondary }}>•</Text>
                  <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                    {item.difficulty_level}
                  </Text>
                </>
              )}
              {item.times_used > 0 && (
                <>
                  <Text style={{ fontSize: 12, color: colors.text.secondary }}>•</Text>
                  <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                    {item.times_used} users
                  </Text>
                </>
              )}
            </View>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
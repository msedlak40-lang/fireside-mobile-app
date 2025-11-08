// src/screens/Home.tsx
import React, { useCallback, useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { fetchUserDashboard } from '../services/progress';
import { fetchActiveReadingPlan } from '../services/readingPlans';
import type { UserDashboard } from '../services/progress';
import type { ActivePlanWithReading } from '../services/readingPlans';

/** Get YYYY-MM-DD in a specific IANA timezone without extra deps */
function getLocalISODate(tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value ?? '1970';
  const m = parts.find(p => p.type === 'month')?.value ?? '01';
  const d = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

export default function Home() {
  const nav = useNavigation<any>();
  const [dashboard, setDashboard] = useState<UserDashboard | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlanWithReading | null>(null);
  const [todayDevotion, setTodayDevotion] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Load dashboard, active plan, and today's devotion when screen focuses
  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const [dashData, planData] = await Promise.all([
            fetchUserDashboard(),
            fetchActiveReadingPlan(),
          ]);
          setDashboard(dashData);
          setActivePlan(planData);

          const today = getLocalISODate('America/Chicago'); // date column (not timestamptz)
          const { data: devo, error } = await supabase
            .from('daily_devotions')
            .select('id,title,devotion_date')
            .eq('devotion_date', today)
            .maybeSingle();
          if (!error) setTodayDevotion(devo ?? null);
        } catch (err) {
          console.error('[Home] Failed to load dashboard', err);
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  const onBrowsePlans = useCallback(() => {
    // Navigate to your reading plans home screen within the Plans tab
    nav.navigate('PlansTab', { screen: 'ReadingPlansHome' });
  }, [nav]);

  const onOpenNotesSummary = useCallback(() => {
    nav.navigate('NotesHighlightsSummary'); // make sure this route exists in your navigator
  }, [nav]);

  const onOpenTodayDevotion = useCallback(() => {
    if (!todayDevotion?.id) return;
    nav.navigate('DevotionDetail', { devotionId: todayDevotion.id });
  }, [nav, todayDevotion]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: '#6b7280' }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Welcome 👋</Text>
        <Text style={{ color: '#6b7280', marginBottom: 24 }}>You're signed in.</Text>

        {/* Streak Card */}
        <View
          style={{
            marginBottom: 16,
            padding: 16,
            backgroundColor: '#fef3c7',
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#fbbf24',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 14, color: '#92400e', fontWeight: '600' }}>CURRENT STREAK</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#92400e', marginTop: 4 }}>
                {dashboard?.streak?.current || 0} 🔥
              </Text>
              <Text style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
                Longest: {dashboard?.streak?.longest || 0} days
              </Text>
            </View>
            <Text style={{ fontSize: 48 }}>🔥</Text>
          </View>
        </View>

        {/* Today’s Devotion */}
        <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#e9d5ff', borderRadius: 12 }}>
          <Text style={{ fontSize: 12, color: '#6b21a8', fontWeight: '700' }}>TODAY’S DEVOTION</Text>
          {todayDevotion ? (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 4 }}>{todayDevotion.title}</Text>
              <TouchableOpacity
                onPress={onOpenTodayDevotion}
                style={{
                  marginTop: 12,
                  padding: 12,
                  backgroundColor: '#7c3aed',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Open Devotion →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>
              No devotion scheduled for today.
            </Text>
          )}
        </View>

        {/* Active Reading Plan */}
        {activePlan && (
          <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#dbeafe', borderRadius: 12 }}>
            <Text style={{ fontSize: 12, color: '#1e40af', fontWeight: '700' }}>READING PLAN</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 4 }}>{activePlan.plan_name}</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
              Day {activePlan.current_day}/{activePlan.total_days} • {Math.round(activePlan.percentage)}% complete
            </Text>
            {activePlan.on_track ? (
              <Text style={{ fontSize: 12, color: '#059669', marginTop: 2, fontWeight: '600' }}>
                ✓ On track
              </Text>
            ) : (
              <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 2, fontWeight: '600' }}>
                ⚠ Behind schedule
              </Text>
            )}
            {activePlan.todays_reading?.length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#bfdbfe' }}>
                <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>Today's Reading:</Text>
                {activePlan.todays_reading.map((r, i) => (
                  <Text key={i} style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                    • {r.full_reference}
                  </Text>
                ))}
              </View>
            )}
            <TouchableOpacity
              onPress={() => nav.navigate('PlansTab', { screen: 'ReadingPlansHome' })}
              style={{
                marginTop: 12,
                padding: 12,
                backgroundColor: '#2563eb',
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Continue Reading →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Stats */}
        <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#f3f4f6', borderRadius: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 12 }}>YOUR PROGRESS</Text>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>📖 Chapters Read</Text>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>{dashboard?.chapters?.total_read || 0}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>🕊️ Devotions</Text>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>{dashboard?.devotions?.total_completed || 0}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>👤 Character Studies</Text>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>{dashboard?.characters?.total_studied || 0}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={onBrowsePlans}
            style={{
              height: 48,
              backgroundColor: '#111827',
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Browse Reading Plans</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onOpenNotesSummary}
            style={{
              height: 48,
              backgroundColor: '#0ea5e9',
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Notes & Highlights Summary</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => supabase.auth.signOut()}
            style={{
              height: 48,
              backgroundColor: '#ef4444',
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

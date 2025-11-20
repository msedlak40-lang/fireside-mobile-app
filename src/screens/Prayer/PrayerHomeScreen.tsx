// src/screens/Prayer/PrayerHomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { colors } from '../../theme/colors';
import {
  getPrayerStreak,
  hasPrayedToday,
  getWeeklyPrayerMinutes,
  getPrayerSessions,
  type PrayerSession,
} from '../../services/prayer';

const TIMER_OPTIONS = [
  { minutes: 5, label: '5 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 20, label: '20 min' },
  { minutes: 30, label: '30 min' },
];

export default function PrayerHomeScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [prayedToday, setPrayedToday] = useState(false);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [recentSessions, setRecentSessions] = useState<PrayerSession[]>([]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: auth } = await supabase.auth.getUser();
    setUserId(auth?.user?.id || null);
    if (auth?.user?.id) {
      loadPrayerData(auth.user.id);
    } else {
      setLoading(false);
    }
  };

  const loadPrayerData = async (uid: string) => {
    if (!uid) return;

    setLoading(true);
    try {
      const [streakData, todayData, weeklyData, sessionsData] = await Promise.all([
        getPrayerStreak(uid),
        hasPrayedToday(uid),
        getWeeklyPrayerMinutes(uid),
        getPrayerSessions(uid, 5),
      ]);

      setStreak(streakData);
      setPrayedToday(todayData);
      setWeeklyMinutes(weeklyData);
      setRecentSessions(sessionsData);
    } catch (err) {
      console.error('[PrayerHome] Load data failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = (durationMinutes: number) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to track your prayer time.');
      return;
    }

    // @ts-ignore - Navigate to session screen
    navigation.navigate('PrayerSession', { durationMinutes });
  };

  const handleViewHistory = () => {
    // @ts-ignore - Navigate to history screen
    navigation.navigate('PrayerHistory');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      contentContainerStyle={{ padding: 20 }}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 20 }}>
        <Text style={{ fontSize: 32, marginBottom: 8 }}>🙏</Text>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>
          Chair Time
        </Text>
        <Text style={{ fontSize: 15, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 }}>
          A time to sit quietly and listen{'\n'}to what God is speaking to you
        </Text>
      </View>

      {/* Streak Card */}
      <View style={{
        backgroundColor: prayedToday ? '#dcfce7' : '#fef3c7',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: prayedToday ? '#86efac' : '#fde047',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#065f46', marginBottom: 4 }}>
              CURRENT STREAK
            </Text>
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#065f46' }}>
              {streak} {streak === 1 ? 'day' : 'days'}
            </Text>
          </View>
          <Text style={{ fontSize: 48 }}>
            {prayedToday ? '✅' : '⏳'}
          </Text>
        </View>
        {!prayedToday && (
          <Text style={{ fontSize: 13, color: '#92400e', marginTop: 12, fontStyle: 'italic' }}>
            Start a session today to continue your streak
          </Text>
        )}
      </View>

      {/* Weekly Stats */}
      <View style={{
        backgroundColor: colors.background.secondary,
        borderRadius: 12,
        padding: 16,
        marginBottom: 32,
      }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 8 }}>
          THIS WEEK
        </Text>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text.primary }}>
          {weeklyMinutes} minutes
        </Text>
        <Text style={{ fontSize: 13, color: '#fff', marginTop: 4 }}>
          Time spent in prayer
        </Text>
      </View>

      {/* Timer Options */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 16 }}>
          Choose Your Session Length
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {TIMER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.minutes}
              onPress={() => handleStartSession(option.minutes)}
              style={{
                flex: 1,
                minWidth: '30%',
                backgroundColor: colors.primary,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 }}>
                {option.minutes}
              </Text>
              <Text style={{ fontSize: 12, color: '#fff', opacity: 0.9 }}>
                minutes
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
              Recent Sessions
            </Text>
            <TouchableOpacity onPress={handleViewHistory}>
              <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>
                View All →
              </Text>
            </TouchableOpacity>
          </View>

          {recentSessions.map((session) => (
            <View
              key={session.id}
              style={{
                backgroundColor: colors.background.secondary,
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                  {formatDate(session.session_date)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.text.secondary, marginRight: 6 }}>⏱️</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                    {session.duration_minutes} min
                  </Text>
                </View>
              </View>
              {session.post_session_notes && (
                <Text
                  style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}
                  numberOfLines={2}
                >
                  {session.post_session_notes}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Info Card */}
      <View style={{
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
      }}>
        <Text style={{ fontSize: 14, color: '#1e40af', lineHeight: 20 }}>
          <Text style={{ fontWeight: '700' }}>Chair Time</Text> is about listening, not just talking.
          Sit quietly, clear your mind, and listen to what God wants to speak to you today.
        </Text>
      </View>
    </ScrollView>
  );
}

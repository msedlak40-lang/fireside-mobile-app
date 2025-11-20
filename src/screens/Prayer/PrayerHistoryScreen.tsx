// src/screens/Prayer/PrayerHistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getPrayerSessions, type PrayerSession } from '../../services/prayer';

export default function PrayerHistoryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<PrayerSession[]>([]);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await getPrayerSessions(user.id, 100);
      setSessions(data);
    } catch (err) {
      console.error('[PrayerHistory] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const groupSessionsByMonth = () => {
    const groups: { [key: string]: PrayerSession[] } = {};

    sessions.forEach((session) => {
      const date = new Date(session.session_date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(session);
    });

    return groups;
  };

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalSessions = sessions.length;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📖</Text>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: 8, textAlign: 'center' }}>
          No Prayer Sessions Yet
        </Text>
        <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center' }}>
          Start your first chair time session to build a history of listening to God
        </Text>
      </View>
    );
  }

  const groupedSessions = groupSessionsByMonth();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      contentContainerStyle={{ padding: 20 }}
    >
      {/* Stats Header */}
      <View style={{
        backgroundColor: colors.background.secondary,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
      }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary, marginBottom: 12 }}>
          ALL TIME STATS
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text.primary }}>
              {totalSessions}
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 4 }}>
              Sessions
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: colors.text.tertiary, opacity: 0.2 }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text.primary }}>
              {totalMinutes}
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 4 }}>
              Minutes
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: colors.text.tertiary, opacity: 0.2 }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text.primary }}>
              {Math.round(totalMinutes / 60 * 10) / 10}
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 4 }}>
              Hours
            </Text>
          </View>
        </View>
      </View>

      {/* Grouped Sessions */}
      {Object.entries(groupedSessions).map(([month, monthSessions]) => (
        <View key={month} style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
            {month}
          </Text>

          {monthSessions.map((session) => {
            const isExpanded = expandedSession === session.id;

            return (
              <TouchableOpacity
                key={session.id}
                onPress={() => setExpandedSession(isExpanded ? null : session.id)}
                style={{
                  backgroundColor: colors.background.secondary,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                  borderLeftWidth: 4,
                  borderLeftColor: colors.primary,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
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

                <Text style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 8 }}>
                  {formatTime(session.created_at)}
                </Text>

                {session.pre_session_verse && (
                  <View style={{
                    backgroundColor: colors.background.primary,
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 8,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.secondary, marginBottom: 4 }}>
                      MEDITATION VERSE
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.text.primary, lineHeight: 18 }}>
                      {session.pre_session_verse}
                    </Text>
                  </View>
                )}

                {session.post_session_notes && (
                  <View style={{
                    backgroundColor: colors.background.primary,
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 8,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.secondary, marginBottom: 4 }}>
                      WHAT I HEARD
                    </Text>
                    <Text
                      style={{ fontSize: 13, color: colors.text.primary, lineHeight: 18 }}
                      numberOfLines={isExpanded ? undefined : 2}
                    >
                      {session.post_session_notes}
                    </Text>
                  </View>
                )}

                {session.post_session_notes && session.post_session_notes.length > 100 && (
                  <Text style={{ fontSize: 12, color: colors.primary, marginTop: 8, fontWeight: '600' }}>
                    {isExpanded ? 'Show less ↑' : 'Show more ↓'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

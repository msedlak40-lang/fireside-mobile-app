// src/screens/Prayer/PrayerSessionScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { createPrayerSession, updatePrayerSessionNotes } from '../../services/prayer';

type RouteParams = {
  PrayerSession: {
    durationMinutes: number;
  };
};

type SessionPhase = 'pre' | 'active' | 'post';

export default function PrayerSessionScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'PrayerSession'>>();

  const { durationMinutes } = route.params;
  const totalSeconds = durationMinutes * 60;

  const [phase, setPhase] = useState<SessionPhase>('pre');
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [preVerse, setPreVerse] = useState('');
  const [postNotes, setPostNotes] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);

  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  const startSession = () => {
    setPhase('active');
    setSecondsRemaining(totalSeconds);
    setIsPaused(false);

    timerInterval.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSessionComplete = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
    setPhase('post');
    saveSession();
  };

  const saveSession = async () => {
    if (!user?.id) return;

    const session = await createPrayerSession(
      user.id,
      durationMinutes,
      preVerse || null,
      null
    );

    if (session) {
      setSessionId(session.id);
    }
  };

  const handleSaveNotes = async () => {
    if (sessionId && postNotes.trim()) {
      await updatePrayerSessionNotes(sessionId, postNotes.trim());
    }

    Alert.alert(
      'Session Complete! 🎉',
      'Your prayer time has been recorded.',
      [
        {
          text: 'Done',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleSkipNotes = () => {
    navigation.goBack();
  };

  const togglePause = () => {
    if (isPaused) {
      // Resume
      timerInterval.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setIsPaused(false);
    } else {
      // Pause
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      setIsPaused(true);
    }
  };

  const handleEndEarly = () => {
    Alert.alert(
      'End Session?',
      'Are you sure you want to end this prayer session early?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            if (timerInterval.current) {
              clearInterval(timerInterval.current);
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = ((totalSeconds - secondsRemaining) / totalSeconds) * 100;

  // Pre-session phase
  if (phase === 'pre') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: colors.background.primary }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>🙏</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>
              Prepare Your Heart
            </Text>
            <Text style={{ fontSize: 15, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 }}>
              {durationMinutes} minute session
            </Text>
          </View>

          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
              Optional: Choose a verse to meditate on
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.background.secondary,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: colors.text.primary,
                minHeight: 80,
              }}
              placeholder="e.g., Psalm 46:10 - 'Be still and know that I am God'"
              placeholderTextColor={colors.text.tertiary}
              multiline
              value={preVerse}
              onChangeText={setPreVerse}
            />
          </View>

          <View style={{
            backgroundColor: '#eff6ff',
            borderRadius: 12,
            padding: 16,
            marginBottom: 32,
          }}>
            <Text style={{ fontSize: 14, color: '#1e40af', lineHeight: 20 }}>
              Find a quiet place, free from distractions. During this time, focus on listening
              to what God wants to speak to you. Let go of your own agenda and be still.
            </Text>
          </View>

          <TouchableOpacity
            onPress={startSession}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 16,
              padding: 18,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
              Begin Session
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              marginTop: 16,
              padding: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, color: colors.text.secondary }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Active session phase
  if (phase === 'active') {
    return (
      <View style={{ flex: 1, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        {/* Progress Ring */}
        <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 60 }}>
          <View style={{
            width: 280,
            height: 280,
            borderRadius: 140,
            borderWidth: 12,
            borderColor: '#334155',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {/* This is a simplified progress indicator - for a real circular progress, you'd use a library like react-native-svg */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 140,
              borderWidth: 12,
              borderColor: '#60a5fa',
              transform: [{ rotate: `${progressPercentage * 3.6}deg` }],
              borderTopColor: 'transparent',
              borderLeftColor: 'transparent',
            }} />

            <Text style={{ fontSize: 64, fontWeight: '200', color: '#fff' }}>
              {formatTime(secondsRemaining)}
            </Text>
          </View>
        </View>

        {/* Verse reminder */}
        {preVerse && (
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 40,
            maxWidth: '90%',
          }}>
            <Text style={{ fontSize: 14, color: '#cbd5e1', textAlign: 'center', lineHeight: 20 }}>
              {preVerse}
            </Text>
          </View>
        )}

        {/* Controls */}
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity
            onPress={togglePause}
            style={{
              backgroundColor: '#475569',
              borderRadius: 50,
              paddingHorizontal: 24,
              paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEndEarly}
            style={{
              backgroundColor: '#ef4444',
              borderRadius: 50,
              paddingHorizontal: 24,
              paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
              End Early
            </Text>
          </TouchableOpacity>
        </View>

        {/* Encouragement */}
        <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 40, textAlign: 'center', fontStyle: 'italic' }}>
          Be still and listen...
        </Text>
      </View>
    );
  }

  // Post-session phase
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background.primary }}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>✨</Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>
            Time Complete
          </Text>
          <Text style={{ fontSize: 15, color: colors.text.secondary, textAlign: 'center' }}>
            What did God speak to you?
          </Text>
        </View>

        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
            Capture what you heard (optional)
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.background.secondary,
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: colors.text.primary,
              minHeight: 150,
              textAlignVertical: 'top',
            }}
            placeholder="What insights, words, or impressions did you receive during your prayer time?"
            placeholderTextColor={colors.text.tertiary}
            multiline
            value={postNotes}
            onChangeText={setPostNotes}
            autoFocus
          />
        </View>

        <TouchableOpacity
          onPress={handleSaveNotes}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 16,
            padding: 18,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
            {postNotes.trim() ? 'Save & Complete' : 'Complete Session'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkipNotes}
          style={{
            marginTop: 16,
            padding: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 15, color: colors.text.secondary }}>
            Skip
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

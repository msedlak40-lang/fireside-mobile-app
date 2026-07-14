import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import {
  getJourneyById,
  getUserJourneyProgress,
} from '../services/journeys';
import type { Journey, UserJourneyProgress } from '../types/journey';
import JourneyMapTab from '../components/journey/JourneyMapTab';
import JourneyStoriesTab from '../components/journey/JourneyStoriesTab';
import JourneyCharactersTab from '../components/journey/JourneyCharactersTab';
import { colors } from '../theme/colors';

const Tab = createMaterialTopTabNavigator();

export default function JourneyExperienceScreen({ route, navigation }: any) {
  const { journeyId } = route.params;
  const [journey, setJourney] = useState<Journey | null>(null);
  const [progress, setProgress] = useState<UserJourneyProgress | null>(null);

  useEffect(() => {
    loadJourney();
  }, [journeyId]);

  async function loadJourney() {
    // CRITICAL: Only LOAD existing progress, never create it
    const journeyData = getJourneyById(journeyId);
    const progressData = await getUserJourneyProgress(journeyId);

    if (!journeyData) {
      navigation.goBack();
      return;
    }

    // If no progress exists, go back to detail screen
    if (!progressData) {
      console.warn('[JourneyExperience] No progress found, returning to detail');
      navigation.goBack();
      return;
    }

    setJourney(journeyData);
    setProgress(progressData);
  }

  function reloadProgress() {
    loadJourney();
  }

  if (!journey || !progress) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading journey...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
      {/* Header with progress */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{journey.title}</Text>
          <Text style={styles.headerProgress}>
            {progress.completed_locations.length} / {journey.locations.length} locations
          </Text>
        </View>
      </View>

      {/* Tab Navigator */}
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.accent.primary,
          tabBarInactiveTintColor: colors.text.secondary,
          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: '600',
            textTransform: 'none',
          },
          tabBarStyle: {
            backgroundColor: colors.background.primary,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.default,
          },
          tabBarIndicatorStyle: {
            backgroundColor: colors.accent.primary,
            height: 3,
          },
        }}
      >
        <Tab.Screen
          name="JourneyMap"
          options={{ tabBarLabel: 'Journey Map' }}
        >
          {() => (
            <JourneyMapTab
              journey={journey}
              progress={progress}
              onProgressUpdate={reloadProgress}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Stories"
          options={{ tabBarLabel: 'Stories' }}
        >
          {() => <JourneyStoriesTab journey={journey} />}
        </Tab.Screen>

        <Tab.Screen
          name="Characters"
          options={{ tabBarLabel: 'Characters' }}
        >
          {() => <JourneyCharactersTab journey={journey} />}
        </Tab.Screen>
      </Tab.Navigator>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    minHeight: 60,
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.accent.primary,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerProgress: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});

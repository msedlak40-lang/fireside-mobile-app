import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  getJourneyById,
  getUserJourneyProgress,
  startJourney,
  updateJourneyLastViewed,
} from '../services/journeys';
import type { Journey, UserJourneyProgress } from '../types/journey';
import { colors } from '../theme/colors';

export default function JourneyDetailScreen({ route, navigation }: any) {
  const { journeyId } = route.params;
  const [journey, setJourney] = useState<Journey | null>(null);
  const [progress, setProgress] = useState<UserJourneyProgress | null>(null);

  useEffect(() => {
    loadJourney();
  }, [journeyId]);

  async function loadJourney() {
    const journeyData = getJourneyById(journeyId);
    if (!journeyData) {
      Alert.alert('Error', 'Journey not found');
      navigation.goBack();
      return;
    }

    setJourney(journeyData);

    const progressData = await getUserJourneyProgress(journeyId);
    setProgress(progressData);

    if (progressData) {
      await updateJourneyLastViewed(journeyId);
    }
  }

  async function handleStart() {
    if (!journey) return;

    if (progress) {
      navigation.navigate('JourneyExperience', { journeyId: journey.id });
    } else {
      try {
        await startJourney(journey.id);
        navigation.navigate('JourneyExperience', { journeyId: journey.id });
      } catch (error) {
        console.error('[JourneyDetail] Start error:', error);
        Alert.alert('Error', 'Could not start journey');
      }
    }
  }

  if (!journey) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: colors.text.secondary }}>Loading...</Text>
      </View>
    );
  }

  const progressPercent = progress
    ? Math.round((progress.completed_locations.length / journey.locations.length) * 100)
    : 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{journey.icon}</Text>
        <Text style={styles.title}>{journey.title}</Text>
        <Text style={styles.subtitle}>{journey.subtitle}</Text>
      </View>

      {progress && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.completed_locations.length} of {journey.locations.length} locations completed
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What You'll Experience</Text>

        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>📍</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              {journey.locations.length} Journey Locations
            </Text>
            <Text style={styles.featureDescription}>
              Explore key moments in this Biblical story
            </Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>📖</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              {journey.storyCards.length} Deep Dive Stories
            </Text>
            <Text style={styles.featureDescription}>
              Unpack pivotal moments with rich insights
            </Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>👤</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              {journey.characters.length} Character Profiles
            </Text>
            <Text style={styles.featureDescription}>
              Learn from the people in this journey
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Themes</Text>
        <View style={styles.themesContainer}>
          {journey.themes.map((theme, index) => (
            <View key={index} style={styles.themeTag}>
              <Text style={styles.themeTagText}>{theme}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Locations Preview</Text>
        {journey.locations.slice(0, 3).map((location) => (
          <View key={location.id} style={styles.previewCard}>
            <Text style={styles.previewIcon}>{location.icon}</Text>
            <View style={styles.previewContent}>
              <Text style={styles.previewTitle}>{location.name}</Text>
              <Text style={styles.previewSubtitle}>{location.subtitle}</Text>
            </View>
          </View>
        ))}
        {journey.locations.length > 3 && (
          <Text style={styles.previewMore}>
            + {journey.locations.length - 3} more locations
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.startButton} onPress={handleStart}>
        <Text style={styles.startButtonText}>
          {progress ? 'Continue Journey' : 'Start Journey'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  progressSection: {
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.primary,
  },
  progressText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  themesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeTag: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  themeTagText: {
    fontSize: 14,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  previewIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  previewMore: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  startButton: {
    margin: 20,
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

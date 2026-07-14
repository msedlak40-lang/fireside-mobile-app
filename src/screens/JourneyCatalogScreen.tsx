import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllJourneys, getUserJourneyProgress } from '../services/journeys';
import type { Journey, UserJourneyProgress } from '../types/journey';
import { colors } from '../theme/colors';

export default function JourneyCatalogScreen({ navigation }: any) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [progress, setProgress] = useState<Record<string, UserJourneyProgress>>({});
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadJourneys();
    }, [])
  );

  async function loadJourneys() {
    try {
      setIsLoading(true);
      const allJourneys = getAllJourneys();
      setJourneys(allJourneys);

      const progressMap: Record<string, UserJourneyProgress> = {};
      for (const journey of allJourneys) {
        const prog = await getUserJourneyProgress(journey.id);
        if (prog) {
          progressMap[journey.id] = prog;
        }
      }
      setProgress(progressMap);
    } catch (error) {
      console.error('[JourneyCatalog] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function getProgressPercentage(journeyId: string, totalLocations: number): number {
    const prog = progress[journeyId];
    if (!prog) return 0;
    return Math.round((prog.completed_locations.length / totalLocations) * 100);
  }

  function getProgressLabel(journeyId: string): string {
    const prog = progress[journeyId];
    if (!prog) return 'Start Journey';
    if (prog.completed_at) return 'Completed';
    return 'Continue';
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Interactive Journeys</Text>
      <Text style={styles.subtitle}>
        Explore Biblical stories through immersive experiences
      </Text>

      {journeys.map(journey => {
        const progressPercent = getProgressPercentage(journey.id, journey.locations.length);
        const progressLabel = getProgressLabel(journey.id);
        const isStarted = !!progress[journey.id];
        const isCompleted = !!progress[journey.id]?.completed_at;

        return (
          <TouchableOpacity
            key={journey.id}
            style={styles.journeyCard}
            onPress={() => navigation.navigate('JourneyDetail', { journeyId: journey.id })}
          >
            <View style={styles.journeyHeader}>
              <Text style={styles.journeyIcon}>{journey.icon}</Text>
              <View style={styles.journeyTitleContainer}>
                <Text style={styles.journeyTitle}>{journey.title}</Text>
                <Text style={styles.journeySubtitle}>{journey.subtitle}</Text>
              </View>
            </View>

            <View style={styles.journeyMeta}>
              <Text style={styles.journeyMetaText}>
                {journey.locations.length} Locations  {journey.storyCards.length} Stories  {journey.characters.length} Characters
              </Text>
            </View>

            <View style={styles.journeyThemes}>
              {journey.themes.map((theme, index) => (
                <View key={index} style={styles.themeTag}>
                  <Text style={styles.themeTagText}>{theme}</Text>
                </View>
              ))}
            </View>

            {isStarted && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPercent}%` }
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{progressPercent}% Complete</Text>
              </View>
            )}

            <View style={styles.journeyFooter}>
              <View
                style={[
                  styles.journeyButton,
                  isCompleted && styles.journeyButtonCompleted,
                ]}
              >
                <Text
                  style={[
                    styles.journeyButtonText,
                    isCompleted && styles.journeyButtonTextCompleted,
                  ]}
                >
                  {progressLabel}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  journeyCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  journeyHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  journeyIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  journeyTitleContainer: {
    flex: 1,
  },
  journeyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  journeySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  journeyMeta: {
    marginBottom: 12,
  },
  journeyMetaText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  journeyThemes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
    fontSize: 12,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  progressContainer: {
    marginBottom: 16,
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
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  journeyFooter: {
    flexDirection: 'row',
  },
  journeyButton: {
    flex: 1,
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  journeyButtonCompleted: {
    backgroundColor: colors.success,
  },
  journeyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  journeyButtonTextCompleted: {
    color: '#fff',
  },
});

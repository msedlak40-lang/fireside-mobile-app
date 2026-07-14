import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { completeLocation } from '../../services/journeys';
import type { Journey, UserJourneyProgress } from '../../types/journey';
import { colors } from '../../theme/colors';

interface Props {
  journey: Journey;
  progress: UserJourneyProgress;
  onProgressUpdate: () => void;
}

export default function JourneyMapTab({ journey, progress, onProgressUpdate }: Props) {
  const navigation = useNavigation<any>();

  function isLocationCompleted(index: number): boolean {
    return progress.completed_locations.includes(index);
  }

  function isLocationUnlocked(index: number): boolean {
    if (index === 0) return true;
    return isLocationCompleted(index - 1);
  }

  function handleLocationPress(locationIndex: number) {
    if (!isLocationUnlocked(locationIndex)) {
      Alert.alert(
        'Location Locked',
        'Complete the previous location to unlock this one'
      );
      return;
    }

    navigation.navigate('JourneyLocation', {
      journeyId: journey.id,
      locationIndex,
    });
  }

  async function handleMarkComplete(locationIndex: number) {
    try {
      await completeLocation(journey.id, locationIndex);
      onProgressUpdate();
      Alert.alert('Progress Saved', 'Location marked as complete!');
    } catch (error) {
      console.error('[JourneyMap] Complete error:', error);
      Alert.alert('Error', 'Could not save progress');
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.journeyPath}>
        {journey.locations.map((location, index) => {
          const isCompleted = isLocationCompleted(index);
          const isUnlocked = isLocationUnlocked(index);
          const isCurrent = progress.current_location === index;

          return (
            <View key={location.id} style={styles.locationContainer}>
              {/* Connector line */}
              {index > 0 && (
                <View
                  style={[
                    styles.connector,
                    isLocationCompleted(index - 1) && styles.connectorCompleted,
                  ]}
                />
              )}

              {/* Location Card */}
              <TouchableOpacity
                style={[
                  styles.locationCard,
                  isCompleted && styles.locationCardCompleted,
                  isCurrent && !isCompleted && styles.locationCardCurrent,
                  !isUnlocked && styles.locationCardLocked,
                ]}
                onPress={() => handleLocationPress(index)}
                disabled={!isUnlocked}
              >
                <View style={styles.locationHeader}>
                  <Text style={styles.locationIcon}>{location.icon}</Text>
                  <View style={styles.locationInfo}>
                    <Text style={[
                      styles.locationName,
                      isCompleted && styles.locationNameCompleted,
                    ]}>
                      {location.name}
                    </Text>
                    <Text style={styles.locationSubtitle}>{location.subtitle}</Text>
                  </View>
                  {isCompleted && (
                    <Text style={styles.completedBadge}>✓</Text>
                  )}
                  {!isUnlocked && (
                    <Text style={styles.lockedBadge}>🔒</Text>
                  )}
                </View>

                {isUnlocked && !isCompleted && (
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => handleMarkComplete(index)}
                  >
                    <Text style={styles.completeButtonText}>
                      Mark as Complete
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {progress.completed_locations.length === journey.locations.length && (
        <View style={styles.completionBanner}>
          <Text style={styles.completionIcon}>🎉</Text>
          <Text style={styles.completionTitle}>Journey Complete!</Text>
          <Text style={styles.completionText}>
            You've completed all locations in this journey
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  journeyPath: {
    padding: 20,
  },
  locationContainer: {
    marginBottom: 16,
  },
  connector: {
    width: 4,
    height: 32,
    backgroundColor: colors.border.default,
    marginLeft: 36,
    marginBottom: 8,
  },
  connectorCompleted: {
    backgroundColor: colors.accent.primary,
  },
  locationCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  locationCardCompleted: {
    borderColor: colors.success,
  },
  locationCardCurrent: {
    borderColor: colors.accent.primary,
  },
  locationCardLocked: {
    opacity: 0.5,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  locationNameCompleted: {
    color: colors.success,
  },
  locationSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  completedBadge: {
    fontSize: 28,
    color: colors.success,
  },
  lockedBadge: {
    fontSize: 24,
  },
  completeButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  completionBanner: {
    margin: 20,
    padding: 24,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success,
  },
  completionIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  completionText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

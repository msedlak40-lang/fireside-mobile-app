import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { getJourneyById, completeLocation, getUserJourneyProgress } from '../services/journeys';
import type { JourneyLocation } from '../types/journey';
import { colors } from '../theme/colors';

export default function JourneyLocationScreen({ route, navigation }: any) {
  const { journeyId, locationIndex } = route.params;
  const journey = getJourneyById(journeyId);
  const location: JourneyLocation | undefined = journey?.locations[locationIndex];
  const [completing, setCompleting] = useState(false);

  if (!journey || !location) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: colors.text.secondary }}>Location not found</Text>
      </View>
    );
  }

  async function handleComplete() {
    try {
      setCompleting(true);
      await completeLocation(journeyId, locationIndex);
      Alert.alert('Progress Saved', 'Location marked as complete!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('[JourneyLocation] Complete error:', error);
      Alert.alert('Error', 'Could not save progress');
    } finally {
      setCompleting(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>{location.icon}</Text>
        <Text style={styles.title}>{location.name}</Text>
        <Text style={styles.subtitle}>{location.subtitle}</Text>
      </View>

      {/* Narrative */}
      <View style={styles.section}>
        <Text style={styles.narrative}>{location.narrative}</Text>
      </View>

      {/* Scriptures */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Scriptures</Text>
        {location.scriptures.map((scripture, index) => (
          <View key={index} style={styles.scriptureCard}>
            <Text style={styles.scriptureReference}>{scripture.reference}</Text>
            <Text style={styles.scriptureText} selectable>{scripture.text}</Text>
          </View>
        ))}
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Details</Text>
        {location.details.map((detail, index) => (
          <View key={index} style={styles.detailRow}>
            <Text style={styles.detailBullet}>•</Text>
            <Text style={styles.detailText}>{detail}</Text>
          </View>
        ))}
      </View>

      {/* Faith Lesson */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Faith Lesson</Text>
        <View style={styles.faithLessonCard}>
          <Text style={styles.faithLessonText}>{location.faithLesson}</Text>
        </View>
      </View>

      {/* Complete Button */}
      <TouchableOpacity
        style={styles.completeButton}
        onPress={handleComplete}
        disabled={completing}
      >
        <Text style={styles.completeButtonText}>
          {completing ? 'Saving...' : 'Mark Location Complete'}
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
  narrative: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 26,
  },
  scriptureCard: {
    backgroundColor: colors.background.tertiary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
  },
  scriptureReference: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent.primary,
    marginBottom: 8,
  },
  scriptureText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailBullet: {
    fontSize: 16,
    color: colors.accent.primary,
    marginRight: 12,
    marginTop: 2,
  },
  detailText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 22,
  },
  faithLessonCard: {
    backgroundColor: colors.background.secondary,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.primary,
  },
  faithLessonText: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  completeButton: {
    margin: 20,
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

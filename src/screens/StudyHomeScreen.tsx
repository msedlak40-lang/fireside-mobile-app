import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';

export default function StudyHomeScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Study</Text>
        <Text style={styles.headerSubtitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
          Deepen your understanding of Scripture
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* Biblical Characters */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('CharactersHome')}
        >
          <Text style={styles.cardIcon} maxFontSizeMultiplier={CHROME_MAX_SCALE}>👥</Text>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Biblical Characters</Text>
          <Text style={styles.cardDescription} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            Explore the lives and lessons of people in Scripture
          </Text>
        </TouchableOpacity>

        {/* Reading Plans */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('ReadingPlansHome')}
        >
          <Text style={styles.cardIcon} maxFontSizeMultiplier={CHROME_MAX_SCALE}>📅</Text>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Reading Plans</Text>
          <Text style={styles.cardDescription} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            Structured guides for spiritual growth
          </Text>
        </TouchableOpacity>

        {/* Interactive Journeys */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('JourneyCatalog')}
        >
          <Text style={styles.cardIcon} maxFontSizeMultiplier={CHROME_MAX_SCALE}>🗺️</Text>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Interactive Journeys</Text>
          <Text style={styles.cardDescription} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            Explore Biblical stories through immersive experiences
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  cardsContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 20,
    marginBottom: 16,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: colors.accent.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

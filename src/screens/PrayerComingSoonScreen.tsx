import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';

export default function PrayerComingSoonScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🙏</Text>
      </View>

      <Text style={styles.title}>Prayer Coming Soon</Text>

      <Text style={styles.description}>
        We're building a powerful prayer experience for you with:
      </Text>

      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📝</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Prayer Journal</Text>
            <Text style={styles.featureDescription}>
              Record your prayers and track God's answers
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🤝</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Prayer Requests</Text>
            <Text style={styles.featureDescription}>
              Share requests with your Fire and pray together
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>⏰</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Prayer Reminders</Text>
            <Text style={styles.featureDescription}>
              Set reminders for daily prayer times
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📊</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Answered Prayers</Text>
            <Text style={styles.featureDescription}>
              Celebrate how God has answered your prayers
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🔥</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Fire Prayer Wall</Text>
            <Text style={styles.featureDescription}>
              Pray for your Fire members' requests
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This feature is in development and will be available soon!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 24,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresList: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: colors.background.secondary,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  footerText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

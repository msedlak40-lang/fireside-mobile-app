// src/components/GuestPreview.tsx
//
// Designed "here's what you unlock" card shown on account tabs (Home, Arsenal,
// Fire) when browsing as a guest. Intentionally NOT an empty state — it reads as
// a feature you sign in for. The CTA routes through the shared promptSignIn sheet
// (via useGuestMode) so all gating stays consistent.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';
import { useGuestMode } from '../context/GuestModeContext';

type Props = {
  icon: string;
  title: string;
  subtitle: string;
  bullets?: string[];
  /** Completes "Sign in to {action}" in the shared sheet. */
  action: string;
  ctaLabel?: string;
};

export default function GuestPreview({
  icon,
  title,
  subtitle,
  bullets = [],
  action,
  ctaLabel = 'Sign In / Create Account',
}: Props) {
  const { promptSignIn } = useGuestMode();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.icon} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{icon}</Text>
          <Text style={styles.title} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{title}</Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{subtitle}</Text>

          {bullets.length > 0 && (
            <View style={styles.bullets}>
              {bullets.map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot} maxFontSizeMultiplier={CHROME_MAX_SCALE}>✓</Text>
                  <Text style={styles.bulletText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.cta} onPress={() => promptSignIn(action)} activeOpacity={0.85}>
            <Text style={styles.ctaText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{ctaLabel}</Text>
          </TouchableOpacity>
          <Text style={styles.footnote} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            Free to create — keep reading the Bible as a guest anytime.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  bullets: {
    alignSelf: 'stretch',
    marginBottom: 24,
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.accent.primary,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text.primary,
  },
  cta: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  footnote: {
    marginTop: 12,
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
  },
});

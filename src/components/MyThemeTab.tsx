// src/components/MyThemeTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import {
  getUserYearlyTheme,
  getChapterTheme,
  recordThemeDiscovery,
  getThemeColors,
  isValidTheme,
} from '../services/themes';
import { saveApplication, isApplicationSaved } from '../services/arsenal';
import { colors } from '../theme/colors';

interface Props {
  bookName: string;
  chapter: number;
}

export default function MyThemeTab({ bookName, chapter }: Props) {
  const navigation = useNavigation<any>();
  const [userTheme, setUserTheme] = useState<string | null>(null);
  const [themeApplication, setThemeApplication] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadThemeApplication = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use getSession() instead of getUser() to avoid network call for auth
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('Please log in to see theme applications');
        return;
      }
      const user = session.user;
      setUserId(user.id);

      const yearlyTheme = await getUserYearlyTheme(user.id);
      if (!yearlyTheme) {
        setError('no-theme');
        return;
      }

      setUserTheme(yearlyTheme.theme);

      const application = await getChapterTheme(bookName, chapter, yearlyTheme.theme);

      if (!application) {
        setError('not-generated');
        return;
      }

      setThemeApplication(application);

      // Record sub-theme discovery if present (non-blocking)
      if (application.sub_theme) {
        recordThemeDiscovery(
          user.id,
          yearlyTheme.theme,
          application.sub_theme,
          bookName,
          chapter
        ).catch(() => {});
      }
    } catch (err: any) {
      console.error('[MyThemeTab] Error loading theme application:', err);
      if (err?.message?.includes('Network request failed') || err?.message?.includes('fetch')) {
        setError('network-error');
      } else {
        setError('Failed to load theme application');
      }
    } finally {
      setIsLoading(false);
    }
  }, [bookName, chapter]);

  useEffect(() => {
    loadThemeApplication();
  }, [loadThemeApplication]);

  // Check if already saved to Arsenal
  useEffect(() => {
    if (themeApplication?.id && userId) {
      isApplicationSaved(userId, themeApplication.id)
        .then(setIsSaved)
        .catch(() => {});
    }
  }, [themeApplication, userId]);

  const handleSaveToArsenal = useCallback(async () => {
    if (!themeApplication || !userTheme || !userId) return;

    try {
      setIsSaving(true);
      await saveApplication({
        userId,
        chapterThemeId: themeApplication.id,
        book: bookName,
        chapter,
        themeTag: userTheme,
        subThemeTag: themeApplication.sub_theme,
      });
      setIsSaved(true);
    } catch (err) {
      console.error('[MyThemeTab] Error saving to arsenal:', err);
    } finally {
      setIsSaving(false);
    }
  }, [themeApplication, userTheme, userId, bookName, chapter]);

  const handleShare = useCallback(async () => {
    if (!themeApplication || !userTheme) return;
    try {
      let message = `${userTheme}`;
      if (themeApplication.sub_theme) message += ` - ${themeApplication.sub_theme}`;
      message += `\n\n${bookName} ${chapter}`;
      if (themeApplication.application) message += `\n\n${themeApplication.application}`;
      if (themeApplication.key_insight) message += `\n\nKey Insight: ${themeApplication.key_insight}`;
      if (themeApplication.action_step) message += `\n\nAction Step: ${themeApplication.action_step}`;
      message += `\n\n- Shared from Fireside Fellowship`;
      await Share.share({ message });
    } catch (error) {
      console.error('[MyThemeTab] Share error:', error);
    }
  }, [themeApplication, userTheme, bookName, chapter]);

  const themeColors = userTheme && isValidTheme(userTheme) ? getThemeColors(userTheme) : null;
  const accentColor = themeColors?.primary || colors.accent.primary;

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={styles.loadingText}>Loading your theme...</Text>
      </View>
    );
  }

  // Network error - show retry
  if (error === 'network-error') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>Connection Error</Text>
        <Text style={styles.emptyDescription}>
          Could not load theme content. Please check your internet connection.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={loadThemeApplication}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No theme selected
  if (error === 'no-theme') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.icon}>🎯</Text>
        <Text style={styles.emptyTitle}>No Theme Selected</Text>
        <Text style={styles.emptyDescription}>
          Choose a yearly theme in Settings to see how each chapter speaks to your journey.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('HomeTab', { screen: 'Settings' })}
        >
          <Text style={styles.buttonText}>Go to Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Theme application not generated yet
  if (error === 'not-generated') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.emptyTitle}>Application Coming Soon</Text>
        <Text style={styles.emptyDescription}>
          We're still generating {userTheme} applications for this chapter. Check back soon!
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Success - show theme application
  return (
    <View style={styles.container}>
      {/* Theme Header */}
      <View style={styles.header}>
        <View style={[styles.themeBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.themeBadgeText}>{userTheme?.toUpperCase()}</Text>
        </View>
        {themeApplication.sub_theme && (
          <View style={[styles.subThemeBadge, { borderColor: accentColor }]}>
            <Text style={[styles.subThemeBadgeText, { color: accentColor }]}>
              {themeApplication.sub_theme}
            </Text>
          </View>
        )}
      </View>

      {/* Chapter Reference */}
      <Text style={styles.reference}>
        {bookName} {chapter}
      </Text>

      {/* Application Text */}
      {themeApplication.application?.split('\n\n').map((paragraph: string, index: number) => (
        <Text key={index} selectable style={styles.application}>
          {paragraph}
        </Text>
      ))}

      {/* Key Insight */}
      {themeApplication.key_insight && (
        <View style={[styles.insightBox, { borderLeftColor: accentColor }]}>
          <Text style={styles.insightLabel}>🎯 Key Insight</Text>
          <Text selectable style={styles.insightText}>{themeApplication.key_insight}</Text>
        </View>
      )}

      {/* Action Step */}
      {themeApplication.action_step && (
        <View style={styles.actionBox}>
          <Text style={styles.actionLabel}>💪 Today's Challenge</Text>
          <Text selectable style={styles.actionText}>{themeApplication.action_step}</Text>
        </View>
      )}

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>📤 Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.saveButton,
            isSaved && styles.saveButtonSaved,
          ]}
          onPress={handleSaveToArsenal}
          disabled={isSaved || isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : isSaved ? '✓ Saved to Arsenal' : 'Save to Arsenal'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.accent.primary,
    borderRadius: 8,
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  themeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  themeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subThemeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: 6,
    borderWidth: 1,
  },
  subThemeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reference: {
    fontSize: 16,
    color: colors.text.muted,
    marginBottom: 20,
  },
  application: {
    fontSize: 17,
    lineHeight: 28,
    color: colors.text.primary,
    marginBottom: 24,
  },
  insightBox: {
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent.tertiary,
    marginBottom: 8,
  },
  insightText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
    fontWeight: '600',
  },
  actionBox: {
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    marginBottom: 24,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  shareButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonSaved: {
    backgroundColor: '#95a5a6',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

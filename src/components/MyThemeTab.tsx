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
  getAllChapterThemes,
  recordThemeDiscovery,
  getThemeColors,
  isValidTheme,
  CORE_THEMES,
  THEME_DESCRIPTIONS,
  type ChapterTheme,
  type CoreTheme,
} from '../services/themes';
import { saveApplication, isApplicationSaved } from '../services/arsenal';
import { colors } from '../theme/colors';
import SelectableProse from './SelectableProse';
import { useSentenceSelection } from '../hooks/useSentenceSelection';

interface Props {
  bookName: string;
  chapter: number;
}

export default function MyThemeTab({ bookName, chapter }: Props) {
  const navigation = useNavigation<any>();
  const [userTheme, setUserTheme] = useState<string | null>(null);
  const [chapterThemes, setChapterThemes] = useState<ChapterTheme[]>([]);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // Transient per-sentence tap selection for the application prose. One shared
  // instance (single-select); cleared when the expanded theme changes.
  const sentenceSel = useSentenceSelection();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('Please log in to see theme applications');
        return;
      }
      const user = session.user;
      setUserId(user.id);

      const [yearlyTheme, themes] = await Promise.all([
        getUserYearlyTheme(user.id),
        getAllChapterThemes(bookName, chapter),
      ]);

      setUserTheme(yearlyTheme?.theme ?? null);
      setChapterThemes(themes);

      // Record discovery for user's theme if it has a sub_theme
      if (yearlyTheme?.theme) {
        const userApp = themes.find(t => t.theme === yearlyTheme.theme);
        if (userApp?.sub_theme) {
          recordThemeDiscovery(
            user.id,
            yearlyTheme.theme,
            userApp.sub_theme,
            bookName,
            chapter,
          ).catch(() => {});
        }
      }

      // Check saved status for all themes
      const savedChecks = await Promise.all(
        themes.map(t =>
          isApplicationSaved(user.id, t.id)
            .then(saved => (saved ? t.id : null))
            .catch(() => null),
        ),
      );
      setSavedIds(new Set(savedChecks.filter(Boolean) as string[]));
    } catch (err: any) {
      console.error('[MyThemeTab] Error loading data:', err);
      if (err?.message?.includes('Network request failed') || err?.message?.includes('fetch')) {
        setError('network-error');
      } else {
        setError('Failed to load theme applications');
      }
    } finally {
      setIsLoading(false);
    }
  }, [bookName, chapter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (theme: string) => {
    sentenceSel.clear(); // drop any sentence selection when switching/closing a theme
    setExpandedTheme(prev => (prev === theme ? null : theme));
  };

  const handleSaveToArsenal = useCallback(
    async (app: ChapterTheme) => {
      if (!userId) return;
      try {
        setSavingId(app.id);
        await saveApplication({
          userId,
          chapterThemeId: app.id,
          book: bookName,
          chapter,
          themeTag: app.theme,
          subThemeTag: app.sub_theme,
        });
        setSavedIds(prev => new Set([...prev, app.id]));
      } catch (err) {
        console.error('[MyThemeTab] Error saving to arsenal:', err);
      } finally {
        setSavingId(null);
      }
    },
    [userId, bookName, chapter],
  );

  const handleShare = useCallback(
    async (app: ChapterTheme) => {
      try {
        let message = `${app.theme}`;
        if (app.sub_theme) message += ` - ${app.sub_theme}`;
        message += `\n\n${bookName} ${chapter}`;
        if (app.application) message += `\n\n${app.application}`;
        if (app.key_insight) message += `\n\nKey Insight: ${app.key_insight}`;
        if (app.action_step) message += `\n\nAction Step: ${app.action_step}`;
        message += `\n\n- Shared from Fireside Fellowship`;
        await Share.share({ message });
      } catch (error) {
        console.error('[MyThemeTab] Share error:', error);
      }
    },
    [bookName, chapter],
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={styles.loadingText}>Loading themes...</Text>
      </View>
    );
  }

  // Network error
  if (error === 'network-error') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>Connection Error</Text>
        <Text style={styles.emptyDescription}>
          Could not load theme content. Please check your internet connection.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Generic error
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Build a map of theme -> chapter application
  const themeMap = new Map<string, ChapterTheme>();
  for (const ct of chapterThemes) {
    themeMap.set(ct.theme, ct);
  }

  return (
    <View style={styles.container}>
      {/* Prompt to set theme if none selected */}
      {!userTheme && (
        <TouchableOpacity
          style={styles.setThemeBanner}
          onPress={() => navigation.navigate('HomeTab', { screen: 'Settings' })}
        >
          <Text style={styles.setThemeBannerText}>
            Set your yearly theme in Settings to highlight your focus
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionHeader}>
        Themes in {bookName} {chapter}
      </Text>

      {/* Theme list */}
      {CORE_THEMES.map(theme => {
        const app = themeMap.get(theme);
        const isUserTheme = userTheme === theme;
        const isExpanded = expandedTheme === theme;
        const themeColors = getThemeColors(theme);
        const accentColor = themeColors?.primary || colors.accent.primary;
        const isSaved = app ? savedIds.has(app.id) : false;
        const isSaving = app ? savingId === app.id : false;

        return (
          <View
            key={theme}
            style={[
              styles.themeCard,
              isUserTheme && { borderColor: accentColor, borderWidth: 2 },
            ]}
          >
            {/* Collapsed header */}
            <TouchableOpacity
              style={styles.themeHeader}
              onPress={() => toggleExpand(theme)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {isUserTheme && (
                  <Text style={[styles.checkmark, { color: accentColor }]}>{'\u2713'}</Text>
                )}
                <View style={[styles.themeDot, { backgroundColor: accentColor }]} />
                <Text
                  style={[
                    styles.themeName,
                    isUserTheme && { fontWeight: '700', color: accentColor },
                  ]}
                >
                  {theme}
                </Text>
                {isUserTheme && (
                  <View style={[styles.yourThemeBadge, { backgroundColor: accentColor }]}>
                    <Text style={styles.yourThemeBadgeText}>YOUR THEME</Text>
                  </View>
                )}
              </View>
              <Text style={styles.expandIcon}>{isExpanded ? '\u25BC' : '\u25B6'}</Text>
            </TouchableOpacity>

            {/* One-line description when collapsed */}
            {!isExpanded && (
              <Text style={styles.themeDesc} numberOfLines={1}>
                {THEME_DESCRIPTIONS[theme as CoreTheme]}
              </Text>
            )}

            {/* Expanded content */}
            {isExpanded && (
              <View style={styles.themeContent}>
                {app ? (
                  <>
                    {app.sub_theme && (
                      <View style={[styles.subThemeBadge, { borderColor: accentColor }]}>
                        <Text style={[styles.subThemeBadgeText, { color: accentColor }]}>
                          {app.sub_theme}
                        </Text>
                      </View>
                    )}

                    {app.application?.split('\n\n').map((paragraph: string, index: number) => (
                      <SelectableProse
                        key={index}
                        text={paragraph}
                        blockId={`${theme}-${index}`}
                        selection={sentenceSel}
                        style={styles.applicationText}
                        selectable
                      />
                    ))}

                    {app.key_insight && (
                      <View style={[styles.insightBox, { borderLeftColor: accentColor }]}>
                        <Text style={styles.insightLabel}>Key Insight</Text>
                        <Text selectable style={styles.insightText}>
                          {app.key_insight}
                        </Text>
                      </View>
                    )}

                    {app.action_step && (
                      <View style={styles.actionBox}>
                        <Text style={styles.actionLabel}>Today's Challenge</Text>
                        <Text selectable style={styles.actionText}>
                          {app.action_step}
                        </Text>
                      </View>
                    )}

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.shareButton}
                        onPress={() => handleShare(app)}
                      >
                        <Text style={styles.shareButtonText}>Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveButton, isSaved && styles.saveButtonSaved]}
                        onPress={() => handleSaveToArsenal(app)}
                        disabled={isSaved || isSaving}
                      >
                        <Text style={styles.saveButtonText}>
                          {isSaving
                            ? 'Saving...'
                            : isSaved
                              ? '\u2713 Saved'
                              : 'Save to Arsenal'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.notGenerated}>
                    <Text style={styles.notGeneratedText}>
                      Application for this theme hasn't been generated for this chapter yet.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.accent.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  setThemeBanner: {
    backgroundColor: colors.background.elevated,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  setThemeBannerText: {
    color: colors.accent.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },

  themeCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingBottom: 8,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
  },
  themeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  yourThemeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  yourThemeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  expandIcon: {
    fontSize: 12,
    color: colors.text.muted,
    marginLeft: 8,
  },
  themeDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    paddingHorizontal: 14,
    paddingBottom: 12,
    lineHeight: 18,
  },

  themeContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: 12,
  },

  subThemeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.background.tertiary,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  subThemeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  applicationText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text.primary,
    marginBottom: 16,
  },
  insightBox: {
    backgroundColor: colors.background.secondary,
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent.tertiary,
    marginBottom: 6,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
    fontWeight: '600',
  },
  actionBox: {
    backgroundColor: colors.background.secondary,
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    marginBottom: 16,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 6,
  },
  actionText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  shareButtonText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonSaved: {
    backgroundColor: '#95a5a6',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notGenerated: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  notGeneratedText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

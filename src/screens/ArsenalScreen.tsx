// src/screens/ArsenalScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import {
  getSavedApplications,
  deleteSavedApplication,
  toggleFavorite,
  getArsenalStats,
  getSubThemesForTheme,
  getCharactersFromArsenal,
  type SavedApplication,
  type ArsenalFilters,
  type ArsenalStats,
} from '../services/arsenal';
import { getAvailableThemes, getThemeColors, isValidTheme } from '../services/themes';
import EditArsenalModal from '../components/EditArsenalModal';
import ViewArsenalModal from '../components/ViewArsenalModal';
import ShareToFireModal from '../components/ShareToFireModal';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';

export default function ArsenalScreen({ navigation }: any) {
  const [savedApps, setSavedApps] = useState<SavedApplication[]>([]);
  const [stats, setStats] = useState<ArsenalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedSubTheme, setSelectedSubTheme] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [availableSubThemes, setAvailableSubThemes] = useState<string[]>([]);
  const [availableCharacters, setAvailableCharacters] = useState<string[]>([]);

  // Edit modal
  const [editingApp, setEditingApp] = useState<SavedApplication | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // View (read-only theme text) modal
  const [viewingApp, setViewingApp] = useState<SavedApplication | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Share modal
  const [sharingApp, setSharingApp] = useState<SavedApplication | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const availableThemes = getAvailableThemes();

  const loadArsenal = useCallback(async () => {
    try {
      if (!refreshing) setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const filters: ArsenalFilters = {
        favoritesOnly: showFavoritesOnly,
      };
      if (selectedTheme) filters.themeTag = selectedTheme;
      if (selectedSubTheme) filters.subThemeTag = selectedSubTheme;
      if (selectedCharacter) filters.characterTag = selectedCharacter;

      const [apps, arsenalStats, characters] = await Promise.all([
        getSavedApplications(user.id, filters),
        getArsenalStats(user.id),
        getCharactersFromArsenal(user.id),
      ]);

      setSavedApps(apps);
      setStats(arsenalStats);
      setAvailableCharacters(characters);
    } catch (error) {
      console.error('[Arsenal] Error loading:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedTheme, selectedSubTheme, selectedCharacter, showFavoritesOnly, refreshing]);

  useEffect(() => {
    loadArsenal();
  }, [loadArsenal]);

  useEffect(() => {
    if (selectedTheme) {
      loadSubThemes();
    } else {
      setAvailableSubThemes([]);
      setSelectedSubTheme(null);
    }
  }, [selectedTheme]);

  async function loadSubThemes() {
    if (!selectedTheme) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const subThemes = await getSubThemesForTheme(user.id, selectedTheme);
      setAvailableSubThemes(subThemes);
    } catch (error) {
      console.error('[Arsenal] Error loading sub-themes:', error);
    }
  }

  function handleDelete(savedApp: SavedApplication) {
    Alert.alert(
      'Remove from Arsenal?',
      `Remove ${savedApp.book} ${savedApp.chapter} from your Arsenal?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSavedApplication(savedApp.id);
              loadArsenal();
            } catch (error) {
              console.error('[Arsenal] Error deleting:', error);
              Alert.alert('Error', 'Failed to remove. Please try again.');
            }
          },
        },
      ]
    );
  }

  async function handleToggleFavorite(savedApp: SavedApplication) {
    try {
      await toggleFavorite(savedApp.id, savedApp.is_favorite);
      loadArsenal();
    } catch (error) {
      console.error('[Arsenal] Error toggling favorite:', error);
    }
  }

  function handleView(savedApp: SavedApplication) {
    setViewingApp(savedApp);
    setShowViewModal(true);
  }

  function handleViewClose() {
    setShowViewModal(false);
    setViewingApp(null);
  }

  function handleEdit(savedApp: SavedApplication) {
    setEditingApp(savedApp);
    setShowEditModal(true);
  }

  function handleEditClose() {
    setShowEditModal(false);
    setEditingApp(null);
  }

  function handleEditSaved() {
    setShowEditModal(false);
    setEditingApp(null);
    loadArsenal();
  }

  function handleShare(savedApp: SavedApplication) {
    setSharingApp(savedApp);
    setShowShareModal(true);
  }

  function handleShareClose() {
    setShowShareModal(false);
    setSharingApp(null);
  }

  function handleShareCompleted() {
    setShowShareModal(false);
    setSharingApp(null);
    loadArsenal();
  }

  function clearFilters() {
    setSelectedTheme(null);
    setSelectedSubTheme(null);
    setSelectedCharacter(null);
    setShowFavoritesOnly(false);
  }

  function onRefresh() {
    setRefreshing(true);
    loadArsenal();
  }

  function getThemeAccent(theme: string): string {
    if (isValidTheme(theme)) {
      return getThemeColors(theme)?.primary || colors.accent.primary;
    }
    return colors.accent.primary;
  }

  const hasActiveFilters = selectedTheme || selectedSubTheme || selectedCharacter || showFavoritesOnly;

  // Loading state
  if (isLoading && savedApps.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={styles.loadingText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Loading your Arsenal...</Text>
      </View>
    );
  }

  // Empty state - no saved applications at all
  if (!isLoading && stats && stats.totalSaved === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon} maxFontSizeMultiplier={CHROME_MAX_SCALE}>🗡️</Text>
        <Text style={styles.emptyTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Your Arsenal is Empty</Text>
        <Text style={styles.emptyDescription}>
          Save theme applications from the "My Theme" tab when reading chapters to build your
          personal library of insights.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('BibleTab')}
        >
          <Text style={styles.emptyButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Start Reading</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Filters + Stats section (shared between filtered-empty and main views)
  const renderFiltersAndStats = () => (
    <>
      {/* Stats Header */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{stats.totalSaved}</Text>
              <Text style={styles.statLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Saved</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{stats.favoriteCount}</Text>
              <Text style={styles.statLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Favorites</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{stats.themeBreakdown.length}</Text>
              <Text style={styles.statLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Themes</Text>
            </View>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedTheme && styles.filterChipActive]}
            onPress={() => setSelectedTheme(null)}
          >
            <Text style={[styles.filterChipText, !selectedTheme && styles.filterChipTextActive]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              All
            </Text>
          </TouchableOpacity>
          {availableThemes.map(theme => {
            const accent = getThemeAccent(theme);
            const isActive = selectedTheme === theme;
            return (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => setSelectedTheme(prev => prev === theme ? null : theme)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                  {theme}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sub-Theme Filter */}
        {selectedTheme && availableSubThemes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedSubTheme && styles.filterChipActive]}
              onPress={() => setSelectedSubTheme(null)}
            >
              <Text style={[styles.filterChipText, !selectedSubTheme && styles.filterChipTextActive]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                All {selectedTheme}
              </Text>
            </TouchableOpacity>
            {availableSubThemes.map(subTheme => (
              <TouchableOpacity
                key={subTheme}
                style={[styles.filterChip, selectedSubTheme === subTheme && styles.filterChipActive]}
                onPress={() => setSelectedSubTheme(prev => prev === subTheme ? null : subTheme)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedSubTheme === subTheme && styles.filterChipTextActive,
                ]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                  {subTheme}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Character Filter */}
        {availableCharacters.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedCharacter && styles.filterChipActive]}
              onPress={() => setSelectedCharacter(null)}
            >
              <Text style={[styles.filterChipText, !selectedCharacter && styles.filterChipTextActive]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                All Characters
              </Text>
            </TouchableOpacity>
            {availableCharacters.map(character => (
              <TouchableOpacity
                key={character}
                style={[styles.filterChip, selectedCharacter === character && styles.filterChipActive]}
                onPress={() => setSelectedCharacter(prev => prev === character ? null : character)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedCharacter === character && styles.filterChipTextActive,
                ]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                  {character}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Favorites Toggle + Clear */}
        <View style={styles.filterActions}>
          <TouchableOpacity
            style={[styles.favoritesToggle, showFavoritesOnly && styles.favoritesToggleActive]}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Text style={[
              styles.favoritesToggleText,
              showFavoritesOnly && styles.favoritesToggleTextActive,
            ]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              {showFavoritesOnly ? '⭐ Favorites' : '☆ Favorites'}
            </Text>
          </TouchableOpacity>

          {hasActiveFilters && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
              <Text style={styles.clearFiltersText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );

  // Filtered empty state
  if (!isLoading && savedApps.length === 0 && hasActiveFilters) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
      >
        {renderFiltersAndStats()}
        <View style={styles.centerContainerInline}>
          <Text style={styles.emptyIcon} maxFontSizeMultiplier={CHROME_MAX_SCALE}>🔍</Text>
          <Text style={styles.emptyTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>No Results</Text>
          <Text style={styles.emptyDescription}>
            No saved applications match your filters.
          </Text>
          <TouchableOpacity onPress={clearFilters} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Main view
  return (
    <>
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
    >
      {renderFiltersAndStats()}

      {/* Results Count */}
      <Text style={styles.resultsCount} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
        {savedApps.length} {savedApps.length === 1 ? 'insight' : 'insights'}
      </Text>

      {/* Saved Applications List */}
      <View style={styles.cardsContainer}>
        {savedApps.map(app => {
          const accent = getThemeAccent(app.theme_tag);
          return (
            <View key={app.id} style={styles.card}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTags}>
                  <View style={[styles.themeTag, { backgroundColor: accent }]}>
                    <Text style={styles.themeTagText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{app.theme_tag.toUpperCase()}</Text>
                  </View>
                  {app.sub_theme_tag && (
                    <View style={[styles.subThemeTag, { borderColor: accent }]}>
                      <Text style={[styles.subThemeTagText, { color: accent }]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                        {app.sub_theme_tag}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleToggleFavorite(app)}>
                  <Text style={styles.favoriteIcon} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{app.is_favorite ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              </View>

              {/* Reference */}
              <Text style={styles.cardReference} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                {app.book} {app.chapter}
                {app.character_tag ? ` • ${app.character_tag}` : ''}
              </Text>

              {/* Application text (truncated) */}
              <Text style={styles.cardApplication} numberOfLines={4}>
                {app.application}
              </Text>

              {/* Key Insight */}
              {app.key_insight && (
                <View style={[styles.insightBox, { borderLeftColor: accent }]}>
                  <Text style={styles.insightText}>{app.key_insight}</Text>
                </View>
              )}

              {/* User note */}
              {app.user_note && (
                <View style={styles.userNoteContainer}>
                  <Text style={styles.userNoteLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>My note:</Text>
                  <Text style={styles.userNoteText}>{app.user_note}</Text>
                </View>
              )}

              {/* Saved date */}
              <Text style={styles.cardDate} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                Saved {new Date(app.saved_at).toLocaleDateString()}
              </Text>

              {/* Actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: accent }]}
                  onPress={() => handleView(app)}
                >
                  <Text style={styles.actionButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shareActionButton}
                  onPress={() => handleShare(app)}
                >
                  <Text style={styles.shareActionButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEdit(app)}
                >
                  <Text style={styles.editButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(app)}
                >
                  <Text style={styles.deleteButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>

    <ViewArsenalModal
      visible={showViewModal}
      savedApplication={viewingApp}
      onClose={handleViewClose}
    />

    <EditArsenalModal
      visible={showEditModal}
      savedApplication={editingApp}
      onClose={handleEditClose}
      onSaved={handleEditSaved}
    />

    <ShareToFireModal
      visible={showShareModal}
      target={sharingApp ? { kind: 'arsenal', savedApplication: sharingApp } : null}
      onClose={handleShareClose}
      onShared={handleShareCompleted}
    />
    </>
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
    padding: 40,
    backgroundColor: colors.background.primary,
  },
  centerContainerInline: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 250,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  emptyIcon: {
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
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.accent.primary,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Stats
  statsContainer: {
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  statLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
  },

  // Filters
  filtersContainer: {
    padding: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  favoritesToggle: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  favoritesToggleActive: {
    backgroundColor: '#7a5d1a',
    borderColor: '#7a5d1a',
  },
  favoritesToggleText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  favoritesToggleTextActive: {
    color: '#ffd54f',
  },
  clearFiltersButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  clearFiltersText: {
    fontSize: 13,
    color: colors.accent.tertiary,
    fontWeight: '600',
  },

  // Results
  resultsCount: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 13,
    color: colors.text.muted,
  },

  // Cards
  cardsContainer: {
    padding: 12,
    paddingTop: 8,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  themeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  themeTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subThemeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
    borderWidth: 1,
  },
  subThemeTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  favoriteIcon: {
    fontSize: 22,
    marginLeft: 8,
  },
  cardReference: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: 10,
  },
  cardApplication: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
    marginBottom: 12,
  },
  insightBox: {
    backgroundColor: colors.background.tertiary,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  userNoteContainer: {
    backgroundColor: colors.background.tertiary,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.tertiary,
    marginBottom: 12,
  },
  userNoteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent.tertiary,
    marginBottom: 4,
  },
  userNoteText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  cardDate: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  shareActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.success,
  },
  shareActionButtonText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  editButtonText: {
    color: colors.accent.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
});

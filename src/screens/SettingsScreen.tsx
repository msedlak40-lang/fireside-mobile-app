// src/screens/SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import {
  getUserYearlyTheme,
  setUserYearlyTheme,
  getAvailableThemes,
  getThemeDescription,
  getThemeColors,
  isValidTheme,
  type CoreTheme,
} from '../services/themes';
import { getPreferredTranslation, setPreferredTranslation, clearLocalUserData } from '../services/userPrefs';
import { getCurrentCycle, startNextCycle } from '../services/readingCycle';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';

const TRANSLATIONS = ['KJV', 'WEB'];

export default function SettingsScreen() {
  const [currentTheme, setCurrentTheme] = useState<string | null>(null);
  const [translation, setTranslation] = useState('KJV');
  const [cycle, setCycle] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Your Name
  const [firstName, setFirstName] = useState('');
  const [savedFirstName, setSavedFirstName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Account actions (sign out / delete)
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const availableThemes = getAvailableThemes();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadUserTheme();
    getPreferredTranslation().then(t => { if (t) setTranslation(t.toUpperCase()); }).catch(() => {});
    getCurrentCycle().then(setCycle).catch(() => {});
  }, []);

  const handleTranslationSelect = (t: string) => {
    setTranslation(t);
    setPreferredTranslation(t);
  };

  const handleStartNextCycle = () => {
    const next = cycle + 1;
    Alert.alert(
      `Start reading cycle ${next}?`,
      'Your current progress is preserved. All chapters will show as unread, and this begins a new reading cycle.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Start cycle ${next}`,
          onPress: async () => {
            try {
              const updated = await startNextCycle();
              setCycle(updated);
              Alert.alert('New Cycle Started', `You're now on reading cycle ${updated}. All chapters show as unread; your past cycles are preserved.`);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Unable to start a new cycle.');
            }
          },
        },
      ],
    );
  };

  const loadUserTheme = useCallback(async () => {
    try {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? null);

      // Prefill "Your Name" from the profile (isolated so a profiles read
      // failure can't block theme loading).
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .maybeSingle();
        const existing = (profile?.first_name || '').trim();
        setFirstName(existing);
        setSavedFirstName(existing);
      } catch (e) {
        console.error('[Settings] Error loading profile name:', e);
      }

      const yearlyTheme = await getUserYearlyTheme(user.id);
      setCurrentTheme(yearlyTheme?.theme || null);
    } catch (error) {
      console.error('[Settings] Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSaveName = async () => {
    if (!userId) return;
    const trimmed = firstName.trim();
    if (!trimmed || trimmed === savedFirstName) return;

    try {
      setNameSaving(true);
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, first_name: trimmed, email: userEmail }, { onConflict: 'id' });
      if (error) throw error;

      setSavedFirstName(trimmed);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    } catch (e: any) {
      console.error('[Settings] Error saving name:', e);
      Alert.alert('Error', e?.message ?? 'Could not save your name. Please try again.');
    } finally {
      setNameSaving(false);
    }
  };

  const handleThemeSelect = useCallback(
    async (theme: string) => {
      if (!userId) {
        Alert.alert('Error', 'You must be signed in to select a theme');
        return;
      }

      // Confirm if changing from existing theme
      if (currentTheme && currentTheme !== theme) {
        Alert.alert(
          'Change Theme?',
          `Switch your ${currentYear} theme from "${currentTheme}" to "${theme}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Change',
              onPress: () => saveTheme(theme),
            },
          ]
        );
      } else {
        saveTheme(theme);
      }
    },
    [userId, currentTheme, currentYear]
  );

  const saveTheme = async (theme: string) => {
    if (!userId) return;

    try {
      setIsSaving(true);
      const result = await setUserYearlyTheme(userId, theme);

      if (result) {
        setCurrentTheme(theme);
        Alert.alert(
          'Theme Set!',
          `Your ${currentYear} theme is now "${theme}". This theme will guide your Bible reading and surface relevant applications.`
        );
      } else {
        Alert.alert('Error', 'Failed to save theme. Please try again.');
      }
    } catch (error) {
      console.error('[Settings] Error setting theme:', error);
      Alert.alert('Error', 'Failed to save theme. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', onPress: () => { supabase.auth.signOut().catch(() => {}); } },
    ]);
  };

  // Delete: RPC first. Sign out + clear local caches ONLY on confirmed success,
  // so an RPC failure leaves the user signed in (never strand them).
  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      const { error } = await supabase.rpc('delete_own_account');
      if (error) throw error;

      // Success — account + all data are gone. Clear local caches, then sign out;
      // signOut() flips the root gate back to the Auth screen. (The root auth
      // listener also clears on SIGNED_OUT; clearing here first is belt-and-braces.)
      await clearLocalUserData();
      try { await supabase.auth.signOut(); } catch {}
      // Component unmounts as the gate flips; no manual navigation needed.
    } catch (e: any) {
      setDeleting(false);
      setConfirmVisible(false);
      Alert.alert(
        'Could not delete account',
        `${e?.message ?? 'Something went wrong.'}\n\nYou are still signed in — no data was deleted. Please try again.`
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
          <Text style={styles.loadingText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Your Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Your Name</Text>
          <Text style={styles.sectionDescription} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            The name shown to your brothers on posts and comments in Fire.
          </Text>
          <TextInput
            style={styles.nameInput}
            value={firstName}
            onChangeText={(t) => {
              setFirstName(t);
              if (nameSaved) setNameSaved(false);
            }}
            placeholder="Enter your name"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="words"
            maxLength={40}
            returnKeyType="done"
            editable={!nameSaving}
          />
          {(() => {
            const disabled = nameSaving || !firstName.trim() || firstName.trim() === savedFirstName;
            return (
              <TouchableOpacity
                onPress={handleSaveName}
                activeOpacity={0.7}
                disabled={disabled}
                style={[
                  styles.nameSaveButton,
                  disabled && styles.nameSaveButtonDisabled,
                  nameSaved && styles.nameSaveButtonSaved,
                ]}
              >
                <Text style={styles.nameSaveButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                  {nameSaving ? 'Saving…' : nameSaved ? '✓ Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* Theme Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>My {currentYear} Theme</Text>
            {currentTheme && (
              <View
                style={[
                  styles.currentBadge,
                  {
                    backgroundColor:
                      getThemeColors(currentTheme)?.light || colors.background.tertiary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currentBadgeText,
                    { color: getThemeColors(currentTheme)?.dark || colors.text.primary },
                  ]}
                  maxFontSizeMultiplier={CHROME_MAX_SCALE}
                >
                  Active
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionDescription} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            Choose a theme to guide your Bible reading this year. Your theme will surface relevant
            applications and help you discover sub-themes throughout Scripture.
          </Text>

          <View style={styles.themeList}>
            {availableThemes.map((theme) => {
              const isSelected = currentTheme === theme;
              const themeColors = isValidTheme(theme) ? getThemeColors(theme) : null;
              const description = isValidTheme(theme) ? getThemeDescription(theme) : '';

              return (
                <TouchableOpacity
                  key={theme}
                  style={[
                    styles.themeOption,
                    isSelected && styles.themeOptionSelected,
                    isSelected && themeColors && { borderColor: themeColors.primary },
                  ]}
                  onPress={() => handleThemeSelect(theme)}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  {/* Theme Header */}
                  <View style={styles.themeHeader}>
                    <View style={styles.themeTitleRow}>
                      {/* Color indicator */}
                      <View
                        style={[
                          styles.colorIndicator,
                          { backgroundColor: themeColors?.primary || colors.accent.primary },
                        ]}
                      />
                      <Text
                        style={[
                          styles.themeText,
                          isSelected && themeColors && { color: themeColors.primary },
                        ]}
                        maxFontSizeMultiplier={CHROME_MAX_SCALE}
                      >
                        {theme}
                      </Text>
                    </View>

                    {isSelected && (
                      <View
                        style={[
                          styles.checkmarkContainer,
                          { backgroundColor: themeColors?.primary || colors.accent.primary },
                        ]}
                      >
                        <Text style={styles.checkmark} maxFontSizeMultiplier={CHROME_MAX_SCALE}>✓</Text>
                      </View>
                    )}
                  </View>

                  {/* Theme Description */}
                  <Text
                    style={[
                      styles.themeDescription,
                      isSelected && { color: colors.text.primary },
                    ]}
                    maxFontSizeMultiplier={CHROME_MAX_SCALE}
                  >
                    {description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!currentTheme && (
            <View style={styles.hintContainer}>
              <Text style={styles.hintIcon} maxFontSizeMultiplier={CHROME_MAX_SCALE}>💡</Text>
              <Text style={styles.hint} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                Select a theme to begin your journey. You can change it anytime during the year.
              </Text>
            </View>
          )}

          {currentTheme && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                Your theme influences which applications appear when reading chapters and helps
                track your growth throughout the year.
              </Text>
            </View>
          )}
        </View>

        {/* Reading Translation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Reading Translation</Text>
          <Text style={styles.sectionDescription} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            The translation used when you read and study Scripture.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            {TRANSLATIONS.map((t) => {
              const selected = translation === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => handleTranslationSelect(t)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: selected ? colors.accent.primary : colors.border.default,
                    backgroundColor: selected ? colors.accent.primary : colors.background.tertiary,
                  }}
                >
                  <Text style={{ fontWeight: '700', color: selected ? '#fff' : colors.text.primary }} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Reading Cycle Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Reading Cycle</Text>
          <Text style={styles.sectionDescription} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            {cycle > 1
              ? `You're on reading cycle ${cycle}. Start a new cycle to read through again with a clean slate.`
              : 'Finished reading through? Start a new cycle to read again with a clean slate.'}
          </Text>
          <TouchableOpacity
            onPress={handleStartNextCycle}
            activeOpacity={0.7}
            style={styles.cycleButton}
          >
            <Text style={styles.cycleButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Start reading cycle {cycle + 1}</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Account</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Email</Text>
            <Text style={styles.settingValue} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{userEmail ?? (userId ? 'Signed in' : 'Not signed in')}</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
            <Text style={styles.signOutButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>About</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Version</Text>
            <Text style={styles.settingValue} maxFontSizeMultiplier={CHROME_MAX_SCALE}>2.0.0</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Theme System</Text>
            <Text style={styles.settingValue} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Active</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Danger Zone</Text>
          <Text style={styles.sectionDescription} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            Permanently delete your account and all of your data. This cannot be undone.
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => { setConfirmText(''); setConfirmVisible(true); }}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete confirmation (two-step: open + type DELETE) */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!deleting) setConfirmVisible(false); }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Delete Account</Text>
            <Text style={styles.modalWarning} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              This permanently deletes your account and all your data — reading progress, notes, saved verses, and Fire history. This cannot be undone.
            </Text>
            <Text style={styles.modalPrompt} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Type DELETE to confirm.</Text>
            <TextInput
              style={styles.modalInput}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="DELETE"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
            />
            {(() => {
              const armed = confirmText.trim().toUpperCase() === 'DELETE' && !deleting;
              return (
                <TouchableOpacity
                  style={[styles.modalDeleteBtn, !armed && styles.modalDeleteBtnDisabled]}
                  disabled={!armed}
                  onPress={handleConfirmDelete}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalDeleteBtnText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                    {deleting ? 'Deleting…' : 'Delete My Account'}
                  </Text>
                </TouchableOpacity>
              );
            })()}
            <TouchableOpacity
              style={styles.modalCancelBtn}
              disabled={deleting}
              onPress={() => setConfirmVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelBtnText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Saving Overlay */}
      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
          <Text style={styles.savingText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Saving theme...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.text.secondary,
    fontSize: 14,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  themeList: {
    gap: 12,
  },
  themeOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.background.secondary,
  },
  themeOptionSelected: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 2,
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  themeDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginLeft: 22,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    gap: 8,
  },
  hintIcon: {
    fontSize: 16,
  },
  hint: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  infoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
  },
  infoText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  nameInput: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 12,
  },
  nameSaveButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.accent.primary,
  },
  nameSaveButtonDisabled: {
    opacity: 0.5,
  },
  nameSaveButtonSaved: {
    backgroundColor: colors.success,
  },
  nameSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  cycleButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.accent.primary,
  },
  cycleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  settingLabel: {
    fontSize: 15,
    color: colors.text.primary,
  },
  settingValue: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingText: {
    marginTop: 12,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  signOutButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  dangerSection: {
    borderBottomWidth: 0,
  },
  dangerTitle: {
    color: '#ef4444',
  },
  deleteButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.background.elevated,
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ef4444',
    marginBottom: 10,
  },
  modalWarning: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
    marginBottom: 16,
  },
  modalPrompt: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.text.primary,
    marginBottom: 16,
  },
  modalDeleteBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#dc2626',
  },
  modalDeleteBtnDisabled: {
    opacity: 0.4,
  },
  modalDeleteBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  modalCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});

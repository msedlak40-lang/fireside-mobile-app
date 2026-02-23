import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import {
  updateSavedApplication,
  getSubThemesForTheme,
  type SavedApplication,
} from '../services/arsenal';
import { colors } from '../theme/colors';

interface EditArsenalModalProps {
  visible: boolean;
  savedApplication: SavedApplication | null;
  onClose: () => void;
  onSaved: () => void;
}

const COMMON_CHARACTERS = [
  'Abraham', 'Isaac', 'Jacob', 'Joseph', 'Moses', 'Joshua', 'David',
  'Solomon', 'Elijah', 'Elisha', 'Isaiah', 'Jeremiah', 'Ezekiel',
  'Daniel', 'Jesus', 'Peter', 'Paul', 'John', 'James', 'Mary',
  'Ruth', 'Esther', 'Deborah', 'Samuel', 'Gideon', 'Samson',
  'Adam', 'Eve', 'Noah', 'Job', 'Jonah', 'Nehemiah', 'Ezra',
];

export default function EditArsenalModal({
  visible,
  savedApplication,
  onClose,
  onSaved,
}: EditArsenalModalProps) {
  const [userNote, setUserNote] = useState('');
  const [subThemeTag, setSubThemeTag] = useState('');
  const [characterTag, setCharacterTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [availableSubThemes, setAvailableSubThemes] = useState<string[]>([]);

  useEffect(() => {
    if (visible && savedApplication) {
      setUserNote(savedApplication.user_note || '');
      setSubThemeTag(savedApplication.sub_theme_tag || '');
      setCharacterTag(savedApplication.character_tag || '');
      loadSubThemes(savedApplication.theme_tag);
    }
  }, [visible, savedApplication]);

  async function loadSubThemes(themeTag: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const subThemes = await getSubThemesForTheme(user.id, themeTag);
      setAvailableSubThemes(subThemes);
    } catch {
      setAvailableSubThemes([]);
    }
  }

  async function handleSave() {
    if (!savedApplication) return;

    try {
      setIsSaving(true);
      await updateSavedApplication({
        savedAppId: savedApplication.id,
        userNote: userNote.trim() || null,
        subThemeTag: subThemeTag.trim() || null,
        characterTag: characterTag.trim() || null,
      });
      onSaved();
      onClose();
    } catch (error) {
      console.error('[EditArsenalModal] Error updating:', error);
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!savedApplication) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Edit Arsenal Entry</Text>
                <Text style={styles.headerSubtitle}>
                  {savedApplication.book} {savedApplication.chapter}
                </Text>
              </View>

              <ScrollView style={styles.scrollContent}>
                {/* User Note */}
                <View style={styles.section}>
                  <Text style={styles.label}>Personal Note</Text>
                  <TextInput
                    style={styles.noteInput}
                    value={userNote}
                    onChangeText={setUserNote}
                    placeholder="Add your reflections, thoughts, or reminders..."
                    placeholderTextColor={colors.text.muted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Sub-Theme */}
                <View style={styles.section}>
                  <Text style={styles.label}>
                    Sub-Theme{savedApplication.sub_theme_tag ? ` (current: ${savedApplication.sub_theme_tag})` : ''}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipScroll}
                  >
                    <TouchableOpacity
                      style={[styles.chip, !subThemeTag && styles.chipActive]}
                      onPress={() => setSubThemeTag('')}
                    >
                      <Text style={[styles.chipText, !subThemeTag && styles.chipTextActive]}>
                        None
                      </Text>
                    </TouchableOpacity>
                    {availableSubThemes.map(theme => (
                      <TouchableOpacity
                        key={theme}
                        style={[styles.chip, subThemeTag === theme && styles.chipActive]}
                        onPress={() => setSubThemeTag(theme)}
                      >
                        <Text style={[styles.chipText, subThemeTag === theme && styles.chipTextActive]}>
                          {theme}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Character */}
                <View style={styles.section}>
                  <Text style={styles.label}>
                    Biblical Character{savedApplication.character_tag ? ` (current: ${savedApplication.character_tag})` : ''}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={characterTag}
                    onChangeText={setCharacterTag}
                    placeholder="Type character name..."
                    placeholderTextColor={colors.text.muted}
                  />
                  <Text style={styles.hint}>Or select from common characters:</Text>
                  <View style={styles.characterGrid}>
                    {COMMON_CHARACTERS.map(char => (
                      <TouchableOpacity
                        key={char}
                        style={[styles.characterChip, characterTag === char && styles.characterChipActive]}
                        onPress={() => setCharacterTag(prev => prev === char ? '' : char)}
                      >
                        <Text style={[styles.characterChipText, characterTag === char && styles.characterChipTextActive]}>
                          {char}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  scrollContent: {
    maxHeight: 400,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 8,
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text.primary,
    minHeight: 100,
  },
  textInput: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text.primary,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  chipText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  characterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  characterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  characterChipActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  characterChipText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  characterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  saveButton: {
    backgroundColor: colors.accent.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { updateFire, type Fire } from '../services/fire';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';

interface FireSettingsModalProps {
  visible: boolean;
  fire: Fire | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function FireSettingsModal({
  visible,
  fire,
  onClose,
  onSaved,
}: FireSettingsModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && fire) {
      setName(fire.name);
      setDescription(fire.description || '');
    }
  }, [visible, fire]);

  async function handleSave() {
    if (!fire) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Fire name is required');
      return;
    }

    try {
      setIsSaving(true);

      await updateFire(fire.id, {
        name: name.trim(),
        description: description.trim() || null,
      });

      Alert.alert('Success', 'Fire settings updated');
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error updating fire:', error);
      Alert.alert('Error', error.message || 'Could not update Fire settings');
    } finally {
      setIsSaving(false);
    }
  }

  if (!fire) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.header}>
                <Text style={styles.headerTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Fire Settings</Text>
              </View>

              <ScrollView style={styles.scrollContent}>
                <View style={styles.section}>
                  <Text style={styles.label} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Fire Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Fire name"
                    placeholderTextColor={colors.text.muted}
                    maxLength={100}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.label} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Optional description"
                    placeholderTextColor={colors.text.muted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.label} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Invite Code</Text>
                  <TouchableOpacity
                    style={styles.inviteCodeBox}
                    activeOpacity={0.7}
                    onPress={() => {
                      Share.share({
                        message: `Join my Fire on Fireside Fellowship! Use invite code: ${fire.invite_code}`,
                      });
                    }}
                  >
                    <Text style={styles.inviteCode} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{fire.invite_code}</Text>
                    <Text style={styles.copyHint} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Tap to share</Text>
                  </TouchableOpacity>
                  <Text style={styles.hint} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                    Share this code with brothers to invite them
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.saveButton,
                    isSaving && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
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
    maxWidth: 500,
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
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 80,
  },
  hint: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  inviteCodeBox: {
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    alignItems: 'center',
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent.primary,
    letterSpacing: 2,
  },
  copyHint: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 6,
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
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

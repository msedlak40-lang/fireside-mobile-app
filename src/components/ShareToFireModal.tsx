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
  ActivityIndicator,
} from 'react-native';
import { getUserFires, shareToFire, shareVerseToFire, type Fire } from '../services/fire';
import type { SavedApplication } from '../services/arsenal';
import { colors } from '../theme/colors';

export type ShareTarget =
  | { kind: 'arsenal'; savedApplication: SavedApplication }
  | { kind: 'verse'; book: string; chapter: number; verseNumber: number; reference: string; text: string };

interface ShareToFireModalProps {
  visible: boolean;
  target: ShareTarget | null;
  onClose: () => void;
  onShared: () => void;
}

export default function ShareToFireModal({
  visible,
  target,
  onClose,
  onShared,
}: ShareToFireModalProps) {
  const [fires, setFires] = useState<Fire[]>([]);
  const [selectedFireId, setSelectedFireId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFires();
      setMessage('');
      setSelectedFireId(null);
    }
  }, [visible]);

  async function loadFires() {
    try {
      setIsLoading(true);
      const userFires = await getUserFires();
      setFires(userFires);

      // Auto-select if only one fire
      if (userFires.length === 1) {
        setSelectedFireId(userFires[0].id);
      }
    } catch (error) {
      console.error('Error loading fires:', error);
      Alert.alert('Error', 'Could not load your Fires');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleShare() {
    if (!selectedFireId) {
      Alert.alert('Select Fire', 'Please select which Fire to share with');
      return;
    }

    if (!target) return;

    try {
      setIsSharing(true);

      if (target.kind === 'verse') {
        await shareVerseToFire(
          selectedFireId,
          {
            book: target.book,
            chapter: target.chapter,
            verseNumber: target.verseNumber,
            reference: target.reference,
            text: target.text,
          },
          message,
        );
      } else {
        await shareToFire(selectedFireId, target.savedApplication.id, message);
      }

      Alert.alert(
        'Shared!',
        target.kind === 'verse'
          ? 'Your verse has been shared with your Fire'
          : 'Your insight has been shared with your Fire',
      );
      onShared();
      onClose();
    } catch (error: any) {
      console.error('Error sharing to fire:', error);
      Alert.alert('Error', error.message || 'Could not share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  }

  if (!target) return null;

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
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Share with Fire</Text>
                <Text style={styles.headerSubtitle}>
                  {target.kind === 'verse'
                    ? target.reference
                    : `${target.savedApplication.book} ${target.savedApplication.chapter} - ${target.savedApplication.theme_tag}`}
                </Text>
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.accent.primary} />
                  <Text style={styles.loadingText}>Loading your Fires...</Text>
                </View>
              ) : fires.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Fires Yet</Text>
                  <Text style={styles.emptyDescription}>
                    Create or join a Fire first to share insights
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.scrollContent}>
                  {/* Select Fire */}
                  <View style={styles.section}>
                    <Text style={styles.label}>Select Fire:</Text>
                    {fires.map(fire => (
                      <TouchableOpacity
                        key={fire.id}
                        style={[
                          styles.fireOption,
                          selectedFireId === fire.id && styles.fireOptionSelected
                        ]}
                        onPress={() => setSelectedFireId(fire.id)}
                      >
                        <View style={styles.fireOptionHeader}>
                          <Text style={[
                            styles.fireOptionName,
                            selectedFireId === fire.id && styles.fireOptionNameSelected
                          ]}>
                            {fire.name}
                          </Text>
                          {selectedFireId === fire.id && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                        <Text style={styles.fireOptionMembers}>
                          {fire.member_count} members
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Add Message */}
                  <View style={styles.section}>
                    <Text style={styles.label}>Add a message (optional):</Text>
                    <TextInput
                      style={styles.messageInput}
                      value={message}
                      onChangeText={setMessage}
                      placeholder="Share why this spoke to you..."
                      placeholderTextColor={colors.text.muted}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      maxLength={500}
                    />
                    <Text style={styles.characterCount}>
                      {message.length} / 500
                    </Text>
                  </View>

                  {/* Preview */}
                  <View style={styles.section}>
                    <Text style={styles.label}>Preview:</Text>
                    <View style={styles.previewCard}>
                      {target.kind === 'verse' ? (
                        <>
                          <Text style={styles.previewReference}>{target.reference}</Text>
                          <Text style={styles.previewInsight} numberOfLines={4}>
                            "{target.text}"
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.previewReference}>
                            {target.savedApplication.book} {target.savedApplication.chapter}
                          </Text>
                          <Text style={styles.previewTheme}>
                            {target.savedApplication.theme_tag} {target.savedApplication.sub_theme_tag ? `• ${target.savedApplication.sub_theme_tag}` : ''}
                          </Text>
                          {target.savedApplication.key_insight && (
                            <Text style={styles.previewInsight} numberOfLines={3}>
                              {target.savedApplication.key_insight}
                            </Text>
                          )}
                        </>
                      )}
                      {message.trim() ? (
                        <View style={styles.previewMessage}>
                          <Text style={styles.previewMessageLabel}>Your note:</Text>
                          <Text style={styles.previewMessageText}>"{message}"</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </ScrollView>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.shareButton,
                    (isSharing || !selectedFireId) && styles.shareButtonDisabled
                  ]}
                  onPress={handleShare}
                  disabled={isSharing || !selectedFireId || fires.length === 0}
                >
                  <Text style={styles.shareButtonText}>
                    {isSharing ? 'Sharing...' : 'Share'}
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
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
  fireOption: {
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border.default,
    marginBottom: 8,
  },
  fireOptionSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.background.tertiary,
  },
  fireOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fireOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  fireOptionNameSelected: {
    color: colors.accent.primary,
  },
  checkmark: {
    fontSize: 20,
    color: colors.accent.primary,
  },
  fireOptionMembers: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  messageInput: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text.primary,
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'right',
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  previewReference: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  previewTheme: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  previewInsight: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  previewMessage: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  previewMessageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  previewMessageText: {
    fontSize: 14,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
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
  shareButton: {
    backgroundColor: colors.accent.primary,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

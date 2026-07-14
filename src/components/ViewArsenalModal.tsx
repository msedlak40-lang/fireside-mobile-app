import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { getThemeColors, isValidTheme } from '../services/themes';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';

/** Minimal shape the read-only theme modal renders. Both a full SavedApplication
 *  (Arsenal screen) and the Fire feed's embedded saved_application satisfy it. */
export interface ViewableApplication {
  book: string;
  chapter: number;
  theme_tag: string;
  sub_theme_tag?: string | null;
  character_tag?: string | null;
  application?: string | null;
  key_insight?: string | null;
  action_step?: string | null;
  user_note?: string | null;
}

interface ViewArsenalModalProps {
  visible: boolean;
  savedApplication: ViewableApplication | null;
  onClose: () => void;
}

export default function ViewArsenalModal({
  visible,
  savedApplication,
  onClose,
}: ViewArsenalModalProps) {
  if (!savedApplication) return null;

  const app = savedApplication;
  const accent =
    (isValidTheme(app.theme_tag) && getThemeColors(app.theme_tag)?.primary) ||
    colors.accent.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTags}>
              <View style={[styles.themeTag, { backgroundColor: accent }]}>
                <Text style={styles.themeTagText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{app.theme_tag.toUpperCase()}</Text>
              </View>
              {app.sub_theme_tag ? (
                <View style={[styles.subThemeTag, { borderColor: accent }]}>
                  <Text style={[styles.subThemeTagText, { color: accent }]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                    {app.sub_theme_tag}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.reference} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              {app.book} {app.chapter}
              {app.character_tag ? ` • ${app.character_tag}` : ''}
            </Text>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
            {/* Application */}
            {app.application ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Application</Text>
                <Text style={styles.bodyText}>{app.application}</Text>
              </View>
            ) : null}

            {/* Key Insight */}
            {app.key_insight ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Key Insight</Text>
                <View style={[styles.insightBox, { borderLeftColor: accent }]}>
                  <Text style={styles.insightText}>{app.key_insight}</Text>
                </View>
              </View>
            ) : null}

            {/* Action Step */}
            {app.action_step ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Action Step</Text>
                <Text style={styles.bodyText}>{app.action_step}</Text>
              </View>
            ) : null}

            {/* User Note */}
            {app.user_note ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>My Note</Text>
                <View style={styles.userNoteBox}>
                  <Text style={styles.userNoteText}>{app.user_note}</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Close */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    maxHeight: '85%',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
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
  reference: {
    fontSize: 14,
    color: colors.text.muted,
  },
  scrollContent: {
    flexShrink: 1,
  },
  scrollInner: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.text.primary,
  },
  insightBox: {
    backgroundColor: colors.background.tertiary,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  userNoteBox: {
    backgroundColor: colors.background.tertiary,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.tertiary,
  },
  userNoteText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

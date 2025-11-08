import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import ExpandableSection from './ExpandableSection';
import { colors } from '../theme/colors';

type Props = {
  summary: string | null; // from advanced summary_advanced
  theologicalThemes: string | null; // extracted from basic summary_content
  keyVersesText: string | null; // extracted from basic Key Verses section
  practicalApplications: string | null; // from advanced
  bookName: string | null;
  chapter: number;
};

// Helper to strip basic markdown formatting
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '') // Remove heading markers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/`(.+?)`/g, '$1') // Remove inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
    .trim();
}

export default function OnePagerTab({
  summary,
  theologicalThemes,
  keyVersesText,
  practicalApplications,
  bookName,
  chapter,
}: Props) {
  // Normalize practical applications to markdown string
  let practicalAppsMarkdown: string | null = null;
  if (typeof practicalApplications === 'string') {
    practicalAppsMarkdown = practicalApplications;
  }

  // Share One Pager
  const shareOnePager = async () => {
    let message = `${bookName} ${chapter}\nONE PAGER SUMMARY\n\n`;

    if (summary) {
      message += `SUMMARY\n${stripMarkdown(summary)}\n\n`;
    }

    if (theologicalThemes) {
      message += `THEOLOGICAL THEMES\n${stripMarkdown(theologicalThemes)}\n\n`;
    }

    if (keyVersesText) {
      message += `KEY VERSES\n${stripMarkdown(keyVersesText)}\n\n`;
    }

    if (practicalAppsMarkdown) {
      message += `PRACTICAL APPLICATIONS\n${stripMarkdown(practicalAppsMarkdown)}\n\n`;
    }

    try {
      await Share.share({
        message: message.trim(),
      });
    } catch (error) {
      console.error('[OnePagerTab] Share failed', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Share button */}
      <TouchableOpacity
        onPress={shareOnePager}
        style={styles.shareButton}
      >
        <Text style={styles.shareIcon}>📤</Text>
        <Text style={styles.shareText}>Share One Pager</Text>
      </TouchableOpacity>

      {/* Summary */}
      {summary && (
        <ExpandableSection
          title="Summary"
          initiallyExpanded={true}
          markdown={summary}
          studyTier={null}
          sectionKey="onepager-summary"
          enableAnnotations={true}
          bookName={bookName}
          chapter={chapter}
        />
      )}

      {/* Theological Themes */}
      {theologicalThemes && (
        <ExpandableSection
          title="Theological Themes"
          initiallyExpanded={false}
          markdown={theologicalThemes}
          studyTier={null}
          sectionKey="onepager-theological-themes"
          enableAnnotations={true}
          bookName={bookName}
          chapter={chapter}
        />
      )}

      {/* Key Verses with Context */}
      {keyVersesText && (
        <ExpandableSection
          title="Key Verses with Context"
          initiallyExpanded={false}
          markdown={keyVersesText}
          studyTier={null}
          sectionKey="onepager-key-verses"
          enableAnnotations={true}
          bookName={bookName}
          chapter={chapter}
        />
      )}

      {/* Practical Applications */}
      {practicalAppsMarkdown && (
        <ExpandableSection
          title="Practical Applications"
          initiallyExpanded={false}
          markdown={practicalAppsMarkdown}
          studyTier={null}
          sectionKey="onepager-practical-applications"
          enableAnnotations={true}
          bookName={bookName}
          chapter={chapter}
        />
      )}

      {!summary && !theologicalThemes && !keyVersesText && !practicalAppsMarkdown && (
        <Text style={styles.muted}>No summary content available for this chapter.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 8 },
  muted: { color: colors.text.muted, textAlign: 'center', marginTop: 20 },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  shareIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  shareText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

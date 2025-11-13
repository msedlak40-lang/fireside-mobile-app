import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import ExpandableSection from './ExpandableSection';
import { colors } from '../theme/colors';
import { generateOnePagerPDF } from '../services/pdfGenerator';

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

// Helper to reformat theological themes with inline bold headers
// Converts: "**Header1** text here. **Header2** more text."
// Into: "**Header1**: text here.\n\n**Header2**: more text."
function reformatTheologicalThemes(text: string): string {
  // Check if text has inline bold headers (bold text not followed by colon)
  const inlineHeaderPattern = /\*\*([^*]+?)\*\*\s+(?!:)([a-z])/;

  // If no inline headers found, return original text
  if (!inlineHeaderPattern.test(text)) {
    return text;
  }

  // Split by bold patterns to extract headers and content
  const parts: string[] = [];
  let currentIndex = 0;
  const headerRegex = /\*\*([^*]+?)\*\*/g;
  let match;

  const matches: Array<{ header: string; start: number; end: number }> = [];

  // Find all bold headers
  while ((match = headerRegex.exec(text)) !== null) {
    matches.push({
      header: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Build reformatted sections
  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];

      // Get content from end of current header to start of next header (or end of text)
      const contentStart = current.end;
      const contentEnd = next ? next.start : text.length;
      let content = text.substring(contentStart, contentEnd).trim();

      // Remove leading connecting words like "forms", "is", "emerges" etc.
      // if the content starts with a lowercase word
      content = content.replace(/^(forms?|is|are|emerges?|appears?|demonstrates?)\s+/i, '');

      // Capitalize first letter if needed
      if (content.length > 0 && content[0] === content[0].toLowerCase()) {
        content = content.charAt(0).toUpperCase() + content.slice(1);
      }

      // Format as "**Header**: content"
      parts.push(`**${current.header}**: ${content}`);
    }

    return parts.join('\n\n');
  }

  return text;
}

export default function OnePagerTab({
  summary,
  theologicalThemes,
  keyVersesText,
  practicalApplications,
  bookName,
  chapter,
}: Props) {
  // Reformat theological themes to break out inline headers
  const formattedTheologicalThemes = theologicalThemes
    ? reformatTheologicalThemes(theologicalThemes)
    : null;

  // Normalize practical applications to markdown string
  let practicalAppsMarkdown: string | null = null;
  if (typeof practicalApplications === 'string') {
    practicalAppsMarkdown = practicalApplications;
  }

  // Share One Pager as PDF
  const shareOnePager = async () => {
    try {
      await generateOnePagerPDF({
        bookName,
        chapter,
        summary,
        theologicalThemes: formattedTheologicalThemes,
        keyVersesText,
        practicalApplications: practicalAppsMarkdown,
      });
    } catch (error) {
      console.error('[OnePagerTab] PDF share failed', error);
      Alert.alert('Share Failed', 'Could not generate PDF. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Share button */}
      <TouchableOpacity
        onPress={shareOnePager}
        style={styles.shareButton}
      >
        <Text style={styles.shareIcon}>📄</Text>
        <Text style={styles.shareText}>Share as PDF</Text>
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
      {formattedTheologicalThemes && (
        <ExpandableSection
          title="Theological Themes"
          initiallyExpanded={false}
          markdown={formattedTheologicalThemes}
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

      {!summary && !formattedTheologicalThemes && !keyVersesText && !practicalAppsMarkdown && (
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

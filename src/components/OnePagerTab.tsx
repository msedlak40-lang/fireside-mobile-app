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

  // Split text by bold patterns while keeping the delimiters
  const sections: string[] = [];
  const headerRegex = /\*\*([^*]+?)\*\*/g;

  let lastIndex = 0;
  let match;

  while ((match = headerRegex.exec(text)) !== null) {
    const header = match[1];
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    // Get any text before this match (for the first match, this might be intro text)
    const beforeText = text.substring(lastIndex, matchStart).trim();

    // Get text after the bold header until the next bold pattern or end
    const afterStart = matchEnd;
    const nextMatch = text.substring(afterStart).search(/\*\*[^*]+?\*\*/);
    const afterEnd = nextMatch === -1 ? text.length : afterStart + nextMatch;
    let afterText = text.substring(afterStart, afterEnd).trim();

    // Remove leading connecting words
    afterText = afterText.replace(/^(forms?|is|are|was|were|emerges?|appears?|demonstrates?|emphasizes?|emphasized)\s+/i, '');

    // Capitalize first letter if needed
    if (afterText.length > 0 && afterText[0] === afterText[0].toLowerCase()) {
      afterText = afterText.charAt(0).toUpperCase() + afterText.slice(1);
    }

    // Only add non-empty content
    if (afterText) {
      sections.push(`**${header}**: ${afterText}`);
    }

    lastIndex = afterEnd;
  }

  return sections.length > 0 ? sections.join('\n\n') : text;
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

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

  return (
    <View style={styles.container}>
      {/* Summary */}
      {summary && (
        <ExpandableSection
          title="Summary"
          initiallyExpanded={true}
          markdown={summary}
          studyTier={null}
          sectionKey="onepager:summary"
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
          sectionKey="onepager:theological-themes"
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
          sectionKey="onepager:key-verses"
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
          sectionKey="onepager:practical-applications"
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
});

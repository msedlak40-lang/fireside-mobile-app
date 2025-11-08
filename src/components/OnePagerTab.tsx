import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ExpandableSection from './ExpandableSection';
import { colors } from '../theme/colors';

type Props = {
  summary: string | null; // from advanced summary_advanced
  theologicalThemes: string | null; // extracted from basic summary_content
  keyVerses: Array<{ verse_number: number; text: string; insight: string }>; // verses with context
  practicalApplications: string[] | string | null; // from advanced
  bookName: string | null;
  chapter: number;
};

export default function OnePagerTab({
  summary,
  theologicalThemes,
  keyVerses,
  practicalApplications,
  bookName,
  chapter,
}: Props) {
  // Normalize practical applications to markdown string
  let practicalAppsMarkdown: string | null = null;
  if (Array.isArray(practicalApplications)) {
    practicalAppsMarkdown = practicalApplications.map(app => `- ${app}`).join('\n');
  } else if (typeof practicalApplications === 'string') {
    practicalAppsMarkdown = practicalApplications;
  }

  // Convert key verses to markdown for annotation support
  const keyVersesMarkdown = keyVerses.length > 0
    ? keyVerses.map(kv => {
        let md = `**${bookName} ${chapter}:${kv.verse_number}**\n\n"${kv.text}"`;
        if (kv.insight) {
          md += `\n\n*Context:*\n${kv.insight}`;
        }
        return md;
      }).join('\n\n---\n\n')
    : null;

  return (
    <View style={styles.container}>
      {/* Summary */}
      {summary && (
        <ExpandableSection
          title="Summary"
          initiallyExpanded={true}
          markdown={summary}
          studyTier="onepager"
          sectionKey="summary"
        />
      )}

      {/* Theological Themes */}
      {theologicalThemes && (
        <ExpandableSection
          title="Theological Themes"
          initiallyExpanded={false}
          markdown={theologicalThemes}
          studyTier="onepager"
          sectionKey="theological-themes"
        />
      )}

      {/* Key Verses with Context */}
      {keyVersesMarkdown && (
        <ExpandableSection
          title="Key Verses with Context"
          initiallyExpanded={false}
          markdown={keyVersesMarkdown}
          studyTier="onepager"
          sectionKey="key-verses"
        />
      )}

      {/* Practical Applications */}
      {practicalAppsMarkdown && (
        <ExpandableSection
          title="Practical Applications"
          initiallyExpanded={false}
          markdown={practicalAppsMarkdown}
          studyTier="onepager"
          sectionKey="practical-applications"
        />
      )}

      {!summary && !theologicalThemes && !keyVersesMarkdown && !practicalAppsMarkdown && (
        <Text style={styles.muted}>No summary content available for this chapter.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 8 },
  muted: { color: colors.text.muted, textAlign: 'center', marginTop: 20 },
});

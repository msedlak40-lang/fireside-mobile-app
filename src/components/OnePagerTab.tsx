import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ExpandableSection from './ExpandableSection';
import MarkdownRenderer from './MarkdownRenderer';
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
  // Normalize practical applications to array
  const apps = Array.isArray(practicalApplications)
    ? practicalApplications
    : typeof practicalApplications === 'string'
    ? [practicalApplications]
    : [];

  return (
    <View style={styles.container}>
      {/* Summary */}
      {summary && (
        <ExpandableSection
          title="Summary"
          initiallyExpanded={true}
          markdown={summary}
        />
      )}

      {/* Theological Themes */}
      {theologicalThemes && (
        <ExpandableSection
          title="Theological Themes"
          initiallyExpanded={false}
          markdown={theologicalThemes}
        />
      )}

      {/* Key Verses with Context */}
      {keyVerses.length > 0 && (
        <ExpandableSection
          title="Key Verses with Context"
          initiallyExpanded={false}
        >
          <View style={{ gap: 12 }}>
            {keyVerses.map((kv, idx) => (
              <View key={idx} style={styles.keyVerseCard}>
                <Text style={styles.keyVerseRef}>
                  {bookName} {chapter}:{kv.verse_number}
                </Text>
                <Text style={styles.keyVerseText}>"{kv.text}"</Text>
                {kv.insight && (
                  <View style={styles.insightBox}>
                    <Text style={styles.insightLabel}>Context</Text>
                    <MarkdownRenderer content={kv.insight} />
                  </View>
                )}
              </View>
            ))}
          </View>
        </ExpandableSection>
      )}

      {/* Practical Applications */}
      {apps.length > 0 && (
        <ExpandableSection
          title="Practical Applications"
          initiallyExpanded={false}
        >
          <View style={{ gap: 8 }}>
            {apps.map((app, idx) => (
              <View key={idx} style={styles.applicationItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.applicationText}>{app}</Text>
              </View>
            ))}
          </View>
        </ExpandableSection>
      )}

      {!summary && !theologicalThemes && keyVerses.length === 0 && apps.length === 0 && (
        <Text style={styles.muted}>No summary content available for this chapter.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 8 },
  muted: { color: colors.text.muted, textAlign: 'center', marginTop: 20 },

  keyVerseCard: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
  },
  keyVerseRef: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent.primary,
    marginBottom: 4,
  },
  keyVerseText: {
    fontSize: 15,
    color: colors.text.primary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  insightBox: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent.tertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  applicationItem: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    fontSize: 16,
    color: colors.accent.primary,
    fontWeight: '700',
  },
  applicationText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 22,
  },
});

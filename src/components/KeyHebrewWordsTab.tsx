import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MarkdownRenderer from './MarkdownRenderer';
import { colors } from '../theme/colors';

type WordStudy = {
  term?: string;
  word?: string;
  gloss?: string;
  detail?: string; // markdown
  verses?: string[];
};

type Props = {
  wordStudies: WordStudy[] | null;
};

export default function KeyHebrewWordsTab({ wordStudies }: Props) {
  if (!wordStudies || wordStudies.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>No Hebrew word studies available for this chapter.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Key Hebrew Words</Text>
      <View style={{ gap: 14 }}>
        {wordStudies.map((word, idx) => {
          const term = word.term || word.word || 'Unknown';
          const gloss = word.gloss || '';
          const detail = word.detail || '';
          const verses = word.verses || [];

          return (
            <View key={idx} style={styles.wordCard}>
              <View style={styles.wordHeader}>
                <Text style={styles.wordTerm}>{term}</Text>
                {gloss && <Text style={styles.wordGloss}>{gloss}</Text>}
              </View>

              {detail && (
                <View style={styles.detailBox}>
                  <MarkdownRenderer content={detail} />
                </View>
              )}

              {verses.length > 0 && (
                <View style={styles.versesBox}>
                  <Text style={styles.versesLabel}>Appears in:</Text>
                  <Text style={styles.versesText}>{verses.join(', ')}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  header: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 16,
  },
  muted: {
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 20,
  },

  wordCard: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.tertiary,
  },
  wordHeader: {
    marginBottom: 10,
  },
  wordTerm: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.accent.tertiary,
    marginBottom: 2,
  },
  wordGloss: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  detailBox: {
    marginTop: 8,
  },
  versesBox: {
    marginTop: 10,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 10,
  },
  versesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  versesText: {
    fontSize: 13,
    color: colors.text.primary,
  },
});

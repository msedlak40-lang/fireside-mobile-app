import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

type Question = {
  question?: string;
  related_verses?: string[];
} | string;

type Props = {
  discussionQuestions: Question[] | null;
};

export default function DiscussionQuestionsTab({ discussionQuestions }: Props) {
  if (!discussionQuestions || discussionQuestions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>No discussion questions available for this chapter.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Discussion Questions</Text>
      <View style={{ gap: 16 }}>
        {discussionQuestions.map((q, idx) => {
          if (typeof q === 'string') {
            return (
              <View key={idx} style={styles.questionCard}>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberText}>{idx + 1}</Text>
                </View>
                <Text style={styles.questionText}>{q}</Text>
              </View>
            );
          }

          return (
            <View key={idx} style={styles.questionCard}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                {q.question && (
                  <Text style={styles.questionText}>{q.question}</Text>
                )}
                {q.related_verses && q.related_verses.length > 0 && (
                  <View style={styles.versesBox}>
                    <Text style={styles.versesLabel}>Related Verses:</Text>
                    <Text style={styles.versesText}>
                      {q.related_verses.join(', ')}
                    </Text>
                  </View>
                )}
              </View>
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

  questionCard: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  questionText: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
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
    color: colors.accent.tertiary,
    marginBottom: 4,
  },
  versesText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});

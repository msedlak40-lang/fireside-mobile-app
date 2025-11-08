import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MarkdownRenderer from './MarkdownRenderer';
import { colors } from '../theme/colors';

type Props = {
  markdownContent: string | null;
};

export default function CrossReferencesTab({ markdownContent }: Props) {
  if (!markdownContent) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>No cross-references available for this chapter.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Cross-References</Text>
      <View style={styles.content}>
        <MarkdownRenderer content={markdownContent} />
      </View>
    </ScrollView>
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
  content: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.secondary,
  },
  muted: {
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 20,
  },
});

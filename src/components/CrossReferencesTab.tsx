import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

type CrossRef = {
  from?: string;
  to?: string;
  note?: string;
} | string;

type Props = {
  crossReferences: CrossRef[] | null;
};

export default function CrossReferencesTab({ crossReferences }: Props) {
  if (!crossReferences || crossReferences.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>No cross-references available for this chapter.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Cross-References</Text>
      <View style={{ gap: 12 }}>
        {crossReferences.map((ref, idx) => {
          if (typeof ref === 'string') {
            return (
              <View key={idx} style={styles.refCard}>
                <Text style={styles.refText}>{ref}</Text>
              </View>
            );
          }

          return (
            <View key={idx} style={styles.refCard}>
              {ref.from && (
                <Text style={styles.refFrom}>From: {ref.from}</Text>
              )}
              {ref.to && (
                <Text style={styles.refTo}>→ {ref.to}</Text>
              )}
              {ref.note && (
                <Text style={styles.refNote}>{ref.note}</Text>
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

  refCard: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.secondary,
  },
  refFrom: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent.secondary,
    marginBottom: 4,
  },
  refTo: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: ref => ref ? 6 : 0,
  },
  refText: {
    fontSize: 15,
    color: colors.text.primary,
  },
  refNote: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 6,
    lineHeight: 20,
  },
});

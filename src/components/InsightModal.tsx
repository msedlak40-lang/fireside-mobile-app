// src/components/InsightModal.tsx
import React from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, ScrollView } from 'react-native'
import { colors } from '../theme/colors'

type Props = {
  visible: boolean
  onClose: () => void
  title?: string
  content?: string
  detailedExplanation?: string
}

export default function InsightModal({ visible, onClose, title, content, detailedExplanation }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.card}>
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={styles.title}>{title || 'Insight'}</Text>

                {content ? (
                  <Text style={styles.body}>{content}</Text>
                ) : null}

                {detailedExplanation ? (
                  <View style={styles.detailedSection}>
                    <Text style={styles.detailedLabel}>DETAILED EXPLANATION</Text>
                    <Text style={styles.detailedText}>{detailedExplanation}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <TouchableOpacity style={styles.btn} onPress={onClose}>
                <Text style={styles.btnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '90%',
    backgroundColor: colors.background.elevated,
    borderRadius: 14,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    color: colors.text.primary,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    color: colors.text.primary,
  },
  detailedSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
  },
  detailedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    marginBottom: 6,
  },
  detailedText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  btn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
})

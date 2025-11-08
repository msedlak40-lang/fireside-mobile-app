// src/components/InsightModal.tsx — WITH DETAILED EXPLANATION
import React from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'

type Props = {
  visible: boolean
  onClose: () => void
  title?: string
  content?: string
  detailedExplanation?: string
}

export default function InsightModal({ visible, onClose, title, content, detailedExplanation }: Props) {
  console.log('[InsightModal] Rendering with:', { 
    title, 
    hasContent: !!content, 
    hasDetailed: !!detailedExplanation,
    detailedLength: detailedExplanation?.length 
  })
  
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
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
            ) : (
              <Text style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                (No detailed explanation available)
              </Text>
            )}
          </ScrollView>
          
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    alignItems: 'center', 
    justifyContent: 'flex-end' 
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  title: { 
    fontSize: 18, 
    fontWeight: '800', 
    marginBottom: 12,
    color: '#111827'
  },
  body: { 
    lineHeight: 22, 
    marginBottom: 12,
    color: '#111827'
  },
  detailedSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  detailedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 6,
  },
  detailedText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  btn: { 
    height: 44, 
    borderRadius: 10, 
    backgroundColor: '#111827', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 12,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700'
  }
})
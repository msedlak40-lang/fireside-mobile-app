// src/components/Bible/CommentaryModal.tsx
import React, { useState, useEffect } from 'react'
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Pressable,
} from 'react-native'
import { supabase } from '../../lib/supabaseClient'
import { colors } from '../../theme/colors'

type Props = {
  visible: boolean
  onClose: () => void
  bookName: string | null
  chapter: number
  verseNumber: number
  verseText: string
}

export default function CommentaryModal({
  visible, onClose, bookName, chapter, verseNumber, verseText,
}: Props) {
  const [commentary, setCommentary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible && bookName && chapter && verseNumber) {
      fetchCommentary()
    }
    if (!visible) {
      setCommentary(null)
      setError(null)
    }
  }, [visible, bookName, chapter, verseNumber])

  async function fetchCommentary() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('matthew_henry_commentary')
        .select('commentary_text')
        .eq('book_name', bookName!)
        .eq('chapter_number', chapter)
        .eq('verse_number', verseNumber)
        .maybeSingle()

      if (fetchErr) throw fetchErr

      if (data?.commentary_text) {
        setCommentary(formatCommentary(data.commentary_text))
      } else {
        setError('No commentary available for this verse.')
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      if (msg.includes('Network request failed')) {
        setError('Network error. Check your connection and try again.')
      } else {
        setError('Failed to load commentary.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />

        <View style={styles.card}>
          {/* Fixed header */}
          <View style={styles.header}>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>
            <Text style={styles.headerTitle}>Commentary</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.headerCloseText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator color={colors.accent.primary} size="large" />
              <Text style={styles.loadingText}>Loading commentary...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerWrap}>
              <Text style={styles.emptyIcon}>{'\uD83D\uDCDA'}</Text>
              <Text style={styles.emptyTitle}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchCommentary}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {/* Verse header */}
                <View style={styles.verseHeader}>
                  <Text style={styles.verseRef}>
                    {bookName} {chapter}:{verseNumber}
                  </Text>
                  <Text style={styles.verseQuote}>{verseText}</Text>
                </View>

                {/* Attribution */}
                <Text style={styles.attribution}>Matthew Henry's Complete Commentary</Text>

                {/* Commentary text */}
                {commentary && (
                  <Text style={styles.commentaryBody}>{commentary}</Text>
                )}

                <View style={{ height: 20 }} />
              </ScrollView>

              {/* Fixed footer */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

/**
 * Format raw commentary text into readable paragraphs.
 * Splits on Roman numeral sections (I., II.), numbered points (1., 2.),
 * and parenthetical markers ((1), (2)) to create paragraph breaks.
 */
function formatCommentary(text: string): string {
  return text
    // Paragraph break before Roman numeral sections: I., II., III., IV., V., VI.
    .replace(/\s+((?:I{1,3}|IV|VI{0,3}|IX|X{1,3})\.\s)/g, '\n\n$1')
    // Paragraph break before numbered points at start of thought: "1. ", "2. "
    .replace(/\s+(\d+\.\s+[A-Z])/g, '\n\n$1')
    // Clean up excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  handleWrap: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerCloseBtn: {
    padding: 8,
  },
  headerCloseText: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '300',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },

  // Center states
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: 12,
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  retryBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  retryBtnText: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 14,
  },

  // Verse header
  verseHeader: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    marginBottom: 16,
  },
  verseRef: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent.primary,
    marginBottom: 10,
  },
  verseQuote: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  // Attribution
  attribution: {
    fontSize: 12,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginBottom: 16,
  },

  // Commentary body
  commentaryBody: {
    fontSize: 15,
    lineHeight: 26,
    color: colors.text.primary,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  closeBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 14,
  },
})

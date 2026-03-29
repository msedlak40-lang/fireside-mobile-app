// src/components/Bible/WordStudyModal.tsx
import React, { useEffect, useState } from 'react'
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Pressable,
} from 'react-native'
import { supabase } from '../../lib/supabaseClient'
import { addToReviewQueue } from '../../services/verseReviewQueue'
import { colors } from '../../theme/colors'

type WordStudyData = {
  strongs: {
    original_word: string
    transliteration: string
    short_definition: string
    detailed_definition?: string | null
    language?: string
  } | null
  study: {
    entry_text: string
    word_count: number
  } | null
  examples: Array<{ book_name: string; chapter_number: number; verse_number: number }>
  totalUses: number
  matthewHenry: { commentary_text: string; book_name: string; chapter_number: number; verse_number: number } | null
}

type Props = {
  visible: boolean
  onClose: () => void
  strongsNumber: string | null
  englishWord?: string
  bookName?: string
  chapter?: number
  verseNumber?: number
  verseText?: string
}

export default function WordStudyModal({
  visible, onClose, strongsNumber, englishWord,
  bookName, chapter, verseNumber, verseText,
}: Props) {
  const [data, setData] = useState<WordStudyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible && strongsNumber) {
      fetchData(strongsNumber)
    }
    if (!visible) {
      setData(null)
      setError(null)
    }
  }, [visible, strongsNumber])

  async function fetchData(sn: string, retryCount = 0) {
    setLoading(true)
    setError(null)
    try {
      // Fetch each query individually for better error isolation
      const strongsRes = await supabase.from('strongs_lexicon')
        .select('original_word, transliteration, short_definition, detailed_definition, language')
        .eq('strongs_number', sn).maybeSingle()
      if (strongsRes.error) throw strongsRes.error

      const studyRes = await supabase.from('theological_word_studies')
        .select('entry_text, word_count')
        .eq('strongs_number', sn).maybeSingle()
      if (studyRes.error) throw studyRes.error

      const examplesRes = await supabase.from('verse_strongs_words')
        .select('book_name, chapter_number, verse_number')
        .eq('strongs_number', sn).limit(5)
      if (examplesRes.error) throw examplesRes.error

      const countRes = await supabase.from('verse_strongs_words')
        .select('*', { count: 'exact', head: true })
        .eq('strongs_number', sn)
      if (countRes.error) throw countRes.error

      // Fetch Matthew Henry commentary for the verse the user is reading
      let mhData: { commentary_text: string; book_name: string; chapter_number: number; verse_number: number } | null = null
      if (bookName && chapter && verseNumber) {
        const mhRes = await supabase.from('matthew_henry_commentary')
          .select('commentary_text, book_name, chapter_number, verse_number')
          .eq('book_name', bookName)
          .eq('chapter_number', chapter)
          .eq('verse_number', verseNumber)
          .maybeSingle()
        if (!mhRes.error && mhRes.data) mhData = mhRes.data
      }

      setData({
        strongs: strongsRes.data ?? null,
        study: studyRes.data ?? null,
        examples: examplesRes.data ?? [],
        totalUses: countRes.count ?? 0,
        matthewHenry: mhData,
      })
    } catch (e: any) {
      const msg = e?.message || String(e)
      console.warn('[WordStudyModal] fetch error:', msg)

      // Retry on network errors (up to 2 retries)
      if (msg.includes('Network request failed') && retryCount < 2) {
        console.log(`[WordStudyModal] Retrying (${retryCount + 1}/2)...`)
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)))
        return fetchData(sn, retryCount + 1)
      }

      if (msg.includes('Network request failed')) {
        setError('Network error. Check your connection and try again.')
      } else {
        setError('Failed to load word study. Tap to retry.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAddToQueue() {
    if (!bookName || !chapter || !verseNumber) return
    try {
      const added = await addToReviewQueue(bookName, chapter, verseNumber, verseText || '')
      if (added) {
        Alert.alert('Added!', `${bookName} ${chapter}:${verseNumber} added to Review Queue`)
      } else {
        Alert.alert('Already Queued', 'This verse is already in your Review Queue')
      }
    } catch {
      Alert.alert('Error', 'Could not add verse to queue')
    }
  }

  const langLabel = strongsNumber?.startsWith('H') ? 'Hebrew' : 'Greek'
  const studyText = data?.study?.entry_text ?? ''

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Tap outside (top area) to close */}
        <Pressable style={styles.backdropTap} onPress={onClose} />

        {/* Modal container — fixed height, column layout */}
        <View style={styles.card}>
          {/* Fixed header */}
          <View style={styles.header}>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>
            <Text style={styles.headerTitle}>Word Study</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.headerCloseText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          {/* Content area */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accent.primary} size="large" />
              <Text style={styles.loadingText}>Loading word study...</Text>
            </View>
          ) : error ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.errorIcon}>{'\u26A0\uFE0F'}</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => strongsNumber && fetchData(strongsNumber)}
              >
                <Text style={styles.actionBtnText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.closeOnlyBtn, { marginTop: 8 }]} onPress={onClose}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : !data?.strongs ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>No data found for {strongsNumber}</Text>
              <TouchableOpacity style={styles.closeOnlyBtn} onPress={onClose}>
                <Text style={styles.actionBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Scrollable content — flex:1 fills space between header and actions */}
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {/* Original word */}
                <View style={styles.wordHeader}>
                  {englishWord ? (
                    <Text style={styles.englishWord}>{'\u201C'}{englishWord}{'\u201D'}</Text>
                  ) : null}
                  <Text style={styles.originalWord}>{data.strongs.original_word}</Text>
                  {data.strongs.transliteration ? (
                    <Text style={styles.transliteration}>({data.strongs.transliteration})</Text>
                  ) : null}
                  <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{strongsNumber}</Text>
                    </View>
                    <View style={[styles.badge, styles.badgeLang]}>
                      <Text style={styles.badgeText}>{langLabel}</Text>
                    </View>
                  </View>
                </View>

                {/* Definition */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>DEFINITION</Text>
                  <Text style={styles.sectionBody}>{data.strongs.short_definition}</Text>
                </View>

                {/* Theological Word Study */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>THEOLOGICAL INSIGHT</Text>
                  {studyText ? (
                    <Text style={styles.studyBody}>{studyText}</Text>
                  ) : (
                    <Text style={styles.muted}>Detailed word study not available</Text>
                  )}
                </View>

                {/* Usage Examples */}
                {data.examples.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>
                      USED IN {data.totalUses} VERSES
                    </Text>
                    {data.examples.map((ex, i) => (
                      <Text key={i} style={styles.exampleVerse}>
                        {'\u2022'} {ex.book_name} {ex.chapter_number}:{ex.verse_number}
                      </Text>
                    ))}
                    {data.totalUses > 5 && (
                      <Text style={styles.seeAllText}>
                        See all {data.totalUses} uses in Deep Study
                      </Text>
                    )}
                  </View>
                )}

                {/* Matthew Henry Commentary */}
                {data.matthewHenry && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>MATTHEW HENRY COMMENTARY</Text>
                    <Text style={styles.commentarySource}>
                      On {data.matthewHenry.book_name} {data.matthewHenry.chapter_number}:{data.matthewHenry.verse_number}
                    </Text>
                    <Text style={styles.studyBody}>{data.matthewHenry.commentary_text}</Text>
                  </View>
                )}

                {/* Bottom padding so content isn't hidden behind actions */}
                <View style={{ height: 20 }} />
              </ScrollView>

              {/* Fixed bottom actions */}
              <View style={styles.actions}>
                {bookName && chapter && verseNumber ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.queueBtn]}
                    onPress={handleAddToQueue}
                  >
                    <Text style={styles.actionBtnText}>Add to Review Queue</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.actionBtn} onPress={onClose}>
                  <Text style={styles.actionBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
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

  // Fixed header
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

  // Scrollable content
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },

  loadingWrap: {
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

  // Word header
  wordHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  englishWord: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5b9bd5',
    marginBottom: 6,
  },
  originalWord: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  transliteration: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  badgeLang: {
    backgroundColor: colors.accent.primary + '30',
    borderColor: colors.accent.primary,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
  },

  // Sections
  section: {
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent.tertiary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
  },
  studyBody: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 23,
  },
  muted: {
    fontSize: 14,
    color: colors.text.muted,
    fontStyle: 'italic',
  },

  // Commentary
  commentarySource: {
    fontSize: 12,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginBottom: 8,
  },

  // Examples
  exampleVerse: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
    paddingLeft: 4,
  },
  seeAllText: {
    color: colors.accent.primary,
    fontWeight: '600',
    fontSize: 13,
    marginTop: 8,
  },

  // Fixed bottom actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBtn: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  actionBtnText: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  closeOnlyBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  closeBtnText: {
    color: colors.text.secondary,
    fontWeight: '700',
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
})

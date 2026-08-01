// src/components/VerseSummaryCard.tsx
// Verse tap surface: summary content + cross-references + one Deeper affordance + one actions entry point.
import React, { useEffect, useState } from 'react'
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Pressable, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { colors } from '../theme/colors'
import { supabase } from '../lib/supabaseClient'
import { saveBattleVerse } from '../services/battleVerses'
import { cleanVerseText } from '../utils/verseText'
import { CHROME_MAX_SCALE } from '../lib/textScaling'
import SelectableProse from './SelectableProse'
import { useSentenceSelection } from '../hooks/useSentenceSelection'
import type { VerseLifeApplication } from '../services/scripture'

export type HighlightColor = 'yellow' | 'green' | 'pink' | 'blue'
export type CrossRefItem = {
  id: number
  label: string
  book: string
  chapter: number
  verseStart: number
  verseEnd: number | null
}

type Props = {
  visible: boolean
  onClose: () => void
  reference: string
  loading: boolean
  content: VerseLifeApplication | null
  crossRefs?: CrossRefItem[]
  /** Navigate to a cross-reference's full chapter (host owns navigation). */
  onViewCrossRefChapter?: (item: CrossRefItem) => void
  onDeeper: () => void
  /** Deliberate primary-region "Save to Battle Verses" (distinct from the generic onBattleVerse action).
   *  Controlled: the host owns the state so it can be shared with another control (e.g. a corner button). */
  onSaveBattleVerse?: () => void
  battleState?: 'idle' | 'saving' | 'saved'
  // Actions are optional so hosts supply only what fits their context.
  onNote?: () => void
  onBattleVerse?: () => void
  onShareToFire?: () => void
  onHighlight?: (color: HighlightColor) => void
  isHighlighted?: boolean
  onRemoveHighlight?: () => void
  extraActions?: Array<{ icon?: string; label: string; onPress: () => void }>
}

export default function VerseSummaryCard(props: Props) {
  const {
    visible, onClose, reference, loading, content, crossRefs, onViewCrossRefChapter, onDeeper,
    onSaveBattleVerse, battleState = 'idle', onNote, onBattleVerse, onShareToFire, onHighlight, isHighlighted, onRemoveHighlight, extraActions,
  } = props
  const [actionsOpen, setActionsOpen] = useState(false)
  const hasActions = !!(onNote || onBattleVerse || onShareToFire || onHighlight || (extraActions && extraActions.length > 0))

  // Transient per-sentence tap selection, shared across both prose blocks so
  // single-select spans plain_truth + deeper_layer. Cleared when the card closes.
  const sentenceSel = useSentenceSelection()

  // Cross-reference detail view (in-sheet, no nested modal)
  const [crossRefDetail, setCrossRefDetail] = useState<CrossRefItem | null>(null)
  const [crossRefText, setCrossRefText] = useState<string | null>(null)
  const [crossRefLoading, setCrossRefLoading] = useState(false)

  // Reset transient state whenever the sheet closes.
  // (Battle-save state is host-owned so it can be shared with the corner control — not reset here.)
  useEffect(() => {
    if (!visible) {
      setActionsOpen(false)
      setCrossRefDetail(null)
      setCrossRefText(null)
      sentenceSel.clear()
    }
  }, [visible])

  function handleClose() {
    setActionsOpen(false)
    setCrossRefDetail(null)
    setCrossRefText(null)
    sentenceSel.clear()
    onClose()
  }

  async function openCrossRef(item: CrossRefItem) {
    setCrossRefDetail(item)
    setCrossRefText(null)
    setCrossRefLoading(true)
    try {
      const end = item.verseEnd ?? item.verseStart
      const { data, error } = await supabase
        .from('bible_verses')
        .select('verse_number, verse_text')
        .eq('book_name', item.book)
        .eq('chapter_number', item.chapter)
        .eq('translation', 'KJV')
        .gte('verse_number', item.verseStart)
        .lte('verse_number', end)
        .order('verse_number')
      if (!error && data && data.length > 0) {
        setCrossRefText(data.map((v: any) => `${v.verse_number} ${cleanVerseText(v.verse_text)}`).join(' '))
      } else {
        setCrossRefText('Verse text not available.')
      }
    } catch {
      setCrossRefText('Could not load verse text.')
    } finally {
      setCrossRefLoading(false)
    }
  }

  async function addCrossRefToBattle() {
    if (!crossRefDetail || !crossRefText || crossRefText.startsWith('Verse') || crossRefText.startsWith('Could')) {
      Alert.alert('Error', 'Cannot add — verse text not loaded.')
      return
    }
    try {
      const saved = await saveBattleVerse(crossRefDetail.book, crossRefDetail.chapter, crossRefDetail.verseStart, crossRefText)
      Alert.alert(saved ? 'Saved' : 'Already Saved',
        saved ? 'Verse added to your Battle Verses.' : 'This verse is already in your Battle Verses.')
    } catch {
      Alert.alert('Error', 'Could not save verse.')
    }
  }

  function viewCrossRefChapter() {
    if (!crossRefDetail) return
    const item = crossRefDetail
    setCrossRefDetail(null)
    onViewCrossRefChapter?.(item)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {crossRefDetail ? (
            /* ===== Cross-reference detail ===== */
            <>
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setCrossRefDetail(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.backText}>{'‹'} Back</Text>
                </TouchableOpacity>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.detailTitle}>{crossRefDetail.label}</Text>
                <View style={{ width: 50 }} />
              </View>

              <ScrollView style={styles.scroll}>
                {crossRefLoading ? (
                  <ActivityIndicator color={colors.accent.primary} style={{ marginVertical: 24 }} />
                ) : (
                  <Text style={styles.crossRefVerse}>"{crossRefText}"</Text>
                )}
              </ScrollView>

              <TouchableOpacity style={styles.deeperBtn} onPress={addCrossRefToBattle}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.deeperText}>Add to Battle Verses</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={viewCrossRefChapter}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.secondaryText}>View Full Chapter</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ===== Summary ===== */
            <>
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.title}>{reference}</Text>

              <ScrollView style={styles.scroll}>
                {loading ? (
                  <ActivityIndicator color={colors.accent.primary} style={{ marginVertical: 24 }} />
                ) : content ? (
                  <>
                    {!!content.plain_truth && (
                      <SelectableProse
                        text={content.plain_truth}
                        blockId="plain"
                        selection={sentenceSel}
                        style={styles.body}
                        selectable
                      />
                    )}
                    {!!content.deeper_layer && (
                      <SelectableProse
                        text={content.deeper_layer}
                        blockId="deeper"
                        selection={sentenceSel}
                        style={styles.body}
                        selectable
                      />
                    )}
                    {!!content.reflection_question && (
                      <View style={styles.reflectBox}>
                        <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.reflectLabel}>REFLECT</Text>
                        <Text style={styles.reflectText}>{content.reflection_question}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.muted}>No summary available for this verse yet.</Text>
                )}

                {crossRefs && crossRefs.length > 0 && (
                  <View style={styles.crossRefsSection}>
                    <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.crossRefsLabel}>CROSS-REFERENCES</Text>
                    {crossRefs.map((cr) => (
                      <TouchableOpacity key={cr.id} style={styles.crossRefRow} onPress={() => openCrossRef(cr)}>
                        <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.crossRefRowText}>{cr.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Deeper affordance */}
              <TouchableOpacity style={styles.deeperBtn} onPress={onDeeper}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.deeperText}>Study the Words {'→'}</Text>
              </TouchableOpacity>

              {/* Deliberate primary-region Battle Verse save — controlled by the host (shared with the corner control) */}
              {onSaveBattleVerse && (
                <TouchableOpacity
                  style={[styles.secondaryBtn, battleState !== 'idle' && styles.savedBtn]}
                  onPress={onSaveBattleVerse}
                  disabled={battleState !== 'idle'}
                >
                  <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={battleState !== 'idle' ? styles.savedText : styles.secondaryText}>
                    {battleState === 'saving' ? 'Saving…'
                      : battleState === 'saved' ? '✓ Saved to Battle Verses'
                      : '⚔️ Save to Battle Verses'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Single actions entry point */}
              {hasActions && (
                <>
                  <TouchableOpacity style={styles.actionsToggle} onPress={() => setActionsOpen(o => !o)}>
                    <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.actionsToggleText}>
                      {actionsOpen ? 'Hide actions' : 'More actions'} {actionsOpen ? '▴' : '▾'}
                    </Text>
                  </TouchableOpacity>

                  {actionsOpen && (
                    <View style={styles.actionsDrawer}>
                      {onNote && (
                        <TouchableOpacity style={styles.actionItem} onPress={onNote}>
                          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.actionIcon}>{'📝'}</Text>
                          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.actionText}>Add Note</Text>
                        </TouchableOpacity>
                      )}
                      {onBattleVerse && (
                        <TouchableOpacity style={styles.actionItem} onPress={onBattleVerse}>
                          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.actionIcon}>{'⚔️'}</Text>
                          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.actionText}>Battle Verse</Text>
                        </TouchableOpacity>
                      )}
                      {onShareToFire && (
                        <TouchableOpacity style={styles.actionItem} onPress={onShareToFire}>
                          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.actionIcon}>{'🔥'}</Text>
                          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.actionText}>Share to Fire</Text>
                        </TouchableOpacity>
                      )}
                      {(extraActions ?? []).map((a) => (
                        <TouchableOpacity key={a.label} style={styles.actionItem} onPress={a.onPress}>
                          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.actionIcon}>{a.icon ?? '•'}</Text>
                          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.actionText}>{a.label}</Text>
                        </TouchableOpacity>
                      ))}
                      {onHighlight && (
                        <View style={styles.highlightRow}>
                          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.highlightLabel}>Highlight:</Text>
                          {(['yellow', 'green', 'pink', 'blue'] as const).map((c) => (
                            <TouchableOpacity
                              key={c}
                              style={[styles.highlightDot, { backgroundColor: colors.highlight[c] }]}
                              onPress={() => onHighlight(c)}
                            />
                          ))}
                          {isHighlighted && (
                            <TouchableOpacity style={styles.removeBtn} onPress={onRemoveHighlight}>
                              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.removeText}>Remove</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 30,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border.light,
    alignSelf: 'center', marginTop: 10, marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text.primary, textAlign: 'center', marginBottom: 12 },
  scroll: { flexShrink: 1 },
  body: { fontSize: 15, lineHeight: 23, color: colors.text.primary, marginBottom: 12 },

  crossRefsSection: { marginTop: 4, marginBottom: 8 },
  crossRefsLabel: { fontSize: 12, fontWeight: '700', color: colors.text.muted, marginBottom: 8, letterSpacing: 0.5 },
  crossRefRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border.default },
  crossRefRowText: { fontSize: 15, fontWeight: '600', color: colors.accent.tertiary },

  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  detailTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.text.primary, textAlign: 'center' },
  backText: { color: colors.accent.primary, fontWeight: '700', fontSize: 15, width: 50 },
  crossRefVerse: { fontSize: 16, lineHeight: 24, color: colors.text.primary, fontStyle: 'italic' },

  reflectBox: { marginTop: 4, marginBottom: 12, padding: 12, backgroundColor: colors.background.tertiary, borderRadius: 8 },
  reflectLabel: { fontSize: 12, fontWeight: '700', color: colors.text.muted, marginBottom: 6 },
  reflectText: { fontSize: 14, lineHeight: 20, color: colors.text.secondary, fontStyle: 'italic' },
  muted: { color: colors.text.muted, textAlign: 'center', marginVertical: 24 },

  deeperBtn: {
    minHeight: 46, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.accent.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  deeperText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    minHeight: 46, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.accent.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  secondaryText: { color: colors.accent.primary, fontWeight: '700', fontSize: 15 },
  savedBtn: { borderColor: colors.success, backgroundColor: 'rgba(39, 174, 96, 0.12)' },
  savedText: { color: colors.success, fontWeight: '700', fontSize: 15 },

  actionsToggle: { alignItems: 'center', paddingVertical: 12 },
  actionsToggleText: { color: colors.text.secondary, fontWeight: '600', fontSize: 14 },

  actionsDrawer: { gap: 8 },
  actionItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: colors.background.tertiary, borderRadius: 12,
  },
  actionIcon: { fontSize: 20, marginRight: 12, width: 28, textAlign: 'center' },
  actionText: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  highlightRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  highlightLabel: { color: colors.text.muted, fontSize: 13, marginRight: 10 },
  highlightDot: { width: 30, height: 30, borderRadius: 15, marginRight: 10, borderWidth: 2, borderColor: colors.border.light },
  removeBtn: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.error + '30' },
  removeText: { color: colors.error, fontWeight: '600', fontSize: 13 },

  closeBtn: {
    minHeight: 44, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.background.secondary,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  closeText: { color: colors.text.secondary, fontWeight: '700' },
})

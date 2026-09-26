// src/components/BattleTagPicker.tsx
//
// The one place the battle-tag choice is presented.
//
// WHY IT EXISTS. This interaction was a local modal inside ChapterText, which is why the
// chapter reader was the ONLY one of five save paths that asked for a category. The other four
// -- VOTD, cross-reference, search single, search batch -- saved with battle_tag null, and a
// null tag is unreachable from the dashboard's tag filter row, so those verses could only ever
// be found under "All". Lifting the picker out means a new save path is a new caller rather
// than a sixth copy of this modal.
//
// THE TAG IS SKIPPABLE. "Skip / just save" returns null, NOT 'general'. 'general' is one of the
// eight real tags and means something a reader chose; null means they declined to choose. Those
// are different facts and collapsing them would make the planned "Untagged" filter chip
// meaningless. Callers pass the value straight to saveBattleVerse, which already takes
// `battleTag?: string` and writes `battle_tag: battleTag || null`.
import React from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { BATTLE_TAGS } from '../services/battleVerses'
import { colors } from '../theme/colors'
import { CHROME_MAX_SCALE } from '../lib/textScaling'

type Props = {
  visible: boolean
  /** Shown in the subtitle, e.g. "Romans 8:28". Omit for a batch save. */
  reference?: string | null
  /** Overrides the subtitle entirely — for a batch, e.g. "12 verses selected". */
  subtitle?: string | null
  /** tag = one of BATTLE_TAGS, or null when the reader skips. */
  onSelect: (tag: string | null) => void
  onCancel: () => void
  /** Disables every control and shows a spinner while the caller's save is in flight. */
  busy?: boolean
}

export default function BattleTagPicker({
  visible, reference, subtitle, onSelect, onCancel, busy = false,
}: Props) {
  // A save in flight must not be interrupted by the Android back button or a backdrop dismiss,
  // or the caller's state machine can be left mid-save with the modal gone.
  const requestClose = () => { if (!busy) onCancel() }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.title}>Save to Battle Verses</Text>
          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.subtitle}>
            {subtitle ?? (reference ? `${reference} — choose a battle tag, or just save:` : 'Choose a battle tag, or just save:')}
          </Text>

          <View style={styles.chips}>
            {BATTLE_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.chip, busy && styles.disabled]}
                disabled={busy}
                onPress={() => onSelect(tag)}
              >
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.chipText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Skip is a first-class action, not a cancel. It saves -- with no tag -- so the fast
              one-tap paths stay fast: open, tap Just save, done. */}
          <TouchableOpacity
            style={[styles.skip, busy && styles.disabled]}
            disabled={busy}
            onPress={() => onSelect(null)}
          >
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.skipText}>
              Just save (no tag)
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            {busy ? <ActivityIndicator /> : (
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onCancel}>
                <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', backgroundColor: colors.background.elevated, borderRadius: 12, padding: 14 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: colors.text.primary },
  subtitle: { color: colors.text.secondary, fontSize: 14, marginBottom: 12 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.background.tertiary, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border.default,
  },
  chipText: { color: colors.text.primary, fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },

  skip: {
    marginTop: 12, paddingVertical: 11, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: colors.accent.primary,
  },
  skipText: { color: colors.accent.primary, fontWeight: '700', fontSize: 14 },

  footer: { minHeight: 44, marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  btn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnGhost: { backgroundColor: colors.background.tertiary },
  btnGhostText: { color: colors.text.secondary, fontWeight: '700' },

  disabled: { opacity: 0.5 },
})

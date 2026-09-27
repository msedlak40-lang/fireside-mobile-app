// src/components/DeepDiveTab.tsx — chapter Deep Dive tab (short_summary / deep_dive by depth)
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native'
import MarkdownRenderer from './MarkdownRenderer'
import SelectableMarkdown from './SelectableMarkdown'
import { colors } from '../theme/colors'
import type { ChapterDeepDive } from '../services/scripture'
import type { StudyDepth } from '../services/userPrefs'

type Props = {
  deepDive: ChapterDeepDive | null
  depth: StudyDepth
  onChangeDepth: (depth: StudyDepth) => void
  bookName: string | null
  chapter: number
}

/** One-line revert for the selection trial: false restores the old <Text selectable> rendering. */
const NATIVE_SELECTION = true

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim()
}

export default function DeepDiveTab({ deepDive, depth, onChangeDepth, bookName, chapter }: Props) {
  const isSummary = depth === 'summary'
  const body = deepDive ? (isSummary ? deepDive.short_summary : deepDive.deep_dive) : null

  const shareDeepDive = async () => {
    if (!body) return
    try {
      await Share.share({
        message: `${bookName} ${chapter}\n${isSummary ? 'SUMMARY' : 'DEEP DIVE'}\n\n${stripMarkdown(body)}`.trim(),
      })
    } catch (error) {
      console.error('[DeepDiveTab] Share failed', error)
    }
  }

  return (
    <View style={styles.container}>
      {/* Depth toggle — writes the global sticky preference */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, isSummary && styles.toggleBtnActive]}
          onPress={() => onChangeDepth('summary')}
        >
          <Text style={[styles.toggleText, isSummary && styles.toggleTextActive]}>Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, !isSummary && styles.toggleBtnActive]}
          onPress={() => onChangeDepth('deeper')}
        >
          <Text style={[styles.toggleText, !isSummary && styles.toggleTextActive]}>Deeper</Text>
        </TouchableOpacity>
      </View>

      {body ? (
        <>
          <TouchableOpacity onPress={shareDeepDive} style={styles.shareButton}>
            <Text style={styles.shareIcon}>📤</Text>
            <Text style={styles.shareText}>Share {isSummary ? 'Summary' : 'Deep Dive'}</Text>
          </TouchableOpacity>

          {/* TRIAL: real Apple selection (drag handles, arbitrary range) needs a UITextView, which
              only a multiline TextInput gives us -- <Text selectable> can only ever copy a whole
              Text block. Set NATIVE_SELECTION to false to fall straight back to MarkdownRenderer.
              Deep dives are the right surface to trial on: no competing touch handlers, and the
              content uses no headings, lists, quotes, links or code at all (verified across all
              1,189 chapters), so MarkdownRenderer's block machinery isn't doing anything here. */}
          {NATIVE_SELECTION ? (
            <SelectableMarkdown content={body} paragraphSpacing={isSummary ? 0 : 12} />
          ) : (
            <MarkdownRenderer content={body} selectable paragraphSpacing={isSummary ? 0 : 12} />
          )}
        </>
      ) : (
        <Text style={styles.muted}>No deep dive available for this chapter yet.</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 8 },
  muted: { color: colors.text.muted, textAlign: 'center', marginTop: 20 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    backgroundColor: colors.background.tertiary, alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.accent.primary },
  toggleText: { fontWeight: '700', fontSize: 14, color: colors.text.secondary },
  toggleTextActive: { color: colors.text.primary },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, backgroundColor: colors.background.secondary, borderRadius: 8,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border.default,
  },
  shareIcon: { fontSize: 16, marginRight: 8 },
  shareText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
})

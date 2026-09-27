// src/components/SelectableMarkdown.tsx
//
// Prose rendered so iOS gives you APPLE'S REAL SELECTION: long-press, drag the handles to any
// range, then Copy / Look Up / Share from the system menu.
//
// WHY A TextInput AND NOT <Text selectable>. RN's `selectable` on iOS does not implement text
// selection at all. RCTTextView.mm (legacy) and RCTParagraphComponentView.mm (Fabric) both add a
// UILongPressGestureRecognizer whose handler ONLY presents the edit menu, and their copy: does:
//
//     [attributedText dataFromRange:NSMakeRange(0, attributedText.length) ...]
//
// -- the whole text, hardcoded. There is no selected range because nothing ever selects one. So
// <Text selectable> means "copy this entire Text", never "select part of it". A multiline
// TextInput is backed by a real UITextView, which is where the handles come from. This is the
// same mechanism the devotion highlight modal already relies on.
//
// INLINE EMPHASIS IS FLATTENED, DELIBERATELY. A TextInput's `value` is a plain string, so italic
// and bold inside a body are dropped to plain text. RN does accept styled <Text> CHILDREN instead
// of `value` (TextInput.js:718-726), which would preserve them, but that path was dropped on
// purpose: it is the fragile, less-travelled one, and drag-select consistency was judged worth
// more than the italics on transliterated Strong's terms (~3.6 per deep-dive chapter; present in
// 99.4% of verse-summary deeper_layer fields).
//
// SECTION LABELS ARE NOT AFFECTED. They are lifted out into real bold <Text> headings above each
// body (see SECTION_LABEL below), so deep-dive summary structure survives regardless.
//
// HEIGHT AND SCROLLING. `multiline` + `scrollEnabled={false}` + no fixed height: iOS grows the
// UITextView to fit its content, and with its own scrolling off there is no inner scroll view to
// fight the parent ScrollView for the pan gesture. No onContentSizeChange bookkeeping needed.
import React, { useMemo } from 'react'
import { View, Text, TextInput, StyleSheet, StyleProp, TextStyle } from 'react-native'
import { markdownParagraphStyle } from './MarkdownRenderer'
import { colors } from '../theme/colors'

/** Strips inline markdown, since a TextInput `value` can only be plain text. */
function stripInline(text: string): string {
  return text
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

/**
 * Bold runs are SECTION LABELS, so they become real <Text> headings outside the TextInput.
 *
 * Verified across all 1,189 chapters: there are 3,567 bold spans and exactly FOUR distinct
 * strings among them -- "What It Says", "What Happened", "Why It Matters", "The One Thing". Every
 * single one is a section label; there is no genuine mid-sentence bold anywhere in the corpus. So
 * treating a bold run as a heading boundary is not a heuristic here, it is the data.
 *
 * Splitting on the label (rather than only on blank lines) also fixes 3 chapters -- Romans 3,
 * Psalms 98, Psalms 99 -- whose source is missing the blank line before 2 of their labels, which
 * today renders those labels as bold text stranded mid-paragraph.
 *
 * Lifting labels out means the document's structure survives regardless of what styled runs do
 * inside the TextInput, and each body becomes one clean selectable region.
 */
const SECTION_LABEL = /\*\*(.+?)\*\*\s*/g

type Block = { label: string | null; body: string }

/** Paragraph -> blocks, breaking at every bold section label. */
function toBlocks(paragraph: string): Block[] {
  const blocks: Block[] = []
  let lastIndex = 0
  let pendingLabel: string | null = null
  let m: RegExpExecArray | null
  SECTION_LABEL.lastIndex = 0

  while ((m = SECTION_LABEL.exec(paragraph)) !== null) {
    const before = paragraph.slice(lastIndex, m.index).trim()
    // Text preceding this label closes the previous block (or opens a label-less one).
    if (before || pendingLabel) blocks.push({ label: pendingLabel, body: before })
    pendingLabel = m[1]
    lastIndex = SECTION_LABEL.lastIndex
  }

  const tail = paragraph.slice(lastIndex).trim()
  if (tail || pendingLabel) blocks.push({ label: pendingLabel, body: tail })
  return blocks
}

type Props = {
  /** Markdown-ish prose. Split on blank lines into paragraphs. */
  content: string
  /** Extra gap under each paragraph (matches MarkdownRenderer's paragraphSpacing). */
  paragraphSpacing?: number
  /** Overrides the paragraph text style. */
  style?: StyleProp<TextStyle>
}

export default function SelectableMarkdown({ content, paragraphSpacing = 0, style }: Props) {
  const blocks = useMemo(
    () =>
      content
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean)
        .flatMap(toBlocks),
    [content],
  )

  return (
    <View style={styles.root}>
      {blocks.map((block, i) => (
        <View key={`b-${i}`} style={paragraphSpacing ? { marginBottom: paragraphSpacing } : undefined}>
          {block.label ? <Text style={styles.label}>{block.label}</Text> : null}

          {/* editable={false} keeps the keyboard away while leaving the UITextView selectable.
              See styles.reset for why `padding: 0` is the only alignment fix needed. */}
          {block.body ? (
            <TextInput
              editable={false}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              style={[styles.body, style, styles.reset]}
              value={stripInline(block.body)}
            />
          ) : null}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 4 },
  // Matches MarkdownRenderer's own paragraph style, imported rather than restated so the two
  // surfaces cannot drift apart visually.
  body: markdownParagraphStyle,
  label: { fontWeight: '800', color: colors.text.primary, fontSize: 15, lineHeight: 23, marginBottom: 2 },
  // `padding: 0` is the WHOLE reset, and no negative margin belongs here.
  //
  // UITextView's textContainer.lineFragmentPadding defaults to 5pt, but RN already zeroes it in
  // every text path -- RCTUITextView.mm:55 (the multiline input's own view, shared by both
  // architectures), RCTBaseTextInputShadowView.mm:273, RCTTextShadowView.mm:218, and Fabric's
  // RCTTextLayoutManager.mm:227. RN then applies the React `padding` as textContainerInset
  // (RCTBaseTextInputView.mm:118), so padding: 0 leaves no inset at all.
  //
  // An earlier marginHorizontal: -5 here "compensated" for that already-removed inset and pushed
  // each block 5pt past its container on both sides -- about one character of overflow.
  reset: { padding: 0 },
})

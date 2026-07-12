// src/components/SelectableProse.tsx
//
// Renders a prose string as per-sentence tappable runs. Tap a sentence to
// select it (single-select, shared via the passed-in `selection`); when a
// sentence in THIS block is selected, a small "🔗 Share" action row appears
// beneath it and hands the sentence text to the OS share sheet.
//
// The split logic (splitSentences) and selection/share state
// (useSentenceSelection) live outside this component so they can be reused by
// other prose surfaces later without duplicating either.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, TextStyle } from 'react-native';
import { splitSentences } from '../utils/splitSentences';
import type { SentenceSelection } from '../hooks/useSentenceSelection';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';

type Props = {
  /** The prose to render. */
  text: string;
  /** Unique id for this block so sentence keys don't collide across blocks. */
  blockId: string;
  /** Shared selection state (one per host, so single-select spans all blocks). */
  selection: SentenceSelection;
  /** Base paragraph text style (matches the surrounding prose). */
  style?: StyleProp<TextStyle>;
  /** OS long-press text selection (copy). Kept as a prop so it's a one-line toggle. */
  selectable?: boolean;
};

export default function SelectableProse({ text, blockId, selection, style, selectable }: Props) {
  const sentences = useMemo(() => splitSentences(text), [text]);

  return (
    <View>
      <Text style={style} selectable={selectable}>
        {sentences.map((seg, i) => {
          const key = `${blockId}:${i}`;
          return (
            <Text
              key={key}
              onPress={() => selection.toggle(key, seg)}
              style={selection.isSelected(key) ? styles.selected : undefined}
            >
              {seg}
            </Text>
          );
        })}
      </Text>

      {selection.isInBlock(blockId) && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={selection.shareSelected}>
            <Text style={styles.shareText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>🔗 Share</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Transient selection tint — deliberately an accent-orange wash, distinct from
  // the highlight.* palette used by the persisted onHighlight feature.
  selected: { backgroundColor: 'rgba(211, 84, 0, 0.30)' },

  actionRow: { flexDirection: 'row', marginTop: 6, marginBottom: 4 },
  shareBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1, borderColor: colors.border.default,
  },
  shareText: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },
});

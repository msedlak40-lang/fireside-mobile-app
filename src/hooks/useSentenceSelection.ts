// src/hooks/useSentenceSelection.ts
//
// Transient single-select state for tap-to-select sentences, shared across all
// prose blocks in one host (e.g. plain_truth + deeper_layer in the verse card),
// so selecting a sentence in one block deselects any in another.
//
// Intentionally distinct from the persisted `onHighlight` feature: this state is
// in-memory only and is cleared when the host card closes.

import { useCallback, useState } from 'react';
import { Share } from 'react-native';

type Selected = { key: string; text: string };

export type SentenceSelection = {
  /** True if `key` is the currently selected sentence. */
  isSelected: (key: string) => boolean;
  /** True if the current selection belongs to `blockId` (keys are `${blockId}:${i}`). */
  isInBlock: (blockId: string) => boolean;
  /** Tap a sentence: selects it, or deselects if it was already selected. */
  toggle: (key: string, text: string) => void;
  /** Clear selection (call when the host closes — keeps it transient). */
  clear: () => void;
  /** Hand the selected sentence text to the OS share sheet. No-op if nothing selected. */
  shareSelected: () => Promise<void>;
};

export function useSentenceSelection(): SentenceSelection {
  const [selected, setSelected] = useState<Selected | null>(null);

  const isSelected = useCallback((key: string) => selected?.key === key, [selected]);

  const isInBlock = useCallback(
    (blockId: string) => !!selected && selected.key.startsWith(`${blockId}:`),
    [selected]
  );

  const toggle = useCallback((key: string, text: string) => {
    setSelected(prev => (prev?.key === key ? null : { key, text }));
  }, []);

  const clear = useCallback(() => setSelected(null), []);

  const shareSelected = useCallback(async () => {
    if (!selected) return;
    try {
      await Share.share({ message: selected.text.trim() });
    } catch (error) {
      console.error('[useSentenceSelection] Share failed', error);
    }
  }, [selected]);

  return { isSelected, isInBlock, toggle, clear, shareSelected };
}

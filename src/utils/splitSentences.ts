// src/utils/splitSentences.ts
//
// Split prose into sentence segments for per-sentence tap selection.
//
// v1 rule (accepted): split on sentence terminators (. ! ?). This fragments on
// abbreviations and verse refs — "Gen. 1:1" -> "Gen." | "1:1" and "v. 3" ->
// "v." | "3" — which we live with for now.
//
// Hermes-safe: uses match() (no lookbehind, which Hermes support is spotty on).
// Segments keep their trailing punctuation and whitespace so concatenating the
// result reproduces the original string exactly (lossless). Callers should
// .trim() a segment before using it as share text.

const SENTENCE_RE = /[^.!?]+[.!?]+[)"'\]]*\s*|[^.!?]+$/g;

export function splitSentences(text: string): string[] {
  if (!text) return [];
  const matches = text.match(SENTENCE_RE);
  // Fallback: if nothing matched (shouldn't happen for non-empty text), treat
  // the whole string as one sentence rather than dropping it.
  return matches && matches.length > 0 ? matches : [text];
}

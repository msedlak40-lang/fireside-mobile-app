// Shared normalization for raw Scripture verse text.
//
// Source verse_text (bible_verses.verse_text) can carry embedded newlines
// (poetic/KJV line breaks) and irregular internal spacing. Rendered raw, a "\n"
// becomes a hard line break mid-phrase and multi-space runs create uneven
// wrapping. Collapse any whitespace run (incl. newlines/tabs) to a single space
// and trim the ends so the text flows and wraps naturally. Used by both the
// chapter reader and the Verse of the Day surfaces so they stay consistent.
export function cleanVerseText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

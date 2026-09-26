// src/services/userPrefs.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
const KEY = 'fireside.translation'
const DEPTH_KEY = 'fireside.studyDepth'
const POSITION_KEY = 'fireside.lastPosition'
const BOOK_SORT_KEY = 'fireside.bookSort'
// Owned by readingCycle.ts; listed here so clearLocalUserData wipes it too.
const DASHBOARD_CACHE_KEY = 'fireside.dashboard'

/**
 * Wipe all device-cached user state (prefs + last position + cached dashboard).
 * Called on sign-out so one account's cached personal data (streak, progress,
 * reading position) can never bleed into the next account that logs in on this
 * device. Also used by the account-deletion flow.
 */
export async function clearLocalUserData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY, DEPTH_KEY, POSITION_KEY, BOOK_SORT_KEY, DASHBOARD_CACHE_KEY])
  } catch {}
}

/**
 * The translation used when the reader is opened and no preference has been stored.
 *
 * KJV, for two reasons that are facts about this app rather than preferences:
 *   1. SettingsScreen already initialises its selector to 'KJV', so the UI has always SHOWN
 *      KJV as the active translation. The reader simply was not honouring it.
 *   2. The entire enrichment corpus is authored against KJV -- verse_life_application,
 *      chapter_deep_dives spotlights, matthew_henry_commentary and verse_strongs_words all
 *      key to KJV text and versification. Defaulting to WEB would pair KJV-derived study
 *      content with WEB verse text, and would also show the five WEB omissions to users who
 *      never chose WEB.
 */
export const DEFAULT_TRANSLATION = 'KJV'

/**
 * The EFFECTIVE translation: the stored preference, or DEFAULT_TRANSLATION when none is set.
 *
 * Returns a translation ALWAYS, never null. It used to return null on a fresh install, and
 * every caller turned that into `?? undefined` and passed it on, so fetchChapterText applied
 * no translation filter and returned KJV *and* WEB rows for the chapter, deduped by
 * verse_number keeping whichever arrived first -- a chapter of mixed translations, and
 * unattributed. That is why the default belongs here and not at the navigation sites: this is
 * the single point every reader entry passes through, so one default keeps the three of them
 * (BibleScreen.openChapter, BibleScreen.resume, ReadingProgressModal continue-reading) and
 * the Settings display in agreement.
 *
 * Nothing needs to distinguish "unset" from "explicitly KJV": Settings shows a selected chip,
 * and KJV selected is the truthful thing to show when KJV is what the reader will get.
 */
export async function getPreferredTranslation(): Promise<string> {
  try { return (await AsyncStorage.getItem(KEY)) || DEFAULT_TRANSLATION } catch { return DEFAULT_TRANSLATION }
}
export async function setPreferredTranslation(code: string) {
  try { await AsyncStorage.setItem(KEY, code) } catch {}
}

/**
 * Global study depth preference. Single value written from either the chapter
 * Deep Dive toggle or a verse Deeper tap; read to set the chapter Deep Dive default.
 */
export type StudyDepth = 'summary' | 'deeper'

export async function getStudyDepth(): Promise<StudyDepth> {
  try {
    const v = await AsyncStorage.getItem(DEPTH_KEY)
    return v === 'deeper' ? 'deeper' : 'summary'
  } catch { return 'summary' }
}
export async function setStudyDepth(depth: StudyDepth) {
  try { await AsyncStorage.setItem(DEPTH_KEY, depth) } catch {}
}

/**
 * Last reading position. Written whenever the reader opens or changes chapter.
 * Nothing reads it yet — the getter is provided for parity with the other prefs.
 */
export type LastReadingPosition = { bookId: number; bookName: string; chapter: number }

export async function getLastReadingPosition(): Promise<LastReadingPosition | null> {
  try {
    const raw = await AsyncStorage.getItem(POSITION_KEY)
    return raw ? (JSON.parse(raw) as LastReadingPosition) : null
  } catch { return null }
}
export async function setLastReadingPosition(pos: LastReadingPosition) {
  try { await AsyncStorage.setItem(POSITION_KEY, JSON.stringify(pos)) } catch {}
}

/** Book-grid display order. Sticky across sessions; display-only, no data change. */
export type BookSort = 'traditional' | 'az'

export async function getBookSort(): Promise<BookSort> {
  try {
    const v = await AsyncStorage.getItem(BOOK_SORT_KEY)
    return v === 'az' ? 'az' : 'traditional'
  } catch { return 'traditional' }
}
export async function setBookSort(sort: BookSort) {
  try { await AsyncStorage.setItem(BOOK_SORT_KEY, sort) } catch {}
}

// src/services/userPrefs.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
const KEY = 'fireside.translation'
const DEPTH_KEY = 'fireside.studyDepth'
const POSITION_KEY = 'fireside.lastPosition'
const BOOK_SORT_KEY = 'fireside.bookSort'

export async function getPreferredTranslation(): Promise<string | null> {
  try { return (await AsyncStorage.getItem(KEY)) } catch { return null }
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

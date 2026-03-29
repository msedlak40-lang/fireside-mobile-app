// src/components/ChapterText.tsx — Progressive disclosure word study UX
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, TouchableWithoutFeedback,
} from 'react-native'
import { supabase } from '../lib/supabaseClient'
import InsightModal from './InsightModal'
import WordStudyModal from './Bible/WordStudyModal'
import CommentaryModal from './Bible/CommentaryModal'
import { saveBattleVerse, BATTLE_TAGS } from '../services/battleVerses'
import { addToReviewQueue } from '../services/verseReviewQueue'
import { colors } from '../theme/colors'

type RawVerse = any

type WordMapping = {
  verse_number: number
  word_position: number
  english_word: string
  original_word: string
  strongs_number: string
  transliteration: string
}

type Props = {
  bookName?: string
  book_name?: string
  chapter: number
  verses: RawVerse[]
  verseInsightsByVerse?: Record<number, string>
}

function extractVerseNumber(v: RawVerse): number | null {
  const n = v?.number ?? v?.verse ?? v?.verse_number ?? v?.n
  if (typeof n === 'number' && Number.isFinite(n)) return n
  if (typeof n === 'string' && /^\d+$/.test(n)) return parseInt(n, 10)
  if (typeof v?.id === 'string') {
    const m = v.id.match(/:(\d+)\s*$/)
    if (m) return parseInt(m[1], 10)
  }
  return null
}

function extractVerseInsightFromVerse(v: RawVerse): string {
  return v?.insight || v?.key_insight || v?.verse_insight || ''
}

export default function ChapterText(props: Props) {
  const book = useMemo(() => props.bookName ?? props.book_name ?? null, [props.bookName, props.book_name])
  const chapter = props.chapter
  const verses = props.verses ?? []
  const verseInsightsByVerse = props.verseInsightsByVerse ?? {}

  // Note modal
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [activeVerse, setActiveVerse] = useState<number | null>(null)

  // Insight modal
  const [insightOpen, setInsightOpen] = useState(false)
  const [insightTitle, setInsightTitle] = useState('')
  const [insightBody, setInsightBody] = useState('')

  // Word Study modal
  const [wordStudyOpen, setWordStudyOpen] = useState(false)
  const [wordStudyStrongs, setWordStudyStrongs] = useState<string | null>(null)
  const [wordStudyEnglish, setWordStudyEnglish] = useState('')
  const [wordStudyContext, setWordStudyContext] = useState<{ verse: number; text: string }>({ verse: 0, text: '' })

  // Commentary modal
  const [commentaryOpen, setCommentaryOpen] = useState(false)
  const [commentaryVerse, setCommentaryVerse] = useState<{ num: number; text: string }>({ num: 0, text: '' })

  // Verse action menu
  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [actionMenuVerse, setActionMenuVerse] = useState<{ num: number; text: string; raw: RawVerse } | null>(null)

  // Word study mode — which verse is active (null = normal reading)
  const [wordStudyVerseNum, setWordStudyVerseNum] = useState<number | null>(null)

  // Battle verse tag selection
  const [battleTagOpen, setBattleTagOpen] = useState(false)
  const [battleVerseData, setBattleVerseData] = useState<{ verseNum: number; verseText: string } | null>(null)

  // Highlights
  const [highlightMap, setHighlightMap] = useState<Map<number, string>>(new Map())

  // Strong's word mappings for entire chapter
  const [wordMappings, setWordMappings] = useState<Record<number, WordMapping[]>>({})

  // Commentary availability (set of verse numbers that have MH commentary)
  const [commentaryVerses, setCommentaryVerses] = useState<Set<number>>(new Set())

  const loadCommentaryVerses = useCallback(async () => {
    if (!book) return
    try {
      const { data } = await supabase
        .from('matthew_henry_commentary')
        .select('verse_number')
        .eq('book_name', book)
        .eq('chapter_number', chapter)
      setCommentaryVerses(new Set((data ?? []).map((r: { verse_number: number }) => r.verse_number)))
    } catch {}
  }, [book, chapter])

  const loadWordMappings = useCallback(async () => {
    if (!book) return
    try {
      const { data, error } = await supabase
        .from('verse_strongs_words')
        .select('verse_number, word_position, english_word, original_word, strongs_number, transliteration')
        .eq('book_name', book)
        .eq('chapter_number', chapter)
        .order('verse_number')
        .order('word_position')

      if (error) { console.warn('[ChapterText] word mappings error:', error); return }

      const grouped: Record<number, WordMapping[]> = {}
      for (const row of data ?? []) {
        if (!grouped[row.verse_number]) grouped[row.verse_number] = []
        grouped[row.verse_number].push(row)
      }
      setWordMappings(grouped)
    } catch (e) {
      console.warn('[ChapterText] word mappings error:', e)
    }
  }, [book, chapter])

  const loadHighlights = useCallback(async () => {
    try {
      if (!book) return
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) return
      const { data, error } = await supabase
        .from('user_chapter_entries')
        .select('context_key,highlight_color')
        .eq('user_id', userId)
        .eq('book_name', book)
        .eq('chapter_number', chapter)
        .eq('context_type', 'verse')
        .eq('entry_type', 'highlight')

      if (error) return
      const map = new Map<number, string>()
      for (const r of data ?? []) {
        const m = String(r.context_key ?? '').match(/^v:(\d+)$/)
        if (m) map.set(parseInt(m[1], 10), String(r.highlight_color ?? ''))
      }
      setHighlightMap(map)
    } catch {}
  }, [book, chapter])

  useEffect(() => {
    setHighlightMap(new Map())
    setWordMappings({})
    setCommentaryVerses(new Set())
    setWordStudyVerseNum(null)
    loadHighlights()
    loadWordMappings()
    loadCommentaryVerses()
  }, [loadHighlights, loadWordMappings, loadCommentaryVerses])

  // --- Verse number tap: open action menu ---
  function onTapVerseNumber(rawVerse: RawVerse) {
    const v = extractVerseNumber(rawVerse)
    if (!v) return
    const verseText = rawVerse?.text ?? String(rawVerse ?? '')
    setActionMenuVerse({ num: v, text: verseText, raw: rawVerse })
    setActionMenuOpen(true)
  }

  // --- Action menu handlers ---
  function handleCommentary() {
    if (!actionMenuVerse) return
    setCommentaryVerse({ num: actionMenuVerse.num, text: actionMenuVerse.text })
    setActionMenuOpen(false)
    setCommentaryOpen(true)
  }

  function handleWordStudy() {
    if (!actionMenuVerse) return
    setWordStudyVerseNum(actionMenuVerse.num)
    setActionMenuOpen(false)
  }

  function handleAddNote() {
    if (!actionMenuVerse) return
    setActiveVerse(actionMenuVerse.num)
    setActionMenuOpen(false)
    setNoteOpen(true)
  }

  function handleBattleVerse() {
    if (!actionMenuVerse) return
    setBattleVerseData({ verseNum: actionMenuVerse.num, verseText: actionMenuVerse.text })
    setActionMenuOpen(false)
    setBattleTagOpen(true)
  }

  async function handleReviewQueue() {
    if (!actionMenuVerse || !book) return
    setActionMenuOpen(false)
    try {
      const added = await addToReviewQueue(book, chapter, actionMenuVerse.num, actionMenuVerse.text)
      if (added) {
        Alert.alert('Added!', `${book} ${chapter}:${actionMenuVerse.num} added to Review Queue`)
      } else {
        Alert.alert('Already Queued', 'This verse is already in your Review Queue')
      }
    } catch {
      Alert.alert('Error', 'Could not add verse to queue')
    }
  }

  function handleViewInsight() {
    if (!actionMenuVerse) return
    const v = actionMenuVerse.num
    const direct = verseInsightsByVerse[v]
    const fallback = extractVerseInsightFromVerse(actionMenuVerse.raw)
    const insight = direct ?? fallback
    setActionMenuOpen(false)
    if (insight) {
      setInsightTitle(`${book ?? ''} ${chapter}:${v}`)
      setInsightBody(String(insight))
      setInsightOpen(true)
    }
  }

  async function handleHighlight(color: 'yellow' | 'green' | 'pink' | 'blue') {
    if (!actionMenuVerse || !book) return
    const v = actionMenuVerse.num
    setActionMenuOpen(false)
    if (highlightMap.has(v)) await removeHighlight(v)
    await insertHighlight(v, color)
    await loadHighlights()
  }

  async function handleRemoveHighlight() {
    if (!actionMenuVerse) return
    const v = actionMenuVerse.num
    setActionMenuOpen(false)
    await removeHighlight(v)
    await loadHighlights()
  }

  // --- Word study mode: tap a word ---
  function openWordStudy(strongsNumber: string, englishWord: string, verseNum: number, verseText: string) {
    setWordStudyStrongs(strongsNumber)
    setWordStudyEnglish(englishWord)
    setWordStudyContext({ verse: verseNum, text: verseText })
    setWordStudyOpen(true)
  }

  // --- DB operations ---
  async function handleSaveBattleVerse(tag: string) {
    if (!battleVerseData || !book) return
    setBattleTagOpen(false)
    try {
      const saved = await saveBattleVerse(book, chapter, battleVerseData.verseNum, battleVerseData.verseText, tag)
      if (saved) Alert.alert('Saved!', `${book} ${chapter}:${battleVerseData.verseNum} added to Battle Verses`)
      else Alert.alert('Already Saved', 'This verse is already in your Battle Verses')
    } catch { Alert.alert('Error', 'Could not save verse') }
    setBattleVerseData(null)
  }

  async function insertNote(v: number, markdown: string) {
    try {
      if (!book) throw new Error('Missing book name')
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) throw new Error('Not signed in')
      const { error } = await supabase.from('user_chapter_entries').insert({
        user_id: userId, book_name: book, chapter_number: chapter,
        context_type: 'verse', context_key: `v:${v}`, entry_type: 'note', note_markdown: markdown,
      }).select().single()
      if (error) throw error
      Alert.alert('Saved', `Note added to v.${v}`)
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Check permissions/policies.')
    }
  }

  async function insertHighlight(v: number, color: 'yellow' | 'green' | 'pink' | 'blue') {
    try {
      if (!book) throw new Error('Missing book name')
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) throw new Error('Not signed in')
      const { error } = await supabase.from('user_chapter_entries').insert({
        user_id: userId, book_name: book, chapter_number: chapter,
        context_type: 'verse', context_key: `v:${v}`, entry_type: 'highlight', highlight_color: color,
      }).select().single()
      if (error) throw error
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Check permissions/policies.')
    }
  }

  async function removeHighlight(v: number) {
    try {
      if (!book) throw new Error('Missing book name')
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) throw new Error('Not signed in')
      await supabase.from('user_chapter_entries').delete()
        .eq('user_id', userId).eq('book_name', book).eq('chapter_number', chapter)
        .eq('context_type', 'verse').eq('context_key', `v:${v}`).eq('entry_type', 'highlight')
    } catch {}
  }

  // Check if action menu verse has insight
  const actionVerseHasInsight = actionMenuVerse
    ? !!(verseInsightsByVerse[actionMenuVerse.num] || extractVerseInsightFromVerse(actionMenuVerse.raw))
    : false
  const actionVerseIsHighlighted = actionMenuVerse ? highlightMap.has(actionMenuVerse.num) : false

  return (
    <View style={styles.wrap}>
      {/* Word Study Mode bar */}
      {wordStudyVerseNum !== null && (
        <View style={styles.wordStudyBar}>
          <TouchableOpacity onPress={() => setWordStudyVerseNum(null)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{'\u2190'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.wordStudyBarTitle}>Word Study: Verse {wordStudyVerseNum}</Text>
        </View>
      )}

      {/* Hint banner */}
      {wordStudyVerseNum === null && (
        <Text style={styles.tapHint}>Tap any verse for Word Study, Notes, Highlights & more</Text>
      )}

      {/* Verses */}
      {verses.map((raw, idx) => {
        const vNum = extractVerseNumber(raw)
        const highlighted = vNum ? highlightMap.has(vNum) : false
        const verseText = raw?.text ?? String(raw ?? '')
        const isWordStudyActive = wordStudyVerseNum === vNum

        // verse-level insight indicator
        const insightDirect = vNum ? verseInsightsByVerse[vNum] : undefined
        const insightFallback = extractVerseInsightFromVerse(raw)
        const verseInsight = insightDirect ?? insightFallback

        // Resource indicators
        const hasWords = vNum ? !!(wordMappings[vNum] && wordMappings[vNum].length > 0) : false
        const hasCommentary = vNum ? commentaryVerses.has(vNum) : false

        return (
          <TouchableOpacity
            key={`${book ?? 'unknown'}-${chapter}-${vNum ?? idx}-${idx}`}
            style={[
              styles.verseRow,
              highlighted && styles.verseRowHighlighted,
              isWordStudyActive && styles.verseRowStudyActive,
            ]}
            activeOpacity={isWordStudyActive ? 1 : 0.6}
            onPress={isWordStudyActive ? undefined : () => onTapVerseNumber(raw)}
          >
            {/* Verse number + resource icons */}
            <View style={styles.verseNumWrap}>
              <Text style={[styles.verseNum, verseInsight ? styles.keyTint : null]}>
                {vNum ?? ''}
              </Text>
              {(hasWords || hasCommentary) && (
                <View style={styles.resourceRow}>
                  {hasWords && <Text style={styles.resourceIcon}>{'\uD83D\uDCD6'}</Text>}
                  {hasCommentary && <Text style={styles.resourceIcon}>{'\uD83D\uDCDA'}</Text>}
                </View>
              )}
            </View>

            {/* Verse text */}
            {isWordStudyActive ? (
              <View style={{ flex: 1 }}>
                <Text style={[styles.verseText, highlighted && styles.verseTextHighlighted]}>
                  {renderVerseWithTappableWords(
                    verseText,
                    wordMappings[vNum!] ?? [],
                    (sn, eng) => openWordStudy(sn, eng, vNum ?? 0, verseText)
                  )}
                </Text>
                <Text style={styles.wordStudyHint}>Tap a blue word to study it</Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.verseText,
                  highlighted && styles.verseTextHighlighted,
                  verseInsight ? styles.keyVerseText : null,
                ]}
              >
                {verseText}
              </Text>
            )}
          </TouchableOpacity>
        )
      })}

      {/* ===== VERSE ACTION MENU ===== */}
      <Modal visible={actionMenuOpen} transparent animationType="fade" onRequestClose={() => setActionMenuOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setActionMenuOpen(false)}>
          <View style={styles.actionOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.actionSheet}>
                <View style={styles.actionHandle} />
                <Text style={styles.actionTitle}>Verse {actionMenuVerse?.num}</Text>

                {/* Word Study */}
                <TouchableOpacity style={styles.actionItem} onPress={handleWordStudy}>
                  <Text style={styles.actionIcon}>{'\uD83D\uDCD6'}</Text>
                  <View style={styles.actionTextWrap}>
                    <Text style={styles.actionText}>Word Study</Text>
                    <Text style={styles.actionSub}>Study Hebrew/Greek words</Text>
                  </View>
                </TouchableOpacity>

                {/* Commentary */}
                <TouchableOpacity style={styles.actionItem} onPress={handleCommentary}>
                  <Text style={styles.actionIcon}>{'\uD83D\uDCDA'}</Text>
                  <View style={styles.actionTextWrap}>
                    <Text style={styles.actionText}>Commentary</Text>
                    <Text style={styles.actionSub}>Matthew Henry exposition</Text>
                  </View>
                </TouchableOpacity>

                {/* View Insight (if available) */}
                {actionVerseHasInsight && (
                  <TouchableOpacity style={styles.actionItem} onPress={handleViewInsight}>
                    <Text style={styles.actionIcon}>{'\uD83D\uDCA1'}</Text>
                    <View style={styles.actionTextWrap}>
                      <Text style={styles.actionText}>View Insight</Text>
                      <Text style={styles.actionSub}>See verse insight</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Add Note */}
                <TouchableOpacity style={styles.actionItem} onPress={handleAddNote}>
                  <Text style={styles.actionIcon}>{'\uD83D\uDCDD'}</Text>
                  <View style={styles.actionTextWrap}>
                    <Text style={styles.actionText}>Add Note</Text>
                    <Text style={styles.actionSub}>Write your thoughts</Text>
                  </View>
                </TouchableOpacity>

                {/* Battle Verse */}
                <TouchableOpacity style={styles.actionItem} onPress={handleBattleVerse}>
                  <Text style={styles.actionIcon}>{'\u2694\uFE0F'}</Text>
                  <View style={styles.actionTextWrap}>
                    <Text style={styles.actionText}>Battle Verse</Text>
                    <Text style={styles.actionSub}>Save for memorization</Text>
                  </View>
                </TouchableOpacity>

                {/* Review Queue */}
                <TouchableOpacity style={styles.actionItem} onPress={handleReviewQueue}>
                  <Text style={styles.actionIcon}>{'\uD83D\uDD0D'}</Text>
                  <View style={styles.actionTextWrap}>
                    <Text style={styles.actionText}>Add to Review Queue</Text>
                    <Text style={styles.actionSub}>Queue for deep study</Text>
                  </View>
                </TouchableOpacity>

                {/* Highlight options */}
                <View style={styles.highlightRow}>
                  <Text style={[styles.actionSub, { marginRight: 10 }]}>Highlight:</Text>
                  {(['yellow', 'green', 'pink', 'blue'] as const).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.highlightDot, { backgroundColor: colors.highlight[c] }]}
                      onPress={() => handleHighlight(c)}
                    />
                  ))}
                  {actionVerseIsHighlighted && (
                    <TouchableOpacity style={styles.removeHighlightBtn} onPress={handleRemoveHighlight}>
                      <Text style={styles.removeHighlightText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Cancel */}
                <TouchableOpacity
                  style={[styles.actionItem, styles.cancelItem]}
                  onPress={() => setActionMenuOpen(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ===== NOTE MODAL ===== */}
      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Note for v.{activeVerse ?? ''}</Text>
            <TextInput
              style={styles.input}
              multiline
              placeholder="Write your note..."
              placeholderTextColor={colors.text.muted}
              value={noteText}
              onChangeText={setNoteText}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={() => { setNoteOpen(false); setNoteText(''); setActiveVerse(null) }}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btn}
                onPress={async () => {
                  const text = noteText.trim()
                  const v = typeof activeVerse === 'number' ? activeVerse : null
                  setNoteOpen(false); setNoteText(''); setActiveVerse(null)
                  if (v && text) await insertNote(v, text)
                }}
              >
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== INSIGHT MODAL ===== */}
      <InsightModal
        visible={insightOpen}
        onClose={() => setInsightOpen(false)}
        title={insightTitle}
        content={insightBody}
      />

      {/* ===== WORD STUDY MODAL ===== */}
      <WordStudyModal
        visible={wordStudyOpen}
        onClose={() => setWordStudyOpen(false)}
        strongsNumber={wordStudyStrongs}
        englishWord={wordStudyEnglish}
        bookName={book ?? undefined}
        chapter={chapter}
        verseNumber={wordStudyContext.verse}
        verseText={wordStudyContext.text}
      />

      {/* ===== COMMENTARY MODAL ===== */}
      <CommentaryModal
        visible={commentaryOpen}
        onClose={() => setCommentaryOpen(false)}
        bookName={book}
        chapter={chapter}
        verseNumber={commentaryVerse.num}
        verseText={commentaryVerse.text}
      />

      {/* ===== BATTLE TAG MODAL ===== */}
      <Modal visible={battleTagOpen} transparent animationType="fade" onRequestClose={() => { setBattleTagOpen(false); setBattleVerseData(null) }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save to Battle Verses</Text>
            <Text style={{ color: colors.text.secondary, fontSize: 14, marginBottom: 12 }}>
              {book} {chapter}:{battleVerseData?.verseNum} — Choose a battle tag:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {BATTLE_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10,
                    backgroundColor: colors.background.tertiary, borderRadius: 8,
                    borderWidth: 1, borderColor: colors.border.default,
                  }}
                  onPress={() => handleSaveBattleVerse(tag)}
                >
                  <Text style={{ color: colors.text.primary, fontWeight: '600', fontSize: 14, textTransform: 'capitalize' }}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost, { marginTop: 12, alignSelf: 'flex-end' }]}
              onPress={() => { setBattleTagOpen(false); setBattleVerseData(null) }}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

/**
 * Render verse text with tappable Strong's-mapped words.
 * Only used when a verse is in word study mode.
 */
function renderVerseWithTappableWords(
  text: string,
  mappings: WordMapping[],
  onTap: (strongsNumber: string, englishWord: string) => void,
): React.ReactNode {
  if (!mappings || mappings.length === 0) return text

  const sorted = [...mappings].sort((a, b) => a.word_position - b.word_position)

  const parts: React.ReactNode[] = []
  let lastIdx = 0
  let partKey = 0

  for (const mapping of sorted) {
    const searchWord = mapping.english_word.trim()
    if (!searchWord || searchWord.length < 2) continue

    const lowerText = text.toLowerCase()
    const lowerSearch = searchWord.toLowerCase()
    const idx = lowerText.indexOf(lowerSearch, lastIdx)

    if (idx === -1) continue

    if (idx > lastIdx) {
      parts.push(<Text key={`t-${partKey++}`}>{text.slice(lastIdx, idx)}</Text>)
    }

    const matchedText = text.slice(idx, idx + searchWord.length)
    const sn = mapping.strongs_number
    const eng = mapping.english_word
    parts.push(
      <Text
        key={`w-${partKey++}`}
        style={styles.tappableWord}
        onPress={() => onTap(sn, eng)}
      >
        {matchedText}
      </Text>
    )

    lastIdx = idx + searchWord.length
  }

  if (lastIdx < text.length) {
    parts.push(<Text key={`t-${partKey++}`}>{text.slice(lastIdx)}</Text>)
  }

  return parts.length > 0 ? parts : text
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingBottom: 60 },

  // Word Study mode bar
  wordStudyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  backBtn: { marginRight: 12 },
  backBtnText: { color: colors.accent.primary, fontSize: 15, fontWeight: '700' },
  wordStudyBarTitle: { color: colors.text.primary, fontSize: 15, fontWeight: '600' },

  // Verse rows
  verseRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, borderRadius: 6, paddingRight: 6 },
  verseRowHighlighted: { backgroundColor: colors.highlight.yellow },
  verseRowStudyActive: {
    backgroundColor: colors.accent.primary + '15',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
    paddingLeft: 6,
  },

  verseNumWrap: { alignItems: 'center', marginRight: 6, minWidth: 28 },
  verseNum: { textAlign: 'right', color: colors.text.muted, fontWeight: '700', minWidth: 28 },
  keyTint: { color: colors.accent.tertiary, textDecorationLine: 'underline' },
  resourceRow: { flexDirection: 'row', gap: 1, marginTop: 2 },
  resourceIcon: { fontSize: 9, opacity: 0.5 },

  verseText: { flex: 1, color: colors.text.primary, lineHeight: 22 },
  verseTextHighlighted: { fontWeight: '600' },
  keyVerseText: { textDecorationLine: 'underline', textDecorationColor: colors.accent.tertiary },

  tappableWord: {
    color: '#5b9bd5',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#5b9bd580',
  },
  tapHint: {
    fontSize: 12,
    color: colors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },
  wordStudyHint: {
    fontSize: 12,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Action menu
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  actionHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border.light,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 12,
  },
  actionTitle: {
    fontSize: 18, fontWeight: '700', color: colors.text.primary,
    textAlign: 'center', marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionIcon: { fontSize: 22, marginRight: 12, width: 30, textAlign: 'center' },
  actionTextWrap: { flex: 1 },
  actionText: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  actionSub: { fontSize: 13, color: colors.text.muted, marginTop: 1 },
  cancelItem: {
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelText: { fontSize: 16, fontWeight: '600', color: colors.text.secondary, textAlign: 'center', flex: 1 },

  // Highlight row in action menu
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  highlightDot: {
    width: 30, height: 30, borderRadius: 15,
    marginRight: 10,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  removeHighlightBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.error + '30',
  },
  removeHighlightText: { color: colors.error, fontWeight: '600', fontSize: 13 },

  // Existing modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '90%', backgroundColor: colors.background.elevated, borderRadius: 12, padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: colors.text.primary },
  input: { minHeight: 100, borderWidth: 1, borderColor: colors.border.default, borderRadius: 10, padding: 10, textAlignVertical: 'top', color: colors.text.primary, backgroundColor: colors.background.secondary },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 },
  btn: { backgroundColor: colors.accent.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnText: { color: colors.text.primary, fontWeight: '700' },
  btnGhost: { backgroundColor: colors.background.tertiary },
  btnGhostText: { color: colors.text.secondary, fontWeight: '700' },
})

// src/components/ChapterText.tsx — verse summary surface (summary card + Deeper + actions)
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../lib/supabaseClient'
import VerseSummaryCard, { HighlightColor, type CrossRefItem } from './VerseSummaryCard'
import ShareToFireModal from './ShareToFireModal'
import { getVerseLifeApplication, type VerseLifeApplication } from '../services/scripture'
import { getCrossReferences, type CrossReference } from '../services/strongsStudy'
import { setStudyDepth } from '../services/userPrefs'
import { saveBattleVerse, BATTLE_TAGS } from '../services/battleVerses'
import { colors } from '../theme/colors'

type RawVerse = any

type Props = {
  bookName?: string
  book_name?: string
  chapter: number
  verses: RawVerse[]
  /** Verse numbers flagged as significant (present in bible_verse_insights) — drives the significance
   *  marker (gold number tint + trailing lightbulb). Pure visual flag; no content behind it. */
  significantVerses?: Set<number>
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

function toCrossRefItem(ref: CrossReference): CrossRefItem {
  const label = ref.target_verse_end
    ? `${ref.target_book} ${ref.target_chapter}:${ref.target_verse_start}-${ref.target_verse_end}`
    : `${ref.target_book} ${ref.target_chapter}:${ref.target_verse_start}`
  return {
    id: ref.id,
    label,
    book: ref.target_book,
    chapter: ref.target_chapter,
    verseStart: ref.target_verse_start,
    verseEnd: ref.target_verse_end,
  }
}

export default function ChapterText(props: Props) {
  const book = useMemo(() => props.bookName ?? props.book_name ?? null, [props.bookName, props.book_name])
  const chapter = props.chapter
  const verses = props.verses ?? []
  const significantVerses = props.significantVerses ?? new Set<number>()
  const navigation = useNavigation<any>()

  // Note modal
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [activeVerse, setActiveVerse] = useState<number | null>(null)

  // Verse summary card
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryVerse, setSummaryVerse] = useState<{ num: number; text: string } | null>(null)
  const [summaryContent, setSummaryContent] = useState<VerseLifeApplication | null>(null)
  const [summaryCrossRefs, setSummaryCrossRefs] = useState<CrossRefItem[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [shareFireOpen, setShareFireOpen] = useState(false)
  const [shareVerse, setShareVerse] = useState<{ num: number; text: string } | null>(null)

  // Battle verse tag selection
  const [battleTagOpen, setBattleTagOpen] = useState(false)
  const [battleVerseData, setBattleVerseData] = useState<{ verseNum: number; verseText: string } | null>(null)

  // Highlights
  const [highlightMap, setHighlightMap] = useState<Map<number, string>>(new Map())

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
    loadHighlights()
  }, [loadHighlights])

  // --- Verse tap: open summary card, fetch life-application content ---
  async function onTapVerse(rawVerse: RawVerse) {
    const v = extractVerseNumber(rawVerse)
    if (!v) return
    const verseText = rawVerse?.text ?? String(rawVerse ?? '')
    setSummaryVerse({ num: v, text: verseText })
    setSummaryContent(null)
    setSummaryCrossRefs([])
    setSummaryLoading(true)
    setSummaryOpen(true)
    if (book) {
      const [content, refs] = await Promise.all([
        getVerseLifeApplication(book, chapter, v),
        getCrossReferences(book, chapter, v, 8),
      ])
      // Guard against a later tap resolving out of order
      setSummaryVerse(cur => {
        if (cur?.num === v) {
          setSummaryContent(content)
          setSummaryCrossRefs(refs.map(toCrossRefItem))
        }
        return cur
      })
    }
    setSummaryLoading(false)
  }

  // --- Deeper affordance: open the Strong's deep-study surface for this verse ---
  function handleDeeper() {
    if (!summaryVerse || !book) return
    // A verse Deeper tap sets the global sticky depth (per spec: written from either surface).
    setStudyDepth('deeper')
    setSummaryOpen(false)
    navigation.navigate('DeepStudy', {
      bookName: book,
      chapter,
      verseNumber: summaryVerse.num,
      verseText: summaryVerse.text,
    })
  }

  // --- Cross-reference "View Full Chapter": jump to the target chapter ---
  function handleViewCrossRefChapter(cr: CrossRefItem) {
    setSummaryOpen(false)
    navigation.push('Chapter', { bookName: cr.book, chapter: cr.chapter })
  }

  // --- Actions ---
  function handleAddNote() {
    if (!summaryVerse) return
    setActiveVerse(summaryVerse.num)
    setSummaryOpen(false)
    setNoteOpen(true)
  }

  function handleBattleVerse() {
    if (!summaryVerse) return
    setBattleVerseData({ verseNum: summaryVerse.num, verseText: summaryVerse.text })
    setSummaryOpen(false)
    setBattleTagOpen(true)
  }

  function handleShareToFire() {
    if (!summaryVerse || !book) return
    setShareVerse({ num: summaryVerse.num, text: summaryVerse.text })
    setSummaryOpen(false)
    setShareFireOpen(true)
  }

  async function handleHighlight(color: HighlightColor) {
    if (!summaryVerse || !book) return
    const v = summaryVerse.num
    if (highlightMap.has(v)) await removeHighlight(v)
    await insertHighlight(v, color)
    await loadHighlights()
  }

  async function handleRemoveHighlight() {
    if (!summaryVerse) return
    await removeHighlight(summaryVerse.num)
    await loadHighlights()
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

  async function insertHighlight(v: number, color: HighlightColor) {
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

  const summaryIsHighlighted = summaryVerse ? highlightMap.has(summaryVerse.num) : false

  return (
    <View style={styles.wrap}>
      <Text style={styles.tapHint}>Tap any verse for its summary, word study & more</Text>

      {/* Verses */}
      {verses.map((raw, idx) => {
        const vNum = extractVerseNumber(raw)
        const highlighted = vNum ? highlightMap.has(vNum) : false
        const verseText = raw?.text ?? String(raw ?? '')
        const significant = vNum ? significantVerses.has(vNum) : false

        return (
          <TouchableOpacity
            key={`${book ?? 'unknown'}-${chapter}-${vNum ?? idx}-${idx}`}
            style={[styles.verseRow, highlighted && styles.verseRowHighlighted]}
            activeOpacity={0.6}
            onPress={() => onTapVerse(raw)}
          >
            <View style={styles.verseNumWrap}>
              <Text style={[styles.verseNum, significant ? styles.keyTint : null]}>
                {vNum ?? ''}
              </Text>
            </View>
            <Text
              style={[
                styles.verseText,
                highlighted && styles.verseTextHighlighted,
              ]}
            >
              {verseText}
            </Text>
            {significant && <Text style={styles.bulb}>💡</Text>}
          </TouchableOpacity>
        )
      })}

      {/* ===== VERSE SUMMARY CARD ===== */}
      <VerseSummaryCard
        visible={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        reference={`${book ?? ''} ${chapter}:${summaryVerse?.num ?? ''}`}
        loading={summaryLoading}
        content={summaryContent}
        crossRefs={summaryCrossRefs}
        onViewCrossRefChapter={handleViewCrossRefChapter}
        onDeeper={handleDeeper}
        onNote={handleAddNote}
        onBattleVerse={handleBattleVerse}
        onShareToFire={handleShareToFire}
        onHighlight={handleHighlight}
        isHighlighted={summaryIsHighlighted}
        onRemoveHighlight={handleRemoveHighlight}
      />

      {/* ===== SHARE TO FIRE ===== */}
      <ShareToFireModal
        visible={shareFireOpen}
        target={shareVerse && book ? {
          kind: 'verse',
          book,
          chapter,
          verseNumber: shareVerse.num,
          reference: `${book} ${chapter}:${shareVerse.num}`,
          text: shareVerse.text,
        } : null}
        onClose={() => setShareFireOpen(false)}
        onShared={() => setShareFireOpen(false)}
      />

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

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingBottom: 60 },

  verseRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, borderRadius: 6, paddingRight: 6 },
  verseRowHighlighted: { backgroundColor: colors.highlight.yellow },

  verseNumWrap: { alignItems: 'center', marginRight: 6, minWidth: 28 },
  verseNum: { textAlign: 'right', color: colors.text.muted, fontWeight: '700', minWidth: 28 },
  keyTint: { color: colors.accent.tertiary },

  verseText: { flex: 1, color: colors.text.primary, lineHeight: 22 },
  verseTextHighlighted: { fontWeight: '600' },
  bulb: { fontSize: 13, marginLeft: 6, marginTop: 2 },

  tapHint: {
    fontSize: 12,
    color: colors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },

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

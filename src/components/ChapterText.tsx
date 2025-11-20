// src/components/ChapterText.tsx — COMPLETE FINAL VERSION
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ActionSheetIOS,
  Modal, TextInput, Alert
} from 'react-native'
import { supabase } from '../lib/supabaseClient'
import InsightModal from './InsightModal'
import { colors } from '../theme/colors'
import { saveBattleVerse } from '../services/armor'

type RawVerse = any
type Keyword = { word: string; insight?: string; detailed_explanation?: string }

type Props = {
  bookName?: string
  book_name?: string
  chapter: number
  verses: RawVerse[]

  /** map from bible_verse_insights — { [verseNumber]: insight } */
  verseInsightsByVerse?: Record<number, string>

  /** list from biblical_terms — each with a display word and optional insight */
  biblicalTerms?: Keyword[]

  /** Optional chapter-wide keyword list (kept for backward compat) */
  chapterKeyWords?: Keyword[]
}

/** Extract verse number from your shape */
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

/** Extract an insight string if this is a "key verse" (fallback only) */
function extractVerseInsightFromVerse(v: RawVerse): string {
  return v?.insight || v?.key_insight || v?.verse_insight || ''
}

/** Merge keywords: biblicalTerms (preferred) + per-verse keywords + chapterKeyWords (legacy) */
function collectKeywordsForVerse(v: RawVerse, biblicalTerms?: Keyword[], chapterKeyWords?: Keyword[]): Keyword[] {
  const legacyLocal = Array.isArray(v?.key_words) ? v.key_words :
                      Array.isArray(v?.keywords)  ? v.keywords  : []
  const legacyGlobal = Array.isArray(chapterKeyWords) ? chapterKeyWords : []
  const preferred = Array.isArray(biblicalTerms) ? biblicalTerms : []

  const merged = [...preferred, ...legacyLocal, ...legacyGlobal]
  const seen = new Set<string>()
  
  const result = merged
    .map(k => {
      const mapped = {
        word: String(k?.word ?? k?.term ?? '').trim(),
        insight: String(k?.insight ?? k?.note ?? k?.simple_definition ?? '').trim(),
        detailed_explanation: String(k?.detailed_explanation ?? '').trim()
      }
      return mapped
    })
    .filter(k => k.word && !seen.has(k.word.toLowerCase()) && (seen.add(k.word.toLowerCase()) || true))
  
  // Log first result for debugging
  if (result.length > 0) {
    console.log('[collectKeywordsForVerse] First keyword:', JSON.stringify(result[0], null, 2))
  }
  
  return result
}

export default function ChapterText(props: Props) {
  const book = useMemo(() => props.bookName ?? props.book_name ?? null, [props.bookName, props.book_name])
  const chapter = props.chapter
  const verses = props.verses ?? []
  const verseInsightsByVerse = props.verseInsightsByVerse ?? {}
  const biblicalTerms = props.biblicalTerms
  const chapterKeyWords = props.chapterKeyWords

  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [activeVerse, setActiveVerse] = useState<number | null>(null)

  // INSIGHT modal (key verse / key word)
  const [insightOpen, setInsightOpen] = useState(false)
  const [insightTitle, setInsightTitle] = useState('')
  const [insightBody, setInsightBody] = useState('')
  const [insightDetailed, setInsightDetailed] = useState('')

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

      if (error) { console.warn('[ChapterText] load highlights error:', error); return }
      const map = new Map<number, string>()
      for (const r of data ?? []) {
        const key = String(r.context_key ?? '')
        const m = key.match(/^v:(\d+)$/)
        if (m) map.set(parseInt(m[1], 10), String(r.highlight_color ?? ''))
      }
      setHighlightMap(map)
    } catch (e) {
      console.warn('[ChapterText] load highlights error:', e)
    }
  }, [book, chapter])

  useEffect(() => {
    setHighlightMap(new Map())
    loadHighlights()
  }, [loadHighlights])

  async function saveToBattleVerses(rawVerse: RawVerse) {
    try {
      if (!book) throw new Error('Missing book name')
      const v = extractVerseNumber(rawVerse)
      if (!v) throw new Error('Could not determine verse number')

      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) throw new Error('Not signed in')

      const verseRef = `${book} ${chapter}:${v}`
      const verseText = rawVerse?.text ?? String(rawVerse ?? '')

      // Show battle tag selection
      const saveWithTag = async (tag: string | null) => {
        try {
          const result = await saveBattleVerse(
            userId,
            book,
            chapter,
            v,
            verseRef,
            verseText,
            tag as any
          )

          if (result) {
            Alert.alert('Saved!', `${verseRef} added to your Battle Verses`)
          } else {
            Alert.alert('Already Saved', 'This verse is already in your Battle Verses')
          }
        } catch (err: any) {
          console.warn('[ChapterText] save battle verse error:', err)
          Alert.alert('Could not save', err?.message ?? 'Please try again.')
        }
      }

      Alert.alert(
        'Tag this verse',
        'Choose a battle category for this verse:',
        [
          { text: 'Fear', onPress: () => saveWithTag('fear') },
          { text: 'Anger', onPress: () => saveWithTag('anger') },
          { text: 'Temptation', onPress: () => saveWithTag('temptation') },
          { text: 'Doubt', onPress: () => saveWithTag('doubt') },
          { text: 'Loneliness', onPress: () => saveWithTag('loneliness') },
          { text: 'Identity', onPress: () => saveWithTag('identity') },
          { text: 'Purpose', onPress: () => saveWithTag('purpose') },
          { text: 'General (no tag)', onPress: () => saveWithTag(null) },
          { text: 'Cancel', style: 'cancel' },
        ]
      )
    } catch (err: any) {
      console.warn('[ChapterText] save battle verse handler failed:', err)
      Alert.alert('Could not save', err?.message ?? 'Please try again.')
    }
  }

  function openVerseActions(rawVerse: RawVerse) {
    if (!book) {
      console.warn('[ChapterText] Missing bookName/book_name; cannot annotate.')
      Alert.alert('Missing book', 'Cannot add note/highlight because book is unknown.')
      return
    }
    const v = extractVerseNumber(rawVerse)
    if (!v) { Alert.alert('Unknown verse', 'Could not determine verse number.'); return }

    const isHighlighted = highlightMap.has(v)

    // Show different options based on whether verse is already highlighted
    const options = isHighlighted
      ? ['Add Note', 'Remove Highlight', 'Highlight (Yellow)', 'Highlight (Green)', 'Highlight (Pink)', 'Highlight (Blue)', 'Save to Battle Verses', 'Cancel']
      : ['Add Note', 'Highlight (Yellow)', 'Highlight (Green)', 'Highlight (Pink)', 'Highlight (Blue)', 'Save to Battle Verses', 'Cancel']

    const cancelIndex = options.length - 1
    const battleVerseIndex = options.length - 2

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `Verse ${v}`,
        options,
        cancelButtonIndex: cancelIndex,
        destructiveButtonIndex: isHighlighted ? 1 : undefined,
        userInterfaceStyle: 'dark',
      },
      async (idx) => {
        if (idx === 0) {
          setActiveVerse(v);
          setNoteOpen(true)
        }
        else if (isHighlighted && idx === 1) {
          // Remove highlight
          await removeHighlight(v)
          await loadHighlights()
        }
        else if (isHighlighted && idx >= 2 && idx <= 5) {
          // Change highlight color
          const colors = ['yellow', 'green', 'pink', 'blue'] as const
          await removeHighlight(v) // Remove old highlight first
          await insertHighlight(v, colors[idx - 2])
          await loadHighlights()
        }
        else if (!isHighlighted && idx >= 1 && idx <= 4) {
          // Add new highlight
          const colors = ['yellow', 'green', 'pink', 'blue'] as const
          await insertHighlight(v, colors[idx - 1])
          await loadHighlights()
        }
        else if (idx === battleVerseIndex) {
          // Save to Battle Verses
          await saveToBattleVerses(rawVerse)
        }
      }
    )
  }

  // Tap on verse number -> open INSIGHT if available
  function onPressVerseNum(rawVerse: RawVerse) {
    const v = extractVerseNumber(rawVerse)
    const direct = v ? verseInsightsByVerse[v] : undefined
    const fallback = extractVerseInsightFromVerse(rawVerse)
    const insight = direct ?? fallback

    if (insight && v) {
      setInsightTitle(`${book ?? ''} ${chapter}:${v}`)
      setInsightBody(String(insight))
      setInsightDetailed('')
      setInsightOpen(true)
    }
    // Removed verse view modal - verse text already visible in chapter
  }

  async function insertNote(v: number, markdown: string) {
    try {
      if (!book) throw new Error('Missing book name')
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) throw new Error('Not signed in')

      const { data, error } = await supabase
        .from('user_chapter_entries')
        .insert({
          user_id: userId,
          book_name: book,
          chapter_number: chapter,
          context_type: 'verse',
          context_key: `v:${v}`,
          entry_type: 'note',
          note_markdown: markdown,
        })
        .select()
        .single()

      if (error || !data) throw error || new Error('Insert failed')
      Alert.alert('Saved', `Note added to v.${v}`)
    } catch (err: any) {
      console.warn('[ChapterText] insert note error:', err)
      Alert.alert('Could not save', err?.message ?? 'Check permissions/policies.')
    }
  }

  async function insertHighlight(v: number, color: 'yellow' | 'green' | 'pink' | 'blue') {
    try {
      if (!book) throw new Error('Missing book name')
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) throw new Error('Not signed in')

      const { data, error } = await supabase
        .from('user_chapter_entries')
        .insert({
          user_id: userId,
          book_name: book,
          chapter_number: chapter,
          context_type: 'verse',
          context_key: `v:${v}`,
          entry_type: 'highlight',
          highlight_color: color,
        })
        .select()
        .single()

      if (error || !data) throw error || new Error('Insert failed')
    } catch (err: any) {
      console.warn('[ChapterText] insert highlight error:', err)
      Alert.alert('Could not save', err?.message ?? 'Check permissions/policies.')
    }
  }

  async function removeHighlight(v: number) {
    try {
      if (!book) throw new Error('Missing book name')
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) throw new Error('Not signed in')

      const { error } = await supabase
        .from('user_chapter_entries')
        .delete()
        .eq('user_id', userId)
        .eq('book_name', book)
        .eq('chapter_number', chapter)
        .eq('context_type', 'verse')
        .eq('context_key', `v:${v}`)
        .eq('entry_type', 'highlight')

      if (error) throw error
    } catch (err: any) {
      console.warn('[ChapterText] remove highlight error:', err)
      Alert.alert('Could not remove', err?.message ?? 'Check permissions/policies.')
    }
  }

  return (
    <View style={styles.wrap}>
      {verses.map((raw, idx) => {
        const vNum = extractVerseNumber(raw)
        const highlighted = vNum ? highlightMap.has(vNum) : false
        const keywords = collectKeywordsForVerse(raw, biblicalTerms, chapterKeyWords)

        // verse-level insight (prefer table map; fallback per-verse field)
        const insightDirect = vNum ? verseInsightsByVerse[vNum] : undefined
        const insightFallback = extractVerseInsightFromVerse(raw)
        const verseInsight = insightDirect ?? insightFallback

        return (
          <View
            key={`${book ?? 'unknown'}-${chapter}-${vNum ?? idx}-${idx}`}
            style={[styles.verseRow, highlighted && styles.verseRowHighlighted]}
          >
            <TouchableOpacity
              onPress={() => onPressVerseNum(raw)}
              onLongPress={() => openVerseActions(raw)}
              activeOpacity={0.7}
            >
              <Text style={[styles.verseNum, (verseInsight ? styles.keyTint : null)]}>
                {vNum ?? ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1 }}
              onLongPress={() => openVerseActions(raw)}
              activeOpacity={0.7}
            >
              <Text style={[styles.verseText, highlighted && styles.verseTextHighlighted]}>
                {renderTextWithKeywords(raw?.text ?? String(raw ?? ''), keywords, (w, ins, detailed) => {
                  console.log('[ChapterText] Keyword tapped:', w)
                  console.log('[ChapterText] Insight:', ins)
                  console.log('[ChapterText] Detailed:', detailed)
                  setInsightTitle(w)
                  setInsightBody(ins || `Insight on ${w}`)
                  setInsightDetailed(detailed || '')
                  setInsightOpen(true)
                })}
              </Text>
            </TouchableOpacity>
          </View>
        )
      })}

      {/* NOTE MODAL */}
      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Note for v.{activeVerse ?? ''}</Text>
            <TextInput
              style={styles.input}
              multiline
              placeholder="Write your note…"
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

      {/* INSIGHT MODAL (key verses / key words) */}
      <InsightModal
        visible={insightOpen}
        onClose={() => setInsightOpen(false)}
        title={insightTitle}
        content={insightBody}
        detailedExplanation={insightDetailed}
      />
    </View>
  )
}

/** Turn matching keywords into blue, tappable spans */
function renderTextWithKeywords(
  text: string,
  words: Keyword[],
  onTap: (w: string, ins?: string, detailed?: string) => void
) {
  if (!Array.isArray(words) || words.length === 0) return text
  const escaped = words.map(w => escapeRegex(w.word)).filter(Boolean)
  if (escaped.length === 0) return text
  const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')

  const parts: React.ReactNode[] = []
  let lastIdx = 0
  let m: RegExpExecArray | null
  let i = 0

  while ((m = re.exec(text)) !== null) {
    const [match] = m
    const start = m.index
    const end = start + match.length

    if (start > lastIdx) parts.push(<Text key={`t-${i++}`}>{text.slice(lastIdx, start)}</Text>)

    const orig = match
    const found = words.find(w => w.word.toLowerCase() === orig.toLowerCase())
    const insight = found?.insight
    const detailed = found?.detailed_explanation

    parts.push(
      <Text
        key={`kw-${i++}`}
        style={styles.keyword}
        onPress={() => onTap(orig, insight, detailed)}
      >
        {orig}
      </Text>
    )

    lastIdx = end
  }

  if (lastIdx < text.length) parts.push(<Text key={`t-${i++}`}>{text.slice(lastIdx)}</Text>)
  return parts
}

function escapeRegex(s: string) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingBottom: 60 },
  verseRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, borderRadius: 6, paddingRight: 6 },
  verseRowHighlighted: { backgroundColor: colors.highlight.yellow },

  verseNum: { width: 28, textAlign: 'right', marginRight: 8, color: colors.text.muted, fontWeight: '700' },
  keyTint: { color: colors.accent.tertiary, textDecorationLine: 'underline' },

  verseText: { flex: 1, color: colors.text.primary, lineHeight: 22 },
  verseTextHighlighted: { fontWeight: '600' },

  keyword: { color: colors.accent.tertiary, textDecorationLine: 'underline' },

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
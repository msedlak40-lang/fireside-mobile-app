// src/components/ExpandableSection.tsx (fixed)
import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native'
import { supabase } from '../lib/supabaseClient'
import MarkdownRenderer from './MarkdownRenderer'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type Tier = 'basic' | 'advanced'

type Props = {
  title: string
  initiallyExpanded?: boolean
  children?: React.ReactNode
  content?: string
  markdown?: string
  /** Annotation UI */
  enableAnnotations?: boolean
  /** Context for annotation keys (optional) */
  book_name?: string | null
  bookName?: string | null
  chapter?: number | null
  studyTier?: Tier | null
  /** Override the slug source; defaults to title */
  sectionKey?: string | null
  /** Tell parent when a note/highlight is added */
  onAnnotationAdded?: () => void
}

/** Persist a summary note/highlight entry to Supabase */
async function insertSummaryEntry({
  type,
  book,
  chapter,
  sectionSlug,
  paraIndex,
  color,
  note,
  studyTier,
}: {
  type: 'note' | 'highlight'
  book: string
  chapter: number
  sectionSlug: string
  paraIndex: number
  color?: 'yellow' | 'green' | 'pink' | 'blue'
  note?: string
  studyTier?: Tier | null
}) {
  try {
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth?.user?.id
    if (!userId) return
    const context_key = studyTier
      ? `p:${studyTier}:${sectionSlug}:${paraIndex}`
      : `s:${sectionSlug}:p${paraIndex}`
    const payload: any = {
      user_id: userId,
      book_name: book,
      chapter_number: chapter,
      context_type: 'summary',
      context_key,
      entry_type: type,
      study_tier: studyTier ?? null,
    }
    if (type === 'highlight') payload.highlight_color = color ?? 'yellow'
    if (type === 'note') payload.note_markdown = note ?? ''
    await supabase.from('user_chapter_entries').insert(payload)
  } catch (e) {
    console.warn('insertSummaryEntry failed', e)
  }
}

/** Slug helper kept simple & stable */
function slugify(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
}

/** Split markdown into logical blocks, preserving code fences. */
function splitMarkdownIntoBlocks(markdown?: string | null): string[] {
  const src = String(markdown ?? '')
  if (!src.trim()) return []
  const lines = src.split('\n')

  const blocks: string[] = []
  let buf: string[] = []
  let inCode = false

  const flush = () => {
    if (buf.length) blocks.push(buf.join('\n').trim())
    buf = []
  }

  for (const line of lines) {
    const isFence = /^```/.test(line)
    if (isFence) {
      inCode = !inCode
      buf.push(line)
      if (!inCode) flush()
      continue
    }
    if (!inCode && /^\s*$/.test(line)) {
      flush()
      continue
    }
    buf.push(line)
  }
  flush()

  // Merge solitary headings with the next para for nicer reading
  const merged: string[] = []
  for (let i = 0; i < blocks.length; i++) {
    const cur = blocks[i]
    if (/^#{1,6}\s+/.test(cur) && (i + 1) < blocks.length && !/^```/.test(blocks[i + 1])) {
      merged.push([cur, blocks[i + 1]].join('\n'))
      i++
    } else {
      merged.push(cur)
    }
  }
  return merged
}

export default function ExpandableSection({
  title,
  initiallyExpanded = false,
  children,
  content,
  markdown,
  enableAnnotations = false,
  book_name,
  bookName,
  chapter,
  studyTier,
  sectionKey,
  onAnnotationAdded,
}: Props) {
  const [expanded, setExpanded] = useState<boolean>(!!initiallyExpanded)

  // Local-only annotation state
  const [noteModalVisible, setNoteModalVisible] = useState(false)
  const [activeParaIndex, setActiveParaIndex] = useState<number | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [paraHighlights, setParaHighlights] = useState<Record<number, 'yellow' | 'green' | 'pink' | 'blue'>>({})

  const resolvedContent = typeof content === 'string' ? content : markdown ?? ''
  const paraBlocks = useMemo(() => splitMarkdownIntoBlocks(resolvedContent), [resolvedContent])

  const sectionSlug = useMemo(() => {
    const base = String(sectionKey || title)
    return slugify(base)
  }, [sectionKey, title])

  const contextKey = useMemo(() => {
    const b = String(book_name || bookName || '').trim()
    const c = typeof chapter === 'number' ? chapter : ''
    return [b, c, sectionSlug].filter(Boolean).join(':')
  }, [book_name, bookName, chapter, sectionSlug])

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }

  const openNoteForPara = (idx: number) => {
    if (!enableAnnotations) return
    setActiveParaIndex(idx)
    setNoteDraft('')
    setNoteModalVisible(true)
  }

  const saveNote = async () => {
    setNoteModalVisible(false)
    if (enableAnnotations) {
      const b = String(book_name || bookName || '').trim()
      const c = typeof chapter === 'number' ? chapter : null
      if (b && c != null && activeParaIndex != null) {
        await insertSummaryEntry({ type: 'note', book: b, chapter: c, sectionSlug, paraIndex: activeParaIndex, note: noteDraft, studyTier })
      }
    }
    setActiveParaIndex(null)
    onAnnotationAdded?.()
  }

  const setHighlight = async (idx: number, color: 'yellow' | 'green' | 'pink' | 'blue') => {
    setParaHighlights(prev => ({ ...prev, [idx]: color }))
    if (enableAnnotations) {
      const b = String(book_name || bookName || '').trim()
      const c = typeof chapter === 'number' ? chapter : null
      if (b && c != null) {
        await insertSummaryEntry({ type: 'highlight', book: b, chapter: c, sectionSlug, paraIndex: idx, color, studyTier })
      }
    }
    onAnnotationAdded?.()
  }

  const clearHighlight = (idx: number) => {
    setParaHighlights(prev => {
      const copy = { ...prev }
      delete copy[idx]
      return copy
    })
    onAnnotationAdded?.()
  }

  const shouldRenderChildren = React.Children.count(children) > 0

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.8}
        style={styles.header}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {/* Body */}
      {expanded && (
        <View style={styles.body}>
          {shouldRenderChildren ? (
            children
          ) : (
            <>
              {paraBlocks.map((block, idx) => (
                <View key={idx} style={styles.paraWrap}>
                  <TouchableOpacity
                    activeOpacity={enableAnnotations ? 0.8 : 1}
                    style={[styles.para, paraHighlights[idx] ? { backgroundColor: '#fffbe6', borderColor: '#fde68a' } : null]}
                    onLongPress={() => enableAnnotations ? openNoteForPara(idx) : undefined}
                    onPress={() => enableAnnotations ? setHighlight(idx, 'yellow') : undefined}
                  >
                    <MarkdownRenderer content={block} />
                  </TouchableOpacity>

                  {enableAnnotations ? (
                    <View style={styles.paraActions}>
                      <TouchableOpacity onPress={() => openNoteForPara(idx)}>
                        <Text style={styles.paraActionText}>Note</Text>
                      </TouchableOpacity>
                      <Text style={styles.dot}>·</Text>
                      <TouchableOpacity onPress={() => setHighlight(idx, 'yellow')}>
                        <Text style={styles.paraActionText}>Highlight</Text>
                      </TouchableOpacity>
                      {paraHighlights[idx] ? (
                        <>
                          <Text style={styles.dot}>·</Text>
                          <TouchableOpacity onPress={() => clearHighlight(idx)}>
                            <Text style={[styles.paraActionText, styles.clearText]}>Clear</Text>
                          </TouchableOpacity>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          )}

          {/* Note modal */}
          <Modal visible={noteModalVisible} animationType="fade" transparent onRequestClose={() => setNoteModalVisible(false)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Add Note</Text>
                <Text style={styles.modalLabel}>Context</Text>
                <Text style={styles.modalContext}>{contextKey}{activeParaIndex != null ? ` • p.${activeParaIndex}` : ''}</Text>

                <Text style={styles.modalLabel}>Note</Text>
                <TextInput
                  style={styles.noteInput}
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  placeholder="Write your note..."
                  multiline
                />

                <View style={styles.modalRow}>
                  <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setNoteModalVisible(false)}>
                    <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btn} onPress={saveNote}>
                    <Text style={styles.btnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginVertical: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  chevron: { fontSize: 16, color: '#6b7280' },
  body: { paddingHorizontal: 12, paddingBottom: 10 },

  paraWrap: { marginTop: 8 },
  para: { borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 10, padding: 10 },
  paraActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  paraActionText: { color: '#111827', fontWeight: '700' },
  clearText: { color: '#b91c1c' },
  dot: { color: '#9ca3af' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, color: '#111827' },
  modalLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  modalContext: { fontSize: 12, color: '#111827', fontWeight: '700' },
  noteInput: { minHeight: 120, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, color: '#111827' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },

  btn: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  btnText: { color: '#fff', fontWeight: '800' },
  btnGhost: { backgroundColor: 'transparent' },
  btnGhostText: { color: '#6b7280' },
})

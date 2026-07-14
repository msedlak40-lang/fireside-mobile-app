// src/components/Progress/ReadingProgressModal.tsx
// Motivation-focused drill-down behind the home-screen reading bar: testament bars that
// expand into their sections, an honest full-Bible completion badge, a "closest win" nudge,
// and a continue-reading tap. All data is current-cycle scoped (matches the book grid).
import React, { useCallback, useEffect, useState } from 'react'
import { Modal, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { colors } from '../../theme/colors'
import { CHROME_MAX_SCALE } from '../../lib/textScaling'
import { getReadingBreakdown, type ReadingBreakdown, type TestamentProgress, type SectionProgress, type BookProgress } from '../../services/readingBreakdown'
import { getLastReadingPosition, getPreferredTranslation, type LastReadingPosition } from '../../services/userPrefs'

const BLUE = '#3b82f6'   // reading-blue, matches the hero bar
const TRACK = '#e5e7eb'  // bar track
const DONE = '#16a34a'   // reward state: a completed section/testament

function Bar({ read, total, complete, height = 10 }: { read: number; total: number; complete: boolean; height?: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((read / total) * 100)) : 0
  return (
    <View style={{ height, backgroundColor: TRACK, borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: complete ? DONE : BLUE }} />
    </View>
  )
}

// Level 3: a single book (display-only, not tappable). Shows all books incl. 0%.
function BookRow({ b }: { b: BookProgress }) {
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 13, color: colors.text.primary }}>
          {b.complete ? '✓ ' : ''}{b.name}
        </Text>
        <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 12, color: b.complete ? DONE : colors.text.secondary, fontWeight: '600' }}>
          {b.read} / {b.total} · {b.pct}%
        </Text>
      </View>
      <Bar read={b.read} total={b.total} complete={b.complete} height={6} />
    </View>
  )
}

// Level 2: a section header (tappable) that expands into its books, indented on a rail
// so a man three levels deep still sees which section he's inside.
function SectionBlock({ s, expanded, onToggle }: { s: SectionProgress; expanded: boolean; onToggle: () => void }) {
  return (
    <View style={{ marginTop: 14 }}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 14, color: colors.text.primary, fontWeight: '700' }}>
            {s.complete ? '✓ ' : ''}{s.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 13, color: s.complete ? DONE : colors.text.secondary, fontWeight: '700' }}>
              {s.read} / {s.total} · {s.pct}%
            </Text>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 13, color: colors.text.secondary }}>{expanded ? '▾' : '▸'}</Text>
          </View>
        </View>
        <Bar read={s.read} total={s.total} complete={s.complete} />
      </TouchableOpacity>
      {expanded && (
        <View style={{ marginTop: 6, marginLeft: 10, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.border.default }}>
          {s.books.map((b) => <BookRow key={b.name} b={b} />)}
        </View>
      )}
    </View>
  )
}

// Level 1: a testament card that expands into its sections.
function TestamentCard({
  t, expanded, onToggle, expandedSections, onToggleSection,
}: {
  t: TestamentProgress
  expanded: boolean
  onToggle: () => void
  expandedSections: Record<string, boolean>
  onToggleSection: (name: string) => void
}) {
  return (
    <View style={{
      marginBottom: 14, padding: 16, backgroundColor: colors.background.secondary, borderRadius: 14,
      borderLeftWidth: 6, borderLeftColor: t.complete ? DONE : BLUE,
    }}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 15, fontWeight: '800', color: colors.text.primary }}>
            {t.complete ? '✓ ' : ''}{t.label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 13, fontWeight: '700', color: t.complete ? DONE : colors.text.secondary }}>
              {t.read} / {t.total} · {t.pct}%
            </Text>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 14, color: colors.text.secondary }}>{expanded ? '▾' : '▸'}</Text>
          </View>
        </View>
        <Bar read={t.read} total={t.total} complete={t.complete} />
      </TouchableOpacity>
      {expanded && (
        <View style={{ marginTop: 4 }}>
          {t.sections.map((s) => (
            <SectionBlock
              key={s.name}
              s={s}
              expanded={!!expandedSections[s.name]}
              onToggle={() => onToggleSection(s.name)}
            />
          ))}
        </View>
      )}
    </View>
  )
}

export default function ReadingProgressModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const navigation = useNavigation<any>()
  const [data, setData] = useState<ReadingBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastPos, setLastPos] = useState<LastReadingPosition | null>(null)
  const [expanded, setExpanded] = useState<Record<'OT' | 'NT', boolean>>({ OT: false, NT: false })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!visible) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const [bd, lp] = await Promise.all([getReadingBreakdown(), getLastReadingPosition()])
        if (!alive) return
        setData(bd)
        setLastPos(lp)
        // Auto-expand the testament holding the last read position; both collapsed otherwise.
        // Sections start collapsed so a fresh open isn't a wall of book bars.
        const t = lp ? bd.testamentByBook[lp.bookName] : null
        setExpanded({ OT: t === 'OT', NT: t === 'NT' })
        setExpandedSections({})
      } catch (e) {
        console.warn('[ReadingProgressModal] load failed', e)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [visible])

  const resume = useCallback(async () => {
    if (!lastPos) {
      onClose()
      navigation.navigate('BibleTab', { screen: 'BibleHome' })
      return
    }
    const translation = (await getPreferredTranslation()) ?? undefined
    onClose()
    navigation.navigate('BibleTab', {
      screen: 'Chapter',
      params: {
        bookId: lastPos.bookId,
        book_name: lastPos.bookName,
        bookName: lastPos.bookName,
        chapter: lastPos.chapter,
        translation,
      },
    })
  }, [lastPos, navigation, onClose])

  const milestone = data && data.completionsCount >= 1
    ? (data.completionsCount === 1
        ? "🎉 You've read the entire Bible"
        : `🎉 You've read the entire Bible — ${data.completionsCount}× complete`)
    : null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          backgroundColor: colors.background.primary,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          paddingTop: 20, paddingBottom: 24, maxHeight: '88%',
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 }}>
            <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
              Reading Progress
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 24, color: colors.text.secondary }}>×</Text>
            </TouchableOpacity>
          </View>

          {loading || !data ? (
            <View style={{ padding: 48, alignItems: 'center' }}>
              <ActivityIndicator color={colors.accent.primary} />
            </View>
          ) : (
            <>
              <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ paddingHorizontal: 20, fontSize: 14, color: colors.text.secondary, marginBottom: 12 }}>
                {data.overall.read} / {data.overall.total} chapters · {data.overall.pct}% this cycle
              </Text>

              <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 8 }}>
                {/* Honest completion badge */}
                {milestone && (
                  <View style={{
                    marginBottom: 14, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
                    backgroundColor: 'rgba(22,163,74,0.12)', borderWidth: 1, borderColor: 'rgba(22,163,74,0.4)',
                  }}>
                    <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ fontSize: 15, fontWeight: '800', color: DONE, textAlign: 'center' }}>
                      {milestone}
                    </Text>
                  </View>
                )}

                {/* Closest-win nudge — only when genuinely close (>60%, <100%) */}
                {data.closestWin && (
                  <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ marginBottom: 14, fontSize: 14, fontWeight: '700', color: BLUE, textAlign: 'center' }}>
                    You're {data.closestWin.pct}% through the {data.closestWin.name} — almost there!
                  </Text>
                )}

                {data.testaments.map((t) => (
                  <TestamentCard
                    key={t.key}
                    t={t}
                    expanded={expanded[t.key]}
                    onToggle={() => setExpanded((prev) => ({ ...prev, [t.key]: !prev[t.key] }))}
                    expandedSections={expandedSections}
                    onToggleSection={(name) => setExpandedSections((prev) => ({ ...prev, [name]: !prev[name] }))}
                  />
                ))}
              </ScrollView>

              {/* Continue reading */}
              <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                <TouchableOpacity
                  onPress={resume}
                  style={{ padding: 16, backgroundColor: BLUE, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text maxFontSizeMultiplier={CHROME_MAX_SCALE} style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                    {lastPos ? `Continue: ${lastPos.bookName} ${lastPos.chapter} →` : 'Start reading →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

// src/components/MarkdownRenderer.tsx
import React from 'react'
import { View, Text, StyleSheet, Linking, Platform } from 'react-native'
import { colors } from '../theme/colors'

type Props = {
  /** Preferred prop */
  content?: string | null
  /** Legacy prop (kept for back-compat) */
  markdown?: string | null
  /** Allow text selection via long-press */
  selectable?: boolean
  /** Extra vertical space below each paragraph (px). Off by default. */
  paragraphSpacing?: number
}

export default function MarkdownRenderer({ content, markdown, selectable, paragraphSpacing }: Props) {
  const raw = typeof content === 'string' ? content : markdown
  const safe = typeof raw === 'string' ? raw : ''
  if (!safe.trim()) return null

  const lines = safe.replace(/\r\n/g, '\n').split('\n')

  const elements: React.ReactNode[] = []
  let inCode = false
  let codeBuf: string[] = []
  let listBuf: string[] = []
  let inList = false
  let listType: 'ul' | 'ol' = 'ul'
  let idx = 0

  const flushParagraph = (para: string) => {
    const children = renderInline(para)
    elements.push(
      <Text
        key={`p-${idx++}`}
        selectable={selectable}
        style={paragraphSpacing ? [styles.paragraph, { marginBottom: paragraphSpacing }] : styles.paragraph}
      >
        {children}
      </Text>
    )
  }

  const flushCode = () => {
    const code = codeBuf.join('\n')
    elements.push(
      <View key={`code-${idx++}`} style={styles.codeBlock}>
        <Text style={styles.codeText}>{code}</Text>
      </View>
    )
    codeBuf = []
  }

  const flushList = () => {
    if (listBuf.length === 0) return
    const items = listBuf.map((item, i) => {
      const t = item.replace(/^\s*([-*+]|\d+\.)\s+/, '')
      return (
        <View key={`li-${idx++}-${i}`} style={styles.listItem}>
          <Text style={styles.bullet}>{listType === 'ul' ? '•' : `${i + 1}.`}</Text>
          <Text selectable={selectable} style={styles.listText}>{renderInline(t)}</Text>
        </View>
      )
    })
    elements.push(<View key={`list-${idx++}`} style={styles.listWrap}>{items}</View>)
    listBuf = []
    inList = false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Fences
    if (/^\s*```/.test(line)) {
      if (!inCode) {
        // starting code
        inCode = true
        codeBuf = []
      } else {
        // closing code
        inCode = false
        flushCode()
      }
      continue
    }
    if (inCode) {
      codeBuf.push(line)
      continue
    }

    // horizontal rule
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      flushList()
      elements.push(<View key={`hr-${idx++}`} style={styles.horizontalRule} />)
      continue
    }

    // Headings
    if (/^#####\s+/.test(line)) {
      flushList()
      elements.push(<Text key={`h5-${idx++}`} selectable={selectable} style={styles.h5}>{renderInline(line.replace(/^#####\s+/, ''))}</Text>)
      continue
    }
    if (/^####\s+/.test(line)) {
      flushList()
      elements.push(<Text key={`h4-${idx++}`} selectable={selectable} style={styles.h4}>{renderInline(line.replace(/^####\s+/, ''))}</Text>)
      continue
    }
    if (/^###\s+/.test(line)) {
      flushList()
      elements.push(<Text key={`h3-${idx++}`} selectable={selectable} style={styles.h3}>{renderInline(line.replace(/^###\s+/, ''))}</Text>)
      continue
    }
    if (/^##\s+/.test(line)) {
      flushList()
      elements.push(<Text key={`h2-${idx++}`} selectable={selectable} style={styles.h2}>{renderInline(line.replace(/^##\s+/, ''))}</Text>)
      continue
    }
    if (/^#\s+/.test(line)) {
      flushList()
      elements.push(<Text key={`h1-${idx++}`} selectable={selectable} style={styles.h1}>{renderInline(line.replace(/^#\s+/, ''))}</Text>)
      continue
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      flushList()
      const text = line.replace(/^\s*>\s?/, '')
      elements.push(
        <View key={`quote-${idx++}`} style={styles.quote}>
          <Text selectable={selectable} style={styles.quoteText}>{renderInline(text)}</Text>
        </View>
      )
      continue
    }

    // List item
    if (/^\s*([-*+])\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      if (!inList) {
        inList = true
        listType = /^\s*\d+\.\s+/.test(line) ? 'ol' : 'ul'
        listBuf = []
      }
      listBuf.push(line)
      continue
    } else if (inList && line.trim() === '') {
      flushList()
      continue
    } else if (inList) {
      // continuation of list item
      const last = listBuf.pop() || ''
      listBuf.push(`${last} ${line.trim()}`)
      continue
    }

    // empty line -> new paragraph
    if (line.trim() === '') {
      continue
    }

    // default paragraph
    flushParagraph(line)
  }

  // flush tail
  if (inCode) flushCode()
  if (inList) flushList()

  return <View style={styles.root}>{elements}</View>
}

// --- Inline renderer -------------------------------------------------------

function renderInline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = []
  let key = 0

  // Single left-to-right scan preserves the original order of inline spans.
  // Order in the alternation matters: link, bold (**), italic (*), code.
  const pattern = /\[(.+?)\]\((https?:\/\/[^\s)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`/g
  let lastIndex = 0
  let m: RegExpExecArray | null

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIndex) {
      nodes.push(<Text key={`t-${key++}`}>{text.slice(lastIndex, m.index)}</Text>)
    }
    if (m[1] !== undefined) {
      const url = m[2]
      nodes.push(
        <Text key={`a-${key++}`} style={styles.link} onPress={() => Linking.openURL(url)}>{m[1]}</Text>
      )
    } else if (m[3] !== undefined) {
      nodes.push(<Text key={`b-${key++}`} style={styles.bold}>{m[3]}</Text>)
    } else if (m[4] !== undefined) {
      nodes.push(<Text key={`i-${key++}`} style={styles.italic}>{m[4]}</Text>)
    } else if (m[5] !== undefined) {
      nodes.push(<Text key={`c-${key++}`} style={styles.inlineCode}>{m[5]}</Text>)
    }
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(<Text key={`t-${key++}`}>{text.slice(lastIndex)}</Text>)
  }

  return nodes
}

// --- Styles ----------------------------------------------------------------

const styles = StyleSheet.create({
  root: { gap: 4 },
  h1: { fontSize: 21, fontWeight: '800', marginTop: 20, marginBottom: 10, color: colors.text.primary },
  h2: { fontSize: 19, fontWeight: '800', marginTop: 16, marginBottom: 8, color: colors.text.primary },
  h3: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 6, color: colors.text.primary },
  h4: { fontSize: 15, fontWeight: '700', marginTop: 10, marginBottom: 6, color: colors.text.primary },
  h5: { fontSize: 14, fontWeight: '700', marginTop: 8, marginBottom: 4, color: colors.text.primary },

  paragraph: { fontSize: 15, lineHeight: 23, color: colors.text.secondary },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.border.default, paddingLeft: 10, marginVertical: 6 },
  quoteText: { fontStyle: 'italic', color: colors.text.secondary },

  listWrap: { marginVertical: 4 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bullet: { width: 18, textAlign: 'left', fontSize: 14, lineHeight: 22, color: colors.text.secondary },
  listText: { flex: 1, fontSize: 15, lineHeight: 23, color: colors.text.secondary },

  horizontalRule: { height: 1, backgroundColor: colors.border.default, marginVertical: 8 },

  bold: { fontWeight: '800', color: colors.text.primary },
  italic: { fontStyle: 'italic', color: colors.text.primary },
  link: { textDecorationLine: 'underline', color: colors.accent.primary },

  codeBlock: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
  },
  codeText: { color: colors.text.primary, fontFamily: Platform?.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 },
  inlineCode: {
    fontFamily: Platform?.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 4,
    borderRadius: 4,
    color: colors.text.primary,
  },
})

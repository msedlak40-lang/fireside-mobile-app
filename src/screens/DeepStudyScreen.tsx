// src/screens/DeepStudyScreen.tsx
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';
import {
  getVerseStudyData,
  getStrongsEntries,
  type VerseWord,
  type StrongsEntry,
} from '../services/strongsStudy';

type RouteParams = {
  bookName: string;
  chapter: number;
  verseNumber: number;
  verseText: string;
};

export default function DeepStudyScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { bookName, chapter, verseNumber, verseText } = route.params as RouteParams;
  const verse = verseNumber;
  const verseReference = `${bookName} ${chapter}:${verseNumber}`;

  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<VerseWord[]>([]);
  const [lexicon, setLexicon] = useState<Record<string, StrongsEntry>>({});
  const [selectedWord, setSelectedWord] = useState<VerseWord | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    loadStudyData();
  }, []);

  async function loadStudyData() {
    try {
      const data = await getVerseStudyData(bookName, chapter, verse);
      setWords(data.words);

      const strongsNumbers = data.words.map((w) => w.strongs_number);
      if (strongsNumbers.length > 0) {
        const entries = await getStrongsEntries(strongsNumbers);
        const map: Record<string, StrongsEntry> = {};
        for (const e of entries) {
          map[e.strongs_number] = e;
        }
        setLexicon(map);
      }
    } catch (err) {
      console.error('[DeepStudy] load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{'\u2039'}</Text>
            <Text style={styles.backLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerBarTitle} numberOfLines={2} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{verseReference}</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
          <Text style={{ color: colors.text.secondary, marginTop: 12 }} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Loading study data...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
    {/* Custom header bar */}
    <View style={styles.headerBar}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      >
        <Text style={styles.backArrow} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{'\u2039'}</Text>
        <Text style={styles.backLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerBarTitle} numberOfLines={2} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{verseReference}</Text>
      <View style={{ width: 80 }} />
    </View>

    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Verse Header */}
      <View style={styles.verseHeader}>
        <Text style={styles.verseReference} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{verseReference}</Text>
        <Text style={styles.verseTextDisplay}>"{verseText}"</Text>
        <Text style={styles.translationLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>KJV</Text>
      </View>

      {/* Strong's Concordance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Strong's Concordance</Text>
        {words.length > 0 ? (
          <View style={styles.wordsGrid}>
            {words.map((word) => {
              const entry = lexicon[word.strongs_number];
              return (
                <TouchableOpacity
                  key={`${word.word_position}`}
                  style={styles.wordCard}
                  onPress={() => setSelectedWord(word)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.wordEnglish} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{word.english_word}</Text>
                  <Text style={styles.wordOriginal}>{word.original_word}</Text>
                  <Text style={styles.wordStrongs} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{word.strongs_number}</Text>
                  {entry && (
                    <Text style={styles.wordDef} numberOfLines={2}>
                      {entry.short_definition}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              Strong's data not yet available for this verse.
            </Text>
          </View>
        )}
      </View>

      {/* Strong's Detail Modal */}
      <Modal
        visible={!!selectedWord}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedWord(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Fixed header — stays pinned while the definition scrolls */}
            {selectedWord && (
              <Text style={styles.modalTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                {selectedWord.english_word} ({selectedWord.strongs_number})
              </Text>
            )}
            <View style={styles.modalDivider} />

            {/* Scrollable body */}
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
            >
              {selectedWord && (() => {
                const entry = lexicon[selectedWord.strongs_number];
                const translit = selectedWord.transliteration || entry?.transliteration || '';
                return (
                  <>
                    <Text style={styles.modalLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Original Word</Text>
                    <Text style={styles.modalValue}>
                      {selectedWord.original_word}
                      {translit ? ` (${translit})` : ''}
                    </Text>

                    {selectedWord.grammar_code && (
                      <>
                        <Text style={styles.modalLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Grammar</Text>
                        <Text style={styles.modalValue}>{selectedWord.grammar_code}</Text>
                      </>
                    )}

                    {entry && (
                      <>
                        <Text style={styles.modalLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Definition</Text>
                        <Text style={styles.modalValue}>{entry.short_definition}</Text>

                        {entry.detailed_definition && (
                          <>
                            <Text style={styles.modalLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Detailed</Text>
                            <Text style={styles.modalValue}>{entry.detailed_definition}</Text>
                          </>
                        )}

                        {entry.usage_notes && (
                          <>
                            <Text style={styles.modalLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Usage / Derivation</Text>
                            <Text style={styles.modalValue}>{entry.usage_notes}</Text>
                          </>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </ScrollView>

            {/* Fixed footer — always reachable */}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedWord(null)}
            >
              <Text style={styles.modalCloseText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 12,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backArrow: {
    fontSize: 32,
    color: colors.accent.primary,
    marginRight: 2,
    lineHeight: 32,
  },
  backLabel: {
    fontSize: 16,
    color: colors.accent.primary,
    fontWeight: '600',
  },
  headerBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.primary },

  verseHeader: {
    backgroundColor: colors.background.elevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.primary,
  },
  verseReference: {
    color: colors.accent.primary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  verseTextDisplay: {
    color: colors.text.primary,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  translationLabel: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },

  section: { marginBottom: 24 },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: 8,
    padding: 10,
    minWidth: '30%',
    maxWidth: '48%',
    flexGrow: 1,
  },
  wordEnglish: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  wordOriginal: {
    color: colors.accent.tertiary,
    fontSize: 16,
    marginTop: 2,
  },
  wordStrongs: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: 2,
  },
  wordDef: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },

  emptySection: {
    backgroundColor: colors.background.elevated,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  emptySectionText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },

  crossRefCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crossRefText: {
    color: colors.accent.tertiary,
    fontSize: 15,
    fontWeight: '600',
  },
  crossRefVotes: {
    color: colors.text.muted,
    fontSize: 12,
  },
  showMoreBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  showMoreText: {
    color: colors.accent.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  notesTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesStatus: {
    color: colors.accent.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: colors.background.elevated,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    color: colors.text.primary,
    fontSize: 14,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  notesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  charCount: {
    color: colors.text.muted,
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 14,
  },

  studiedBtn: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#166534',
  },
  studiedBtnActive: {
    backgroundColor: '#166534',
  },
  studiedBtnText: {
    color: '#bbf7d0',
    fontSize: 16,
    fontWeight: '700',
  },
  studiedBtnTextActive: {
    color: '#bbf7d0',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '90%',
    maxHeight: '80%',
    alignSelf: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: 12,
    padding: 16,
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  modalTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: 12,
  },
  modalLabel: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 2,
  },
  modalValue: {
    color: colors.text.primary,
    fontSize: 15,
    lineHeight: 22,
  },
  modalClose: {
    marginTop: 16,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.text.secondary,
    fontWeight: '600',
  },

  crossRefModalCard: {
    width: '90%',
    alignSelf: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: 12,
    padding: 16,
  },
  crossRefModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crossRefModalTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  crossRefModalX: {
    fontSize: 28,
    color: colors.text.secondary,
    lineHeight: 28,
    paddingHorizontal: 4,
  },
  crossRefModalVerse: {
    color: colors.text.primary,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  crossRefModalAttrib: {
    color: colors.text.muted,
    fontSize: 13,
    marginTop: 8,
  },
  crossRefAddBtn: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  crossRefAddBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  crossRefChapterBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  crossRefChapterBtnText: {
    color: colors.accent.primary,
    fontWeight: '600',
    fontSize: 15,
  },
});

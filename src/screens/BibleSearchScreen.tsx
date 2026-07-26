// src/screens/BibleSearchScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';
import { supabase } from '../lib/supabaseClient';
import { parseReference } from '../utils/bibleReferenceParser';
import { saveBattleVersesBatch, saveBattleVerse } from '../services/battleVerses';
import { CORE_THEMES, THEME_DESCRIPTIONS, THEME_COLORS } from '../services/themes';
import type { ChapterTheme } from '../services/themes';
import { hybridThemeSearch, getThemeChapterCounts } from '../services/themeSearch';
import VerseSummaryCard, { type CrossRefItem } from '../components/VerseSummaryCard';
import { getVerseLifeApplication, type VerseLifeApplication } from '../services/scripture';
import { getCrossReferences, type CrossReference } from '../services/strongsStudy';
import { setStudyDepth } from '../services/userPrefs';
import { useGuestMode } from '../context/GuestModeContext';

type SearchResult = {
  book_name: string;
  chapter_number: number;
  verse_number: number;
  verse_text: string;
  reference: string;
};

const TRANSLATIONS = ['KJV', 'WEB'];

export default function BibleSearchScreen() {
  const navigation = useNavigation<any>();
  const { isGuest, promptSignIn } = useGuestMode();
  const [searchQuery, setSearchQuery] = useState('');
  const [themeInput, setThemeInput] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [themeChapterResults, setThemeChapterResults] = useState<ChapterTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'lookup' | 'theme'>('lookup');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [translation, setTranslation] = useState('KJV');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [themeCounts, setThemeCounts] = useState<Record<string, number>>({});
  const [modalChapter, setModalChapter] = useState<ChapterTheme | null>(null);

  // Verse summary card state
  const [summaryResult, setSummaryResult] = useState<SearchResult | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState<VerseLifeApplication | null>(null);
  const [summaryCrossRefs, setSummaryCrossRefs] = useState<CrossRefItem[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Load theme counts on mount
  useEffect(() => {
    getThemeChapterCounts().then(setThemeCounts).catch(() => {});
  }, []);

  // ------------------------------------------------------------------
  // Search handlers
  // ------------------------------------------------------------------

  const handleTextSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    setSelectedKeys(new Set());
    setThemeChapterResults([]);
    try {
      // 1. Try flexible reference parsing
      const parsed = parseReference(query);
      if (parsed) {
        if (parsed.verseStart === 0) {
          // Chapter-only lookup (e.g., "John 3")
          const { data, error } = await supabase
            .from('bible_verses')
            .select('book_name, chapter_number, verse_number, verse_text')
            .ilike('book_name', `${parsed.book}%`)
            .eq('chapter_number', parsed.chapter)
            .eq('translation', translation)
            .order('verse_number', { ascending: true })
            .limit(200);
          if (!error && data && data.length > 0) {
            setResults(data.map(toResult));
            return;
          }
        } else {
          // Verse or range lookup
          let q = supabase
            .from('bible_verses')
            .select('book_name, chapter_number, verse_number, verse_text')
            .ilike('book_name', `${parsed.book}%`)
            .eq('chapter_number', parsed.chapter)
            .gte('verse_number', parsed.verseStart)
            .lte('verse_number', parsed.verseEnd ?? parsed.verseStart)
            .eq('translation', translation)
            .order('verse_number', { ascending: true });
          const { data, error } = await q;
          if (!error && data && data.length > 0) {
            setResults(data.map(toResult));
            return;
          }
        }
      }

      // 2. Fall back to full-text / keyword search
      await keywordSearch(query);
    } catch (err) {
      console.error('[BibleSearch] search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [translation]);

  const keywordSearch = async (query: string) => {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (keywords.length === 0) { setResults([]); return; }

    // Try Supabase full-text search first
    const { data: ftsData, error: ftsErr } = await supabase
      .from('bible_verses')
      .select('book_name, chapter_number, verse_number, verse_text')
      .textSearch('verse_text', query)
      .eq('translation', translation)
      .limit(100);

    if (!ftsErr && ftsData && ftsData.length > 0) {
      const ranked = rankResults(ftsData, keywords, query);
      setResults(ranked.map(toResult));
      return;
    }

    // Fallback: ILIKE with first keyword
    const { data, error } = await supabase
      .from('bible_verses')
      .select('book_name, chapter_number, verse_number, verse_text')
      .ilike('verse_text', `%${keywords[0]}%`)
      .eq('translation', translation)
      .limit(100);

    if (error) { setResults([]); return; }
    const ranked = rankResults(data || [], keywords, query);
    setResults(ranked.map(toResult));
  };

  const handleThemeSearch = useCallback(async (theme: string) => {
    setLoading(true);
    setSelectedKeys(new Set());
    setThemeChapterResults([]);
    setResults([]);
    try {
      const { themeChapters, verseMatches } = await hybridThemeSearch(theme, translation);
      setThemeChapterResults(themeChapters);
      setResults(verseMatches.map(toResult));
    } catch (err) {
      console.error('[BibleSearch] theme search failed:', err);
      setThemeChapterResults([]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [translation]);

  const handleSearch = useCallback(() => {
    if (searchMode === 'lookup') {
      handleTextSearch(searchQuery);
    } else {
      if (themeInput) { handleThemeSearch(themeInput); setSelectedTheme(null); }
      else if (selectedTheme) { handleThemeSearch(selectedTheme); }
    }
  }, [searchMode, searchQuery, themeInput, selectedTheme, handleTextSearch, handleThemeSearch]);

  // ------------------------------------------------------------------
  // Selection & batch save
  // ------------------------------------------------------------------

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedKeys.size === results.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(results.map(verseKey)));
    }
  };

  const handleBatchSave = async () => {
    if (isGuest) { promptSignIn('save Battle Verses'); return; }
    if (selectedKeys.size === 0) return;
    setSaving(true);
    try {
      const versesToSave = results.filter(r => selectedKeys.has(verseKey(r)));
      const count = await saveBattleVersesBatch(
        versesToSave.map(v => ({
          book_name: v.book_name,
          chapter_number: v.chapter_number,
          verse_number: v.verse_number,
          verse_text: v.verse_text,
        })),
      );
      Alert.alert(
        'Saved to Battle Verses',
        count > 0
          ? `Added ${count} verse${count > 1 ? 's' : ''} to your arsenal.`
          : 'These verses are already in your arsenal.',
      );
      setSelectedKeys(new Set());
    } catch (err) {
      console.error('[BibleSearch] batch save error:', err);
      Alert.alert('Error', 'Could not save verses. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const clearThemeSearch = () => {
    setThemeInput('');
    setResults([]);
    setThemeChapterResults([]);
    setSelectedKeys(new Set());
    setSelectedTheme(null);
  };

  // ------------------------------------------------------------------
  // Verse summary handlers
  // ------------------------------------------------------------------

  const handleResultPress = async (result: SearchResult) => {
    setSummaryResult(result);
    setSummaryContent(null);
    setSummaryCrossRefs([]);
    setSummaryLoading(true);
    setSummaryOpen(true);
    try {
      const [content, refs] = await Promise.all([
        getVerseLifeApplication(result.book_name, result.chapter_number, result.verse_number),
        getCrossReferences(result.book_name, result.chapter_number, result.verse_number, 8),
      ]);
      setSummaryResult(cur => {
        if (cur && verseKey(cur) === verseKey(result)) {
          setSummaryContent(content);
          setSummaryCrossRefs(refs.map(toCrossRefItem));
        }
        return cur;
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleViewCrossRefChapter = (cr: CrossRefItem) => {
    setSummaryOpen(false);
    navigation.navigate('Chapter', { bookName: cr.book, chapter: cr.chapter, translation });
  };

  const handleResultDeeper = () => {
    if (!summaryResult) return;
    // A verse Deeper tap sets the global sticky depth (per spec: written from either surface).
    setStudyDepth('deeper');
    setSummaryOpen(false);
    navigation.navigate('DeepStudy', {
      bookName: summaryResult.book_name,
      chapter: summaryResult.chapter_number,
      verseNumber: summaryResult.verse_number,
      verseText: summaryResult.verse_text,
    });
  };

  const handleResultBattleVerse = async () => {
    if (!summaryResult) return;
    setSummaryOpen(false);
    if (isGuest) { promptSignIn('save Battle Verses'); return; }
    try {
      const saved = await saveBattleVerse(
        summaryResult.book_name, summaryResult.chapter_number,
        summaryResult.verse_number, summaryResult.verse_text,
      );
      if (saved) Alert.alert('Saved!', `${summaryResult.reference} added to Battle Verses`);
      else Alert.alert('Already Saved', 'This verse is already in your Battle Verses');
    } catch { Alert.alert('Error', 'Could not save verse'); }
  };

  const handleGoToChapter = () => {
    if (!summaryResult) return;
    setSummaryOpen(false);
    navigation.navigate('Chapter', {
      bookName: summaryResult.book_name,
      chapter: summaryResult.chapter_number,
      translation,
    });
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const hasQuery = searchQuery.trim() || themeInput.trim() || selectedTheme;
  const hasAnyResults = results.length > 0 || themeChapterResults.length > 0;

  return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1 }}>
        {/* Translation selector */}
        <View style={s.section}>
          <Text style={s.sectionLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Translation:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TRANSLATIONS.map(t => (
              <Pressable
                key={t}
                onPress={() => setTranslation(t)}
                style={[s.chip, translation === t && s.chipActive]}
              >
                <Text style={[s.chipText, translation === t && s.chipTextActive]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Mode toggle */}
        <View style={s.modeRow}>
          <Pressable
            onPress={() => { setSearchMode('lookup'); setResults([]); setThemeChapterResults([]); setSelectedTheme(null); setThemeInput(''); setSelectedKeys(new Set()); }}
            style={[s.modeBtn, searchMode === 'lookup' && s.modeBtnActive]}
          >
            <Text style={[s.modeBtnText, searchMode === 'lookup' && s.modeBtnTextActive]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              Verse / Chapter
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setSearchMode('theme'); setResults([]); setThemeChapterResults([]); setSearchQuery(''); setSelectedKeys(new Set()); }}
            style={[s.modeBtn, searchMode === 'theme' && s.modeBtnActive]}
          >
            <Text style={[s.modeBtnText, searchMode === 'theme' && s.modeBtnTextActive]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              Theme Search
            </Text>
          </Pressable>
        </View>

        {/* Search input — Lookup mode */}
        {searchMode === 'lookup' && (
          <View style={s.inputRow}>
            <View style={s.inputWrap}>
              <TextInput
                placeholder={'John 3:16, John 3:16-18, jn 3 16...'}
                placeholderTextColor={colors.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                style={s.input}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => { setSearchQuery(''); setResults([]); setSelectedKeys(new Set()); }}
                  style={s.clearBtn}
                >
                  <Text style={s.clearX} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{'\u00D7'}</Text>
                </TouchableOpacity>
              )}
            </View>
            <Pressable
              onPress={handleSearch}
              disabled={!searchQuery.trim() || loading}
              style={[s.searchBtn, (!searchQuery.trim() || loading) && s.searchBtnDisabled]}
            >
              <Text style={{ fontSize: 18 }}>{'\uD83D\uDD0D'}</Text>
            </Pressable>
          </View>
        )}

        {/* Search input — Theme mode */}
        {searchMode === 'theme' && (
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={s.inputWrap}>
                <TextInput
                  placeholder="Search by theme..."
                  placeholderTextColor={colors.text.tertiary}
                  value={themeInput}
                  onChangeText={t => { setThemeInput(t); setSelectedTheme(null); }}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  style={s.input}
                />
                {themeInput.length > 0 && (
                  <TouchableOpacity onPress={clearThemeSearch} style={s.clearBtn}>
                    <Text style={s.clearX} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{'\u00D7'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Pressable
                onPress={handleSearch}
                disabled={(!themeInput.trim() && !selectedTheme) || loading}
                style={[s.searchBtn, ((!themeInput.trim() && !selectedTheme) || loading) && s.searchBtnDisabled]}
              >
                <Text style={{ fontSize: 18 }}>{'\uD83D\uDD0D'}</Text>
              </Pressable>
            </View>

            {/* Core theme chips from database */}
            <Text style={s.sectionLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Core Themes:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {CORE_THEMES.map(theme => {
                const themeColor = THEME_COLORS[theme];
                const isActive = selectedTheme === theme;
                const count = themeCounts[theme] || 0;
                return (
                  <Pressable
                    key={theme}
                    onPress={() => { setSelectedTheme(theme); setThemeInput(''); handleThemeSearch(theme); }}
                    style={[
                      s.themeChip,
                      { borderColor: isActive ? themeColor.primary : colors.border.default },
                      isActive && { backgroundColor: themeColor.light },
                    ]}
                  >
                    <View style={[s.themeDot, { backgroundColor: themeColor.primary }]} />
                    <Text style={[
                      s.themeChipText,
                      isActive && { color: themeColor.dark, fontWeight: '700' },
                    ]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                      {theme}
                    </Text>
                    {count > 0 && (
                      <Text style={[s.themeChipCount, isActive && { color: themeColor.dark }]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                        {count}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={s.center}>
            <ActivityIndicator color={colors.accent.primary} size="large" />
            <Text style={{ marginTop: 12, color: colors.text.secondary }} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Searching...</Text>
          </View>
        )}

        {/* Results */}
        {!loading && hasAnyResults && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 100 }}>

            {/* Theme chapter results */}
            {themeChapterResults.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={s.sectionHeader} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                  Theme Chapters ({themeChapterResults.length})
                </Text>
                {themeChapterResults.map((ch) => {
                  const themeColor = THEME_COLORS[ch.theme as keyof typeof THEME_COLORS];
                  return (
                    <TouchableOpacity
                      key={ch.id}
                      onPress={() => setModalChapter(ch)}
                      activeOpacity={0.7}
                      style={[
                        s.themeCard,
                        themeColor && { borderLeftColor: themeColor.primary },
                      ]}
                    >
                      <View style={s.themeCardHeader}>
                        <Text style={s.themeCardRef} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{ch.book} {ch.chapter}</Text>
                        <View style={s.themeCardTags}>
                          {themeColor && (
                            <View style={[s.themeTag, { backgroundColor: themeColor.light }]}>
                              <Text style={[s.themeTagText, { color: themeColor.dark }]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{ch.theme}</Text>
                            </View>
                          )}
                          {ch.sub_theme && (
                            <View style={s.subThemeTag}>
                              <Text style={s.subThemeTagText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{ch.sub_theme}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {ch.key_insight && (
                        <Text style={s.themeCardInsight} numberOfLines={2}>{ch.key_insight}</Text>
                      )}

                      {ch.application && (
                        <Text style={s.themeCardApp} numberOfLines={2}>{ch.application}</Text>
                      )}

                      {ch.action_step && (
                        <View style={s.actionStepRow}>
                          <Text style={s.actionStepLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Action:</Text>
                          <Text style={s.actionStepText} numberOfLines={2}>{ch.action_step}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Verse results */}
            {results.length > 0 && (
              <View>
                <View style={s.resultHeader}>
                  <Text style={s.resultCount} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                    {themeChapterResults.length > 0 ? 'Related Verses' : 'Results'} ({results.length})
                    {searchMode === 'lookup' ? ` \u2022 ${translation}` : ''}
                  </Text>
                  <TouchableOpacity onPress={selectAll}>
                    <Text style={s.selectAllText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                      {selectedKeys.size === results.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {results.map((result, index) => {
                  const key = verseKey(result);
                  const isSelected = selectedKeys.has(key);
                  return (
                    <Pressable
                      key={`${key}-${index}`}
                      onPress={() => handleResultPress(result)}
                      onLongPress={() => toggleSelect(key)}
                      style={[s.card, isSelected && s.cardSelected]}
                    >
                      <View style={s.cardRow}>
                        <TouchableOpacity
                          onPress={() => toggleSelect(key)}
                          style={[s.checkbox, isSelected && s.checkboxActive]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {isSelected && <Text style={s.checkmark} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{'\u2713'}</Text>}
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text style={s.cardRef} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{result.reference}</Text>
                          <Text style={s.cardText}>{result.verse_text}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* Empty state */}
        {!loading && !hasAnyResults && hasQuery && (
          <View style={s.center}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>{'\uD83D\uDCD6'}</Text>
            <Text style={s.emptyTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>No results found</Text>
            <Text style={s.emptySubtitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Try different keywords or a different reference</Text>
          </View>
        )}

        {/* Initial state */}
        {!loading && !hasAnyResults && !hasQuery && (
          <View style={s.center}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>{'\uD83D\uDD0D'}</Text>
            <Text style={s.emptyTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Search the Bible</Text>
            <Text style={s.emptySubtitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              {searchMode === 'lookup'
                ? 'Enter a reference like "John 3:16-18"\nor search by keywords'
                : 'Select a core theme or search by keyword'}
            </Text>
          </View>
        )}

        {/* Floating save bar */}
        {selectedKeys.size > 0 && (
          <View style={s.floatingBar}>
            <Text style={s.floatingText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{selectedKeys.size} selected</Text>
            <TouchableOpacity
              onPress={handleBatchSave}
              disabled={saving}
              style={s.floatingSaveBtn}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.floatingSaveBtnText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Add to Battle Verses</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Verse Summary Card */}
        <VerseSummaryCard
          visible={summaryOpen}
          onClose={() => setSummaryOpen(false)}
          reference={summaryResult?.reference ?? ''}
          loading={summaryLoading}
          content={summaryContent}
          crossRefs={summaryCrossRefs}
          onViewCrossRefChapter={handleViewCrossRefChapter}
          onDeeper={handleResultDeeper}
          onBattleVerse={handleResultBattleVerse}
          extraActions={[{ icon: '\uD83D\uDCD6', label: 'View Full Chapter', onPress: handleGoToChapter }]}
        />

        {/* Theme Detail Modal */}
        {modalChapter && (() => {
          const mc = modalChapter;
          const tc = THEME_COLORS[mc.theme as keyof typeof THEME_COLORS];
          const accentColor = tc?.primary || colors.accent.primary;
          return (
            <Modal
              visible={!!modalChapter}
              animationType="slide"
              transparent
              onRequestClose={() => setModalChapter(null)}
            >
              <View style={s.modalOverlay}>
                <Pressable style={{ flex: 1 }} onPress={() => setModalChapter(null)} />
                <View style={[s.modalCard, { borderLeftColor: accentColor, borderLeftWidth: 4 }]}>
                  {/* Header */}
                  <View style={s.modalHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalRef} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{mc.book} {mc.chapter}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        {tc && (
                          <View style={[s.themeTag, { backgroundColor: tc.light }]}>
                            <Text style={[s.themeTagText, { color: tc.dark }]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{mc.theme}</Text>
                          </View>
                        )}
                        {mc.sub_theme && (
                          <View style={s.subThemeTag}>
                            <Text style={s.subThemeTagText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{mc.sub_theme}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setModalChapter(null)} style={s.modalClose}>
                      <Text style={s.modalCloseText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{'\u00D7'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Content — flex: 1 + flexShrink lets ScrollView take remaining space */}
                  <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16 }}>
                    {mc.key_insight && (
                      <View style={s.modalSection}>
                        <Text style={s.modalSectionLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Key Insight</Text>
                        <Text style={s.modalSectionText}>{mc.key_insight}</Text>
                      </View>
                    )}
                    {mc.application && (
                      <View style={s.modalSection}>
                        <Text style={s.modalSectionLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Application</Text>
                        <Text style={s.modalSectionText}>{mc.application}</Text>
                      </View>
                    )}
                    {mc.action_step && (
                      <View style={s.modalSection}>
                        <Text style={s.modalSectionLabel} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Action Step</Text>
                        <Text style={s.modalSectionText}>{mc.action_step}</Text>
                      </View>
                    )}
                  </ScrollView>

                  {/* Actions */}
                  <View style={s.modalActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setModalChapter(null);
                        navigation.navigate('Chapter', {
                          bookName: mc.book,
                          chapter: mc.chapter,
                          translation,
                        });
                      }}
                      style={[s.modalActionBtn, { backgroundColor: accentColor }]}
                    >
                      <Text style={s.modalActionBtnText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>View Full Chapter</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Pressable style={{ flex: 0.3 }} onPress={() => setModalChapter(null)} />
              </View>
            </Modal>
          );
        })()}
      </View>
    </SafeAreaView>
  );
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function toResult(v: any): SearchResult {
  return {
    book_name: v.book_name,
    chapter_number: v.chapter_number,
    verse_number: v.verse_number,
    verse_text: v.verse_text,
    reference: `${v.book_name} ${v.chapter_number}:${v.verse_number}`,
  };
}

function verseKey(v: SearchResult) {
  return `${v.book_name}-${v.chapter_number}-${v.verse_number}`;
}

function toCrossRefItem(ref: CrossReference): CrossRefItem {
  const label = ref.target_verse_end
    ? `${ref.target_book} ${ref.target_chapter}:${ref.target_verse_start}-${ref.target_verse_end}`
    : `${ref.target_book} ${ref.target_chapter}:${ref.target_verse_start}`;
  return {
    id: ref.id,
    label,
    book: ref.target_book,
    chapter: ref.target_chapter,
    verseStart: ref.target_verse_start,
    verseEnd: ref.target_verse_end,
  };
}

function rankResults(data: any[], keywords: string[], fullQuery: string): any[] {
  const lowerQuery = fullQuery.toLowerCase();
  return [...data]
    .map(v => {
      const text = (v.verse_text || '').toLowerCase();
      let score = 0;
      if (text.includes(lowerQuery)) score += 100;
      if (keywords.every(kw => text.includes(kw))) score += 50;
      for (const kw of keywords) {
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        score += ((v.verse_text || '').match(regex) || []).length * 10;
      }
      score -= (v.verse_text || '').length / 100;
      return { ...v, _score: score };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 50);
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  section: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, marginBottom: 8 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 12 },
  chip: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipActive: { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  chipText: { fontWeight: '600', fontSize: 13, color: colors.text.secondary },
  chipTextActive: { color: colors.text.primary },
  modeRow: { flexDirection: 'row', padding: 16, paddingTop: 8, gap: 8 },
  modeBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modeBtnActive: { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  modeBtnText: { textAlign: 'center', fontWeight: '700', fontSize: 13, color: colors.text.secondary },
  modeBtnTextActive: { color: colors.text.primary },
  inputRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border.default, borderRadius: 10, backgroundColor: colors.background.secondary },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 16,
  },
  clearBtn: { padding: 8, marginRight: 4 },
  clearX: { fontSize: 20, color: colors.text.muted, fontWeight: '600' },
  searchBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.accent.primary,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchBtnDisabled: { backgroundColor: colors.text.tertiary },
  // Theme chips
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 6,
  },
  themeDot: { width: 8, height: 8, borderRadius: 4 },
  themeChipText: { fontWeight: '600', fontSize: 13, color: colors.text.secondary },
  themeChipCount: { fontSize: 11, color: colors.text.muted },
  // Theme chapter cards
  themeCard: {
    marginBottom: 12,
    padding: 14,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.primary,
  },
  themeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeCardRef: { fontSize: 16, fontWeight: '700', color: colors.accent.primary },
  themeCardTags: { flexDirection: 'row', gap: 6, flexShrink: 1 },
  themeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  themeTagText: { fontSize: 11, fontWeight: '700' },
  subThemeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.background.primary,
  },
  subThemeTagText: { fontSize: 11, fontWeight: '600', color: colors.text.secondary },
  themeCardInsight: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
    marginBottom: 6,
  },
  themeCardApp: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  actionStepRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionStepLabel: { fontSize: 12, fontWeight: '700', color: colors.accent.primary },
  actionStepText: { fontSize: 12, color: colors.text.secondary, flex: 1 },
  // Verse results
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultCount: { fontSize: 14, fontWeight: '700', color: colors.text.secondary },
  selectAllText: { fontSize: 13, fontWeight: '600', color: colors.accent.primary },
  card: {
    marginBottom: 10,
    padding: 14,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cardSelected: { borderColor: colors.accent.primary, backgroundColor: 'rgba(211, 84, 0, 0.08)' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cardRef: { fontSize: 13, fontWeight: '700', color: colors.accent.primary, marginBottom: 6 },
  cardText: { fontSize: 15, lineHeight: 22, color: colors.text.primary },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 },
  floatingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  floatingText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  floatingSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.accent.primary,
    borderRadius: 8,
  },
  floatingSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Theme detail modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    maxHeight: '70%',
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalRef: { fontSize: 20, fontWeight: '700', color: colors.accent.primary },
  modalClose: { padding: 4 },
  modalCloseText: { fontSize: 28, color: colors.text.muted, lineHeight: 28 },
  modalSection: { marginBottom: 20 },
  modalSectionLabel: { fontSize: 13, fontWeight: '700', color: colors.text.secondary, marginBottom: 6 },
  modalSectionText: { fontSize: 15, lineHeight: 22, color: colors.text.primary },
  modalActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  modalActionBtn: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalActionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Word study action menu
  actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  actionSheet: {
    backgroundColor: colors.background.elevated, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingBottom: 30,
  },
  actionHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border.light, alignSelf: 'center' as const, marginTop: 10, marginBottom: 12 },
  actionTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.text.primary, textAlign: 'center' as const, marginBottom: 16 },
  actionItem: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, backgroundColor: colors.background.tertiary, borderRadius: 12, marginBottom: 8 },
  actionIcon: { fontSize: 22, marginRight: 12, width: 30, textAlign: 'center' as const },
  actionTextWrap: { flex: 1 },
  actionText: { fontSize: 16, fontWeight: '600' as const, color: colors.text.primary },
  actionSubtext: { fontSize: 13, color: colors.text.muted, marginTop: 1 },
  cancelActionItem: { backgroundColor: colors.background.secondary, justifyContent: 'center' as const, marginTop: 4 },
  cancelActionText: { fontSize: 16, fontWeight: '600' as const, color: colors.text.secondary, textAlign: 'center' as const, flex: 1 },
  // Word study mode on search result
  cardStudyActive: { borderColor: colors.accent.primary, backgroundColor: colors.accent.primary + '15', borderLeftWidth: 3, borderLeftColor: colors.accent.primary },
  studyBar: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 6, paddingHorizontal: 4, marginBottom: 4, gap: 10 },
  studyBarBack: { color: colors.accent.primary, fontWeight: '700' as const, fontSize: 14 },
  studyBarTitle: { color: colors.text.primary, fontWeight: '600' as const, fontSize: 14 },
  studyHint: { fontSize: 12, color: colors.text.muted, fontStyle: 'italic' as const, marginTop: 4 },
});

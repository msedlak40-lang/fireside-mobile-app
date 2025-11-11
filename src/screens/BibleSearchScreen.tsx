// src/screens/BibleSearchScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, SafeAreaView, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabaseClient';

type SearchResult = {
  book_name: string;
  chapter_number: number;
  verse_number: number;
  verse_text: string;
  reference: string;
};

const POPULAR_THEMES = [
  { id: 'love', label: 'Love', emoji: '❤️' },
  { id: 'faith', label: 'Faith', emoji: '🙏' },
  { id: 'hope', label: 'Hope', emoji: '✨' },
  { id: 'wisdom', label: 'Wisdom', emoji: '🦉' },
  { id: 'courage', label: 'Courage', emoji: '💪' },
  { id: 'peace', label: 'Peace', emoji: '🕊️' },
  { id: 'joy', label: 'Joy', emoji: '😊' },
  { id: 'prayer', label: 'Prayer', emoji: '🙏' },
];

const TRANSLATIONS = ['KJV', 'WEB'];

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
}

// Find closest matching book name
function findClosestBookName(input: string, bookNames: string[]): string {
  const normalized = input.trim();

  // First try exact match (case-insensitive)
  const exactMatch = bookNames.find(book => book.toLowerCase() === normalized.toLowerCase());
  if (exactMatch) return exactMatch;

  // Handle common variations
  if (normalized.toLowerCase() === 'psalm') {
    return 'Psalms';
  }

  // Try prefix match
  const prefixMatch = bookNames.find(book => book.toLowerCase().startsWith(normalized.toLowerCase()));
  if (prefixMatch) return prefixMatch;

  // If no exact or prefix match, find closest using Levenshtein distance
  let closestBook = normalized;
  let minDistance = Infinity;

  for (const bookName of bookNames) {
    const distance = levenshteinDistance(normalized, bookName);
    // Only consider it a match if distance is small relative to the length
    if (distance < minDistance && distance <= Math.max(3, normalized.length * 0.4)) {
      minDistance = distance;
      closestBook = bookName;
    }
  }

  return closestBook;
}

export default function BibleSearchScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [themeInput, setThemeInput] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'lookup' | 'theme'>('lookup');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [translation, setTranslation] = useState('KJV');
  const [bookNames, setBookNames] = useState<string[]>([]);

  // Fetch all book names on mount
  useEffect(() => {
    const fetchBookNames = async () => {
      try {
        const { data, error } = await supabase
          .from('bible_verses')
          .select('book_name')
          .eq('translation', 'KJV')
          .limit(1200); // Enough to get all books

        if (error) {
          console.error('[BibleSearch] Failed to fetch book names:', error);
          return;
        }

        // Get unique book names
        const unique = Array.from(new Set(data?.map(v => v.book_name) || []));
        setBookNames(unique);
      } catch (err) {
        console.error('[BibleSearch] Error fetching book names:', err);
      }
    };

    fetchBookNames();
  }, []);

  const handleTextSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Try to parse as a verse range first (e.g., "John 3:16-18" or "Ephesians 6:10-18")
      const rangeMatch = query.match(/^(\d?\s*[A-Za-z]+)\s+(\d+):(\d+)-(\d+)$/);
      if (rangeMatch) {
        const [, bookName, chapterNum, startVerse, endVerse] = rangeMatch;
        const normalizedBook = bookNames.length > 0
          ? findClosestBookName(bookName, bookNames)
          : bookName.trim();

        // Get all verses in the range
        const { data: rangeData, error } = await supabase
          .from('bible_verses')
          .select('book_name, chapter_number, verse_number, verse_text')
          .ilike('book_name', `${normalizedBook}%`)
          .eq('chapter_number', parseInt(chapterNum))
          .gte('verse_number', parseInt(startVerse))
          .lte('verse_number', parseInt(endVerse))
          .eq('translation', translation)
          .order('verse_number', { ascending: true })
          .limit(50);

        if (error) {
          console.error('[BibleSearch] Range lookup error:', error);
          setResults([]);
          setLoading(false);
          return;
        }

        if (rangeData && rangeData.length > 0) {
          const resultsWithRefs = rangeData.map((v: any) => ({
            book_name: v.book_name,
            chapter_number: v.chapter_number,
            verse_number: v.verse_number,
            verse_text: v.verse_text,
            reference: `${v.book_name} ${v.chapter_number}:${v.verse_number}`,
          }));
          setResults(resultsWithRefs);
          setLoading(false);
          return;
        }
      }

      // Try to parse as a single verse reference (e.g., "John 3:16" or "Genesis 1:1")
      const verseMatch = query.match(/^(\d?\s*[A-Za-z]+)\s+(\d+):(\d+)$/);
      if (verseMatch) {
        const [, bookName, chapterNum, verseNum] = verseMatch;
        const normalizedBook = bookNames.length > 0
          ? findClosestBookName(bookName, bookNames)
          : bookName.trim();

        // Direct lookup for specific verse
        const { data: verseData, error } = await supabase
          .from('bible_verses')
          .select('book_name, chapter_number, verse_number, verse_text')
          .ilike('book_name', `${normalizedBook}%`)
          .eq('chapter_number', parseInt(chapterNum))
          .eq('verse_number', parseInt(verseNum))
          .eq('translation', translation)
          .limit(5);

        if (error) {
          console.error('[BibleSearch] Verse lookup error:', error);
          setResults([]);
          setLoading(false);
          return;
        }

        if (verseData && verseData.length > 0) {
          const resultsWithRefs = verseData.map((v: any) => ({
            book_name: v.book_name,
            chapter_number: v.chapter_number,
            verse_number: v.verse_number,
            verse_text: v.verse_text,
            reference: `${v.book_name} ${v.chapter_number}:${v.verse_number}`,
          }));
          setResults(resultsWithRefs);
          setLoading(false);
          return;
        }
      }

      // Try to parse as chapter reference (e.g., "John 3" or "Genesis 1")
      const chapterMatch = query.match(/^(\d?\s*[A-Za-z]+)\s+(\d+)$/);
      if (chapterMatch) {
        const [, bookName, chapterNum] = chapterMatch;
        const normalizedBook = bookNames.length > 0
          ? findClosestBookName(bookName, bookNames)
          : bookName.trim();

        // Get all verses in the chapter
        const { data: chapterData, error } = await supabase
          .from('bible_verses')
          .select('book_name, chapter_number, verse_number, verse_text')
          .ilike('book_name', `${normalizedBook}%`)
          .eq('chapter_number', parseInt(chapterNum))
          .eq('translation', translation)
          .order('verse_number', { ascending: true })
          .limit(50);

        if (error) {
          console.error('[BibleSearch] Chapter lookup error:', error);
          setResults([]);
          setLoading(false);
          return;
        }

        if (chapterData && chapterData.length > 0) {
          const resultsWithRefs = chapterData.map((v: any) => ({
            book_name: v.book_name,
            chapter_number: v.chapter_number,
            verse_number: v.verse_number,
            verse_text: v.verse_text,
            reference: `${v.book_name} ${v.chapter_number}:${v.verse_number}`,
          }));
          setResults(resultsWithRefs);
          setLoading(false);
          return;
        }
      }

      // Otherwise, do a text search
      const { data, error } = await supabase
        .from('bible_verses')
        .select('book_name, chapter_number, verse_number, verse_text')
        .textSearch('verse_text', query)
        .eq('translation', translation)
        .limit(50);

      if (error) {
        console.error('[BibleSearch] Text search error:', error);
        setResults([]);
        setLoading(false);
        return;
      }

      const resultsWithRefs = (data || []).map((v: any) => ({
        book_name: v.book_name,
        chapter_number: v.chapter_number,
        verse_number: v.verse_number,
        verse_text: v.verse_text,
        reference: `${v.book_name} ${v.chapter_number}:${v.verse_number}`,
      }));

      setResults(resultsWithRefs);
    } catch (err) {
      console.error('[BibleSearch] Text search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [translation, bookNames]);

  const handleThemeSearch = useCallback(async (theme: string) => {
    setLoading(true);
    try {
      // Search for verses containing the theme keyword
      const { data, error } = await supabase
        .from('bible_verses')
        .select('book_name, chapter_number, verse_number, verse_text')
        .ilike('verse_text', `%${theme}%`)
        .eq('translation', translation)
        .limit(50);

      if (error) {
        console.error('[BibleSearch] Theme search error:', error);
        setResults([]);
        setLoading(false);
        return;
      }

      const resultsWithRefs = (data || []).map((v: any) => ({
        book_name: v.book_name,
        chapter_number: v.chapter_number,
        verse_number: v.verse_number,
        verse_text: v.verse_text,
        reference: `${v.book_name} ${v.chapter_number}:${v.verse_number}`,
      }));

      setResults(resultsWithRefs);
    } catch (err) {
      console.error('[BibleSearch] Theme search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [translation]);

  const handleSearch = useCallback(() => {
    Keyboard.dismiss(); // Dismiss keyboard when search button is pressed
    if (searchMode === 'lookup') {
      handleTextSearch(searchQuery);
    } else if (searchMode === 'theme') {
      if (themeInput) {
        handleThemeSearch(themeInput);
        setSelectedTheme(null);
      } else if (selectedTheme) {
        handleThemeSearch(selectedTheme);
      }
    }
  }, [searchMode, searchQuery, themeInput, selectedTheme, handleTextSearch, handleThemeSearch]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <View style={{ flex: 1 }}>
        {/* Translation Selector */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary, marginBottom: 8 }}>
            Translation:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
            {TRANSLATIONS.map((trans) => (
              <Pressable
                key={trans}
                onPress={() => setTranslation(trans)}
                style={{
                  marginRight: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: translation === trans ? colors.accent.primary : colors.background.secondary,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: translation === trans ? colors.accent.primary : colors.border.default,
                }}
              >
                <Text style={{
                  fontWeight: '600',
                  fontSize: 13,
                  color: translation === trans ? colors.text.primary : colors.text.secondary,
                }}>
                  {trans}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Search Mode Toggle */}
        <View style={{ flexDirection: 'row', padding: 16, paddingTop: 8, gap: 8 }}>
          <Pressable
            onPress={() => {
              setSearchMode('lookup');
              setResults([]);
              setSelectedTheme(null);
              setThemeInput('');
            }}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor: searchMode === 'lookup' ? colors.accent.primary : colors.background.secondary,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: searchMode === 'lookup' ? colors.accent.primary : colors.border.default,
            }}
          >
            <Text style={{
              textAlign: 'center',
              fontWeight: '700',
              fontSize: 13,
              color: searchMode === 'lookup' ? colors.text.primary : colors.text.secondary,
            }}>
              📖 Verse/Chapter Lookup
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setSearchMode('theme');
              setResults([]);
              setSearchQuery('');
            }}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor: searchMode === 'theme' ? colors.accent.primary : colors.background.secondary,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: searchMode === 'theme' ? colors.accent.primary : colors.border.default,
            }}
          >
            <Text style={{
              textAlign: 'center',
              fontWeight: '700',
              fontSize: 13,
              color: searchMode === 'theme' ? colors.text.primary : colors.text.secondary,
            }}>
              🏷️ Theme Search
            </Text>
          </Pressable>
        </View>

        {/* Search Input (Lookup Mode) */}
        {searchMode === 'lookup' && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                placeholder={searchMode === 'lookup' ? "John 3:16, Genesis 1, etc." : "Search keywords..."}
                placeholderTextColor={colors.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                style={{
                  flex: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  borderRadius: 10,
                  backgroundColor: colors.background.secondary,
                  color: colors.text.primary,
                  fontSize: 16,
                }}
              />
              <Pressable
                onPress={handleSearch}
                disabled={!searchQuery.trim() || loading}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  backgroundColor: searchQuery.trim() && !loading ? colors.accent.primary : colors.text.tertiary,
                  borderRadius: 10,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18 }}>🔍</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Theme Selection (Theme Mode) */}
        {searchMode === 'theme' && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            {/* Theme Input */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  placeholder="Type a theme..."
                  placeholderTextColor={colors.text.tertiary}
                  value={themeInput}
                  onChangeText={(text) => {
                    setThemeInput(text);
                    setSelectedTheme(null);
                  }}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  style={{
                    flex: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: colors.border.default,
                    borderRadius: 10,
                    backgroundColor: colors.background.secondary,
                    color: colors.text.primary,
                    fontSize: 16,
                  }}
                />
                <Pressable
                  onPress={handleSearch}
                  disabled={(!themeInput.trim() && !selectedTheme) || loading}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    backgroundColor: (themeInput.trim() || selectedTheme) && !loading ? colors.accent.primary : colors.text.tertiary,
                    borderRadius: 10,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>🔍</Text>
                </Pressable>
              </View>
            </View>

            {/* Popular Themes */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary, marginBottom: 12 }}>
              Or select a popular theme:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {POPULAR_THEMES.map((theme) => (
                <Pressable
                  key={theme.id}
                  onPress={() => {
                    setSelectedTheme(theme.id);
                    setThemeInput('');
                    handleThemeSearch(theme.id);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    backgroundColor: selectedTheme === theme.id ? colors.accent.primary : colors.background.secondary,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: selectedTheme === theme.id ? colors.accent.primary : colors.border.default,
                  }}
                >
                  <Text style={{
                    fontWeight: '600',
                    color: selectedTheme === theme.id ? colors.text.primary : colors.text.secondary,
                  }}>
                    {theme.emoji} {theme.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent.primary} size="large" />
            <Text style={{ marginTop: 12, color: colors.text.secondary }}>Searching...</Text>
          </View>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.secondary, marginBottom: 12 }}>
              {results.length} {results.length === 1 ? 'result' : 'results'} found ({translation})
            </Text>
            {results.map((result, index) => (
              <View
                key={`${result.reference}-${index}`}
                style={{
                  marginBottom: 12,
                  padding: 16,
                  backgroundColor: colors.background.secondary,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent.primary, marginBottom: 8 }}>
                  {result.reference}
                </Text>
                <Text style={{ fontSize: 15, lineHeight: 22, color: colors.text.primary, flexWrap: 'wrap' }}>
                  {result.verse_text}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && (searchQuery.trim() || themeInput.trim() || selectedTheme) && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📖</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>
              No results found
            </Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center' }}>
              Try different keywords or select another theme
            </Text>
          </View>
        )}

        {/* Initial State */}
        {!loading && results.length === 0 && !searchQuery.trim() && !themeInput.trim() && !selectedTheme && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>🔍</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>
              Search the Bible
            </Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 }}>
              {searchMode === 'lookup' && 'Enter a reference like "John 3:16" or search by keywords'}
              {searchMode === 'theme' && 'Type a theme or select from popular themes below'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

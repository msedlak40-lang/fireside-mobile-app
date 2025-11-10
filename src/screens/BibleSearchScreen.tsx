// src/screens/BibleSearchScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, SafeAreaView } from 'react-native';
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

export default function BibleSearchScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [themeInput, setThemeInput] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'lookup' | 'theme'>('lookup');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [translation, setTranslation] = useState('KJV');

  const handleTextSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error} = await supabase
        .rpc('rpc_bible_search', { p_query: query, p_limit: 50 });

      if (error) {
        console.error('[BibleSearch] Search error:', error);
        setResults([]);
        setLoading(false);
        return;
      }

      const resultsWithText = await Promise.all(
        (data || []).map(async (r: any) => {
          const { data: verseData } = await supabase
            .from('bible_verses')
            .select('verse_text')
            .eq('book_name', r.book_name)
            .eq('chapter_number', r.chapter_number)
            .eq('verse_number', r.verse_number)
            .eq('translation', translation)
            .limit(1)
            .maybeSingle();

          return {
            book_name: r.book_name || '',
            chapter_number: r.chapter_number || 0,
            verse_number: r.verse_number || 0,
            verse_text: verseData?.verse_text || r.snippet || '',
            reference: `${r.book_name} ${r.chapter_number}:${r.verse_number}`,
          };
        })
      );

      setResults(resultsWithText);
    } catch (err) {
      console.error('[BibleSearch] Text search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [translation]);

  const handleThemeSearch = useCallback(async (theme: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('rpc_bible_search', { p_query: theme, p_limit: 50 });

      if (error) {
        console.error('[BibleSearch] Theme search error:', error);
        setResults([]);
        setLoading(false);
        return;
      }

      const resultsWithText = await Promise.all(
        (data || []).map(async (r: any) => {
          const { data: verseData } = await supabase
            .from('bible_verses')
            .select('verse_text')
            .eq('book_name', r.book_name)
            .eq('chapter_number', r.chapter_number)
            .eq('verse_number', r.verse_number)
            .eq('translation', translation)
            .limit(1)
            .maybeSingle();

          return {
            book_name: r.book_name || '',
            chapter_number: r.chapter_number || 0,
            verse_number: r.verse_number || 0,
            verse_text: verseData?.verse_text || r.snippet || '',
            reference: `${r.book_name} ${r.chapter_number}:${r.verse_number}`,
          };
        })
      );

      setResults(resultsWithText);
    } catch (err) {
      console.error('[BibleSearch] Theme search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [translation]);

  const handleSearch = useCallback(() => {
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

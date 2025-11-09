// src/screens/BibleSearchScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { searchScripture } from '../services/scripture';
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

export default function BibleSearchScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'text' | 'theme'>('text');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const handleTextSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchScripture(query);

      // Map results to SearchResult format
      const mappedResults: SearchResult[] = (data || []).map((r: any) => ({
        book_name: r.book_name || '',
        chapter_number: r.chapter_number || 0,
        verse_number: r.verse_number || 0,
        verse_text: r.verse_text || r.text || '',
        reference: `${r.book_name} ${r.chapter_number}:${r.verse_number}`,
      }));

      setResults(mappedResults);
    } catch (err) {
      console.error('[BibleSearch] Text search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleThemeSearch = useCallback(async (theme: string) => {
    setLoading(true);
    setSelectedTheme(theme);
    try {
      // TODO: Replace with actual RPC function name once provided by user
      // Placeholder for theme-based search - will be replaced with actual RPC call
      const { data, error } = await supabase
        .rpc('rpc_search_verses_by_theme', { p_theme: theme })
        .limit(50);

      if (error) {
        console.warn('[BibleSearch] Theme search RPC not available, using fallback');
        // Fallback: use text search with theme name
        await handleTextSearch(theme);
        return;
      }

      const mappedResults: SearchResult[] = (data || []).map((r: any) => ({
        book_name: r.book_name || '',
        chapter_number: r.chapter_number || 0,
        verse_number: r.verse_number || 0,
        verse_text: r.verse_text || r.text || '',
        reference: `${r.book_name} ${r.chapter_number}:${r.verse_number}`,
      }));

      setResults(mappedResults);
    } catch (err) {
      console.error('[BibleSearch] Theme search failed:', err);
      // Fallback to text search
      await handleTextSearch(theme);
    } finally {
      setLoading(false);
    }
  }, [handleTextSearch]);

  const handleSearch = useCallback(() => {
    if (searchMode === 'text') {
      handleTextSearch(searchQuery);
    } else if (selectedTheme) {
      handleThemeSearch(selectedTheme);
    }
  }, [searchMode, searchQuery, selectedTheme, handleTextSearch, handleThemeSearch]);

  const handleResultPress = useCallback((result: SearchResult) => {
    // Navigate to the verse screen
    // First, we need to get the book_id from the book_name
    // For now, navigate to Bible tab and let user navigate from there
    // You may want to add a direct verse navigation later
    navigation.navigate('BibleTab', {
      screen: 'BibleHome',
    });
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <View style={{ flex: 1 }}>
        {/* Search Mode Toggle */}
        <View style={{ flexDirection: 'row', padding: 16, gap: 8 }}>
          <Pressable
            onPress={() => {
              setSearchMode('text');
              setResults([]);
              setSelectedTheme(null);
            }}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor: searchMode === 'text' ? colors.accent.primary : colors.background.secondary,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: searchMode === 'text' ? colors.accent.primary : colors.border.default,
            }}
          >
            <Text style={{
              textAlign: 'center',
              fontWeight: '700',
              color: searchMode === 'text' ? colors.text.primary : colors.text.secondary,
            }}>
              📖 Text Search
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
              color: searchMode === 'theme' ? colors.text.primary : colors.text.secondary,
            }}>
              🏷️ By Theme
            </Text>
          </Pressable>
        </View>

        {/* Search Input (Text Mode) */}
        {searchMode === 'text' && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                placeholder="Search for verses..."
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
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary, marginBottom: 12 }}>
              Select a theme to explore:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {POPULAR_THEMES.map((theme) => (
                <Pressable
                  key={theme.id}
                  onPress={() => handleThemeSearch(theme.id)}
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
              {results.length} {results.length === 1 ? 'result' : 'results'} found
            </Text>
            {results.map((result, index) => (
              <Pressable
                key={`${result.reference}-${index}`}
                onPress={() => handleResultPress(result)}
                style={{
                  marginBottom: 12,
                  padding: 16,
                  backgroundColor: colors.background.secondary,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent.primary, marginBottom: 6 }}>
                  {result.reference}
                </Text>
                <Text style={{ fontSize: 15, lineHeight: 22, color: colors.text.primary }}>
                  {result.verse_text}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && (searchQuery.trim() || selectedTheme) && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📖</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>
              No results found
            </Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center' }}>
              Try searching for different keywords or selecting another theme
            </Text>
          </View>
        )}

        {/* Initial State */}
        {!loading && results.length === 0 && !searchQuery.trim() && !selectedTheme && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>🔍</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>
              Search the Bible
            </Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 }}>
              {searchMode === 'text'
                ? 'Enter keywords to search for verses across all books'
                : 'Select a theme to discover relevant verses'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

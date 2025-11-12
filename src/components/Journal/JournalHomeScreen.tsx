// src/components/Journal/JournalHomeScreen.tsx
import React, { useCallback, useState, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, Image, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { fetchJournalEntries } from '../../services/journals';
import type { JournalEntry } from '../../services/journals';

export default function JournalHomeScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const hasLoadedRef = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchJournalEntries({ limit: 50 });
      setEntries(data);
    } catch (err) {
      console.error('[JournalHome] Load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Only reload if:
      // 1. This is the first time loading (initial mount)
      // 2. We're explicitly told to refresh via route params
      const shouldRefresh = route.params?.refresh;

      if (!hasLoadedRef.current || shouldRefresh) {
        load();
        hasLoadedRef.current = true;

        // Clear the refresh param so we don't reload again unnecessarily
        if (shouldRefresh) {
          navigation.setParams({ refresh: undefined });
        }
      }
    }, [route.params?.refresh])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8 }}>My Journal</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              Capture your spiritual journey through handwritten notes and reflections.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('JournalCreate')}
              style={{
                padding: 16,
                backgroundColor: '#2563eb',
                borderRadius: 12,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                ✍️ New Journal Entry
              </Text>
            </TouchableOpacity>

            {entries.length > 0 && (
              <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 12 }}>
                Recent Entries
              </Text>
            )}
          </View>
        }
        data={entries}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('JournalDetail', { id: item.id })}
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 12,
              backgroundColor: '#fff'
            }}
          >
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {item.photo_thumbnail_url ? (
                <Image
                  source={{ uri: item.photo_thumbnail_url }}
                  style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#f3f4f6' }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 32 }}>📝</Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                {item.title && (
                  <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                    {item.title}
                  </Text>
                )}
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  {new Date(item.journal_date).toLocaleDateString()}
                </Text>
                {item.book_name && (
                  <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
                    📖 {item.book_name} {item.chapter_number}
                  </Text>
                )}
                {item.tags && item.tags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 }}>
                    {item.tags.slice(0, 3).map((tag) => (
                      <View
                        key={tag}
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          backgroundColor: '#e0e7ff',
                          borderRadius: 4
                        }}
                      >
                        <Text style={{ fontSize: 10, color: '#4338ca' }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📓</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', textAlign: 'center' }}>No Entries Yet</Text>
            <Text style={{ marginTop: 8, fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
              Start journaling to track your spiritual growth!
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
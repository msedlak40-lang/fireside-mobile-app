// src/components/Journal/JournalDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { fetchJournalEntry, deleteJournalEntry } from '../../services/journals';
import type { JournalEntry } from '../../services/journals';

export default function JournalDetailScreen() {
  const route = useRoute<any>();
  const { id, shouldRefreshList } = route.params as { id: string; shouldRefreshList?: boolean };
  const navigation = useNavigation<any>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    // Set up navigation interceptor to pass refresh param when going back
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (shouldRefreshList) {
        // Navigate to home with refresh param
        navigation.navigate('JournalHome', { refresh: true });
      }
    });

    return unsubscribe;
  }, [navigation, shouldRefreshList]);

  const load = async () => {
    try {
      const data = await fetchJournalEntry(id);
      setEntry(data);
    } catch (err) {
      console.error('[JournalDetail] Load failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteJournalEntry(id);
              Alert.alert('Deleted', 'Journal entry has been deleted.', [
                { text: 'OK', onPress: () => navigation.navigate('JournalHome', { refresh: true }) }
              ]);
            } catch (err: any) {
              console.error('[JournalDetail] Delete failed', err);
              Alert.alert('Error', 'Failed to delete entry.');
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (loading || !entry) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      {/* Header */}
      {entry.title && (
        <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
          {entry.title}
        </Text>
      )}
      
      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
        {new Date(entry.journal_date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </Text>

      {/* Reference Info */}
      {(entry.book_name || entry.verse_reference) && (
        <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#f8fafc', borderRadius: 10 }}>
          {entry.book_name && (
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              📖 {entry.book_name} {entry.chapter_number}
              {entry.verse_reference && `: ${entry.verse_reference}`}
            </Text>
          )}
        </View>
      )}

      {/* Prompt Used */}
      {entry.prompt_used && (
        <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#eef2ff', borderRadius: 10 }}>
          <Text style={{ fontSize: 12, color: '#4338ca', fontWeight: '700' }}>PROMPT</Text>
          <Text style={{ marginTop: 4, fontSize: 14, color: '#4338ca' }}>
            {entry.prompt_used}
          </Text>
        </View>
      )}

      {/* Photo */}
      {entry.photo_url && (
        <Image
          source={{ uri: entry.photo_url }}
          style={{ 
            width: '100%', 
            height: 400, 
            borderRadius: 12, 
            marginBottom: 16,
            backgroundColor: '#f3f4f6'
          }}
          resizeMode="contain"
        />
      )}

      {/* Digital Notes */}
      {entry.digital_notes && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Notes</Text>
          <Text style={{ fontSize: 15, lineHeight: 24, color: '#374151' }}>
            {entry.digital_notes}
          </Text>
        </View>
      )}

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Tags</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {entry.tags.map((tag) => (
              <View
                key={tag}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: '#e0e7ff',
                  borderRadius: 16
                }}
              >
                <Text style={{ fontSize: 12, color: '#4338ca', fontWeight: '600' }}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Mood */}
      {entry.mood && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Mood</Text>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>{entry.mood}</Text>
        </View>
      )}

      {/* Time Spent */}
      {entry.time_spent_minutes && entry.time_spent_minutes > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            Time spent: {entry.time_spent_minutes} minutes
          </Text>
        </View>
      )}

      {/* Delete Button */}
      <TouchableOpacity
        onPress={handleDelete}
        disabled={deleting}
        style={{
          padding: 14,
          backgroundColor: deleting ? '#9ca3af' : '#fee2e2',
          borderRadius: 10,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#fecaca'
        }}
      >
        <Text style={{ color: '#dc2626', fontWeight: '600' }}>
          {deleting ? 'Deleting...' : '🗑️ Delete Entry'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
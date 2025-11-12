// src/components/Journal/JournalCreateScreen.tsx (NO PHOTO VERSION)
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchJournalPrompt, createJournalEntry } from '../../services/journals';
import type { JournalPrompt } from '../../services/journals';

export default function JournalCreateScreen() {
  const navigation = useNavigation<any>();
  
  const [prompt, setPrompt] = useState<JournalPrompt | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(true);

  useEffect(() => {
    loadPrompt();
  }, []);

  const loadPrompt = async () => {
    try {
      const promptData = await fetchJournalPrompt('general', 'basic');
      setPrompt(promptData);
    } catch (err) {
      console.error('[JournalCreate] Failed to load prompt', err);
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleSave = async () => {
    if (!notes.trim()) {
      Alert.alert('Missing Content', 'Please add some notes before saving.');
      return;
    }

    try {
      setSaving(true);

      const entry = await createJournalEntry({
        title: title.trim() || undefined,
        promptUsed: prompt?.prompt_text,
        digitalNotes: notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      Alert.alert(
        'Entry Saved! 📝',
        'Your journal entry has been saved.',
        [
          {
            text: 'View Entry',
            onPress: () => navigation.replace('JournalDetail', { id: entry.id })
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err: any) {
      console.error('[JournalCreate] Failed to save', err);
      Alert.alert('Error', 'Failed to save journal entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const commonTags = ['prayer', 'gratitude', 'struggle', 'breakthrough', 'question', 'insight'];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8 }}>New Journal Entry</Text>
      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
        Capture your thoughts and reflections
      </Text>

      {/* Prompt Section */}
      {loadingPrompt ? (
        <View style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 10, marginBottom: 16 }}>
          <ActivityIndicator size="small" />
        </View>
      ) : prompt ? (
        <View style={{ padding: 16, backgroundColor: '#eef2ff', borderRadius: 10, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: '#4338ca', fontWeight: '700' }}>JOURNALING PROMPT</Text>
          <Text style={{ marginTop: 6, fontSize: 15, color: '#4338ca' }}>{prompt.prompt_text}</Text>
          <TouchableOpacity onPress={loadPrompt} style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 13, color: '#4338ca', fontWeight: '600' }}>🔄 Get New Prompt</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Title Input */}
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Title (Optional)</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Give your entry a title..."
        placeholderTextColor="#9ca3af"
        autoCorrect={true}
        spellCheck={true}
        style={{
          marginBottom: 16,
          padding: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 10,
          fontSize: 16,
          color: '#000'
        }}
      />

      {/* Photo Feature Notice */}
      <View style={{ 
        marginBottom: 16, 
        padding: 16, 
        backgroundColor: '#fef3c7', 
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#fbbf24'
      }}>
        <Text style={{ fontSize: 13, color: '#92400e', fontWeight: '600' }}>
          📷 Photo Upload Coming Soon
        </Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: '#92400e' }}>
          Photo upload will be available in the next build. For now, you can add text notes!
        </Text>
      </View>

      {/* Notes Input */}
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Notes</Text>
      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
        Write your thoughts and reflections
      </Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Type your thoughts here..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={8}
        textAlignVertical="top"
        autoCorrect={true}
        spellCheck={true}
        style={{
          marginBottom: 16,
          padding: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 10,
          fontSize: 15,
          minHeight: 150,
          color: '#000'
        }}
      />

      {/* Tags */}
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Tags</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {commonTags.map((tag) => {
          const isSelected = tags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => toggleTag(tag)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: isSelected ? '#2563eb' : '#f3f4f6',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: isSelected ? '#2563eb' : '#e5e7eb'
              }}
            >
              <Text style={{ fontSize: 13, color: isSelected ? '#fff' : '#374151', fontWeight: '600' }}>
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={saving || !notes.trim()}
        style={{
          padding: 16,
          backgroundColor: saving || !notes.trim() ? '#9ca3af' : '#10b981',
          borderRadius: 12,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
          {saving ? 'Saving...' : '💾 Save Entry'}
        </Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
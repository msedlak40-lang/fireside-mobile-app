// src/components/Characters/CharacterDetailScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabaseClient';
import { getCharacterWithLessons } from '../../lib/characters';
import { completeCharacterStudy, fetchCharacterProgress, toggleCharacterFavorite } from '../../services/progress';
import type { BibleCharacter, CharacterLesson } from '../../types/supabase-characters';
import type { CharacterProgress } from '../../services/progress';

export default function CharacterDetailScreen() {
  const { id } = useRoute<any>().params as { id: number };
  const navigation = useNavigation<any>();

  const [character, setCharacter] = useState<BibleCharacter | null>(null);
  const [lessons, setLessons] = useState<CharacterLesson[]>([]);
  const [characterProgress, setCharacterProgress] = useState<CharacterProgress | null>(null);
  const [lessonProgress, setLessonProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { character, lessons } = await getCharacterWithLessons(id);
      setCharacter(character);
      setLessons(lessons);

      // Load overall character progress
      const progress = await fetchCharacterProgress(id);
      setCharacterProgress(progress);

      // Load per-lesson progress for this user
      const { data: { user } } = await supabase.auth.getUser();
      if (user && lessons?.length) {
        const { data: lessonProgressData } = await supabase
          .from('user_character_lesson_progress')
          .select('lesson_id, completed, completed_at')
          .eq('user_id', user.id)
          .in('lesson_id', lessons.map(l => l.id));

        setLessonProgress(lessonProgressData || []);
      } else {
        setLessonProgress([]);
      }
    } catch (err) {
      console.error('[CharacterDetail] Load failed', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // initial + on param change
  useEffect(() => { setLoading(true); load(); }, [load]);

  // refresh when screen regains focus (e.g., after completing a lesson)
  useFocusEffect(useCallback(() => { load(); return () => {}; }, [load]));

  const handleStartStudy = async () => {
    if (isStarting || !character) return;
    try {
      setIsStarting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_character_progress')
        .insert({ user_id: user.id, character_id: id, completed: false, notes: 'Study in progress' });

      // ignore dup key
      if (error && error.code !== '23505') throw error;

      Alert.alert('Study Started! 📖', `You've started studying ${character.name}.`, [{ text: 'Got it!' }]);
      await load();
    } catch (err: any) {
      console.error('[CharacterDetail] Failed to start', err);
      Alert.alert('Error', 'Failed to start study. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const markCharacterComplete = async () => {
    if (isCompleting) return;
    try {
      setIsCompleting(true);
      await completeCharacterStudy(id);
      Alert.alert('Character Study Complete! 🎉', `You've completed the study on ${character?.name}`, [{ text: 'Great!' }]);
      await load();
    } catch (err: any) {
      console.error('[CharacterDetail] Failed to complete', err);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleCharacterFavorite(id);
      const progress = await fetchCharacterProgress(id);
      setCharacterProgress(progress);
    } catch (err: any) {
      if (err?.code === '23505') {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('user_character_progress')
              .update({ favorite: !characterProgress?.favorite })
              .eq('user_id', user.id)
              .eq('character_id', id);
            const progress = await fetchCharacterProgress(id);
            setCharacterProgress(progress);
          }
        } catch (retryErr) {
          console.error('[CharacterDetail] Failed to toggle favorite on retry', retryErr);
        }
      } else {
        console.error('[CharacterDetail] Failed to toggle favorite', err);
      }
    }
  };

  const isLessonComplete = (lessonId: number) =>
    lessonProgress.some(lp => lp.lesson_id === lessonId && lp.completed);

  const completedLessonsCount = lessonProgress.filter(lp => lp.completed).length;

  if (loading || !character) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  const hasStarted = characterProgress !== null;
  const isCompleted = characterProgress?.completed;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, backgroundColor: colors.background.primary }}>
      {/* Header with favorite */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>{character.name}</Text>
          <Text style={{ marginTop: 6, fontSize: 13, color: colors.text.secondary }}>
            {character.character_type ?? ''} {character.testament ? `• ${character.testament}` : ''}
          </Text>
        </View>

        <TouchableOpacity onPress={handleToggleFavorite} style={{ padding: 4 }} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Text style={{ fontSize: 28 }}>{characterProgress?.favorite ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress indicator */}
      {isCompleted ? (
        <View style={{ marginTop: 12, padding: 12, backgroundColor: '#d1fae5', borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#065f46' }}>
            ✓ Completed on {new Date(characterProgress.completed_at!).toLocaleDateString()}
          </Text>
        </View>
      ) : hasStarted ? (
        <View style={{ marginTop: 12, padding: 12, backgroundColor: '#dbeafe', borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e40af' }}>STUDY IN PROGRESS</Text>
          <Text style={{ marginTop: 4, fontSize: 16, fontWeight: '600' }}>
            {completedLessonsCount} of {lessons.length} lessons completed
          </Text>
          <View style={{ marginTop: 8, height: 8, backgroundColor: '#bfdbfe', borderRadius: 4, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${lessons.length > 0 ? (completedLessonsCount / lessons.length) * 100 : 0}%`,
                backgroundColor: '#2563eb'
              }}
            />
          </View>
        </View>
      ) : null}

      {/* One sentence summary */}
      {character.one_sentence_summary ? (
        <Text style={{ marginTop: 12, fontSize: 16, lineHeight: 24, color: colors.text.primary }}>
          {character.one_sentence_summary}
        </Text>
      ) : null}

      {/* Appearance info */}
      {(character.first_appearance || character.last_appearance) && (
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 14, color: colors.text.secondary }}>
            📍 {character.first_appearance ?? ''}{character.first_appearance && character.last_appearance ? ' → ' : ''}{character.last_appearance ?? ''}
          </Text>
        </View>
      )}

      {/* Start Study Button */}
      {!hasStarted && lessons.length > 0 && (
        <TouchableOpacity
          onPress={handleStartStudy}
          disabled={isStarting}
          style={{
            marginTop: 16,
            padding: 16,
            backgroundColor: isStarting ? colors.text.tertiary : colors.accent.primary,
            borderRadius: 12,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 16 }}>
            {isStarting ? 'Starting...' : '🚀 Start Character Study'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Lessons section */}
      <View style={{ marginTop: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
            Lessons {lessons.length > 0 && `(${lessons.length})`}
          </Text>

          {hasStarted && !isCompleted && completedLessonsCount === lessons.length && lessons.length > 0 && (
            <TouchableOpacity
              onPress={markCharacterComplete}
              disabled={isCompleting}
              style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: isCompleting ? colors.text.tertiary : '#10b981', borderRadius: 8 }}
            >
              <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 14 }}>
                {isCompleting ? 'Saving...' : '✓ Mark Complete'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {lessons.length === 0 ? (
          <Text style={{ fontSize: 14, color: colors.text.secondary, fontStyle: 'italic' }}>
            No lessons available yet.
          </Text>
        ) : (
          lessons.map((l) => {
            const lessonComplete = isLessonComplete(l.id);
            return (
              <Pressable
                key={l.id}
                onPress={() => navigation.navigate('CharacterLesson', { id: l.id })}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  borderRadius: 10,
                  backgroundColor: lessonComplete ? '#f0fdf4' : colors.background.secondary
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                      {l.lesson_number != null ? `Lesson ${l.lesson_number}: ` : ''}
                      {l.lesson_title ?? 'Untitled'}
                    </Text>
                    {!!l.key_passage && (
                      <Text style={{ marginTop: 4, fontSize: 14, color: colors.text.secondary }}>
                        {l.key_passage}
                      </Text>
                    )}
                    {!!l.life_stage && (
                      <Text style={{ marginTop: 4, fontSize: 12, color: colors.text.secondary }}>
                        {l.life_stage}
                      </Text>
                    )}
                  </View>
                  {lessonComplete && <Text style={{ fontSize: 20 }}>✓</Text>}
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

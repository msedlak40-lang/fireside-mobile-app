// src/components/Characters/CharacterLessonScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import type { CharacterLesson } from '../../types/supabase-characters';

// New table needed: user_character_lesson_progress
type LessonProgress = {
  id: string
  user_id: string
  lesson_id: number
  completed: boolean
  completed_at: string | null
}

export default function CharacterLessonScreen() {
  const { id } = useRoute<any>().params as { id: number };
  const navigation = useNavigation<any>();
  const [lesson, setLesson] = useState<CharacterLesson | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('character_study_lessons')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setLesson(data as CharacterLesson);

        // Load progress for this specific lesson
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: progressData } = await supabase
            .from('user_character_lesson_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('lesson_id', id)
            .maybeSingle();
          
          if (progressData) {
            setLessonProgress(progressData as LessonProgress);
          }
        }
      } catch (err) {
        console.error('[CharacterLesson] Load failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const markLessonComplete = async () => {
    if (isCompleting || !lesson) return;

    try {
      setIsCompleting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Mark this lesson complete
      const { error } = await supabase
        .from('user_character_lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: id,
          completed: true,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      // Check if all lessons for this character are complete
      if (lesson.character_id) {
        const { data: allLessons } = await supabase
          .from('character_study_lessons')
          .select('id')
          .eq('character_id', lesson.character_id);

        const { data: completedLessons } = await supabase
          .from('user_character_lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('completed', true)
          .in('lesson_id', (allLessons || []).map(l => l.id));

        // If all lessons complete, mark character as complete
        if (allLessons && completedLessons && allLessons.length === completedLessons.length + 1) {
          await supabase
            .from('user_character_progress')
            .upsert({
              user_id: user.id,
              character_id: lesson.character_id,
              completed: true,
              completed_at: new Date().toISOString()
            });

          Alert.alert(
            'Character Study Complete! 🎉',
            'You\'ve finished all lessons for this character!',
            [{ text: 'Great!', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert(
            'Lesson Complete! ✓',
            'Keep going with the next lesson!',
            [{ text: 'Continue', onPress: () => {} }]
          );
        }
      }

      // Reload progress
      const { data: progressData } = await supabase
        .from('user_character_lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', id)
        .single();
      
      if (progressData) {
        setLessonProgress(progressData as LessonProgress);
      }

      // Update streak
      await supabase.rpc('update_user_streak', { p_user_id: user.id });
    } catch (err: any) {
      console.error('[CharacterLesson] Failed to complete', err);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading || !lesson) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const vs = Array.isArray(lesson.verse_sections) ? (lesson.verse_sections as any[]) : [];
  const apps = Array.isArray(lesson.specific_applications) ? (lesson.specific_applications as any[]) : [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <Text style={{ fontSize: 22, fontWeight: '800' }}>{lesson.lesson_title ?? 'Lesson'}</Text>
      {!!lesson.lesson_number && (
        <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>Lesson {lesson.lesson_number}</Text>
      )}
      {!!lesson.key_passage && (
        <Text style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>{lesson.key_passage}</Text>
      )}

      {/* Progress indicator */}
      {lessonProgress?.completed && (
        <View style={{ marginTop: 12, padding: 12, backgroundColor: '#d1fae5', borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#065f46' }}>
            ✓ Completed on {new Date(lessonProgress.completed_at!).toLocaleDateString()}
          </Text>
        </View>
      )}

      {!!lesson.story_narrative && (
        <Text style={{ marginTop: 14, fontSize: 16, lineHeight: 24 }}>{lesson.story_narrative}</Text>
      )}

      {vs.length ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700' }}>Verse Sections</Text>
          {vs.map((s, i) => (
            <View key={i} style={{ marginTop: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10 }}>
              {s.heading ? <Text style={{ fontSize: 14, fontWeight: '700' }}>{s.heading}</Text> : null}
              {s.verses ? <Text style={{ marginTop: 2, fontSize: 12, color: '#6b7280' }}>vv. {s.verses}</Text> : null}
              {s.content ? <Text style={{ marginTop: 6, fontSize: 15, lineHeight: 22 }}>{s.content}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {lesson.key_insights?.length ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700' }}>Key Insights</Text>
          {lesson.key_insights!.map((t, i) => (
            <Text key={i} style={{ marginTop: 6, fontSize: 15 }}>
              • {t}
            </Text>
          ))}
        </View>
      ) : null}

      {lesson.hard_truths?.length ? (
        <View style={{ marginTop: 16, padding: 12, backgroundColor: '#fff7ed', borderRadius: 10 }}>
          <Text style={{ fontSize: 12, color: '#9a3412', fontWeight: '700' }}>HARD TRUTHS</Text>
          {lesson.hard_truths!.map((t, i) => (
            <Text key={i} style={{ marginTop: 6, fontSize: 15 }}>
              {t}
            </Text>
          ))}
        </View>
      ) : null}

      {lesson.about_god ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '700' }}>ABOUT GOD</Text>
          <Text style={{ marginTop: 6, fontSize: 15 }}>{lesson.about_god}</Text>
        </View>
      ) : null}

      {lesson.about_ourselves ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '700' }}>ABOUT US</Text>
          <Text style={{ marginTop: 6, fontSize: 15 }}>{lesson.about_ourselves}</Text>
        </View>
      ) : null}

      {lesson.failures_struggles ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '700' }}>FAILURES / STRUGGLES</Text>
          <Text style={{ marginTop: 6, fontSize: 15 }}>{lesson.failures_struggles}</Text>
        </View>
      ) : null}

      {apps.length ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700' }}>Specific Applications</Text>
          {apps.map((a, i) => (
            <View key={i} style={{ marginTop: 8 }}>
              {a.situation ? <Text style={{ fontSize: 13, color: '#6b7280' }}>{a.situation}</Text> : null}
              {a.application ? <Text style={{ fontSize: 15, marginTop: 4 }}>{a.application}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {lesson.reflection_questions?.length ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700' }}>Reflection</Text>
          {lesson.reflection_questions!.map((q, i) => (
            <Text key={i} style={{ marginTop: 6, fontSize: 15 }}>
              • {q}
            </Text>
          ))}
        </View>
      ) : null}

      {lesson.next_lesson_preview ? (
        <View style={{ marginTop: 18, padding: 12, backgroundColor: '#f8fafc', borderRadius: 10 }}>
          <Text style={{ fontSize: 12, color: '#2563eb', fontWeight: '700' }}>NEXT</Text>
          <Text style={{ marginTop: 6, fontSize: 15 }}>{lesson.next_lesson_preview}</Text>
        </View>
      ) : null}

      {/* Complete button */}
      {!lessonProgress?.completed ? (
        <TouchableOpacity
          onPress={markLessonComplete}
          disabled={isCompleting}
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: isCompleting ? '#9ca3af' : '#10b981',
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            {isCompleting ? 'Saving...' : '✓ Mark Lesson Complete'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}
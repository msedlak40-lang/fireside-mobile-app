// src/components/Characters/CharacterDetailScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabaseClient';
import { getCharacterWithLessons, getCharacterRelationships } from '../../lib/characters';
import { completeCharacterStudy, fetchCharacterProgress, toggleCharacterFavorite } from '../../services/progress';
import type { BibleCharacter, CharacterLesson, CharacterRelationship } from '../../types/supabase-characters';
import type { CharacterProgress } from '../../services/progress';

export default function CharacterDetailScreen() {
  const { id } = useRoute<any>().params as { id: number };
  const navigation = useNavigation<any>();

  const [character, setCharacter] = useState<BibleCharacter | null>(null);
  const [lessons, setLessons] = useState<CharacterLesson[]>([]);
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);
  const [characterProgress, setCharacterProgress] = useState<CharacterProgress | null>(null);
  const [lessonProgress, setLessonProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ character, lessons }, relationshipsData] = await Promise.all([
        getCharacterWithLessons(id),
        getCharacterRelationships(id)
      ]);

      setCharacter(character);
      setLessons(lessons);
      setRelationships(relationshipsData);

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

  // Group relationships by type
  const groupedRelationships = relationships.reduce((acc, rel) => {
    if (!acc[rel.relationship_type]) {
      acc[rel.relationship_type] = [];
    }
    acc[rel.relationship_type].push(rel);
    return acc;
  }, {} as Record<string, CharacterRelationship[]>);

  // Relationship type display names
  const relationshipLabels: Record<string, string> = {
    'father': 'Father',
    'mother': 'Mother',
    'spouse': 'Spouse',
    'child': 'Children',
    'sibling': 'Siblings',
    'friend': 'Friends',
    'mentor': 'Mentors',
    'student': 'Students',
    'rival': 'Rivals',
    'predecessor': 'Preceded by',
    'successor': 'Succeeded by',
  };

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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text.primary }}>{character.name}</Text>
          {character.also_known_as && character.also_known_as.length > 0 && (
            <Text style={{ marginTop: 4, fontSize: 13, color: colors.text.secondary, fontStyle: 'italic' }}>
              Also known as: {character.also_known_as.join(', ')}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={handleToggleFavorite} style={{ padding: 4 }} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Text style={{ fontSize: 28 }}>{characterProgress?.favorite ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Info Bar */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {character.era && (
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background.secondary, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: colors.text.secondary, fontWeight: '600' }}>
              📅 {character.era}
            </Text>
          </View>
        )}
        {character.testament && (
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background.secondary, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: colors.text.secondary, fontWeight: '600' }}>
              📖 {character.testament}
            </Text>
          </View>
        )}
        {character.tribe && (
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.background.secondary, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: colors.text.secondary, fontWeight: '600' }}>
              🏛️ Tribe of {character.tribe}
            </Text>
          </View>
        )}
      </View>

      {/* Progress indicator */}
      {isCompleted ? (
        <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#d1fae5', borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#065f46' }}>
            ✓ Completed on {new Date(characterProgress.completed_at!).toLocaleDateString()}
          </Text>
        </View>
      ) : hasStarted ? (
        <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#dbeafe', borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e40af' }}>STUDY IN PROGRESS</Text>
          <Text style={{ marginTop: 4, fontSize: 16, fontWeight: '600', color: '#1e3a8a' }}>
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
        <Text style={{ marginBottom: 16, fontSize: 16, lineHeight: 24, color: colors.text.primary, fontStyle: 'italic' }}>
          "{character.one_sentence_summary}"
        </Text>
      ) : null}

      {/* Known For */}
      {character.known_for && character.known_for.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: colors.text.primary }}>
            Known For
          </Text>
          {character.known_for.map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
              <Text style={{ fontSize: 16, color: colors.text.secondary, marginRight: 8 }}>•</Text>
              <Text style={{ flex: 1, fontSize: 15, color: colors.text.primary, lineHeight: 22 }}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Character Traits */}
      {character.character_traits && character.character_traits.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: colors.text.primary }}>
            Character Traits
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {character.character_traits.map((trait, index) => (
              <View
                key={index}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#f0f9ff',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#bae6fd'
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#0369a1' }}>{trait}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Key Locations */}
      {character.key_locations && character.key_locations.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: colors.text.primary }}>
            Key Locations
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {character.key_locations.map((location, index) => (
              <View
                key={index}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: colors.background.secondary,
                  borderRadius: 8
                }}
              >
                <Text style={{ fontSize: 13, color: colors.text.primary }}>📍 {location}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Relationships */}
      {relationships.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: colors.text.primary }}>
            Relationships
          </Text>
          {Object.entries(groupedRelationships).map(([type, rels]) => (
            <View key={type} style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary, marginBottom: 6 }}>
                {relationshipLabels[type] || type}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {rels.map((rel, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      if (rel.related_character_id) {
                        navigation.push('CharacterDetail', { id: rel.related_character_id });
                      }
                    }}
                    disabled={!rel.related_character_id}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: rel.related_character_id ? '#eff6ff' : colors.background.secondary,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: rel.related_character_id ? '#3b82f6' : colors.border.default
                    }}
                  >
                    <Text style={{ fontSize: 14, color: rel.related_character_id ? '#1e40af' : colors.text.primary }}>
                      {rel.related_character_name}
                    </Text>
                    {rel.notes && (
                      <Text style={{ fontSize: 11, color: rel.related_character_id ? colors.text.tertiary : colors.text.primary, marginTop: 2, opacity: rel.related_character_id ? 1 : 0.7 }}>
                        {rel.notes}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Start Study Button */}
      {!hasStarted && lessons.length > 0 && (
        <TouchableOpacity
          onPress={handleStartStudy}
          disabled={isStarting}
          style={{
            marginBottom: 20,
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

      {/* Timeline - Life Journey */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
            Life Journey {lessons.length > 0 && `(${lessons.length} lessons)`}
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
          <View style={{ position: 'relative' }}>
            {/* Timeline line */}
            <View style={{
              position: 'absolute',
              left: 20,
              top: 20,
              bottom: 20,
              width: 3,
              backgroundColor: colors.border.default
            }} />

            {lessons.map((lesson, index) => {
              const lessonComplete = isLessonComplete(lesson.id);
              return (
                <Pressable
                  key={lesson.id}
                  onPress={() => navigation.navigate('CharacterLesson', { id: lesson.id })}
                  style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start' }}
                >
                  {/* Timeline node */}
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: lessonComplete ? '#10b981' : colors.background.secondary,
                    borderWidth: 3,
                    borderColor: lessonComplete ? '#10b981' : colors.accent.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    zIndex: 1
                  }}>
                    {lessonComplete ? (
                      <Text style={{ fontSize: 18, color: '#fff' }}>✓</Text>
                    ) : (
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent.primary }}>
                        {lesson.lesson_number ?? index + 1}
                      </Text>
                    )}
                  </View>

                  {/* Lesson card */}
                  <View
                    style={{
                      flex: 1,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: lessonComplete ? '#10b981' : colors.border.default,
                      borderRadius: 12,
                      backgroundColor: lessonComplete ? '#f0fdf4' : colors.background.secondary
                    }}
                  >
                    {lesson.life_stage && (
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '800',
                        letterSpacing: 0.5,
                        color: colors.text.secondary,
                        marginBottom: 4
                      }}>
                        {lesson.life_stage.toUpperCase()}
                      </Text>
                    )}
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 4 }}>
                      {lesson.lesson_title ?? 'Untitled'}
                    </Text>
                    {lesson.key_passage && (
                      <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 8 }}>
                        📖 {lesson.key_passage}
                      </Text>
                    )}
                    {lesson.character_qualities && lesson.character_qualities.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {lesson.character_qualities.slice(0, 3).map((quality, i) => (
                          <View
                            key={i}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              backgroundColor: lessonComplete ? '#d1fae5' : '#e0f2fe',
                              borderRadius: 4
                            }}
                          >
                            <Text style={{ fontSize: 11, color: lessonComplete ? '#065f46' : '#0369a1', fontWeight: '600' }}>
                              {quality}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Bible Appearance */}
      {(character.first_appearance || character.last_appearance) && (
        <View style={{
          padding: 14,
          backgroundColor: colors.background.tertiary,
          borderRadius: 12,
          marginBottom: 20
        }}>
          <Text style={{ fontSize: 13, color: colors.text.secondary, fontWeight: '600' }}>
            📍 Appears in: {character.first_appearance ?? ''}{character.first_appearance && character.last_appearance ? ' → ' : ''}{character.last_appearance ?? ''}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

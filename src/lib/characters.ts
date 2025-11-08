// src/lib/characters.ts
import { supabase } from './supabaseClient';
import type { BibleCharacter, CharacterLesson } from '../types/supabase-characters';


export async function listCharacters(params?: { q?: string | null; testament?: 'OT'|'NT'|null; limit?: number; offset?: number }) {
const { q = null, testament = null, limit = 50, offset = 0 } = params ?? {};
const { data, error } = await supabase.rpc('rpc_list_characters', {
p_query: q, p_testament: testament, p_limit: limit, p_offset: offset,
});
if (error) throw error;
return (data ?? []) as BibleCharacter[];
}


export async function getCharacterWithLessons(id: number) {
const { data, error } = await supabase.rpc('rpc_get_character_with_lessons', { p_character_id: id });
if (error) throw error;
const character = data?.[0]?.character_row as BibleCharacter | undefined;
const lessons = (data ?? []).map((r: any) => r.lesson_row).filter(Boolean) as CharacterLesson[];
return { character: character ?? null, lessons };
}


export async function listLessons(characterId: number, limit = 50, offset = 0) {
const { data, error } = await supabase.rpc('rpc_list_lessons', { p_character_id: characterId, p_limit: limit, p_offset: offset });
if (error) throw error;
return (data ?? []) as CharacterLesson[];
}
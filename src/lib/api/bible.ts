// lib/api/bible.ts
import { supabase } from '../supabase';

export async function getChapterPage(bookId: number, chapter: number) {
  const { data, error } = await supabase.rpc('rpc_get_chapter_page', {
    p_book_id: bookId,
    p_chapter: chapter,
  });
  if (error) throw error;
  return data; // { book, chapter, key_verses, insights, ... }
}

export async function getVersePage(bookId: number, chapter: number, verse: number) {
  const { data, error } = await supabase.rpc('rpc_get_verse_page', {
    p_book_id: bookId,
    p_chapter: chapter,
    p_verse: verse,
  });
  if (error) throw error;
  return data;
}

export async function searchScripture(q: string, limit = 20, offset = 0) {
  const { data, error } = await supabase.rpc('rpc_search_scripture', {
    p_query: q,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data; // each row has book, chapter_number, optional verse_number, snippet, rank
}

export async function getChapterKeyVerses(bookId: number, chapter: number) {
  const { data, error } = await supabase.rpc('rpc_get_chapter_key_verses', {
    p_book_id: bookId,
    p_chapter: chapter,
  });
  if (error) throw error;
  return data; // jsonb[]
}

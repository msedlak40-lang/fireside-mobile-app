// src/lib/devotions.ts
import { supabase } from './supabaseClient';
import type { Devotion } from '../types/supabase-devotions';


// Today (device local date in ISO yyyy-mm-dd)
export async function getDevotionByDate(dateISO: string) {
const { data, error } = await supabase
.rpc('rpc_get_devotion_by_date', { p_date: dateISO });
if (error) throw error;
return (data?.[0] ?? null) as Devotion | null;
}


export async function listDailyDevotions(params?: { before?: string; limit?: number }) {
const { before = null, limit = 30 } = params ?? {};
const { data, error } = await supabase
.rpc('rpc_list_daily_devotions', { p_before: before, p_limit: limit });
if (error) throw error;
return (data ?? []) as Devotion[];
}


export async function listThemeCategories() {
const { data, error } = await supabase
.rpc('rpc_list_theme_categories');
if (error) throw error;
return (data ?? []) as { theme_category: string; count: number }[];
}


export async function listDevotionsByTheme(category: string, limit = 30, offset = 0) {
const { data, error } = await supabase
.rpc('rpc_list_devotions_by_theme', { p_category: category, p_limit: limit, p_offset: offset });
if (error) throw error;
return (data ?? []) as Devotion[];
}


export async function searchDevotions(query: string, limit = 30) {
const { data, error } = await supabase
.rpc('rpc_search_devotions', { p_query: query, p_limit: limit });
if (error) throw error;
return (data ?? []) as Devotion[];
}
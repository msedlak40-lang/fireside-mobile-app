// src/types/supabase-devotions.ts
export type Devotion = {
id: number;
devotion_date: string | null; // ISO date or null
title: string;
theme: string | null;
key_verse_reference: string;
key_verse_book: string;
key_verse_chapter: number;
key_verse_number: number;
key_verse_text: string;
devotional_text: string;
today_challenge: string | null;
prayer_starter: string | null;
related_character_id: number | null;
related_reading_plan_id: number | null;
difficulty_level: string | null;
target_audience: string[] | null;
monthly_theme: string | null;
created_at: string | null;
updated_at: string | null;
key_verse_range: string | null;
hard_truth: string | null;
tags: string[] | null;
is_themed: boolean | null;
theme_category: string | null;
situation_tags: string[] | null;
};
// Armor of God Feature Types

export interface ArmorPiece {
  id: number;
  armor_name: string;
  scripture_reference: string;
  description: string | null;
  week_order: number;
  icon_name: string | null;
  created_at: string;
}

export interface BattleVerseTag {
  id: string;
  book_name: string;
  chapter_number: number;
  verse_number: number;
  battle_tag: string;
  armor_piece_id: number | null;
  context_summary: string | null;
  is_featured: boolean;
  created_at: string;
}

export interface UserBattleVerse {
  id: string;
  user_id: string;
  book_name: string;
  chapter_number: number;
  verse_number: number;
  verse_reference: string;
  verse_text: string;
  notes: string | null;
  battle_tag: string | null;
  created_at: string;
}

export interface UserBattle {
  id: string;
  user_id: string;
  week_number: number;
  year: number;
  battle_text: string;
  battle_tag: string;
  armor_piece_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface UserWeeklyReflection {
  id: string;
  user_id: string;
  battle_id: string;
  verse_id: string | null;
  armor_piece_id: number | null;
  week_number: number;
  year: number;
  day_of_week: number | null;
  reflection_text: string;
  reflection_type: 'daily' | 'midweek' | 'victory';
  created_at: string;
  updated_at: string;
}

export interface BattleVerseResult {
  book_name: string;
  chapter_number: number;
  verse_number: number;
  verse_reference: string;
  verse_text: string;
  armor_name: string;
  context_summary: string;
}

export type BattleTag = 'fear' | 'anger' | 'temptation' | 'doubt' | 'loneliness' | 'identity' | 'purpose';

export interface BattleTagOption {
  tag: BattleTag;
  label: string;
  emoji: string;
  description: string;
}

export const BATTLE_TAGS: BattleTagOption[] = [
  { tag: 'fear', label: 'Fear', emoji: '🏔️', description: 'Anxiety, worry, or dread' },
  { tag: 'anger', label: 'Anger', emoji: '🔥', description: 'Rage, frustration, or bitterness' },
  { tag: 'temptation', label: 'Temptation', emoji: '⚔️', description: 'Struggle with sin or desire' },
  { tag: 'doubt', label: 'Doubt', emoji: '🌊', description: 'Uncertainty or lack of faith' },
  { tag: 'loneliness', label: 'Loneliness', emoji: '💔', description: 'Isolation or feeling alone' },
  { tag: 'identity', label: 'Identity', emoji: '👤', description: 'Questions about who you are' },
  { tag: 'purpose', label: 'Purpose', emoji: '🎯', description: 'Questions about your calling' },
];

// src/services/prayer.ts
import { supabase } from '../lib/supabaseClient';

export type PrayerSession = {
  id: number;
  user_id: string;
  session_date: string;
  duration_minutes: number;
  pre_session_verse: string | null;
  post_session_notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Create a new prayer session
 */
export async function createPrayerSession(
  userId: string,
  durationMinutes: number,
  preSessionVerse: string | null = null,
  postSessionNotes: string | null = null
): Promise<PrayerSession | null> {
  try {
    const { data, error } = await supabase
      .from('user_prayer_sessions')
      .insert({
        user_id: userId,
        duration_minutes: durationMinutes,
        pre_session_verse: preSessionVerse,
        post_session_notes: postSessionNotes,
      })
      .select()
      .single();

    if (error) {
      console.error('[Prayer] Create session error:', error);
      return null;
    }

    return data as PrayerSession;
  } catch (err) {
    console.error('[Prayer] Create session failed:', err);
    return null;
  }
}

/**
 * Update prayer session with post-session notes
 */
export async function updatePrayerSessionNotes(
  sessionId: number,
  notes: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_prayer_sessions')
      .update({
        post_session_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('[Prayer] Update session notes error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Prayer] Update session notes failed:', err);
    return false;
  }
}

/**
 * Get user's prayer sessions
 */
export async function getPrayerSessions(
  userId: string,
  limit: number = 30
): Promise<PrayerSession[]> {
  try {
    const { data, error } = await supabase
      .from('user_prayer_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Prayer] Get sessions error:', error);
      return [];
    }

    return (data || []) as PrayerSession[];
  } catch (err) {
    console.error('[Prayer] Get sessions failed:', err);
    return [];
  }
}

/**
 * Calculate current prayer streak
 */
export async function getPrayerStreak(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('calculate_prayer_streak', { p_user_id: userId });

    if (error) {
      console.error('[Prayer] Get streak error:', error);
      return 0;
    }

    return data || 0;
  } catch (err) {
    console.error('[Prayer] Get streak failed:', err);
    return 0;
  }
}

/**
 * Check if user has prayed today
 */
export async function hasPrayedToday(userId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('user_prayer_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('session_date', today)
      .limit(1);

    if (error) {
      console.error('[Prayer] Check today error:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (err) {
    console.error('[Prayer] Check today failed:', err);
    return false;
  }
}

/**
 * Get total prayer time this week
 */
export async function getWeeklyPrayerMinutes(userId: string): Promise<number> {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('user_prayer_sessions')
      .select('duration_minutes')
      .eq('user_id', userId)
      .gte('session_date', weekAgoStr);

    if (error) {
      console.error('[Prayer] Get weekly minutes error:', error);
      return 0;
    }

    return (data || []).reduce((sum, session) => sum + session.duration_minutes, 0);
  } catch (err) {
    console.error('[Prayer] Get weekly minutes failed:', err);
    return 0;
  }
}

// src/services/readingCycle.ts
// User-level reading cycle. Read progress is scoped to the current cycle; advancing
// starts a fresh cycle with all chapters unread while prior rows are preserved.
import { supabase } from '../lib/supabaseClient'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DASHBOARD_CACHE_KEY = 'fireside.dashboard'

/** The signed-in user's current reading cycle. No row / signed out → 1. */
export async function getCurrentCycle(): Promise<number> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return 1
  const { data } = await supabase
    .from('user_reading_cycle')
    .select('current_cycle')
    .eq('user_id', userId)
    .maybeSingle()
  const c = (data as any)?.current_cycle
  return Number.isInteger(c) && c >= 1 ? c : 1
}

/** Advance to the next cycle. Nothing is deleted; prior cycles' rows remain. */
export async function startNextCycle(): Promise<number> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) throw new Error('Not signed in')
  const next = (await getCurrentCycle()) + 1
  const { error } = await supabase
    .from('user_reading_cycle')
    .upsert(
      { user_id: userId, current_cycle: next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (error) throw error
  // Drop the cached dashboard so "Chapters Read" doesn't show the old cycle's count.
  try { await AsyncStorage.removeItem(DASHBOARD_CACHE_KEY) } catch {}
  return next
}

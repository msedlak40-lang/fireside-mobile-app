// src/services/readingPlans.ts
import { supabase } from '../lib/supabaseClient'

/** ------------ Types ------------ */
export type ReadingPlan = {
  id: number
  plan_name: string
  plan_description: string | null
  total_days: number
  difficulty_level: string | null
  theme_name: string | null
  times_used: number
  average_rating: number | null
}

export type ReadingPlanDay = {
  id: number
  plan_id: number
  day_number: number
  day_title: string
  daily_theme: string | null
  book_name: string
  chapter_number: number
  verse_range: string
  full_reference: string
  verse_insight: string
  reflection_questions: string[] | null
  prayer_prompt: string | null
}

export type UserReadingPlanProgress = {
  id: string
  user_id: string
  plan_id: number
  started_at: string
  current_day: number
  completed: boolean
  completed_at: string | null
  is_active: boolean
  plan_name?: string
  total_days?: number
}

export type ActivePlanWithReading = {
  plan_id: number
  plan_name: string
  current_day: number
  total_days: number
  started_at: string
  days_completed: number
  percentage: number
  on_track: boolean
  todays_reading: Array<{
    day_title: string
    book_name: string
    chapter_number: number
    verse_range: string
    full_reference: string
  }>
}

export type ReadingPlanDayProgress = {
  id: string
  user_progress_id: string
  plan_day_id: number
  day_number: number
  completed: boolean
  completed_at: string | null
  notes: string | null
  time_spent_seconds: number
}

/** ------------ Functions ------------ */

/**
 * List all available reading plans
 */
export async function fetchReadingPlans(): Promise<ReadingPlan[]> {
  const { data, error } = await supabase.rpc('rpc_list_reading_plans')
  if (error) throw error
  return (data || []) as ReadingPlan[]
}

/**
 * Get a specific reading plan with all its days
 */
export async function fetchReadingPlanDetails(planId: number): Promise<{
  plan: ReadingPlan
  days: ReadingPlanDay[]
}> {
  const { data: planData, error: planError } = await supabase
    .from('bible_reading_plans')
    .select(`
      id,
      plan_name,
      plan_description,
      total_days,
      difficulty_level,
      theme:reading_plan_themes(theme_name)
    `)
    .eq('id', planId)
    .single()

  if (planError) throw planError

  const { data: daysData, error: daysError } = await supabase
    .from('reading_plan_days')
    .select('*')
    .eq('plan_id', planId)
    .order('day_number', { ascending: true })

  if (daysError) throw daysError

  return {
    plan: {
      ...planData,
      theme_name: planData.theme?.[0]?.theme_name || null
    } as ReadingPlan,
    days: (daysData || []) as ReadingPlanDay[]
  }
}

/**
 * Start a new reading plan
 */
export async function startReadingPlan(planId: number): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Deactivate any other active plans
  await supabase
    .from('user_reading_plan_progress')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('is_active', true)

  // Create new plan progress
  const { data, error } = await supabase
    .from('user_reading_plan_progress')
    .insert({
      user_id: user.id,
      plan_id: planId,
      current_day: 1,
      is_active: true
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/**
 * Get user's active reading plan with today's reading
 */
export async function fetchActiveReadingPlan(): Promise<ActivePlanWithReading | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  try {
    const { data, error } = await supabase
      .rpc('rpc_get_active_reading_plan', { p_user_id: user.id })

    if (error) throw error

    // If no active plan, return null
    if (!data || Object.keys(data).length === 0) return null

    const planData = data as ActivePlanWithReading

    // Fix: Count actual completed days instead of using current_day - 1
    // Get the user progress ID first
    const { data: progressData } = await supabase
      .from('user_reading_plan_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_id', planData.plan_id)
      .eq('is_active', true)
      .maybeSingle()

    if (progressData) {
      // Count actually completed days
      const { count } = await supabase
        .from('user_reading_plan_day_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_progress_id', progressData.id)
        .eq('completed', true)

      const actualDaysCompleted = count || 0
      const correctPercentage = planData.total_days > 0
        ? Math.round((actualDaysCompleted / planData.total_days) * 100)
        : 0

      return {
        ...planData,
        days_completed: actualDaysCompleted,
        percentage: correctPercentage
      }
    }

    return planData
  } catch (err) {
    console.warn('[fetchActiveReadingPlan] Failed:', err)
    return null
  }
}

/**
 * Get user's reading plan progress
 */
export async function fetchUserPlanProgress(planId: number): Promise<UserReadingPlanProgress | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_reading_plan_progress')
    .select(`
      *,
      plan:bible_reading_plans(plan_name, total_days)
    `)
    .eq('user_id', user.id)
    .eq('plan_id', planId)
    .maybeSingle()

  if (error) throw error
  
  if (!data) return null

  return {
    ...data,
    plan_name: data.plan?.plan_name,
    total_days: data.plan?.total_days
  } as UserReadingPlanProgress
}

/**
 * Complete a reading plan day.
 * userProgressId is optional — if not provided (or undefined), it will be
 * resolved automatically from the user's active plan that owns planDayId.
 */
export async function completeReadingPlanDay(
  userProgressId: string | undefined | null,
  planDayId: number,
  dayNumber: number,
  notes?: string,
  timeSpentSeconds?: number
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Auto-resolve userProgressId when not provided
  let resolvedProgressId = userProgressId
  if (!resolvedProgressId) {
    // Look up the plan_id from the day, then find the user's progress for that plan
    const { data: dayRow } = await supabase
      .from('reading_plan_days')
      .select('plan_id')
      .eq('id', planDayId)
      .single()

    if (!dayRow) throw new Error('Reading plan day not found')

    const { data: progressRow } = await supabase
      .from('user_reading_plan_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_id', dayRow.plan_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!progressRow) throw new Error('No active plan progress found. Please start this plan first.')

    resolvedProgressId = progressRow.id
  }

  // Mark day as complete (onConflict matches unique constraint)
  const { error: dayError } = await supabase
    .from('user_reading_plan_day_progress')
    .upsert({
      user_progress_id: resolvedProgressId,
      plan_day_id: planDayId,
      day_number: dayNumber,
      completed: true,
      completed_at: new Date().toISOString(),
      notes: notes || null,
      time_spent_seconds: timeSpentSeconds || 0
    }, {
      onConflict: 'user_progress_id,day_number'
    })

  if (dayError) throw dayError

  // Update current_day if this was the current day
  const { data: progress } = await supabase
    .from('user_reading_plan_progress')
    .select('current_day, plan:bible_reading_plans(total_days)')
    .eq('id', resolvedProgressId)
    .single()

  if (progress && dayNumber === progress.current_day) {
    const totalDays = progress.plan?.total_days || 0
    const nextDay = dayNumber + 1

    // Update current day or mark plan complete
    if (nextDay > totalDays) {
      await supabase
        .from('user_reading_plan_progress')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', resolvedProgressId)
    } else {
      await supabase
        .from('user_reading_plan_progress')
        .update({ current_day: nextDay })
        .eq('id', resolvedProgressId)
    }
  }

  // Update user streak
  await supabase.rpc('update_user_streak', { p_user_id: user.id })
}

/**
 * Get progress for all days in a plan
 */
export async function fetchPlanDayProgress(userProgressId: string): Promise<ReadingPlanDayProgress[]> {
  const { data, error } = await supabase
    .from('user_reading_plan_day_progress')
    .select('*')
    .eq('user_progress_id', userProgressId)
    .order('day_number', { ascending: true })

  if (error) throw error
  return (data || []) as ReadingPlanDayProgress[]
}

/** ------------ Passage-level progress ------------ */

export type PassageProgress = {
  id: string
  user_progress_id: string
  plan_day_id: number
  passage_index: number
  completed: boolean
  completed_at: string | null
}

/**
 * Resolve the user's active progress ID for a given plan day.
 */
async function resolveUserProgressId(planDayId: number): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: dayRow } = await supabase
    .from('reading_plan_days')
    .select('plan_id')
    .eq('id', planDayId)
    .single()

  if (!dayRow) throw new Error('Reading plan day not found')

  const { data: progressRow } = await supabase
    .from('user_reading_plan_progress')
    .select('id')
    .eq('user_id', user.id)
    .eq('plan_id', dayRow.plan_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!progressRow) throw new Error('No active plan progress found. Please start this plan first.')
  return progressRow.id
}

/**
 * Mark a single passage (by index) as complete.
 * If all passages for the day are now complete, auto-marks the day complete too.
 */
export async function markPassageComplete(
  planDayId: number,
  passageIndex: number,
  totalPassages: number,
  dayNumber: number
): Promise<{ allComplete: boolean }> {
  const userProgressId = await resolveUserProgressId(planDayId)

  // Upsert passage completion
  const { error } = await supabase
    .from('user_reading_plan_passage_progress')
    .upsert({
      user_progress_id: userProgressId,
      plan_day_id: planDayId,
      passage_index: passageIndex,
      completed: true,
      completed_at: new Date().toISOString()
    }, {
      onConflict: 'user_progress_id,plan_day_id,passage_index'
    })

  if (error) throw error

  // Count completed passages for this day
  const { count } = await supabase
    .from('user_reading_plan_passage_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_progress_id', userProgressId)
    .eq('plan_day_id', planDayId)
    .eq('completed', true)

  const completedCount = count || 0
  const allComplete = completedCount >= totalPassages

  // If all passages complete, mark the whole day complete
  if (allComplete) {
    await completeReadingPlanDay(userProgressId, planDayId, dayNumber)
  }

  return { allComplete }
}

/**
 * Fetch ALL passage-level completion for an entire plan (batch).
 * Returns all completed passage records so the detail screen can show per-passage status.
 */
export async function fetchAllPassageProgressForPlan(
  userProgressId: string
): Promise<PassageProgress[]> {
  const { data, error } = await supabase
    .from('user_reading_plan_passage_progress')
    .select('*')
    .eq('user_progress_id', userProgressId)
    .eq('completed', true)

  if (error) throw error
  return (data || []) as PassageProgress[]
}

/**
 * Fetch passage-level completion status for a specific day.
 */
export async function fetchPassageProgress(planDayId: number): Promise<PassageProgress[]> {
  try {
    const userProgressId = await resolveUserProgressId(planDayId)

    const { data, error } = await supabase
      .from('user_reading_plan_passage_progress')
      .select('*')
      .eq('user_progress_id', userProgressId)
      .eq('plan_day_id', planDayId)
      .order('passage_index', { ascending: true })

    if (error) throw error
    return (data || []) as PassageProgress[]
  } catch {
    // If user has no active progress yet, return empty
    return []
  }
}
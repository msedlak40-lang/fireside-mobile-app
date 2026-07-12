// Fire Service Layer
// Handles creating, joining, and managing accountability groups ("Fires")

import { supabase } from '../lib/supabaseClient';

// ============================================
// TYPES
// ============================================

export interface Fire {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  max_members: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Joined data
  member_count?: number;
  is_creator?: boolean;
}

export interface FireMember {
  id: string;
  fire_id: string;
  user_id: string;
  role: 'creator' | 'admin' | 'member';
  joined_at: string;
  last_active_at: string;

  // User profile data (if joined)
  user_email?: string;
  user_name?: string;
}

export interface CreateFireParams {
  name: string;
  description?: string;
  maxMembers?: number;
}

export interface FireComment {
  id: string;
  fire_share_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;

  user_email?: string;
  user_name?: string;
}

export interface FireReaction {
  id: string;
  fire_share_id: string;
  user_id: string;
  reaction_type: 'pray' | 'amen' | 'encouraged' | 'grateful';
  created_at: string;
}

export interface ReactionSummary {
  pray: number;
  amen: number;
  encouraged: number;
  grateful: number;
  userReaction?: 'pray' | 'amen' | 'encouraged' | 'grateful' | null;
}

export interface FireShare {
  id: string;
  fire_id: string;
  user_id: string;
  share_type: 'arsenal' | 'theme_discovery' | 'prayer_request' | 'encouragement' | 'verse';
  saved_application_id: string | null;
  message: string | null;
  created_at: string;
  updated_at: string;

  // Verse-type shares carry the verse directly (saved_application_id is null).
  verse_reference?: string | null;
  verse_text?: string | null;
  verse_book?: string | null;
  verse_chapter?: number | null;
  verse_number?: number | null;

  // Joined data
  user_email?: string;
  user_name?: string;
  saved_application?: {
    book: string;
    chapter: number;
    theme_tag: string;
    sub_theme_tag: string;
    application: string;
    key_insight: string;
    action_step: string;
  };
}

// ============================================
// CREATE FIRE
// ============================================

/**
 * Create a new Fire (accountability group)
 */
export async function createFire(params: CreateFireParams): Promise<Fire> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Generate unique invite code
  const { data: codeData, error: codeError } = await supabase
    .rpc('generate_invite_code');

  if (codeError) throw codeError;
  const inviteCode = codeData as string;

  // Create fire
  const { data: fire, error: fireError } = await supabase
    .from('fires')
    .insert({
      name: params.name,
      description: params.description || null,
      invite_code: inviteCode,
      created_by: user.id,
      max_members: null,
    })
    .select()
    .single();

  if (fireError) throw fireError;

  // Add creator as first member
  const { error: memberError } = await supabase
    .from('fire_members')
    .insert({
      fire_id: fire.id,
      user_id: user.id,
      role: 'creator',
    });

  if (memberError) throw memberError;

  return fire;
}

// ============================================
// JOIN FIRE
// ============================================

/**
 * Join a Fire using invite code.
 * Note: The RLS policy on `fires` only allows SELECT for existing members,
 * so we use an RPC function or a two-step approach. For now, we look up
 * the fire via a server-side function or relax the lookup policy.
 * The INSERT policy on fire_members only requires auth.uid() = user_id,
 * so we just need to resolve the fire_id from the invite code.
 */
export async function joinFire(inviteCode: string): Promise<Fire> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Find fire by invite code
  // Note: This requires a SELECT policy that allows lookup by invite_code
  // for non-members. If this fails, add an RPC or relax the SELECT policy.
  const { data: fire, error: fireError } = await supabase
    .from('fires')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase())
    .eq('is_active', true)
    .single();

  if (fireError || !fire) {
    throw new Error('Invalid invite code or Fire not found');
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('fire_members')
    .select('id')
    .eq('fire_id', fire.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    throw new Error('Already a member of this Fire');
  }

  // Add as member
  const { error: memberError } = await supabase
    .from('fire_members')
    .insert({
      fire_id: fire.id,
      user_id: user.id,
      role: 'member',
    });

  if (memberError) throw memberError;

  return fire;
}

// ============================================
// GET USER'S FIRES
// ============================================

/**
 * Get all Fires the user is a member of
 */
export async function getUserFires(): Promise<Fire[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('fire_members')
    .select(`
      fire_id,
      fires (
        id,
        name,
        description,
        invite_code,
        created_by,
        max_members,
        is_active,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id);

  if (error) throw error;

  const fires = (data || [])
    .filter((item: any) => item.fires)
    .map((item: any) => ({
      ...item.fires,
      is_creator: item.fires.created_by === user.id,
    })) as Fire[];

  // Get member counts
  for (const fire of fires) {
    const { count } = await supabase
      .from('fire_members')
      .select('*', { count: 'exact', head: true })
      .eq('fire_id', fire.id);

    fire.member_count = count || 0;
  }

  return fires;
}

// ============================================
// GET FIRE MEMBERS
// ============================================

/**
 * Get all members of a Fire
 */
export async function getFireMembers(fireId: string): Promise<FireMember[]> {
  const { data, error } = await supabase
    .from('fire_members')
    .select(`
      id,
      fire_id,
      user_id,
      role,
      joined_at,
      last_active_at
    `)
    .eq('fire_id', fireId)
    .order('joined_at');

  if (error) throw error;

  const members = data || [];

  // Attach best-effort profile names (batched, one query for all member ids),
  // same resolution chain as getFireShares/getShareComments. UI falls back to
  // 'Brother' when a name doesn't resolve.
  const nameMap = await fetchProfileNames(members.map((m: any) => m.user_id));

  return members.map((m: any) => ({ ...m, user_name: nameMap.get(m.user_id) }));
}

// ============================================
// LEAVE FIRE
// ============================================

/**
 * Leave a Fire
 */
export async function leaveFire(fireId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('fire_members')
    .delete()
    .eq('fire_id', fireId)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ============================================
// DELETE FIRE (creator only)
// ============================================

/**
 * Delete a Fire (creator only)
 */
export async function deleteFire(fireId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('fires')
    .delete()
    .eq('id', fireId)
    .eq('created_by', user.id);

  if (error) throw error;
}

// ============================================
// SHARE TO FIRE
// ============================================

/**
 * Share an Arsenal insight to a Fire
 */
export async function shareToFire(
  fireId: string,
  savedApplicationId: string,
  message?: string
): Promise<FireShare> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify user is a member of this fire
  const { data: membership } = await supabase
    .from('fire_members')
    .select('id')
    .eq('fire_id', fireId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    throw new Error('Not a member of this Fire');
  }

  // Create share
  const { data, error } = await supabase
    .from('fire_shares')
    .insert({
      fire_id: fireId,
      user_id: user.id,
      share_type: 'arsenal',
      saved_application_id: savedApplicationId,
      message: message?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;

  // Update shared_with_fire flag on saved application
  await supabase
    .from('user_saved_applications')
    .update({
      shared_with_fire: true,
      fire_id: fireId,
    })
    .eq('id', savedApplicationId);

  return data;
}

/**
 * Share a single verse (text + reference) to a Fire. Unlike shareToFire, the
 * verse content lives directly on the fire_shares row; there is no saved
 * application, so nothing on user_saved_applications is stamped.
 */
export async function shareVerseToFire(
  fireId: string,
  verse: { book: string; chapter: number; verseNumber: number; reference: string; text: string },
  message?: string
): Promise<FireShare> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify user is a member of this fire
  const { data: membership } = await supabase
    .from('fire_members')
    .select('id')
    .eq('fire_id', fireId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    throw new Error('Not a member of this Fire');
  }

  const { data, error } = await supabase
    .from('fire_shares')
    .insert({
      fire_id: fireId,
      user_id: user.id,
      share_type: 'verse',
      saved_application_id: null,
      verse_book: verse.book,
      verse_chapter: verse.chapter,
      verse_number: verse.verseNumber,
      verse_reference: verse.reference,
      verse_text: verse.text,
      message: message?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

// ============================================
// AUTHOR NAMES (from profiles)
// ============================================

/**
 * Resolve a best-effort author name from a profiles row.
 * Fallback chain: first_name -> display_name -> full_name -> email local-part.
 * Returns null when nothing usable exists (caller shows 'Brother').
 */
function resolveProfileName(p: any): string | null {
  const first = (p?.first_name || '').trim();
  if (first) return first;
  const display = (p?.display_name || '').trim();
  if (display) return display;
  const full = (p?.full_name || '').trim();
  if (full) return full;
  const email = (p?.email || '').trim();
  if (email.includes('@')) return email.split('@')[0];
  return null;
}

/**
 * Fetch author names for a set of user ids from the profiles table.
 * NOTE: reading OTHER users' profiles requires profiles RLS to permit it
 * (a co-member or public SELECT). If profiles RLS is owner-only, only the
 * current user resolves and every other author falls back to 'Brother'.
 * Failures are swallowed so the feed still renders (names just fall back).
 */
async function fetchProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = Array.from(new Set(userIds)).filter(Boolean);
  if (unique.length === 0) return names;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, first_name, last_name, full_name, email')
    .in('id', unique);

  if (error) {
    console.error('[Fire] Error fetching profile names:', error);
    return names;
  }

  for (const p of data || []) {
    const name = resolveProfileName(p);
    if (name) names.set(p.id, name);
  }
  return names;
}

// ============================================
// GET FIRE SHARES
// ============================================

/**
 * Get all shares for a Fire
 */
export async function getFireShares(fireId: string): Promise<FireShare[]> {
  const { data, error } = await supabase
    .from('fire_shares')
    .select(`
      id,
      fire_id,
      user_id,
      share_type,
      saved_application_id,
      message,
      created_at,
      updated_at,
      verse_reference,
      verse_text,
      verse_book,
      verse_chapter,
      verse_number,
      user_saved_applications (
        book,
        chapter,
        theme_tag,
        sub_theme_tag,
        chapter_themes (
          application,
          key_insight,
          action_step
        )
      )
    `)
    .eq('fire_id', fireId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const shares = data || [];
  const nameMap = await fetchProfileNames(shares.map((s: any) => s.user_id));

  return shares.map((share: any) => ({
    ...share,
    user_name: nameMap.get(share.user_id),
    saved_application: share.user_saved_applications ? {
      book: share.user_saved_applications.book,
      chapter: share.user_saved_applications.chapter,
      theme_tag: share.user_saved_applications.theme_tag,
      sub_theme_tag: share.user_saved_applications.sub_theme_tag,
      application: share.user_saved_applications.chapter_themes?.application,
      key_insight: share.user_saved_applications.chapter_themes?.key_insight,
      action_step: share.user_saved_applications.chapter_themes?.action_step,
    } : undefined,
  }));
}

// ============================================
// DELETE SHARE
// ============================================

/**
 * Delete a share (own shares only)
 */
export async function deleteFireShare(shareId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('fire_shares')
    .delete()
    .eq('id', shareId)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ============================================
// COMMENTS
// ============================================

/**
 * Get comments for a share
 */
export async function getShareComments(shareId: string): Promise<FireComment[]> {
  const { data, error } = await supabase
    .from('fire_comments')
    .select('*')
    .eq('fire_share_id', shareId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const comments = data || [];
  const nameMap = await fetchProfileNames(comments.map((c: any) => c.user_id));

  return comments.map((c: any) => ({ ...c, user_name: nameMap.get(c.user_id) }));
}

/**
 * Add a comment to a share
 */
export async function addShareComment(
  shareId: string,
  commentText: string
): Promise<FireComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('fire_comments')
    .insert({
      fire_share_id: shareId,
      user_id: user.id,
      comment_text: commentText.trim(),
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Delete a comment (own comments only)
 */
export async function deleteShareComment(commentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('fire_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ============================================
// REACTIONS
// ============================================

/**
 * Get reaction summary for a share
 */
export async function getShareReactions(shareId: string): Promise<ReactionSummary> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('fire_reactions')
    .select('user_id, reaction_type')
    .eq('fire_share_id', shareId);

  if (error) throw error;

  const reactions = data || [];

  const summary: ReactionSummary = {
    pray: reactions.filter(r => r.reaction_type === 'pray').length,
    amen: reactions.filter(r => r.reaction_type === 'amen').length,
    encouraged: reactions.filter(r => r.reaction_type === 'encouraged').length,
    grateful: reactions.filter(r => r.reaction_type === 'grateful').length,
    userReaction: null,
  };

  if (user) {
    const userReaction = reactions.find(r => r.user_id === user.id);
    if (userReaction) {
      summary.userReaction = userReaction.reaction_type as ReactionSummary['userReaction'];
    }
  }

  return summary;
}

/**
 * Toggle a reaction (add if not present, remove if same, switch if different)
 */
export async function toggleReaction(
  shareId: string,
  reactionType: 'pray' | 'amen' | 'encouraged' | 'grateful'
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user already reacted
  const { data: existing } = await supabase
    .from('fire_reactions')
    .select('id, reaction_type')
    .eq('fire_share_id', shareId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Delete existing reaction first
    await supabase
      .from('fire_reactions')
      .delete()
      .eq('id', existing.id);

    if (existing.reaction_type !== reactionType) {
      // Different reaction - add the new one
      await supabase
        .from('fire_reactions')
        .insert({
          fire_share_id: shareId,
          user_id: user.id,
          reaction_type: reactionType,
        });
    }
    // Same reaction - just removed it (toggle off), don't re-insert
  } else {
    // No reaction yet - add it
    await supabase
      .from('fire_reactions')
      .insert({
        fire_share_id: shareId,
        user_id: user.id,
        reaction_type: reactionType,
      });
  }
}

// ============================================
// UPDATE FIRE SETTINGS
// ============================================

/**
 * Update Fire settings (creator only)
 */
export async function updateFire(
  fireId: string,
  updates: {
    name?: string;
    description?: string | null;
  }
): Promise<Fire> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;

  const { data, error } = await supabase
    .from('fires')
    .update(updateData)
    .eq('id', fireId)
    .eq('created_by', user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

// ============================================
// REMOVE MEMBER
// ============================================

/**
 * Remove a member from Fire (creator only)
 */
export async function removeMember(
  fireId: string,
  memberUserId: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify user is the creator
  const { data: fire } = await supabase
    .from('fires')
    .select('created_by')
    .eq('id', fireId)
    .single();

  if (!fire || fire.created_by !== user.id) {
    throw new Error('Only Fire creator can remove members');
  }

  if (memberUserId === user.id) {
    throw new Error('Creator cannot remove themselves');
  }

  const { data, error } = await supabase
    .from('fire_members')
    .delete()
    .eq('fire_id', fireId)
    .eq('user_id', memberUserId)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    // No row deleted — RLS denial (missing creator DELETE policy) or member not
    // found. Surface instead of reporting a false "Member removed" success.
    console.error('[Fire] removeMember deleted no rows (RLS denial or member not found)');
    throw new Error('removeMember: no fire_members row deleted');
  }
}

// ============================================
// FIRE STATISTICS
// ============================================

export interface FireStats {
  totalShares: number;
  sharesThisWeek: number;
  sharesThisMonth: number;
  totalComments: number;
  totalReactions: number;
  mostActiveMembers: {
    user_id: string;
    share_count: number;
  }[];
}

/**
 * Get Fire statistics
 */
export async function getFireStats(fireId: string): Promise<FireStats> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data: allShares } = await supabase
    .from('fire_shares')
    .select('id, user_id, created_at')
    .eq('fire_id', fireId);

  const shares = allShares || [];

  const totalShares = shares.length;
  const sharesThisWeek = shares.filter(
    s => new Date(s.created_at) >= weekAgo
  ).length;
  const sharesThisMonth = shares.filter(
    s => new Date(s.created_at) >= monthAgo
  ).length;

  const shareIds = shares.map(s => s.id);

  const { count: commentCount } = await supabase
    .from('fire_comments')
    .select('*', { count: 'exact', head: true })
    .in('fire_share_id', shareIds.length > 0 ? shareIds : ['']);

  const { count: reactionCount } = await supabase
    .from('fire_reactions')
    .select('*', { count: 'exact', head: true })
    .in('fire_share_id', shareIds.length > 0 ? shareIds : ['']);

  const shareCounts = new Map<string, number>();
  shares.forEach(share => {
    shareCounts.set(share.user_id, (shareCounts.get(share.user_id) || 0) + 1);
  });

  const mostActiveMembers = Array.from(shareCounts.entries())
    .map(([user_id, share_count]) => ({ user_id, share_count }))
    .sort((a, b) => b.share_count - a.share_count)
    .slice(0, 5);

  return {
    totalShares,
    sharesThisWeek,
    sharesThisMonth,
    totalComments: commentCount || 0,
    totalReactions: reactionCount || 0,
    mostActiveMembers,
  };
}

// ============================================
// UNREAD / ACTIVITY TRACKING
// ============================================

/**
 * Get count of new shares since user last viewed
 */
export async function getUnreadShareCount(fireId: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: member } = await supabase
    .from('fire_members')
    .select('last_active_at')
    .eq('fire_id', fireId)
    .eq('user_id', user.id)
    .single();

  if (!member || !member.last_active_at) return 0;

  const { count } = await supabase
    .from('fire_shares')
    .select('*', { count: 'exact', head: true })
    .eq('fire_id', fireId)
    .gt('created_at', member.last_active_at);

  return count || 0;
}

/**
 * Mark Fire as viewed (update last_active_at).
 * Inspects the result: an RLS-blocked UPDATE returns no error but updates zero
 * rows, so we .select() the affected row and treat an empty result as a failure
 * rather than letting it hide (this is exactly how the never-clearing badge bug
 * went unnoticed).
 */
export async function markFireViewed(fireId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from('fire_members')
    .update({ last_active_at: new Date().toISOString() })
    .eq('fire_id', fireId)
    .eq('user_id', user.id)
    .select('id');

  if (error) {
    console.error('[Fire] markFireViewed failed:', error);
    throw error;
  }
  if (!data || data.length === 0) {
    // No row updated — RLS denial or a missing membership row. Surface instead of hiding.
    console.error('[Fire] markFireViewed updated no rows (RLS on fire_members UPDATE, or no membership row)');
    throw new Error('markFireViewed: no fire_members row updated');
  }
}

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
  share_type: 'arsenal' | 'theme_discovery' | 'prayer_request' | 'encouragement';
  saved_application_id: string | null;
  message: string | null;
  created_at: string;
  updated_at: string;

  // Joined data
  user_email?: string;
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

  return data || [];
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

  return (data || []).map((share: any) => ({
    ...share,
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

  return data || [];
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

  const { error } = await supabase
    .from('fire_members')
    .delete()
    .eq('fire_id', fireId)
    .eq('user_id', memberUserId);

  if (error) throw error;
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
 * Mark Fire as viewed (update last_active_at)
 */
export async function markFireViewed(fireId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('fire_members')
    .update({ last_active_at: new Date().toISOString() })
    .eq('fire_id', fireId)
    .eq('user_id', user.id);
}

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  getShareComments,
  getShareReactions,
  addShareComment,
  deleteShareComment,
  toggleReaction,
  type FireShare,
  type FireComment,
  type ReactionSummary,
} from '../services/fire';
import { colors } from '../theme/colors';

interface FireShareCardProps {
  share: FireShare;
  currentUserId: string;
  onDelete?: () => void;
}

const REACTIONS = [
  { type: 'pray' as const, emoji: '🙏', label: 'Praying' },
  { type: 'amen' as const, emoji: '🙌', label: 'Amen' },
  { type: 'encouraged' as const, emoji: '💪', label: 'Encouraged' },
  { type: 'grateful' as const, emoji: '❤️', label: 'Grateful' },
];

export default function FireShareCard({
  share,
  currentUserId,
  onDelete,
}: FireShareCardProps) {
  const [comments, setComments] = useState<FireComment[]>([]);
  const [reactions, setReactions] = useState<ReactionSummary>({
    pray: 0,
    amen: 0,
    encouraged: 0,
    grateful: 0,
  });
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  useEffect(() => {
    loadInteractions();
  }, [share.id]);

  async function loadInteractions() {
    try {
      const [commentsData, reactionsData] = await Promise.all([
        getShareComments(share.id),
        getShareReactions(share.id),
      ]);

      setComments(commentsData);
      setReactions(reactionsData);
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  }

  async function handleReaction(reactionType: 'pray' | 'amen' | 'encouraged' | 'grateful') {
    try {
      await toggleReaction(share.id, reactionType);
      await loadInteractions();
    } catch (error) {
      console.error('Error toggling reaction:', error);
      Alert.alert('Error', 'Could not add reaction');
    }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;

    try {
      setIsAddingComment(true);
      await addShareComment(share.id, newComment);
      setNewComment('');
      setShowComments(true);
      await loadInteractions();
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Could not add comment');
    } finally {
      setIsAddingComment(false);
    }
  }

  async function handleDeleteComment(comment: FireComment) {
    Alert.alert(
      'Delete Comment?',
      'Remove your comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShareComment(comment.id);
              await loadInteractions();
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Could not delete comment');
            }
          },
        },
      ]
    );
  }

  const isOwnShare = share.user_id === currentUserId;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.user}>
          {isOwnShare ? 'You' : 'Brother'}
        </Text>
        <Text style={styles.date}>
          {new Date(share.created_at).toLocaleDateString()}
        </Text>
      </View>

      {/* Personal Message */}
      {share.message && (
        <View style={styles.message}>
          <Text style={styles.messageText}>"{share.message}"</Text>
        </View>
      )}

      {/* Shared Application */}
      {share.saved_application && (
        <View style={styles.application}>
          <Text style={styles.appReference}>
            {share.saved_application.book} {share.saved_application.chapter}
          </Text>
          <Text style={styles.appTheme}>
            {share.saved_application.theme_tag} {share.saved_application.sub_theme_tag ? `• ${share.saved_application.sub_theme_tag}` : ''}
          </Text>
          {share.saved_application.key_insight && (
            <Text style={styles.appInsight} numberOfLines={3}>
              {share.saved_application.key_insight}
            </Text>
          )}
          {share.saved_application.action_step && (
            <Text style={styles.appAction} numberOfLines={2}>
              {share.saved_application.action_step}
            </Text>
          )}
        </View>
      )}

      {/* Reactions */}
      <View style={styles.reactionsContainer}>
        {REACTIONS.map(({ type, emoji }) => {
          const count = reactions[type];
          const isActive = reactions.userReaction === type;

          return (
            <TouchableOpacity
              key={type}
              style={[styles.reactionButton, isActive && styles.reactionButtonActive]}
              onPress={() => handleReaction(type)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {count > 0 && (
                <Text style={[styles.reactionCount, isActive && styles.reactionCountActive]}>
                  {count}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Comments Section */}
      <View style={styles.commentsSection}>
        <TouchableOpacity
          style={styles.commentsToggle}
          onPress={() => setShowComments(!showComments)}
        >
          <Text style={styles.commentsToggleText}>
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            {showComments ? ' ▼' : ' ▶'}
          </Text>
        </TouchableOpacity>

        {showComments && (
          <View style={styles.commentsContainer}>
            {/* Existing Comments */}
            {comments.map(comment => (
              <View key={comment.id} style={styles.comment}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>
                    {comment.user_id === currentUserId ? 'You' : 'Brother'}
                  </Text>
                  <Text style={styles.commentDate}>
                    {new Date(comment.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.commentText}>{comment.comment_text}</Text>
                {comment.user_id === currentUserId && (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(comment)}
                    style={styles.deleteCommentButton}
                  >
                    <Text style={styles.deleteCommentText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Add Comment */}
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add encouragement..."
                placeholderTextColor={colors.text.muted}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.addCommentButton,
                  (!newComment.trim() || isAddingComment) && styles.addCommentButtonDisabled
                ]}
                onPress={handleAddComment}
                disabled={!newComment.trim() || isAddingComment}
              >
                <Text style={styles.addCommentButtonText}>
                  {isAddingComment ? '...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Delete Share (Own Only) */}
      {isOwnShare && onDelete && (
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteButtonText}>Delete Share</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  user: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  date: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  message: {
    backgroundColor: colors.background.tertiary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
  },
  messageText: {
    fontSize: 15,
    color: colors.text.primary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  application: {
    backgroundColor: colors.background.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  appReference: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  appTheme: {
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  appInsight: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  appAction: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  reactionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  reactionButtonActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 4,
  },
  reactionCountActive: {
    color: '#fff',
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: 12,
  },
  commentsToggle: {
    paddingVertical: 4,
  },
  commentsToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  commentsContainer: {
    marginTop: 12,
  },
  comment: {
    backgroundColor: colors.background.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentUser: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  commentDate: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  commentText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  deleteCommentButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  deleteCommentText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
  },
  addCommentContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.text.primary,
    maxHeight: 80,
  },
  addCommentButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addCommentButtonDisabled: {
    opacity: 0.5,
  },
  addCommentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
});

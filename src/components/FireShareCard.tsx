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
import ViewArsenalModal from './ViewArsenalModal';
import VerseSummaryCard, { type CrossRefItem } from './VerseSummaryCard';
import { saveBattleVerse } from '../services/battleVerses';
import { getVerseLifeApplication, type VerseLifeApplication } from '../services/scripture';
import { getCrossReferences, type CrossReference } from '../services/strongsStudy';
import { setStudyDepth } from '../services/userPrefs';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';

interface FireShareCardProps {
  share: FireShare;
  currentUserId: string;
  onDelete?: () => void;
}

/**
 * CrossReference -> CrossRefItem, the shape VerseSummaryCard's cross-reference rows want.
 *
 * NOTE: ChapterText.tsx has a private copy of this same mapper. Kept local rather than
 * consolidated so this change touches only the Fire feed; if the label format ever changes,
 * both copies need it.
 */
function toCrossRefItem(ref: CrossReference): CrossRefItem {
  const label = ref.target_verse_end
    ? `${ref.target_book} ${ref.target_chapter}:${ref.target_verse_start}-${ref.target_verse_end}`
    : `${ref.target_book} ${ref.target_chapter}:${ref.target_verse_start}`;
  return {
    id: ref.id,
    label,
    book: ref.target_book,
    chapter: ref.target_chapter,
    verseStart: ref.target_verse_start,
    verseEnd: ref.target_verse_end,
  };
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
  const [viewOpen, setViewOpen] = useState(false);
  // Shared-verse enrichment: the same summary card the reader opens on a verse tap. Content is
  // fetched here because VerseSummaryCard is presentational -- it takes content + loading.
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryContent, setSummaryContent] = useState<VerseLifeApplication | null>(null);
  const [summaryCrossRefs, setSummaryCrossRefs] = useState<CrossRefItem[]>([]);
  // Three states, not four: the 'choosing' step lives in VerseSummaryCard, which owns the tag
  // picker for its primary save region. This is the host's half -- the button's label.
  const [battleState, setBattleState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const navigation = useNavigation<any>();

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

  // A verse share is only interactive when it carries the structured columns the privacy work
  // denormalized onto fire_shares. They are nullable, so a share created before they existed
  // would have verse_reference and nothing to key an enrichment lookup on -- that one falls
  // through to the static display below, exactly as today.
  const verseBook = share.verse_book;
  const verseChapter = share.verse_chapter;
  const verseNumber = share.verse_number;
  const hasStructuredVerse =
    !!verseBook && verseChapter != null && verseNumber != null;
  // Composed rather than read from verse_reference so the label always matches the verse the
  // lookups actually used. Falls back to the stored string if anything is missing.
  const verseLabel = hasStructuredVerse
    ? `${verseBook} ${verseChapter}:${verseNumber}`
    : (share.verse_reference ?? '');

  async function openVerseSummary() {
    if (!hasStructuredVerse) return;
    setSummaryContent(null);
    setSummaryCrossRefs([]);
    setSummaryLoading(true);
    setSummaryOpen(true);
    try {
      // Same two reads the reader makes on a verse tap. verse_life_application covers all
      // 31,102 verses, so content is expected; the card has a muted empty state regardless.
      const [content, refs] = await Promise.all([
        getVerseLifeApplication(verseBook as string, verseChapter as number, verseNumber as number),
        getCrossReferences(verseBook as string, verseChapter as number, verseNumber as number, 8),
      ]);
      setSummaryContent(content);
      setSummaryCrossRefs(refs.map(toCrossRefItem));
    } catch (error) {
      console.error('[FireShareCard] Error loading verse summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  }

  // "Study the Words" -> the Strong's surface. DeepStudy is registered in FireStack, so this
  // stays inside the Fire tab and the feed's scroll position survives the round trip.
  function handleDeeper() {
    if (!hasStructuredVerse) return;
    setStudyDepth('deeper');
    setSummaryOpen(false);
    navigation.navigate('DeepStudy', {
      bookName: verseBook,
      chapter: verseChapter,
      verseNumber: verseNumber,
      verseText: share.verse_text ?? '',
    });
  }

  // The tag picker is owned by VerseSummaryCard (nested inside its modal), not mounted here:
  // a picker mounted here would be a SIBLING of the card's open modal and is occluded on iOS.
  // So there is no 'choosing' state to hold -- the card handles that and calls straight in.
  async function saveSharedVerseToBattle(tag: string | null) {
    if (!hasStructuredVerse) return;
    setBattleState('saving');
    try {
      // The shared text is persisted AS SHARED, deliberately. fire_shares has no
      // verse_translation column, so the translation is unknown -- but the text is what this
      // brother actually sent, and it is correct for the verse. (Contrast the devotion key-verse
      // save, which replaces its stored text because that text spans a whole range.)
      await saveBattleVerse(
        verseBook as string,
        verseChapter as number,
        verseNumber as number,
        share.verse_text ?? '',
        tag ?? undefined,
      );
      setBattleState('saved');
    } catch (error) {
      console.error('[FireShareCard] Error saving battle verse:', error);
      setBattleState('idle');
      Alert.alert('Error', 'Could not save verse.');
    }
  }

  const isOwnShare = share.user_id === currentUserId;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.user} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
          {isOwnShare ? 'You' : (share.user_name || 'Brother')}
        </Text>
        <Text style={styles.date} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
          {new Date(share.created_at).toLocaleDateString()}
        </Text>
      </View>

      {/* Personal Message */}
      {share.message && (
        <View style={styles.message}>
          <Text style={styles.messageText}>"{share.message}"</Text>
        </View>
      )}

      {/* Shared Verse (verse-type posts carry their own text; no saved_application).
          Tappable when the structured columns are present, mirroring the arsenal block below:
          same TouchableOpacity + "Tap to read →" cue idiom. Without them it renders exactly as
          it always has, as a static block. */}
      {share.verse_reference && (
        hasStructuredVerse ? (
          <TouchableOpacity style={styles.verseBlock} onPress={openVerseSummary} activeOpacity={0.7}>
            <Text style={styles.verseRef} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{share.verse_reference}</Text>
            <Text style={styles.verseQuote}>"{share.verse_text}"</Text>
            <Text style={styles.verseReadCue} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Tap for insight {'→'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.verseBlock}>
            <Text style={styles.verseRef} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{share.verse_reference}</Text>
            <Text style={styles.verseQuote}>"{share.verse_text}"</Text>
          </View>
        )
      )}

      {/* Shared Application (tap to read the full theme) */}
      {share.saved_application && (
        <TouchableOpacity
          style={styles.application}
          onPress={() => setViewOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.appReference} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            {share.saved_application.book} {share.saved_application.chapter}
          </Text>
          <Text style={styles.appTheme} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
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
          <Text style={styles.appReadCue} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Tap to read →</Text>
        </TouchableOpacity>
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
              <Text style={styles.reactionEmoji} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{emoji}</Text>
              {count > 0 && (
                <Text style={[styles.reactionCount, isActive && styles.reactionCountActive]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
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
          <Text style={styles.commentsToggleText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
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
                  <Text style={styles.commentUser} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                    {comment.user_id === currentUserId ? 'You' : (comment.user_name || 'Brother')}
                  </Text>
                  <Text style={styles.commentDate} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                    {new Date(comment.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.commentText}>{comment.comment_text}</Text>
                {comment.user_id === currentUserId && (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(comment)}
                    style={styles.deleteCommentButton}
                  >
                    <Text style={styles.deleteCommentText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Delete</Text>
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
                <Text style={styles.addCommentButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
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
          <Text style={styles.deleteButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Delete Share</Text>
        </TouchableOpacity>
      )}

      {/* Read-only full theme (reuses the Arsenal view modal) */}
      {share.saved_application && (
        <ViewArsenalModal
          visible={viewOpen}
          savedApplication={share.saved_application}
          onClose={() => setViewOpen(false)}
        />
      )}

      {/* Shared-verse enrichment — the same card the reader opens, so a brother's shared verse
          carries its plain truth, deeper layer, reflection and cross-references. */}
      {hasStructuredVerse && (
        <>
          <VerseSummaryCard
            visible={summaryOpen}
            onClose={() => setSummaryOpen(false)}
            reference={verseLabel}
            loading={summaryLoading}
            content={summaryContent}
            crossRefs={summaryCrossRefs}
            onDeeper={handleDeeper}
            // WithTag form: the card opens its own nested picker, collects the tag, then calls
            // this. Gated on there being text to save -- the column is nullable and a battle
            // verse with an empty body is a row the reader cannot use.
            onSaveBattleVerseWithTag={share.verse_text ? saveSharedVerseToBattle : undefined}
            battleState={battleState}
          />
        </>
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
  verseBlock: {
    backgroundColor: colors.background.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
  },
  verseRef: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent.primary,
    marginBottom: 6,
  },
  verseQuote: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  // Same treatment as appReadCue, the arsenal block's cue, so both tappable blocks read alike.
  verseReadCue: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'right',
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
  appReadCue: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'right',
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

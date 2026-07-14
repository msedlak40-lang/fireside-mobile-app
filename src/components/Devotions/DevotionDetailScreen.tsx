import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TouchableOpacity, Alert, Share, Modal, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { colors } from '../../theme/colors';
import { completeDevotionProgress } from '../../services/progress';
import { saveDevotionHighlight, getDevotionHighlights, deleteDevotionHighlight } from '../../services/devotionHighlights';
import { getDevotionInteraction, toggleDevotionStar, markDevotionRead } from '../../services/devotionInteractions';
import type { Devotion } from '../../types/supabase-devotions';
import VerseSummaryCard from '../VerseSummaryCard';
import { getVerseLifeApplication, type VerseLifeApplication } from '../../services/scripture';
import { setStudyDepth } from '../../services/userPrefs';

export default function DevotionDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // Be flexible about param name and type
  const rawParam = route.params?.id ?? route.params?.devotionId ?? route.params?.devotion?.id;
  const devotionId: number | null = useMemo(() => {
    if (typeof rawParam === 'number' && Number.isFinite(rawParam)) return rawParam;
    if (typeof rawParam === 'string' && rawParam.trim() !== '' && Number.isFinite(Number(rawParam))) {
      return Number(rawParam);
    }
    return null; // invalid / missing
  }, [rawParam]);

  const [devotion, setDevotion] = useState<Devotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [highlights, setHighlights] = useState<Array<{ id?: string; start_pos: number; length: number; selected_text: string; color: string }>>([]);
  const [showHighlights, setShowHighlights] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isToggingStar, setIsToggingStar] = useState(false);
  // Key-verse summary card (same card as VOTD / Battle Verses). Pre-checked on load so the
  // tap affordance only shows when a summary actually exists.
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState<VerseLifeApplication | null>(null);
  const [summaryAvailable, setSummaryAvailable] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectedParagraph, setSelectedParagraph] = useState<{ start: number; length: number; text: string } | null>(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const textInputRef = useRef<TextInput>(null);

  // Helper: Calculate start position of each paragraph in the full text
  const getParagraphPositions = useCallback(() => {
    if (!devotion?.devotional_text) return [];

    const fullText = devotion.devotional_text.replace(/\\n\\n/g, '\n\n');
    const paragraphs = fullText.split('\n\n').filter(p => p.trim());

    const positions: Array<{ start: number; length: number; text: string }> = [];
    let currentPos = 0;

    for (const para of paragraphs) {
      const trimmed = para.trim();
      // Find the actual position in fullText
      const actualStart = fullText.indexOf(trimmed, currentPos);
      if (actualStart !== -1) {
        positions.push({
          start: actualStart,
          length: trimmed.length,
          text: trimmed,
        });
        currentPos = actualStart + trimmed.length;
      }
    }

    return positions;
  }, [devotion]);

  // Check if a paragraph is highlighted based on its position
  const isParagraphHighlighted = (paraStart: number, paraLength: number) => {
    return highlights.some(h => h.start_pos === paraStart && h.length === paraLength);
  };

 function formatISODateYYYYMMDD(iso?: string | null) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return iso;
  // e.g., "Oct 17, 2025" without using Date()
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mm = Math.max(1, Math.min(12, parseInt(m, 10))) - 1;
  return `${monthNames[mm]} ${parseInt(d, 10)}, ${y}`;
}
  const bailWithError = useCallback((msg: string) => {
    console.error('[DevotionDetail] ' + msg, { params: route.params });
    Alert.alert('Oops', 'Unable to open this devotion.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }, [navigation, route.params]);

  useEffect(() => {
    (async () => {
      try {
        if (devotionId == null) {
          bailWithError('Missing or invalid devotion id');
          return;
        }

        // Load devotion
        const { data, error } = await supabase
          .from('daily_devotions')
          .select('*')
          .eq('id', devotionId) // integer id
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          bailWithError('Devotion not found');
          return;
        }
        setDevotion(data as Devotion);

        // Pre-check the key verse's summary: only reveal the tap affordance when a
        // verse_life_application row exists, and cache the content so the card opens
        // instantly. Anchor on the single key_verse_number (the table is per-verse;
        // a devotion whose key verse is a range summarizes its anchor verse).
        const dv = data as Devotion;
        const kBook = dv.key_verse_book;
        const kChap = Number(dv.key_verse_chapter);
        const kVerse = Number(dv.key_verse_number);
        if (kBook && Number.isFinite(kChap) && Number.isFinite(kVerse)) {
          getVerseLifeApplication(kBook, kChap, kVerse)
            .then((app) => { if (app) { setSummaryContent(app); setSummaryAvailable(true); } })
            .catch(() => {});
        }

        // Check completion for this user + devotion
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (userId) {
          const { data: progressData } = await supabase
            .from('user_devotion_progress')
            .select('completed_at')
            .eq('user_id', userId)
            .eq('devotion_id', devotionId)
            .maybeSingle();

          if (progressData?.completed_at) {
            setIsCompleted(true);
          }

          // Load saved highlights for this devotion
          const highlightsData = await getDevotionHighlights(devotionId);
          setHighlights(highlightsData);

          // Load star status and mark as read
          const interaction = await getDevotionInteraction(devotionId);
          if (interaction?.is_starred) setIsStarred(true);
          markDevotionRead(devotionId).catch(() => {});
        }
      } catch (err) {
        console.error('[DevotionDetail] Load failed', err);
        Alert.alert('Error', 'Could not load the devotion. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [devotionId, bailWithError]);

  // Handle long press to open text selection modal
  const handleLongPress = (para: { start: number; length: number; text: string }) => {
    setSelectedParagraph(para);
    setSelectionStart(0);
    setSelectionEnd(para.text.length);
    setShowSelectionModal(true);
  };

  // Save the selected text portion
  const saveSelectedText = async () => {
    if (!selectedParagraph || devotionId == null) return;
    if (selectionStart === selectionEnd) {
      Alert.alert('No Selection', 'Please select some text to highlight');
      return;
    }

    try {
      const actualStart = selectedParagraph.start + selectionStart;
      const actualLength = selectionEnd - selectionStart;
      const selectedText = selectedParagraph.text.substring(selectionStart, selectionEnd);

      await saveDevotionHighlight(devotionId, actualStart, actualLength, selectedText, 'yellow');

      setHighlights([...highlights, { start_pos: actualStart, length: actualLength, selected_text: selectedText, color: 'yellow' }]);
      setShowSelectionModal(false);
      setSelectedParagraph(null);
    } catch (err) {
      console.error('[DevotionDetail] Failed to save highlight:', err);
      Alert.alert('Error', 'Failed to save highlight. Please try again.');
    }
  };

  // Get all saved highlights (returns full objects for deletion)
  const getSavedHighlights = () => {
    return highlights.sort((a, b) => a.start_pos - b.start_pos);
  };

  // Share a saved highlight's text to the OS share sheet (reuses selected_text).
  const shareHighlight = async (highlight: { selected_text: string }) => {
    try {
      await Share.share({ message: highlight.selected_text });
    } catch (err) {
      console.error('[DevotionDetail] Failed to share highlight:', err);
    }
  };

  // Delete a highlight
  const deleteHighlight = async (highlight: { id?: string; start_pos: number; length: number }) => {
    if (devotionId == null) return;

    try {
      if (highlight.id) {
        await deleteDevotionHighlight(highlight.id);
      } else {
        // Fallback: delete by position
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        await supabase
          .from('daily_devotion_highlights')
          .delete()
          .eq('user_id', session.user.id)
          .eq('devotion_id', devotionId)
          .eq('start_pos', highlight.start_pos)
          .eq('length', highlight.length);
      }

      setHighlights(highlights.filter(h => !(h.start_pos === highlight.start_pos && h.length === highlight.length)));
    } catch (err) {
      console.error('[DevotionDetail] Failed to delete highlight:', err);
      Alert.alert('Error', 'Failed to delete highlight.');
    }
  };

  // Mark devotion as complete
  const markDevotionComplete = async () => {
    if (isCompleting || devotionId == null) return;
    try {
      setIsCompleting(true);
      await completeDevotionProgress(devotionId);
      setIsCompleted(true);

      Alert.alert(
        'Devotion Complete! 🙏',
        'Keep up your daily streak!',
        [{ text: 'Continue', onPress: () => {} }]
      );
    } catch (err: any) {
      console.error('[DevotionDetail] Failed to complete', err);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Share devotion
  const shareDevotion = async () => {
    if (!devotion) return;

    const dateText = formatISODateYYYYMMDD(devotion.devotion_date);
    const keyRangeOrNum = devotion.key_verse_range ?? String(devotion.key_verse_number);

    let message = `${devotion.title}\n`;
    if (dateText) message += `${dateText}\n`;
    message += `\n`;

    // Key verse
    message += `"${devotion.key_verse_text}"\n`;
    message += `— ${devotion.key_verse_book} ${devotion.key_verse_chapter}:${keyRangeOrNum}\n\n`;

    // Devotional text — stored with literal "\n\n"; un-escape to real paragraph
    // breaks (matches the on-screen render at getParagraphPositions).
    if (devotion.devotional_text) {
      message += `${devotion.devotional_text.replace(/\\n\\n/g, '\n\n')}\n`;
    }

    // Hard truth
    if (devotion.hard_truth) {
      message += `\nHARD TRUTH\n${devotion.hard_truth}\n`;
    }

    // Today's challenge
    if (devotion.today_challenge) {
      message += `\nTODAY'S CHALLENGE\n${devotion.today_challenge}\n`;
    }

    // Prayer starter
    if (devotion.prayer_starter) {
      message += `\nPRAYER STARTER\n${devotion.prayer_starter}\n`;
    }

    try {
      await Share.share({
        message: message.trim(),
      });
    } catch (error) {
      console.error('[DevotionDetail] Share failed', error);
    }
  };

  const handleToggleStar = async () => {
    if (isToggingStar || devotionId == null) return;
    try {
      setIsToggingStar(true);
      const newStarred = await toggleDevotionStar(devotionId);
      setIsStarred(newStarred);
    } catch (err) {
      console.error('[DevotionDetail] Star toggle failed:', err);
    } finally {
      setIsToggingStar(false);
    }
  };

  // Deeper → Strong's deep-study surface, mirroring the VOTD wiring. Registered in
  // ProgressStack (the live path to this screen) and DevotionsStack.
  const handleDeeper = useCallback(() => {
    if (!devotion) return;
    setStudyDepth('deeper');
    setSummaryOpen(false);
    navigation.navigate('DeepStudy', {
      bookName: devotion.key_verse_book,
      chapter: Number(devotion.key_verse_chapter),
      verseNumber: Number(devotion.key_verse_number),
      verseText: devotion.key_verse_text,
    });
  }, [devotion, navigation]);

  if (loading || !devotion) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  const dateText = formatISODateYYYYMMDD(devotion.devotion_date);
  const keyRef = devotion.key_verse_reference ?? '';
  const keyRangeOrNum = devotion.key_verse_range ?? String(devotion.key_verse_number);
  // Honest reference for the summary card: it summarizes the single anchor verse, so label
  // it with the anchor (e.g. "John 3:16"), not the range the devotion may display.
  const anchorRef = `${devotion.key_verse_book} ${devotion.key_verse_chapter}:${devotion.key_verse_number}`;
  const tags = Array.isArray(devotion.tags) ? devotion.tags : [];
  const situations = Array.isArray(devotion.situation_tags) ? devotion.situation_tags : [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, backgroundColor: colors.background.primary }}>
      {/* Title & action buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', flex: 1, color: colors.text.primary }}>{devotion.title}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginLeft: 12 }}>
          <TouchableOpacity
            onPress={handleToggleStar}
            disabled={isToggingStar}
            style={{
              padding: 8,
              backgroundColor: colors.background.secondary,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 20 }}>{isStarred ? '\u2B50' : '\u2606'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={shareDevotion}
            style={{
              padding: 8,
              backgroundColor: colors.background.secondary,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Meta line */}
      {(dateText || keyRef) ? (
        <Text style={{ marginTop: 6, fontSize: 14, color: colors.text.secondary }}>
          {dateText ? `${dateText} • ` : ''}{keyRef}
        </Text>
      ) : null}

      {/* Key verse box — tap to open the verse summary (only shown when one exists) */}
      <Pressable
        onPress={summaryAvailable ? () => setSummaryOpen(true) : undefined}
        disabled={!summaryAvailable}
        style={{
          marginTop: 14,
          padding: 12,
          borderLeftWidth: 3,
          borderLeftColor: colors.accent.primary,
          backgroundColor: colors.background.secondary,
          borderRadius: 8,
        }}
      >
        <Text selectable style={{ fontSize: 15, fontStyle: 'italic', color: colors.text.primary }}>{devotion.key_verse_text}</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: colors.text.secondary }}>
          {devotion.key_verse_book} {devotion.key_verse_chapter}:{keyRangeOrNum}
        </Text>
        {summaryAvailable && (
          <Text style={{ marginTop: 6, fontSize: 12, color: colors.accent.primary, fontWeight: '700' }}>
            Tap for summary
          </Text>
        )}
      </Pressable>

      {/* Body */}
      {devotion.devotional_text ? (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: colors.text.secondary }}>
              Long-press a paragraph to highlight
            </Text>
            {highlights.length > 0 && (
              <TouchableOpacity onPress={() => setShowHighlights(true)}>
                <Text style={{ fontSize: 12, color: colors.accent.primary, fontWeight: '700' }}>
                  View Saved ({highlights.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {getParagraphPositions().map((para, index) => {
            const isHighlighted = isParagraphHighlighted(para.start, para.length);
            return (
              <Pressable
                key={index}
                onLongPress={() => handleLongPress(para)}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 8,
                  backgroundColor: isHighlighted ? '#fffbeb' : 'transparent',
                  borderLeftWidth: isHighlighted ? 3 : 0,
                  borderLeftColor: '#f59e0b',
                }}
              >
                <Text selectable style={{ fontSize: 16, lineHeight: 24, color: isHighlighted ? '#78350f' : colors.text.primary }}>
                  {para.text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Hard truth */}
      {devotion.hard_truth ? (
        <View style={{ marginTop: 16, padding: 12, backgroundColor: '#fff7ed', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#9a3412', fontWeight: '700' }}>HARD TRUTH</Text>
          <Text selectable style={{ marginTop: 6, fontSize: 15, color: '#9a3412' }}>{devotion.hard_truth}</Text>
        </View>
      ) : null}

      {/* Today's challenge */}
      {devotion.today_challenge ? (
        <View style={{ marginTop: 16, padding: 12, backgroundColor: '#ecfeff', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#155e75', fontWeight: '700' }}>TODAY'S CHALLENGE</Text>
          <Text selectable style={{ marginTop: 6, fontSize: 15, color: '#155e75' }}>{devotion.today_challenge}</Text>
        </View>
      ) : null}

      {/* Prayer starter */}
      {devotion.prayer_starter ? (
        <View style={{ marginTop: 16, padding: 12, backgroundColor: '#eef2ff', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#3730a3', fontWeight: '700' }}>PRAYER STARTER</Text>
          <Text selectable style={{ marginTop: 6, fontSize: 15, color: '#3730a3' }}>{devotion.prayer_starter}</Text>
        </View>
      ) : null}

      {/* Tags */}
      {tags.length ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 12, color: colors.text.secondary, fontWeight: '700' }}>TAGS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {tags.map((t) => (
              <View
                key={`tag-${t}`}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 9999,
                  backgroundColor: colors.background.secondary,
                  marginRight: 6,
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.text.primary }}>#{t}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Situation tags */}
      {situations.length ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: colors.text.secondary, fontWeight: '700' }}>SITUATIONS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {situations.map((t) => (
              <View
                key={`sit-${t}`}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 9999,
                  backgroundColor: colors.background.secondary,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  marginRight: 6,
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.text.primary }}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Related character link */}
      {typeof devotion.related_character_id === 'number' ? (
        <Pressable
          onPress={() => navigation.navigate('CharacterDetail', { id: devotion.related_character_id })}
          style={{ marginTop: 16, padding: 12, backgroundColor: colors.background.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border.default }}
        >
          <Text style={{ fontSize: 12, color: colors.accent.primary, fontWeight: '700' }}>RELATED CHARACTER</Text>
          <Text style={{ marginTop: 6, fontSize: 15, color: colors.text.primary }}>Open character profile</Text>
        </Pressable>
      ) : null}

      {/* Complete button / status */}
      {!isCompleted ? (
        <TouchableOpacity
          onPress={markDevotionComplete}
          disabled={isCompleting}
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: isCompleting ? colors.text.tertiary : colors.accent.primary,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 16 }}>
            {isCompleting ? 'Saving...' : '✓ Mark as Complete'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={{ marginTop: 24, padding: 16, backgroundColor: '#d1fae5', borderRadius: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#065f46', textAlign: 'center' }}>
            ✓ You completed this devotion
          </Text>
        </View>
      )}

      {/* Archive link */}
      <TouchableOpacity
        onPress={() => navigation.navigate('DevotionArchive')}
        style={{
          marginTop: 16,
          padding: 14,
          backgroundColor: colors.background.secondary,
          borderRadius: 10,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border.default,
        }}
      >
        <Text style={{ color: colors.accent.primary, fontWeight: '600', fontSize: 15 }}>
          View Past Devotions
        </Text>
      </TouchableOpacity>

      {/* Text Selection Modal */}
      <Modal
        visible={showSelectionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSelectionModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}>
          <View style={{
            backgroundColor: colors.background.primary,
            borderRadius: 16,
            padding: 20,
            maxHeight: '70%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
                Select Text to Highlight
              </Text>
              <TouchableOpacity onPress={() => setShowSelectionModal(false)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 24, color: colors.text.secondary }}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 12 }}>
              Select the text you want to highlight:
            </Text>

            <ScrollView style={{ flex: 1, marginBottom: 16 }}>
              <TextInput
                ref={textInputRef}
                multiline
                editable={false}
                value={selectedParagraph?.text || ''}
                onSelectionChange={(event) => {
                  const { start, end } = event.nativeEvent.selection;
                  setSelectionStart(start);
                  setSelectionEnd(end);
                }}
                style={{
                  fontSize: 16,
                  lineHeight: 24,
                  color: colors.text.primary,
                  padding: 12,
                  backgroundColor: colors.background.secondary,
                  borderRadius: 8,
                  minHeight: 150,
                }}
                selectionColor={colors.accent.primary}
                selectTextOnFocus
              />
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowSelectionModal(false)}
                style={{
                  flex: 1,
                  padding: 16,
                  backgroundColor: colors.background.secondary,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.text.primary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveSelectedText}
                style={{
                  flex: 1,
                  padding: 16,
                  backgroundColor: colors.accent.primary,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.text.primary, fontWeight: '700' }}>Save Highlight</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Saved Highlights Modal */}
      <Modal
        visible={showHighlights}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHighlights(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: colors.background.primary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingBottom: 40,
            maxHeight: '70%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                Saved Highlights
              </Text>
              <TouchableOpacity onPress={() => setShowHighlights(false)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 24, color: colors.text.secondary }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20 }}>
              {getSavedHighlights().map((highlight, index) => (
                <View
                  key={index}
                  style={{
                    padding: 12,
                    marginBottom: 12,
                    backgroundColor: '#fffbeb',
                    borderRadius: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: '#f59e0b',
                    position: 'relative',
                  }}
                >
                  <Text style={{ fontSize: 15, lineHeight: 22, color: '#78350f', paddingRight: 80 }}>
                    {highlight.selected_text}
                  </Text>
                  {/* Buttons render after the text so they paint on top and win hit-testing. */}
                  <TouchableOpacity
                    onPress={() => shareHighlight(highlight)}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 44,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.accent.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>📤</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteHighlight(highlight)}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: '#dc2626',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {highlights.length === 0 && (
                <Text style={{ fontSize: 15, color: colors.text.secondary, textAlign: 'center', marginTop: 20 }}>
                  No highlights saved yet. Long-press paragraphs to highlight text!
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Key-verse summary card — same card as VOTD / Battle Verses. Reference is the
          anchor verse (honest about what the summary covers). */}
      <VerseSummaryCard
        visible={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        reference={anchorRef}
        loading={false}
        content={summaryContent}
        onDeeper={handleDeeper}
      />
    </ScrollView>
  );
}

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TouchableOpacity, Alert, Share } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { colors } from '../../theme/colors';
import { completeDevotionProgress } from '../../services/progress';
import SelectableMarkdown from '../SelectableMarkdown';
import { getDevotionInteraction, toggleDevotionStar, markDevotionRead } from '../../services/devotionInteractions';
import type { Devotion } from '../../types/supabase-devotions';
import VerseSummaryCard from '../VerseSummaryCard';
import BattleTagPicker from '../BattleTagPicker';
import { saveBattleVerse } from '../../services/battleVerses';
import { getVerseLifeApplication, fetchVerseTextByName, type VerseLifeApplication } from '../../services/scripture';
import { setStudyDepth, getPreferredTranslation } from '../../services/userPrefs';

const LEADING_VERSE = /^\s*(\d+)/;

/**
 * Which verse a devotion's "Save to Battle Verses" writes, and whether the devotion's stored
 * key_verse_text spans more than one verse.
 *
 * DERIVED FROM key_verse_range, NOT key_verse_number. key_verse_number is unreliable for
 * ranges: 9 of the 104 dashed rows hold the LAST verse of the range rather than the first
 * (id 269, "1 Corinthians 1:23-24", holds 24), and the same reference is stored inconsistently
 * — Deuteronomy 6:6-7 appears four times, twice as 6 and twice as 7. key_verse_range is
 * consistent, so derive from it and leave the mis-authored rows alone in the data.
 *
 * A LEADING-INTEGER parse, not a dash split, because that is total over the whole table. The
 * grammar across all 816 devotions is: NULL (367), plain integer (343, always equal to
 * key_verse_number), "N-M" (104), and exactly two others — "10a" (Zechariah 4:10a) and "1,4"
 * (Ecclesiastes 3:1,4). Verified: the derived verse equals the first verse printed in
 * key_verse_reference on all 816 rows, and differs from key_verse_number on exactly the 9.
 *
 * isMultiVerse keys off "-" or "," because those are what join verses. "10a" is a fragment of
 * ONE verse (its text is half of Zechariah 4:10), so it counts as single-verse and keeps the
 * devotion's own text.
 */
function deriveSavedVerse(d: Devotion): { verseNumber: number; isMultiVerse: boolean } {
  const raw = d.key_verse_range;
  const first = raw ? Number(LEADING_VERSE.exec(raw)?.[1]) : NaN;
  return {
    verseNumber: Number.isFinite(first) ? first : Number(d.key_verse_number),
    isMultiVerse: !!raw && /[-,]/.test(raw),
  };
}

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
  const [isStarred, setIsStarred] = useState(false);
  const [isToggingStar, setIsToggingStar] = useState(false);
  // Key-verse summary card (same card as VOTD / Battle Verses). Pre-checked on load so the
  // tap affordance only shows when a summary actually exists.
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState<VerseLifeApplication | null>(null);
  const [summaryAvailable, setSummaryAvailable] = useState(false);
  // Save-the-key-verse-to-Battle-Verses state machine, same four states as the VOTD save:
  // idle -> choosing (picker open) -> saving (write in flight) -> saved.
  const [battleState, setBattleState] = useState<'idle' | 'choosing' | 'saving' | 'saved'>('idle');
  // devotional_text is stored with LITERAL "\n\n" (see the devotion-escaped-newlines gotcha), so
  // every reader has to un-escape it. SelectableMarkdown splits on real blank lines, so it must
  // happen before the text is handed over.
  const devotionalBody = useMemo(
    () => (devotion?.devotional_text ?? '').replace(/\\n\\n/g, '\n\n'),
    [devotion?.devotional_text],
  );

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

    // Devotional text — stored with literal "\n\n"; un-escape to real paragraph breaks.
    // devotionalBody already does this for the on-screen render; reused here so the shared text
    // and the rendered text cannot diverge.
    if (devotionalBody) {
      message += `${devotionalBody}\n`;
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

  // Save the devotion's key verse to Battle Verses — the sixth caller of BattleTagPicker,
  // after VOTD, the chapter reader, the cross-reference card, and search single/batch.
  //
  // NO book-name normalization. The devotion's stored key_verse_book is canonical ('Psalms',
  // not 'Psalm' — 48 rows corrected in the database on 2026-09-26), so the book goes straight
  // through exactly as every other save path passes its own.
  //
  // The verse number and text, however, are NOT taken at face value — see deriveSavedVerse
  // above and the comment in saveKeyVerseToBattle below.
  const openBattlePicker = useCallback(() => {
    if (!devotion || battleState !== 'idle') return;
    setBattleState('choosing');
  }, [devotion, battleState]);

  const cancelBattlePicker = useCallback(() => {
    setBattleState(s => (s === 'choosing' ? 'idle' : s));
  }, []);

  // tag is null when the reader chose "just save" — passed straight through, because
  // saveBattleVerse writes `battle_tag: battleTag || null` and a declined tag must stay
  // genuinely untagged (reachable from the dashboard's "Untagged" chip) rather than being
  // filed as 'general', which is a tag someone actually picked.
  const saveKeyVerseToBattle = useCallback(async (tag: string | null) => {
    if (!devotion) return;
    setBattleState('saving');
    try {
      const { verseNumber, isMultiVerse } = deriveSavedVerse(devotion);

      // A range devotion's key_verse_text is the WHOLE range in a modern paraphrase, verified
      // against the data: "1 Corinthians 1:23-24" stores both verses, "Isaiah 40:29-31" stores
      // three, and the wording is NIV-ish ("spur one another on toward love and good deeds")
      // rather than the KJV our bible_verses holds. Persisting that under a single verse number
      // would file two verses' text as one, so read the one verse instead — at the translation
      // the reader is actually reading, so a saved battle verse matches the reader.
      let verseText = devotion.key_verse_text;
      if (isMultiVerse) {
        const translation = await getPreferredTranslation();
        const single = await fetchVerseTextByName(
          devotion.key_verse_book,
          Number(devotion.key_verse_chapter),
          verseNumber,
          translation,
        ).catch(() => null);
        // Nothing found (a non-canonical book name, a verse this translation omits, a dropped
        // request) falls back to the devotion's own text rather than failing the save. The
        // verse NUMBER is corrected either way — that is the actual defect; the single-verse
        // text is a best-effort improvement on top of it.
        if (single) verseText = single;
      }

      // saveBattleVerse returns false on the duplicate constraint. Already-saved and
      // just-saved both mean "it is in the list", so both collapse to 'saved'. It also composes
      // verse_reference from the number passed here, so correct attribution follows from the
      // corrected number without a second thing to keep in agreement.
      await saveBattleVerse(
        devotion.key_verse_book,
        Number(devotion.key_verse_chapter),
        verseNumber,
        verseText,
        tag ?? undefined,
      );
      setBattleState('saved');
    } catch {
      setBattleState('idle');
      Alert.alert('Error', 'Could not save verse.');
    }
  }, [devotion]);

  // A different devotion in the same mounted screen (setParams) must not inherit the previous
  // one's "Saved" badge.
  useEffect(() => {
    setBattleState('idle');
  }, [devotionId]);

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
  // Deliberately a SECOND reference, not a reuse of anchorRef. anchorRef labels the summary
  // card, and the summary CONTENT is keyed to key_verse_number (fetched that way on load), so
  // repointing it at the derived verse would label the card with a verse whose summary it is
  // not showing. saveRef labels the battle-save picker, which must name the row actually
  // written. Identical on 807 devotions; they differ on the 9 whose key_verse_number holds the
  // last verse of its range. Both come from one helper, so the picker can never drift from the
  // save it describes.
  const saveRef = `${devotion.key_verse_book} ${devotion.key_verse_chapter}:${deriveSavedVerse(devotion).verseNumber}`;
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
        {/* Action row. The Battle-save control is a child touchable, so it takes its own tap
            rather than opening the summary card; the parent Pressable being disabled when no
            summary exists does not block it (Pressable's `disabled` only affects its own
            pressability, not pointer events on children). */}
        <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {summaryAvailable ? (
            <Text style={{ fontSize: 12, color: colors.accent.primary, fontWeight: '700' }}>
              Tap for summary
            </Text>
          ) : <View />}
          <TouchableOpacity
            onPress={openBattlePicker}
            disabled={battleState !== 'idle'}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: battleState === 'saved' ? 'rgba(39,174,96,0.15)' : colors.background.tertiary,
              borderWidth: 1,
              borderColor: battleState === 'saved' ? colors.success : colors.border.default,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: battleState === 'saved' ? colors.success : colors.text.primary }}>
              {battleState === 'saving' ? 'Saving…' : battleState === 'saved' ? '✓ Saved' : '⚔️ Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>

      {/* Body — one read-only TextInput per paragraph (SelectableMarkdown), so a long-press
          gives Apple's drag handles and arbitrary-range Copy. Nothing competes for the gesture
          now: the old long-press-to-highlight interaction and its modal are gone. */}
      {devotionalBody ? (
        <View style={{ marginTop: 16 }}>
          <SelectableMarkdown
            content={devotionalBody}
            paragraphSpacing={8}
            style={{ fontSize: 16, lineHeight: 24, color: colors.text.primary }}
          />
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
          onPress={() => navigation.navigate('StudyTab', { screen: 'CharacterDetail', params: { id: devotion.related_character_id } })}
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

      {/* Optional battle tag for the key-verse save. Visible while choosing AND while saving,
          so the spinner replaces the controls in place rather than the modal vanishing mid-write.
          Reference is saveRef — the row that actually gets written, not the displayed range. */}
      <BattleTagPicker
        visible={battleState === 'choosing' || battleState === 'saving'}
        reference={saveRef}
        busy={battleState === 'saving'}
        onSelect={saveKeyVerseToBattle}
        onCancel={cancelBattlePicker}
      />
    </ScrollView>
  );
}

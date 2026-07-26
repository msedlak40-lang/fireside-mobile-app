import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getUserFires,
  createFire,
  joinFire,
  leaveFire,
  type Fire,
} from '../services/fire';
import { colors } from '../theme/colors';
import { CHROME_MAX_SCALE } from '../lib/textScaling';
import { useGuestMode } from '../context/GuestModeContext';
import GuestPreview from '../components/GuestPreview';

export default function FireScreen({ navigation }: any) {
  const { isGuest } = useGuestMode();
  const [fires, setFires] = useState<Fire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  // Create form
  const [newFireName, setNewFireName] = useState('');
  const [newFireDescription, setNewFireDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Join form
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadFires();
    }, [])
  );

  async function loadFires() {
    if (isGuest) { setIsLoading(false); return } // guests see the preview, no fetch
    try {
      setIsLoading(true);
      const userFires = await getUserFires();
      setFires(userFires);
    } catch (error) {
      console.error('Error loading fires:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateFire() {
    if (!newFireName.trim()) {
      Alert.alert('Error', 'Please enter a Fire name');
      return;
    }

    try {
      setIsCreating(true);
      await createFire({
        name: newFireName.trim(),
        description: newFireDescription.trim() || undefined,
      });

      setNewFireName('');
      setNewFireDescription('');
      setShowCreateForm(false);
      await loadFires();

      Alert.alert('Success', 'Fire created! Share the invite code with your brothers.');
    } catch (error) {
      console.error('Error creating fire:', error);
      Alert.alert('Error', 'Could not create Fire. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinFire() {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    try {
      setIsJoining(true);
      await joinFire(inviteCode.trim());

      setInviteCode('');
      setShowJoinForm(false);
      await loadFires();

      Alert.alert('Success', 'Joined Fire successfully!');
    } catch (error: any) {
      console.error('Error joining fire:', error);
      Alert.alert('Error', error.message || 'Could not join Fire. Check the invite code.');
    } finally {
      setIsJoining(false);
    }
  }

  async function handleLeaveFire(fire: Fire) {
    Alert.alert(
      'Leave Fire?',
      `Are you sure you want to leave "${fire.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveFire(fire.id);
              await loadFires();
            } catch (error) {
              console.error('Error leaving fire:', error);
              Alert.alert('Error', 'Could not leave Fire');
            }
          },
        },
      ]
    );
  }

  if (isGuest) {
    return (
      <GuestPreview
        icon="🔥"
        title="Gather your brothers"
        subtitle="Fires are private accountability groups where men share verses, encouragement, and prayer."
        bullets={[
          'Create or join a Fire with an invite code',
          'Share verses and insights with your group',
          'Encourage and pray for one another',
        ]}
        action="join your brothers in a Fire"
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={styles.loadingText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Loading your Fires...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Fire</Text>
        <Text style={styles.headerSubtitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
          Small groups for accountability & growth
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setShowCreateForm(!showCreateForm);
            if (!showCreateForm) setShowJoinForm(false);
          }}
        >
          <Text style={styles.actionButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            {showCreateForm ? 'Cancel' : '+ Create Fire'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={() => {
            setShowJoinForm(!showJoinForm);
            if (!showJoinForm) setShowCreateForm(false);
          }}
        >
          <Text style={styles.actionButtonTextSecondary} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
            {showJoinForm ? 'Cancel' : 'Join Fire'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Create Form */}
      {showCreateForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Create a New Fire</Text>

          <TextInput
            style={styles.input}
            value={newFireName}
            onChangeText={setNewFireName}
            placeholder="Fire name (e.g., 'Tuesday Morning Warriors')"
            placeholderTextColor={colors.text.muted}
            maxLength={100}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            value={newFireDescription}
            onChangeText={setNewFireDescription}
            placeholder="Description (optional)"
            placeholderTextColor={colors.text.muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
            onPress={handleCreateFire}
            disabled={isCreating}
          >
            <Text style={styles.submitButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              {isCreating ? 'Creating...' : 'Create Fire'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Join Form */}
      {showJoinForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Join a Fire</Text>

          <TextInput
            style={styles.input}
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            placeholder="Enter 8-character invite code"
            placeholderTextColor={colors.text.muted}
            maxLength={8}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={[styles.submitButton, isJoining && styles.submitButtonDisabled]}
            onPress={handleJoinFire}
            disabled={isJoining}
          >
            <Text style={styles.submitButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              {isJoining ? 'Joining...' : 'Join Fire'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User's Fires */}
      <View style={styles.firesContainer}>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Your Fires ({fires.length})</Text>

        {fires.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={CHROME_MAX_SCALE}>No Fires Yet</Text>
            <Text style={styles.emptyDescription} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
              Create a Fire to start an accountability group, or join one using an invite code.
            </Text>
          </View>
        ) : (
          fires.map(fire => (
            <View key={fire.id} style={styles.fireCard}>
              <View style={styles.fireHeader}>
                <Text style={styles.fireName} maxFontSizeMultiplier={CHROME_MAX_SCALE}>{fire.name}</Text>
                {fire.is_creator && (
                  <View style={styles.creatorBadge}>
                    <Text style={styles.creatorBadgeText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>Creator</Text>
                  </View>
                )}
              </View>

              {fire.description && (
                <Text style={styles.fireDescription}>{fire.description}</Text>
              )}

              <View style={styles.fireStats}>
                <Text style={styles.fireStat} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                  {fire.member_count} {fire.member_count === 1 ? 'member' : 'members'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Share.share({
                      message: `Join my Fire on Fireside Fellowship! Use invite code: ${fire.invite_code}`,
                    });
                  }}
                >
                  <Text style={styles.fireStatCode} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                    Code: {fire.invite_code} (tap to share)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fireActions}>
                <TouchableOpacity
                  style={styles.fireActionButton}
                  onPress={() => navigation.navigate('FireDetails', { fireId: fire.id })}
                >
                  <Text style={styles.fireActionButtonText} maxFontSizeMultiplier={CHROME_MAX_SCALE}>View Fire</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.fireActionButton, styles.fireActionButtonDanger]}
                  onPress={() => handleLeaveFire(fire)}
                >
                  <Text style={[styles.fireActionButtonText, styles.fireActionButtonTextDanger]} maxFontSizeMultiplier={CHROME_MAX_SCALE}>
                    Leave
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.accent.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  form: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
  },
  submitButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  firesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  fireCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 16,
    marginBottom: 12,
  },
  fireHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fireName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  creatorBadge: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  creatorBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  fireDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  fireStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  fireStat: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  fireStatCode: {
    fontSize: 13,
    color: colors.accent.primary,
    fontWeight: '600',
  },
  fireActions: {
    flexDirection: 'row',
    gap: 12,
  },
  fireActionButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.accent.primary,
    borderRadius: 6,
    alignItems: 'center',
  },
  fireActionButtonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error,
  },
  fireActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  fireActionButtonTextDanger: {
    color: colors.error,
  },
});

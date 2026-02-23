import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getFireShares,
  getFireMembers,
  getFireStats,
  deleteFireShare,
  removeMember,
  markFireViewed,
  type Fire,
  type FireShare,
  type FireMember,
  type FireStats,
} from '../services/fire';
import FireShareCard from '../components/FireShareCard';
import FireSettingsModal from '../components/FireSettingsModal';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';

export default function FireDetailsScreen({ route, navigation }: any) {
  const { fireId } = route.params;

  const [fire, setFire] = useState<Fire | null>(null);
  const [shares, setShares] = useState<FireShare[]>([]);
  const [members, setMembers] = useState<FireMember[]>([]);
  const [stats, setStats] = useState<FireStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadFireData();
    }, [fireId])
  );

  // Set header settings button for creator
  useEffect(() => {
    if (fire && fire.created_by === currentUserId) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={{ marginRight: 16 }}
          >
            <Text style={{ fontSize: 24 }}>&#x2699;&#xFE0F;</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [fire, currentUserId, navigation]);

  async function loadFireData() {
    try {
      if (!refreshing) setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Get fire info
      const { data: fireData } = await supabase
        .from('fires')
        .select('*')
        .eq('id', fireId)
        .single();

      if (fireData) {
        setFire(fireData);
      }

      const [sharesData, membersData, statsData] = await Promise.all([
        getFireShares(fireId),
        getFireMembers(fireId),
        getFireStats(fireId),
      ]);

      setShares(sharesData);
      setMembers(membersData);
      setStats(statsData);

      // Mark as viewed
      await markFireViewed(fireId);
    } catch (error) {
      console.error('Error loading fire data:', error);
      Alert.alert('Error', 'Could not load Fire data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadFireData();
  }

  async function handleDeleteShare(share: FireShare) {
    Alert.alert(
      'Delete Share?',
      'Remove this from your Fire?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFireShare(share.id);
              await loadFireData();
            } catch (error) {
              console.error('Error deleting share:', error);
              Alert.alert('Error', 'Could not delete share');
            }
          },
        },
      ]
    );
  }

  async function handleRemoveMember(member: FireMember) {
    Alert.alert(
      'Remove Member?',
      'Are you sure you want to remove this member from the Fire?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(fireId, member.user_id);
              await loadFireData();
              Alert.alert('Success', 'Member removed');
            } catch (error: any) {
              console.error('Error removing member:', error);
              Alert.alert('Error', error.message || 'Could not remove member');
            }
          },
        },
      ]
    );
  }

  const isCreator = fire && fire.created_by === currentUserId;

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Stats Section */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.totalShares}</Text>
                <Text style={styles.statLabel}>Total Shares</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.sharesThisWeek}</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.totalComments}</Text>
                <Text style={styles.statLabel}>Comments</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.totalReactions}</Text>
                <Text style={styles.statLabel}>Reactions</Text>
              </View>
            </View>
          </View>
        )}

        {/* Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          {members.map(member => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberChip}>
                <Text style={styles.memberText}>
                  {member.role === 'creator' ? '👑 ' : ''}
                  {member.user_id === currentUserId ? 'You' : (member.user_email || 'Brother')}
                </Text>
              </View>
              {isCreator && member.role !== 'creator' && (
                <TouchableOpacity
                  style={styles.removeMemberButton}
                  onPress={() => handleRemoveMember(member)}
                >
                  <Text style={styles.removeMemberText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Shares Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shared Insights ({shares.length})</Text>

          {shares.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No shares yet</Text>
              <Text style={styles.emptyDescription}>
                Share insights from your Arsenal to encourage your Fire
              </Text>
            </View>
          ) : (
            shares.map(share => (
              <FireShareCard
                key={share.id}
                share={share}
                currentUserId={currentUserId}
                onDelete={() => handleDeleteShare(share)}
              />
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {fire && (
        <FireSettingsModal
          visible={showSettings}
          fire={fire}
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setShowSettings(false);
            loadFireData();
          }}
        />
      )}
    </>
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
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberChip: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  memberText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  removeMemberButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 4,
  },
  removeMemberText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

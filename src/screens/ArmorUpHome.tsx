// ArmorUpHome - Simple Armor of God Reference
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';

// All 7 pieces of the Armor of God
const ARMOR_PIECES = [
  {
    id: 1,
    name: 'Belt of Truth',
    scripture_reference: 'Ephesians 6:14a',
    scripture_text: 'Stand firm then, with the belt of truth buckled around your waist...',
    description: 'Truth holds everything together. Living honestly and embracing God\'s truth protects us from deception.',
    keywords: ['truth', 'honest', 'integrity', 'deceive', 'lie', 'authentic', 'sincere', 'genuine'],
    color: '#f59e0b',
    bgColor: '#fef3c7',
    textColor: '#92400e',
  },
  {
    id: 2,
    name: 'Breastplate of Righteousness',
    scripture_reference: 'Ephesians 6:14b',
    scripture_text: '...with the breastplate of righteousness in place...',
    description: 'Righteousness guards our heart. Living rightly before God protects us from guilt and accusation.',
    keywords: ['righteous', 'holy', 'pure', 'clean', 'blameless', 'just', 'moral', 'virtue', 'character'],
    color: '#10b981',
    bgColor: '#dcfce7',
    textColor: '#065f46',
  },
  {
    id: 3,
    name: 'Shoes of Peace',
    scripture_reference: 'Ephesians 6:15',
    scripture_text: '...and with your feet fitted with the readiness that comes from the gospel of peace.',
    description: 'Peace gives us sure footing. The gospel of peace makes us ready to stand firm and move forward.',
    keywords: ['peace', 'calm', 'rest', 'anxiety', 'worry', 'stress', 'reconcile', 'harmony', 'tranquil'],
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    textColor: '#5b21b6',
  },
  {
    id: 4,
    name: 'Shield of Faith',
    scripture_reference: 'Ephesians 6:16',
    scripture_text: 'In addition to all this, take up the shield of faith, with which you can extinguish all the flaming arrows of the evil one.',
    description: 'Faith deflects attacks. Trusting God extinguishes the enemy\'s attempts to make us doubt.',
    keywords: ['faith', 'trust', 'believe', 'doubt', 'fear', 'confidence', 'assurance', 'rely'],
    color: '#3b82f6',
    bgColor: '#dbeafe',
    textColor: '#1e40af',
  },
  {
    id: 5,
    name: 'Helmet of Salvation',
    scripture_reference: 'Ephesians 6:17a',
    scripture_text: 'Take the helmet of salvation...',
    description: 'Salvation protects our mind. Knowing we are saved guards our thoughts from despair and hopelessness.',
    keywords: ['salvation', 'save', 'redeem', 'hope', 'eternal', 'secure', 'assurance', 'mind', 'think'],
    color: '#ec4899',
    bgColor: '#fce7f3',
    textColor: '#9d174d',
  },
  {
    id: 6,
    name: 'Sword of the Spirit',
    scripture_reference: 'Ephesians 6:17b',
    scripture_text: '...and the sword of the Spirit, which is the word of God.',
    description: 'God\'s Word is our weapon. Scripture equips us to fight back against lies and temptation.',
    keywords: ['word', 'scripture', 'bible', 'speak', 'proclaim', 'declare', 'command', 'authority'],
    color: '#ef4444',
    bgColor: '#fee2e2',
    textColor: '#991b1b',
  },
  {
    id: 7,
    name: 'Prayer',
    scripture_reference: 'Ephesians 6:18',
    scripture_text: 'And pray in the Spirit on all occasions with all kinds of prayers and requests.',
    description: 'Prayer connects us to God. Constant communication with God empowers all the other armor pieces.',
    keywords: ['pray', 'prayer', 'intercede', 'petition', 'request', 'ask', 'seek', 'communion', 'talk'],
    color: '#0891b2',
    bgColor: '#cffafe',
    textColor: '#155e75',
  },
];

interface PracticalApplication {
  book_name: string;
  chapter_number: number;
  application: string;
}

export default function ArmorUpHome() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPiece, setExpandedPiece] = useState<number | null>(null);
  const [applications, setApplications] = useState<PracticalApplication[]>([]);

  // Load practical applications from database
  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('bible_chapter_summaries_strongs')
        .select('book_name, chapter_number, practical_applications_clean')
        .not('practical_applications_clean', 'is', null);

      if (error) {
        console.error('[ArmorUpHome] Error loading applications:', error);
        return;
      }

      // Flatten all applications into a single array
      const allApps: PracticalApplication[] = [];
      data?.forEach(row => {
        if (row.practical_applications_clean && Array.isArray(row.practical_applications_clean)) {
          row.practical_applications_clean.forEach((app: string) => {
            allApps.push({
              book_name: row.book_name,
              chapter_number: row.chapter_number,
              application: app,
            });
          });
        }
      });

      setApplications(allApps);
    } catch (err) {
      console.error('[ArmorUpHome] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get applications for a specific armor piece based on keyword matching
  const getApplicationsForPiece = (piece: typeof ARMOR_PIECES[0]): PracticalApplication[] => {
    if (applications.length === 0) return [];

    // Filter applications that match any of the armor piece's keywords
    const matchingApps = applications.filter(app => {
      const lowerApp = app.application.toLowerCase();
      return piece.keywords.some(keyword => lowerApp.includes(keyword.toLowerCase()));
    });

    if (matchingApps.length === 0) return [];

    // Use date-based seeding for daily rotation
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const seed = dayOfYear + piece.id; // Different seed for each piece

    // Simple seeded shuffle to get consistent daily selection
    const shuffled = [...matchingApps].sort((a, b) => {
      const hashA = (seed * 31 + a.application.length) % 1000;
      const hashB = (seed * 31 + b.application.length) % 1000;
      return hashA - hashB;
    });

    // Return 2 applications
    return shuffled.slice(0, 2);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [])
  );

  const toggleExpanded = (pieceId: number) => {
    setExpandedPiece(expandedPiece === pieceId ? null : pieceId);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8, color: colors.text.primary }}>
          ⚔️ Armor of God
        </Text>
        <Text style={{ fontSize: 15, color: colors.text.secondary, marginBottom: 24, lineHeight: 22 }}>
          Put on the full armor of God, so that you can take your stand against the devil's schemes.
        </Text>

        {/* All 7 Armor Pieces */}
        {ARMOR_PIECES.map((piece) => {
          const isExpanded = expandedPiece === piece.id;
          const pieceApplications = getApplicationsForPiece(piece);

          return (
            <TouchableOpacity
              key={piece.id}
              onPress={() => toggleExpanded(piece.id)}
              activeOpacity={0.8}
              style={{
                marginBottom: 12,
                backgroundColor: isExpanded ? piece.bgColor : colors.background.secondary,
                borderRadius: 16,
                borderLeftWidth: 6,
                borderLeftColor: piece.color,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isExpanded ? 0.15 : 0.08,
                shadowRadius: isExpanded ? 8 : 4,
                elevation: isExpanded ? 5 : 2,
              }}
            >
              {/* Header - Always Visible */}
              <View style={{
                padding: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: isExpanded ? piece.textColor : colors.text.primary,
                    marginBottom: 4,
                  }}>
                    {piece.name}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: isExpanded ? piece.textColor : colors.text.secondary,
                    fontWeight: '600',
                    fontStyle: 'italic',
                  }}>
                    {piece.scripture_reference}
                  </Text>
                </View>
                <Text style={{
                  fontSize: 20,
                  color: isExpanded ? piece.textColor : colors.text.secondary,
                }}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </View>

              {/* Expanded Content */}
              {isExpanded && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  {/* Scripture Text */}
                  <View style={{
                    padding: 12,
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    borderRadius: 8,
                    marginBottom: 12,
                  }}>
                    <Text style={{
                      fontSize: 14,
                      color: piece.textColor,
                      fontStyle: 'italic',
                      lineHeight: 20,
                    }}>
                      "{piece.scripture_text}"
                    </Text>
                  </View>

                  {/* Description */}
                  <Text style={{
                    fontSize: 14,
                    color: piece.textColor,
                    lineHeight: 20,
                    marginBottom: 16,
                  }}>
                    {piece.description}
                  </Text>

                  {/* Applications */}
                  {pieceApplications.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                      {pieceApplications.map((app, index) => (
                        <View
                          key={index}
                          style={{
                            padding: 12,
                            backgroundColor: 'rgba(255,255,255,0.5)',
                            borderRadius: 8,
                            marginBottom: 8,
                            borderLeftWidth: 3,
                            borderLeftColor: piece.color,
                          }}
                        >
                          <Text style={{
                            fontSize: 13,
                            color: piece.textColor,
                            lineHeight: 18,
                          }}>
                            {app.application}
                          </Text>
                          <Text style={{
                            fontSize: 11,
                            color: piece.textColor,
                            opacity: 0.7,
                            marginTop: 4,
                          }}>
                            — {app.book_name} {app.chapter_number}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Ephesians 6 Full Reference */}
        <View style={{
          padding: 16,
          backgroundColor: colors.background.tertiary,
          borderRadius: 12,
          marginTop: 8,
          marginBottom: 20,
        }}>
          <Text style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 18, fontStyle: 'italic' }}>
            "Finally, be strong in the Lord and in his mighty power. Put on the full armor of God, so that you can take your stand against the devil's schemes." - Ephesians 6:10-11
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

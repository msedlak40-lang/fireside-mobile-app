import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { Journey } from '../../types/journey';
import { colors } from '../../theme/colors';

interface Props {
  journey: Journey;
}

export default function JourneyStoriesTab({ journey }: Props) {
  const [expandedStory, setExpandedStory] = useState<string | null>(null);

  function toggleStory(storyId: string) {
    setExpandedStory(expandedStory === storyId ? null : storyId);
  }

  return (
    <ScrollView style={styles.container}>
      {journey.storyCards.map((story) => {
        const isExpanded = expandedStory === story.id;

        return (
          <View key={story.id} style={styles.storyCard}>
            <TouchableOpacity
              style={styles.storyHeader}
              onPress={() => toggleStory(story.id)}
            >
              <Text style={styles.storyIcon}>{story.icon}</Text>
              <View style={styles.storyTitleContainer}>
                <Text style={styles.storyTitle}>{story.title}</Text>
                <Text style={styles.storyTheme}>{story.theme}</Text>
              </View>
              <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.storyContent}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>The Story</Text>
                  <Text style={styles.narrative}>{story.narrative}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Scripture</Text>
                  <Text style={styles.scriptureReference}>
                    {story.scripture.reference}
                  </Text>
                  <Text style={styles.scriptureText} selectable>
                    {story.scripture.text}
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Why This Matters</Text>
                  <Text style={styles.bodyText}>{story.whySection}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Jesus Connection</Text>
                  <Text style={styles.bodyText}>{story.jesusConnection}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Modern Application</Text>
                  <Text style={styles.bodyText}>{story.modernApplication}</Text>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: 16,
  },
  storyCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  storyIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  storyTitleContainer: {
    flex: 1,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  storyTheme: {
    fontSize: 13,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  expandIcon: {
    fontSize: 28,
    color: colors.text.secondary,
    fontWeight: '300',
  },
  storyContent: {
    padding: 16,
    paddingTop: 0,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  narrative: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 24,
  },
  scriptureReference: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent.primary,
    marginBottom: 8,
  },
  scriptureText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 22,
    fontStyle: 'italic',
    padding: 12,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
  },
  bodyText: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 24,
  },
});

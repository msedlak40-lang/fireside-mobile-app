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

export default function JourneyCharactersTab({ journey }: Props) {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    journey.characters[0]?.id || null
  );

  const character = journey.characters.find(c => c.id === selectedCharacter);

  return (
    <View style={styles.container}>
      {/* Character Selector */}
      <ScrollView
        horizontal
        style={styles.characterSelector}
        contentContainerStyle={styles.characterSelectorContent}
        showsHorizontalScrollIndicator={false}
      >
        {journey.characters.map((char) => (
          <TouchableOpacity
            key={char.id}
            style={[
              styles.characterButton,
              selectedCharacter === char.id && styles.characterButtonSelected,
            ]}
            onPress={() => setSelectedCharacter(char.id)}
          >
            <Text style={styles.characterAvatar}>{char.avatar}</Text>
            <Text
              style={[
                styles.characterButtonText,
                selectedCharacter === char.id && styles.characterButtonTextSelected,
              ]}
            >
              {char.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Character Details */}
      {character && (
        <ScrollView style={styles.characterDetails}>
          <View style={styles.characterHeader}>
            <Text style={styles.characterAvatarLarge}>{character.avatar}</Text>
            <View style={styles.characterHeaderText}>
              <Text style={styles.characterName}>{character.name}</Text>
              <Text style={styles.characterTitle}>{character.title}</Text>
              <Text style={styles.characterRole}>{character.role}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Background</Text>
            <Text style={styles.bodyText}>{character.background}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Scripture</Text>
            <Text style={styles.scriptureReference}>
              {character.scripture.reference}
            </Text>
            <Text style={styles.scriptureText} selectable>
              {character.scripture.text}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Their Journey</Text>
            <Text style={styles.bodyText}>{character.journey}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Characteristics</Text>
            {character.characteristics.map((trait, index) => (
              <View key={index} style={styles.characteristicCard}>
                <Text style={styles.characteristicTrait}>{trait.trait}</Text>
                <Text style={styles.characteristicDescription}>
                  {trait.description}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Faith Lesson</Text>
            <Text style={styles.bodyText}>{character.faithLesson}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reflection</Text>
            <Text style={styles.reflectionText}>{character.reflection}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  characterSelector: {
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingVertical: 12,
    paddingHorizontal: 12,
    maxHeight: 120,
  },
  characterSelectorContent: {
    alignItems: 'center',
  },
  characterButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: colors.background.tertiary,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
  },
  characterButtonSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.background.primary,
  },
  characterAvatar: {
    fontSize: 32,
    marginBottom: 4,
  },
  characterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  characterButtonTextSelected: {
    color: colors.accent.primary,
  },
  characterDetails: {
    flex: 1,
    padding: 16,
  },
  characterHeader: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
  },
  characterAvatarLarge: {
    fontSize: 64,
    marginRight: 16,
  },
  characterHeaderText: {
    flex: 1,
  },
  characterName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  characterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent.primary,
    marginBottom: 2,
  },
  characterRole: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  bodyText: {
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
  characteristicCard: {
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  characteristicTrait: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  characteristicDescription: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 22,
  },
  reflectionText: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 24,
    fontStyle: 'italic',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.primary,
  },
});

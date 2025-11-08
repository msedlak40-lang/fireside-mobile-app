// src/components/Devotions/DevotionsHomeTabs.tsx
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import DailyListScreen from './DailyListScreen';
import ThemesHomeScreen from './ThemesHomeScreen';

export default function DevotionsHomeTabs() {
  const [tab, setTab] = useState<'Daily' | 'Themes'>('Daily');

  const TabButton = ({ label }: { label: 'Daily' | 'Themes' }) => {
    const active = tab === label;
    return (
      <Pressable
        onPress={() => setTab(label)}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 9999,
          backgroundColor: active ? '#111827' : '#e5e7eb',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: active ? 'white' : '#374151', fontWeight: '700' }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#f3f4f6', padding: 4, borderRadius: 9999 }}>
          <TabButton label="Daily" />
          <TabButton label="Themes" />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'Daily' ? <DailyListScreen /> : <ThemesHomeScreen />}
      </View>
    </View>
  );
}

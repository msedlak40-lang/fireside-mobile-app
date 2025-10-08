import React from 'react';
import { SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18, marginBottom: 16 }}>Signed in ✅</Text>
      <TouchableOpacity
        onPress={() => supabase.auth.signOut()}
        style={{ height: 44, backgroundColor: '#111827', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

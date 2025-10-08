import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabaseClient';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const sendMagicLink = async () => {
    try {
      setSending(true);
      const redirect = Linking.createURL('auth/callback', { scheme: 'fireside' });
console.log('MAGIC LINK REDIRECT:', redirect);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirect, shouldCreateUser: true },
      });
      if (error) throw error;
      Alert.alert('Check your email', 'Tap the link to open Fireside and finish sign-in.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not send magic link');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '600' }}>Sign in</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, height: 48, color: '#111827' }}
          />
          <TouchableOpacity
            onPress={sendMagicLink}
            disabled={sending || !email}
            style={{ height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: sending || !email ? '#9ca3af' : '#111827' }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>{sending ? 'Sending…' : 'Send magic link'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

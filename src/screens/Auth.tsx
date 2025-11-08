import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabaseClient';
// ⬇️ NEW: read app.json fallback directly so we can show it
import appConfig from '../../app.json';

export default function Auth() {
  const [email, setEmail] = useState(''); 
  const [sending, setSending] = useState(false);

  const sendMagicLink = async () => {
    try {
      setSending(true);
      const redirect = Linking.createURL('auth/callback', { scheme: 'fireside' });
      console.log('[AUTH] redirect =>', redirect);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirect, shouldCreateUser: true }
      });
      if (error) throw error;
      Alert.alert('Check your email', 'Tap the link to sign in.');
    } catch (e: any) {
      console.warn('[AUTH] signInWithOtp failed:', e?.message || e);
      const extra = (appConfig as any)?.expo?.extra || {};
      Alert.alert(
        'Sign-in failed',
        `Message: ${e?.message || e}\n\nSupabase URL present: ${!!extra.supabaseUrl}\nAnon key present: ${!!extra.supabaseAnonKey}`
      );
    } finally { setSending(false); }
  };

  // ⬇️ NEW: quick debug button to verify config values
  const debugConfig = () => {
    const extra = (appConfig as any)?.expo?.extra || {};
    Alert.alert(
      'Runtime config',
      `supabaseUrl: ${extra.supabaseUrl || 'MISSING'}\n\nanonKey length: ${extra.supabaseAnonKey ? String(extra.supabaseAnonKey).length : 'MISSING'}`
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '700' }}>Sign in</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            style={{ height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12 }}
          />
          <TouchableOpacity onPress={sendMagicLink} disabled={sending || !email}
            style={{ height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
              backgroundColor: sending || !email ? '#9ca3af' : '#111827' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{sending ? 'Sending…' : 'Send magic link'}</Text>
          </TouchableOpacity>

          {/* ⬇️ NEW debug button */}
          <TouchableOpacity onPress={debugConfig}
            style={{ height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e7eb' }}>
            <Text style={{ color: '#111827', fontWeight: '600' }}>Debug config</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

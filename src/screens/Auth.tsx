import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const signInWithEmail = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Navigation will happen automatically via onAuthStateChange in AppNavigator
    } catch (e: any) {
      console.warn('[AUTH] signInWithPassword failed:', e?.message || e);
      Alert.alert('Sign in failed', e?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'fireside://auth/callback',
        },
      });
      if (error) throw error;
      Alert.alert(
        'Account created!',
        'Please check your email to confirm your account, then sign in.',
        [{ text: 'OK', onPress: () => setIsSignUp(false) }]
      );
    } catch (e: any) {
      console.warn('[AUTH] signUp failed:', e?.message || e);
      Alert.alert('Sign up failed', e?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (isSignUp) {
      signUpWithEmail();
    } else {
      signInWithEmail();
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'fireside://auth/callback',
      });
      if (error) throw error;

      Alert.alert(
        'Check Your Email',
        `We've sent password reset instructions to ${email}. Click the link in the email, set your new password, then come back to the app to sign in.`,
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      console.warn('[AUTH] resetPassword failed:', e?.message || e);
      Alert.alert('Reset Failed', e?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, padding: 24, justifyContent: 'center' }}
      >
        <View style={{ gap: 16 }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image
              source={require('../../assets/Fellowship_App_Logo.png')}
              style={{ width: 150, height: 150 }}
              resizeMode="contain"
            />
          </View>

          <View style={{ gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text.primary }}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={{ fontSize: 16, color: colors.text.secondary }}>
              {isSignUp ? 'Sign up to get started' : 'Sign in to continue'}
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary }}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={colors.text.muted}
                style={{
                  height: 48,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  paddingHorizontal: 12,
                  backgroundColor: colors.background.secondary,
                  color: colors.text.primary,
                }}
                editable={!loading}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary }}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                secureTextEntry
                placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                placeholderTextColor={colors.text.muted}
                style={{
                  height: 48,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  paddingHorizontal: 12,
                  backgroundColor: colors.background.secondary,
                  color: colors.text.primary,
                }}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || !email || !password}
              style={{
                height: 48,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: (loading || !email || !password) ? colors.border.default : colors.accent.primary,
                marginTop: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 16 }}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password - only show on sign in */}
            {!isSignUp && (
              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={loading}
                style={{ alignItems: 'center', marginTop: 12 }}
              >
                <Text style={{ color: colors.accent.secondary, fontWeight: '600', fontSize: 14 }}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
              <Text style={{ color: colors.text.secondary }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                disabled={loading}
                style={{ marginLeft: 4 }}
              >
                <Text style={{ color: colors.accent.primary, fontWeight: '700' }}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

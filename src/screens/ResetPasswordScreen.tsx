// src/screens/ResetPasswordScreen.tsx
import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../theme/colors'

type Props = { onComplete?: () => void }

export default function ResetPasswordScreen({ onComplete }: Props) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Required', 'Please fill in both password fields')
      return
    }
    if (password.length < 6) {
      Alert.alert('Too Short', 'Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      Alert.alert(
        'Password Updated',
        'Your password has been successfully changed.',
        [{ text: 'OK', onPress: () => onComplete?.() }]
      )
    } catch (e: any) {
      console.warn('[ResetPassword] error:', e?.message || e)
      Alert.alert('Error', e?.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, padding: 24, justifyContent: 'center' }}
      >
        <View style={{ gap: 16 }}>
          <View style={{ gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text.primary }}>
              Set New Password
            </Text>
            <Text style={{ fontSize: 16, color: colors.text.secondary }}>
              Enter your new password below
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary }}>
                New Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                secureTextEntry
                placeholder="At least 6 characters"
                placeholderTextColor={colors.text.muted}
                style={{
                  height: 48, borderRadius: 8, borderWidth: 1,
                  borderColor: colors.border.default, paddingHorizontal: 12,
                  backgroundColor: colors.background.secondary, color: colors.text.primary,
                }}
                editable={!loading}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary }}>
                Confirm Password
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                secureTextEntry
                placeholder="Re-enter your password"
                placeholderTextColor={colors.text.muted}
                style={{
                  height: 48, borderRadius: 8, borderWidth: 1,
                  borderColor: colors.border.default, paddingHorizontal: 12,
                  backgroundColor: colors.background.secondary, color: colors.text.primary,
                }}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={loading || !password || !confirmPassword}
              style={{
                height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                backgroundColor: (loading || !password || !confirmPassword)
                  ? colors.border.default : colors.accent.primary,
                marginTop: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 16 }}>
                  Update Password
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// src/services/biometricAuth.ts
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { supabase } from '../lib/supabaseClient'

const BIOMETRIC_ENABLED_KEY = 'fireside.biometric.enabled'
const USER_EMAIL_KEY = 'fireside.user.email'

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none'

/**
 * Check if the device supports biometric authentication
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const isEnrolled = await LocalAuthentication.isEnrolledAsync()
    return hasHardware && isEnrolled
  } catch (err) {
    console.warn('[BiometricAuth] Error checking availability:', err)
    return false
  }
}

/**
 * Get the type of biometric authentication supported
 */
export async function getBiometricType(): Promise<BiometricType> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'facial'
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint'
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris'
    }
    return 'none'
  } catch (err) {
    console.warn('[BiometricAuth] Error getting biometric type:', err)
    return 'none'
  }
}

/**
 * Get a user-friendly name for the biometric type
 */
export function getBiometricName(type: BiometricType): string {
  switch (type) {
    case 'facial':
      return 'Face ID'
    case 'fingerprint':
      return 'Touch ID'
    case 'iris':
      return 'Iris'
    default:
      return 'Biometric'
  }
}

/**
 * Check if biometric authentication is enabled for this user
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)
    return enabled === 'true'
  } catch (err) {
    console.warn('[BiometricAuth] Error checking if enabled:', err)
    return false
  }
}

/**
 * Enable biometric authentication after successful login
 * Stores the user's email securely for future sessions
 */
export async function enableBiometricAuth(email: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true')
    await SecureStore.setItemAsync(USER_EMAIL_KEY, email)
  } catch (err) {
    console.error('[BiometricAuth] Error enabling biometric:', err)
    throw err
  }
}

/**
 * Disable biometric authentication and clear stored credentials
 */
export async function disableBiometricAuth(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY)
    await SecureStore.deleteItemAsync(USER_EMAIL_KEY)
  } catch (err) {
    console.error('[BiometricAuth] Error disabling biometric:', err)
  }
}

/**
 * Get the stored user email (if biometric is enabled)
 */
export async function getStoredEmail(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(USER_EMAIL_KEY)
  } catch (err) {
    console.warn('[BiometricAuth] Error getting stored email:', err)
    return null
  }
}

/**
 * Authenticate with biometrics and return the stored email if successful
 */
export async function authenticateWithBiometric(): Promise<string | null> {
  try {
    // Check if biometric is available and enabled
    const available = await isBiometricAvailable()
    if (!available) {
      console.warn('[BiometricAuth] Biometric not available')
      return null
    }

    const enabled = await isBiometricEnabled()
    if (!enabled) {
      console.log('[BiometricAuth] Biometric not enabled for this user')
      return null
    }

    // Get the biometric type for a better prompt message
    const bioType = await getBiometricType()
    const bioName = getBiometricName(bioType)

    // Prompt for biometric authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Unlock Fireside with ${bioName}`,
      cancelLabel: 'Use Password',
      disableDeviceFallback: true, // We'll handle fallback ourselves
    })

    if (result.success) {
      // Return the stored email
      const email = await getStoredEmail()
      return email
    } else {
      console.log('[BiometricAuth] Authentication failed or cancelled')
      return null
    }
  } catch (err) {
    console.error('[BiometricAuth] Error during authentication:', err)
    return null
  }
}

/**
 * Check if there's an active Supabase session
 * This is used to determine if we need to show auth screen or can use biometric unlock
 */
export async function hasActiveSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession()
    return !!data.session
  } catch (err) {
    console.warn('[BiometricAuth] Error checking session:', err)
    return false
  }
}

/**
 * Attempt to restore session using biometric authentication
 * Returns true if successful, false if user needs to log in manually
 */
export async function attemptBiometricUnlock(): Promise<boolean> {
  try {
    // First check if we already have an active session
    const hasSession = await hasActiveSession()
    if (hasSession) {
      console.log('[BiometricAuth] Active session exists, no unlock needed')
      return true
    }

    // Check if biometric is enabled
    const enabled = await isBiometricEnabled()
    if (!enabled) {
      console.log('[BiometricAuth] Biometric not enabled')
      return false
    }

    // If Supabase session is still valid (persisted), biometric is just an unlock
    // The session will be automatically restored by Supabase's persistSession
    // We just need to verify the user with biometrics
    const email = await authenticateWithBiometric()

    if (email) {
      // Biometric auth succeeded, check if session is restored
      const sessionRestored = await hasActiveSession()
      if (sessionRestored) {
        console.log('[BiometricAuth] Session restored after biometric unlock')
        return true
      } else {
        console.log('[BiometricAuth] Biometric succeeded but no session available')
        // This means the session expired, user needs to log in again
        return false
      }
    }

    return false
  } catch (err) {
    console.error('[BiometricAuth] Error during unlock attempt:', err)
    return false
  }
}

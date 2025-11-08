// src/services/userPrefs.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
const KEY = 'fireside.translation'

export async function getPreferredTranslation(): Promise<string | null> {
  try { return (await AsyncStorage.getItem(KEY)) } catch { return null }
}
export async function setPreferredTranslation(code: string) {
  try { await AsyncStorage.setItem(KEY, code) } catch {}
}

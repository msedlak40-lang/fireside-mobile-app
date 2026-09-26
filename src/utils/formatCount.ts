// src/utils/formatCount.ts

/**
 * Thousands separators for display counts: 1024 -> "1,024".
 *
 * Deliberately NOT toLocaleString(). On React Native the number formatting available
 * depends on whether the JS engine ships Intl, and a build without it silently falls back
 * to toString() and drops the separators -- the bug would only appear on some devices.
 * These are plain integer counts, so a regex does the job with no engine dependency.
 *
 * Non-finite input returns '0' so a display never renders "NaN".
 */
export function formatCount(n: number | null | undefined): string {
  if (!Number.isFinite(n as number)) return '0'
  return String(Math.trunc(n as number)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Masculine color theme: Charcoal background with dark orange/red accents
export const colors = {
  // Background colors
  background: {
    primary: '#1a1a1a',      // Charcoal
    secondary: '#2d2d2d',    // Lighter charcoal
    tertiary: '#3a3a3a',     // Card backgrounds
    elevated: '#2a2a2a',     // Modal/elevated surfaces
  },

  // Text colors
  text: {
    primary: '#f5f5f5',      // Off-white for primary text
    secondary: '#b8b8b8',    // Gray for secondary text
    muted: '#808080',        // Muted gray
    inverse: '#1a1a1a',      // For light backgrounds
  },

  // Accent colors - Dark orange and red
  accent: {
    primary: '#d35400',      // Dark orange (primary actions)
    secondary: '#c0392b',    // Dark red (secondary actions)
    tertiary: '#e67e22',     // Lighter orange (highlights)
    fire: '#b83400',         // Deep orange-red
  },

  // Highlight colors (for scripture highlights)
  highlight: {
    yellow: '#7a5d1a',       // Dark golden
    green: '#2d5f3f',        // Dark green
    pink: '#6b3a4a',         // Dark rose
    blue: '#2c4f6b',         // Dark blue
  },

  // UI states
  border: {
    default: '#404040',
    light: '#505050',
    dark: '#2a2a2a',
  },

  success: '#27ae60',        // Keep green for success
  error: '#c0392b',          // Dark red for errors
  warning: '#e67e22',        // Orange for warnings

  // Tab bar
  tabBar: {
    background: '#0d0d0d',   // Very dark charcoal
    active: '#d35400',       // Dark orange
    inactive: '#666666',     // Gray
  },
} as const;

export type Colors = typeof colors;

import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  size?: number;
}

// On web, WebThemeToggle is swapped in via metro/webpack platform resolution
// (ThemeToggle.web.tsx). This file covers native only.
export default function ThemeToggle({ size = 18 }: Props) {
  const { isDark, toggleTheme, colors } = useTheme();

  if (Platform.OS !== 'web') {
    return (
      <TouchableOpacity
        onPress={toggleTheme}
        style={{ padding: 8, borderRadius: 20, backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border }}
      >
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={size} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  // Web fallback (overridden by ThemeToggle.web.tsx in practice)
  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={{ padding: 8, borderRadius: 20, backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border }}
    >
      <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={size} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

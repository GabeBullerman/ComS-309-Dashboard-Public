import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ColorPalette } from '../constants/colors';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ColorPalette;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: lightColors,
  toggleTheme: () => {},
  isDark: false,
});

const STORAGE_KEY = 'app_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => { if (stored === 'dark' || stored === 'light') setMode(stored); })
      .catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value: ThemeContextValue = {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    toggleTheme,
    isDark: mode === 'dark',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

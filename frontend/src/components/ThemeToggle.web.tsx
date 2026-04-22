import React, { useEffect } from 'react';
import { Within } from '@theme-toggles/react';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  size?: number;
}

// Inject the within-toggle CSS as a raw string to avoid PostCSS @layer utilities conflict
const WITHIN_CSS = [
  ':root { --toggles-within--duration: 1500ms; }',
  '.toggles-dev--\\[transform-origin\\:center\\] { transform-origin: center; }',
  '.toggles-dev--\\[transition\\:transform_var\\(--toggles-within--duration\\)_cubic-bezier\\(0\\,0\\,0\\,1\\.25\\)\\] { transition: transform var(--toggles-within--duration) cubic-bezier(0,0,0,1.25); }',
  '.dark .dark\\:toggles-dev--\\[transform\\:scale\\(0\\.65\\)\\] { transform: scale(0.65); }',
  '.dark .dark\\:toggles-dev--\\[transform\\:scale\\(1\\.5\\)\\] { transform: scale(1.5); }',
  '.dark .dark\\:toggles-dev--\\[transform\\:translate3d\\(3px\\,-3px\\,0\\)_scale\\(1\\.2\\)\\] { transform: translate3d(3px,-3px,0) scale(1.2); }',
].join('\n');

export default function ThemeToggle({ size = 28 }: Props) {
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (document.getElementById('within-toggle-css')) return;
    const style = document.createElement('style');
    style.id = 'within-toggle-css';
    style.textContent = WITHIN_CSS;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <Within
      duration={1500}
      onClick={toggleTheme}
      style={{
        fontSize: size,
        color: isDark ? '#F1BE48' : '#4B5563',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 4,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
      } as React.CSSProperties}
    />
  );
}

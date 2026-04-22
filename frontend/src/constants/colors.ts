export type ColorPalette = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  primary: string;       // ISU Crimson
  gold: string;          // ISU Gold
  teal: string;          // Teal accent

  // ── Surfaces ───────────────────────────────────────────────────────────────
  background: string;    // Page / screen background
  surface: string;       // Cards, panels, modals
  overlay: string;       // Modal scrim

  // ── Text ───────────────────────────────────────────────────────────────────
  text: string;          // Primary body text
  textSecondary: string; // Secondary / label text
  textMuted: string;     // Muted / hint text
  textFaint: string;     // Faintest decorative text
  textInverse: string;   // Text on coloured surfaces

  // ── Borders ────────────────────────────────────────────────────────────────
  border: string;        // Default card / section border
  borderLight: string;   // Subtle separator
  borderMedium: string;  // Slightly stronger separator

  // ── Inputs ─────────────────────────────────────────────────────────────────
  inputBg: string;
  inputBorder: string;

  // ── Status: Good ───────────────────────────────────────────────────────────
  statusGoodBg: string;
  statusGoodText: string;
  statusGoodBar: string;

  // ── Status: Moderate ───────────────────────────────────────────────────────
  statusModerateBg: string;
  statusModerateText: string;
  statusModerateBar: string;

  // ── Status: Poor ───────────────────────────────────────────────────────────
  statusPoorBg: string;
  statusPoorText: string;
  statusPoorBar: string;

  // ── Status: Ungraded ───────────────────────────────────────────────────────
  statusUngraded: string;

  // ── Severity: Warning ──────────────────────────────────────────────────────
  warningBg: string;
  warningText: string;
  warningBorder: string;
  warningIcon: string;

  // ── Severity: Critical ─────────────────────────────────────────────────────
  criticalBg: string;
  criticalText: string;
  criticalBorder: string;

  // ── Score Dots (demo scoring 0-2) ──────────────────────────────────────────
  score0Bg: string;
  score0Border: string;
  score1Bg: string;
  score1Border: string;
  score2Bg: string;
  score2Border: string;
  score2Text: string;

  // ── Category: Ungraded / Performance (violet) ──────────────────────────────
  ungradedBg: string;
  ungradedBorder: string;
  ungradedText: string;

  // ── Charts (intentionally fixed for visual consistency) ────────────────────
  chartAdditions: string;
  chartDeletions: string;
  chartCommits: string;
  chartMrOpened: string;
  chartMrMerged: string;
  chartMrClosed: string;

  // ── Status: Excused (blue) ─────────────────────────────────────────────────
  excusedBg: string;
  excusedText: string;
  excusedBorder: string;

  // ── Misc UI ────────────────────────────────────────────────────────────────
  avatarBg: string;      // Default avatar background
  ripple: string;        // Android ripple colour
  shadow: string;        // Box shadow base colour
  updateBanner: string;  // "Update ready" banner
  navBg: string;         // Sidebar / bottom-nav background
  navActive: string;     // Active nav-item highlight
  navActiveText: string; // Text on active nav item
  iconPeople: string;    // Icon accent for member count
  iconTA: string;        // Icon accent for TA row
  separator: string;     // Date / section divider lines
};

// ─── Light Palette ────────────────────────────────────────────────────────────

export const lightColors: ColorPalette = {
  primary: '#C8102E',
  gold: '#F1BE48',
  teal: '#64f0cd',

  background: '#f5f7fa',
  surface: '#ffffff',
  overlay: 'rgba(0,0,0,0.45)',

  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  textInverse: '#ffffff',

  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  borderMedium: '#d1d5db',

  inputBg: '#f8fafc',
  inputBorder: '#e2e8f0',

  statusGoodBg: '#dcfce7',
  statusGoodText: '#15803d',
  statusGoodBar: '#22c55e',

  statusModerateBg: '#fef9c3',
  statusModerateText: '#92400e',
  statusModerateBar: '#facc15',

  statusPoorBg: '#fee2e2',
  statusPoorText: '#b91c1c',
  statusPoorBar: '#ef4444',

  statusUngraded: '#9ca3af',

  warningBg: '#fefce8',
  warningText: '#92400e',
  warningBorder: '#f59e0b',
  warningIcon: '#d97706',

  criticalBg: '#fee2e2',
  criticalText: '#b91c1c',
  criticalBorder: '#dc2626',

  score0Bg: '#fca5a5',
  score0Border: '#dc2626',
  score1Bg: '#fde68a',
  score1Border: '#d97706',
  score2Bg: '#bbf7d0',
  score2Border: '#16a34a',
  score2Text: '#15803d',

  ungradedBg: '#f5f3ff',
  ungradedBorder: '#ddd6fe',
  ungradedText: '#6d28d9',

  chartAdditions: '#31C48D',
  chartDeletions: '#978282',
  chartCommits: '#6E57E0',
  chartMrOpened: '#E53935',
  chartMrMerged: '#31C48D',
  chartMrClosed: '#978282',

  excusedBg: '#dbeafe',
  excusedText: '#1d4ed8',
  excusedBorder: '#3b82f6',

  avatarBg: '#F1BE48',
  ripple: '#e5e7eb',
  shadow: '#000000',
  updateBanner: '#16a34a',
  navBg: '#C8102E',
  navActive: '#F1BE48',
  navActiveText: '#713f12',
  iconPeople: '#F1BE48',
  iconTA: '#64f0cd',
  separator: '#111827',
};

// ─── Dark Palette ─────────────────────────────────────────────────────────────

export const darkColors: ColorPalette = {
  primary: '#C8102E',
  gold: '#F1BE48',
  teal: '#64f0cd',

  background: '#0f172a',
  surface: '#1e293b',
  overlay: 'rgba(0,0,0,0.65)',

  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  textInverse: '#ffffff',

  border: '#334155',
  borderLight: '#1e293b',
  borderMedium: '#475569',

  inputBg: '#0f172a',
  inputBorder: '#334155',

  statusGoodBg: '#14532d',
  statusGoodText: '#4ade80',
  statusGoodBar: '#22c55e',

  statusModerateBg: '#713f12',
  statusModerateText: '#fde68a',
  statusModerateBar: '#facc15',

  statusPoorBg: '#7f1d1d',
  statusPoorText: '#fca5a5',
  statusPoorBar: '#ef4444',

  statusUngraded: '#6b7280',

  warningBg: '#422006',
  warningText: '#fde68a',
  warningBorder: '#d97706',
  warningIcon: '#fbbf24',

  criticalBg: '#7f1d1d',
  criticalText: '#fca5a5',
  criticalBorder: '#dc2626',

  score0Bg: '#7f1d1d',
  score0Border: '#ef4444',
  score1Bg: '#78350f',
  score1Border: '#f59e0b',
  score2Bg: '#14532d',
  score2Border: '#22c55e',
  score2Text: '#4ade80',

  ungradedBg: '#2e1065',
  ungradedBorder: '#7c3aed',
  ungradedText: '#a78bfa',

  chartAdditions: '#31C48D',
  chartDeletions: '#978282',
  chartCommits: '#6E57E0',
  chartMrOpened: '#E53935',
  chartMrMerged: '#31C48D',
  chartMrClosed: '#978282',

  excusedBg: '#1e3a5f',
  excusedText: '#93c5fd',
  excusedBorder: '#3b82f6',

  avatarBg: '#F1BE48',
  ripple: '#334155',
  shadow: '#000000',
  updateBanner: '#15803d',
  navBg: '#C8102E',
  navActive: '#F1BE48',
  navActiveText: '#713f12',
  iconPeople: '#F1BE48',
  iconTA: '#64f0cd',
  separator: '#F1BE48',
};

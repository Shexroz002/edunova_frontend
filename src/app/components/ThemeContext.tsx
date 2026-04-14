import { createContext, useContext, useState, ReactNode } from 'react';
import { getStoredUserRole, type AppUserRole } from '../lib/auth';

export interface StatPalette {
  iconBg: string;
  iconColor: string;
  glowColor: string;
  trendUp: string;
  trendDown: string;
}

export interface Theme {
  isDark: boolean;
  // Surfaces
  bgBase: string;
  bgCard: string;
  bgCardHover: string;
  bgInner: string;
  bgInput: string;
  bgButton: string;
  // Borders
  border: string;
  borderSubtle: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Shadow
  shadowCard: string;
  shadowHover: string;
  // Chart
  chartGrid: string;
  chartGridStyle: 'dashed' | 'solid';
  chartGridOpacity: number;
  chartBarPrimary: string;
  chartBarPrimaryGlow: string;
  chartBarSecondary: string;
  chartTooltipBg: string;
  // Stat card palettes
  stat: {
    indigo: StatPalette;
    green: StatPalette;
    amber: StatPalette;
    blue: StatPalette;
  };
  // Trend badges
  trendUpBg: string;
  trendUpText: string;
  trendDownBg: string;
  trendDownText: string;
  // Accent
  accent: string;
  accentMuted: string;
  accentBorder: string;
}

const darkTheme: Theme = {
  isDark: true,
  bgBase: '#0F172A',
  bgCard: '#1E293B',
  bgCardHover: 'rgba(99,102,241,0.04)',
  bgInner: '#0F172A',
  bgInput: '#1E293B',
  bgButton: '#1E293B',
  border: '#334155',
  borderSubtle: 'rgba(255,255,255,0.03)',
  textPrimary: '#F8FAFC',
  textSecondary: '#64748B',
  textMuted: '#475569',
  shadowCard: '0 4px 24px rgba(0,0,0,0.3)',
  shadowHover: '0 8px 32px rgba(0,0,0,0.4)',
  chartGrid: '#1E3A5F',
  chartGridStyle: 'dashed',
  chartGridOpacity: 0.5,
  chartBarPrimary: 'linear-gradient(180deg, #818CF8 0%, #6366F1 100%)',
  chartBarPrimaryGlow: 'rgba(99,102,241,0.6)',
  chartBarSecondary: 'rgba(34,197,94,0.4)',
  chartTooltipBg: '#1E293B',
  stat: {
    indigo: { iconBg: 'rgba(99,102,241,0.12)', iconColor: '#818CF8', glowColor: 'rgba(99,102,241,0.3)', trendUp: '#22C55E', trendDown: '#EF4444' },
    green:  { iconBg: 'rgba(34,197,94,0.12)',  iconColor: '#34D399', glowColor: 'rgba(34,197,94,0.25)',  trendUp: '#22C55E', trendDown: '#EF4444' },
    amber:  { iconBg: 'rgba(245,158,11,0.12)', iconColor: '#FBBF24', glowColor: 'rgba(245,158,11,0.25)', trendUp: '#22C55E', trendDown: '#EF4444' },
    blue:   { iconBg: 'rgba(56,189,248,0.12)', iconColor: '#38BDF8', glowColor: 'rgba(56,189,248,0.25)', trendUp: '#22C55E', trendDown: '#EF4444' },
  },
  trendUpBg: 'rgba(34,197,94,0.12)',
  trendUpText: '#22C55E',
  trendDownBg: 'rgba(239,68,68,0.12)',
  trendDownText: '#EF4444',
  accent: '#818CF8',
  accentMuted: 'rgba(99,102,241,0.1)',
  accentBorder: 'rgba(99,102,241,0.2)',
};

// ─── Reader / Light Theme ────────────────────────────────────────────────────
// Clean professional SaaS palette — high readability, modern contrast.
const lightTheme: Theme = {
  isDark: false,
  bgBase: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgCardHover: 'rgba(99,102,241,0.04)',
  bgInner: '#F1F5F9',
  bgInput: '#F8FAFC',
  bgButton: '#F8FAFC',
  border: '#E2E8F0',
  borderSubtle: 'rgba(0,0,0,0.03)',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  shadowCard: '0 1px 3px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.04)',
  shadowHover: '0 4px 16px rgba(15,23,42,0.1)',
  chartGrid: '#E2E8F0',
  chartGridStyle: 'solid',
  chartGridOpacity: 1,
  chartBarPrimary: 'linear-gradient(180deg, #818CF8 0%, #6366F1 100%)',
  chartBarPrimaryGlow: 'transparent',
  chartBarSecondary: 'rgba(34,197,94,0.55)',
  chartTooltipBg: '#FFFFFF',
  stat: {
    indigo: { iconBg: 'rgba(99,102,241,0.1)',  iconColor: '#6366F1', glowColor: 'rgba(99,102,241,0.15)', trendUp: '#22C55E', trendDown: '#EF4444' },
    green:  { iconBg: 'rgba(34,197,94,0.1)',   iconColor: '#22C55E', glowColor: 'rgba(34,197,94,0.15)',  trendUp: '#22C55E', trendDown: '#EF4444' },
    amber:  { iconBg: 'rgba(245,158,11,0.1)',  iconColor: '#F59E0B', glowColor: 'rgba(245,158,11,0.15)', trendUp: '#22C55E', trendDown: '#EF4444' },
    blue:   { iconBg: 'rgba(59,130,246,0.1)',  iconColor: '#3B82F6', glowColor: 'rgba(59,130,246,0.15)', trendUp: '#22C55E', trendDown: '#EF4444' },
  },
  trendUpBg: 'rgba(34,197,94,0.1)',
  trendUpText: '#22C55E',
  trendDownBg: 'rgba(239,68,68,0.1)',
  trendDownText: '#EF4444',
  accent: '#6366F1',
  accentMuted: 'rgba(99,102,241,0.08)',
  accentBorder: 'rgba(99,102,241,0.2)',
};

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  toggleTheme: () => {},
});

function getDefaultIsDark(role: AppUserRole) {
  if (role === 'teacher') {
    return false;
  }

  return true;
}

export function ThemeProvider({
  children,
  defaultRole,
}: {
  children: ReactNode;
  defaultRole?: AppUserRole;
}) {
  const [isDark, setIsDark] = useState(() => getDefaultIsDark(defaultRole ?? getStoredUserRole()));
  const theme = isDark ? darkTheme : lightTheme;
  const toggleTheme = () => setIsDark((prev) => !prev);
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

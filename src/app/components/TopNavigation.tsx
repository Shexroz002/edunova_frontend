import { Bell, Search, ChevronDown, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from './ThemeContext';

interface TopNavigationProps {
  onMenuClick: () => void;
  profile: {
    fullName: string;
    roleLabel: string;
    profileImage: string | null;
  };
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function TopNavigation({ onMenuClick, profile }: TopNavigationProps) {
  const { theme, toggleTheme } = useTheme();
  const t = theme;
  const initials = initialsFromName(profile.fullName);

  return (
    <header
      className="px-4 lg:px-8 py-4"
      style={{ background: t.bgCard, borderBottom: `1px solid ${t.border}` }}
    >
      <div className="flex items-center justify-between gap-3">

        {/* Left: hamburger (mobile) + title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={onMenuClick}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors"
            style={{ background: t.bgButton, border: `1px solid ${t.border}` }}
          >
            <Menu className="w-5 h-5" style={{ color: t.textSecondary }} />
          </button>

          {/* Title */}
          <div className="min-w-0">
            <h2 className="text-base lg:text-xl font-bold truncate" style={{ color: t.textPrimary }}>
              Bosh sahifa
            </h2>
            <p className="text-xs mt-0.5 hidden sm:block" style={{ color: t.textMuted }}>
              Dushanba, 16 mart, 2026
            </p>
          </div>
        </div>

        {/* Right: search (desktop) + controls */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          {/* Search — desktop only */}
          <div className="relative hidden lg:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: t.textMuted }}
            />
            <input
              type="text"
              placeholder="O'quvchilar, testlarni qidiring..."
              className="pl-10 pr-4 py-2.5 w-72 rounded-xl text-sm focus:outline-none transition-all"
              style={{
                background: t.bgInput,
                border: `1px solid ${t.border}`,
                color: t.textPrimary,
              }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = '#6366F1';
                (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = t.border;
                (e.target as HTMLElement).style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all"
            title={t.isDark ? "Yorug' rejimga o'tish" : "Qorong'u rejimga o'tish"}
            style={{
              background: t.isDark
                ? 'rgba(99,102,241,0.12)'
                : 'rgba(245,158,11,0.1)',
              border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            {t.isDark ? (
              <Sun className="w-5 h-5" style={{ color: '#FBBF24' }} />
            ) : (
              <Moon className="w-5 h-5" style={{ color: '#6366F1' }} />
            )}
          </button>

          {/* Notification bell */}
          <button
            className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
            style={{ background: t.bgButton, border: `1px solid ${t.border}` }}
          >
            <Bell className="w-5 h-5" style={{ color: t.textSecondary }} />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
              style={{ background: '#EF4444', borderColor: t.bgCard }}
            />
          </button>

          {/* Profile — desktop only */}
          <div
            className="hidden lg:flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors"
            style={{ background: t.bgButton, border: `1px solid ${t.border}` }}
          >
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ border: '2px solid #6366F1', background: '#6366F1' }}
            >
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={profile.fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : initials}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: t.textPrimary }}>{profile.fullName}</p>
              <p className="text-xs leading-tight" style={{ color: t.textSecondary }}>{profile.roleLabel}</p>
            </div>
            <ChevronDown className="w-4 h-4 ml-1" style={{ color: t.textMuted }} />
          </div>
        </div>
      </div>
    </header>
  );
}

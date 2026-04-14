import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Video,
  BarChart3,
  PieChart,
  Trophy,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useTheme } from './ThemeContext';
import { clearStoredAuthSession, getValidAccessToken, refreshStoredAuthToken } from '../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

const navigationItems = [
  { name: 'Bosh sahifa',      icon: LayoutDashboard, path: '/'                   },
  { name: "O'quvchilar",      icon: Users,            path: '/students'           },
  { name: 'Sinflar',          icon: BookOpen,         path: '/classes'            },
  { name: 'Testlar',          icon: FileText,         path: '/quizzes'            },
  { name: 'Sessions',         icon: Video,            path: '/live'               },
  { name: 'Tahlil',           icon: BarChart3,        path: '/analytics'          },
  // { name: "O'quvchi tahlili", icon: PieChart,         path: '/student-analytics'  },
  { name: 'Reyting',          icon: Trophy,           path: '/leaderboard'        },
  { name: 'Sozlamalar',       icon: Settings,         path: '/settings'           },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MeResponse {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string | null;
  profile_image: string | null;
}

interface SidebarProfile {
  fullName: string;
  roleLabel: string;
  profileImage: string | null;
}

async function fetchWithAuthRetry(url: string, init: RequestInit = {}) {
  let token = await getValidAccessToken();
  if (!token) {
    throw new Error("Tizimga qayta kiring");
  }

  const makeRequest = (accessToken: string) => fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let response = await makeRequest(token);

  if (response.status === 401) {
    const refreshed = await refreshStoredAuthToken();
    token = refreshed?.access_token ?? null;
    if (!token) {
      throw new Error("Sessiya tugagan. Qayta kiring");
    }
    response = await makeRequest(token);
  }

  return response;
}

function SidebarContent({ onClose, isMobile }: { onClose: () => void; isMobile?: boolean }) {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<SidebarProfile>({
    fullName: 'Ustoz',
    roleLabel: "O'qituvchi",
    profileImage: null,
  });

  const handleLogout = () => {
    clearStoredAuthSession();
    onClose();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/auth/me/`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Profilni olishda xatolik: ${response.status}`);
        }

        const data: MeResponse = await response.json();
        if (!isMounted) return;

        const firstName = data.first_name?.trim() ?? '';
        const lastName = data.last_name?.trim() ?? '';
        const fullName = `${firstName} ${lastName}`.trim() || data.username || 'Ustoz';

        setProfile({
          fullName,
          roleLabel: data.role === 'teacher' ? "O'qituvchi" : 'Foydalanuvchi',
          profileImage: data.profile_image ?? null,
        });
      } catch {
        if (!isMounted) return;
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const profileInitials = useMemo(() => {
    const parts = profile.fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }, [profile.fullName]);

  return (
    <aside className="w-64 h-full flex flex-col" style={{ background: t.bgCard }}>
      {/* Logo */}
      <div className="px-6 py-7 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: t.isDark
                ? 'linear-gradient(135deg, #7C3AED, #6366F1)'
                : 'linear-gradient(135deg, #6366F1, #4F46E5)',
            }}
          >
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: t.textPrimary }}>
            EduNova
          </h1>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ background: t.bgInner, color: t.textMuted }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Section label */}
      <div className="px-5 mb-2">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: t.textMuted }}
        >
          Asosiy menyu
        </span>
      </div>

      {/* Nav items */}
      <nav className="px-3 flex-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              onClick={isMobile ? onClose : undefined}
              className="w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-xl transition-all text-left group"
              style={({ isActive }) =>
                isActive
                  ? {
                      background: t.isDark
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(124,58,237,0.15))'
                        : 'rgba(99,102,241,0.08)',
                      border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.2)'}`,
                      color: t.isDark ? '#818CF8' : '#6366F1',
                      boxShadow: t.isDark ? '0 0 12px rgba(99,102,241,0.15)' : 'none',
                      textDecoration: 'none',
                    }
                  : {
                      background: 'transparent',
                      border: '1px solid transparent',
                      color: t.textSecondary,
                      textDecoration: 'none',
                    }
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className="p-2 rounded-lg flex items-center justify-center"
                    style={
                      isActive
                        ? { background: t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)' }
                        : { background: t.isDark ? 'rgba(30,41,59,0.6)' : 'rgba(0,0,0,0.04)' }
                    }
                  >
                    <Icon className="w-4 h-4" strokeWidth={t.isDark ? 2 : 1.75} />
                  </div>
                  <span className="text-sm font-medium">{item.name}</span>
                  {isActive && (
                    <div
                      className="ml-auto w-1.5 h-5 rounded-full"
                      style={{ background: '#6366F1' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom user card */}
      <div
        className="p-4 mx-3 mb-4 rounded-xl"
        style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
      >
        <div className="flex items-center gap-3">
          {profile.profileImage ? (
            <img
              src={profile.profileImage}
              alt={profile.fullName}
              className="w-9 h-9 rounded-full object-cover shrink-0"
              style={{ border: '2px solid #6366F1' }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
              style={{
                background: t.accentMuted,
                color: t.accent,
                border: '2px solid #6366F1',
              }}
            >
              {profileInitials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{profile.fullName}</p>
            <p className="text-xs truncate" style={{ color: t.textSecondary }}>{profile.roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: t.isDark ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.08)',
            color: '#EF4444',
            border: '1px solid rgba(239,68,68,0.24)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.24)';
          }}
        >
          <LogOut className="w-4 h-4" strokeWidth={2} />
          Chiqish
        </button>
      </div>
    </aside>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { theme: t } = useTheme();

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <div
        className="hidden lg:flex flex-col min-h-screen shrink-0 transition-colors duration-300"
        style={{ borderRight: `1px solid ${t.border}` }}
      >
        <SidebarContent onClose={onClose} />
      </div>

      {/* ── Mobile backdrop ── */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* ── Mobile drawer ── */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 lg:hidden transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderRight: `1px solid ${t.border}`, boxShadow: '4px 0 24px rgba(0,0,0,0.15)' }}
      >
        <SidebarContent onClose={onClose} isMobile />
      </div>
    </>
  );
}

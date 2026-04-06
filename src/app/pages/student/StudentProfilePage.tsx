import { useEffect, useState } from 'react';
import { useTheme } from '../../components/ThemeContext';
import { useNavigate } from 'react-router';
import { User, Zap, Trophy, CheckCircle2, Settings, ChevronRight, Star, Flame } from 'lucide-react';
import { getStoredAuthSession, getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.myedunova.uz';

const achievements = [
  { icon: '🏆', label: '10 test yutdim', earned: true },
  { icon: '🔥', label: '7 kunlik streak', earned: true },
  { icon: '⚡', label: '1000 XP', earned: true },
  { icon: '🎯', label: '90%+ ball', earned: false },
  { icon: '👥', label: '5 do\'st', earned: false },
  { icon: '📚', label: 'Barcha fanlar', earned: false },
];

interface UserMeResponse {
  id: number | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  profile_image: string | null;
  email: string | null;
  phone_number: string | null;
  school_name: string | null;
  education_level: string | null;
}

interface StudentProfileHero {
  fullName: string;
  avatar: string;
  educationLevel: string;
  roleLabel: string;
}

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function mapStudentProfileHero(data: UserMeResponse): StudentProfileHero {
  const fullName = `${normalizeText(data.first_name)} ${normalizeText(data.last_name)}`.trim()
    || normalizeText(data.username, "O'quvchi");

  return {
    fullName,
    avatar: normalizeText(data.profile_image, 'https://i.pravatar.cc/150?img=12'),
    educationLevel: normalizeText(data.education_level, "Sinf ko'rsatilmagan"),
    roleLabel: normalizeText(data.role, "O'quvchi"),
  };
}

async function fetchWithAuthRetry(url: string, init: RequestInit = {}) {
  let token = await getValidAccessToken();
  if (!token) {
    throw new Error('Sessiya topilmadi. Qayta kiring');
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
      throw new Error('Sessiya tugagan. Qayta kiring');
    }

    response = await makeRequest(token);
  }

  return response;
}

async function fetchMe() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/auth/me/`, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Profil ma'lumoti olinmadi: ${response.status}`);
  }

  return response.json() as Promise<UserMeResponse>;
}

export function StudentProfilePage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const cardBase = { background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard };
  const storedSession = getStoredAuthSession();
  const fallbackName = `${normalizeText(storedSession?.user?.first_name)} ${normalizeText(storedSession?.user?.last_name)}`.trim()
    || normalizeText(storedSession?.user?.username, "O'quvchi");
  const [profileHero, setProfileHero] = useState<StudentProfileHero>({
    fullName: fallbackName,
    avatar: normalizeText(storedSession?.user?.profile_image, 'https://i.pravatar.cc/150?img=12'),
    educationLevel: "Sinf ko'rsatilmagan",
    roleLabel: "O'quvchi",
  });

  useEffect(() => {
    let cancelled = false;

    fetchMe()
      .then((data) => {
        if (cancelled) return;
        setProfileHero(mapStudentProfileHero(data));
      })
      .catch(() => {
        // Keep UI fallbacks if the profile request fails.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile hero */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 mb-4"
        style={{
          background: t.isDark
            ? 'linear-gradient(135deg, #4C1D95 0%, #6366F1 60%, #3B82F6 100%)'
            : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
        }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #A5B4FC, transparent)' }} />
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={profileHero.avatar}
              alt={profileHero.fullName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover"
              style={{ border: '3px solid rgba(255,255,255,0.3)' }}
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg text-white">{profileHero.fullName}</h2>
            <p className="text-white/70 text-sm">{profileHero.educationLevel} • {profileHero.roleLabel}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                Daraja 8
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                <Star className="w-3 h-3 text-yellow-300" /> Top 10%
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'XP', value: '1,560', icon: Zap },
            { label: 'Testlar', value: '40', icon: CheckCircle2 },
            { label: 'Streak', value: '7 kun', icon: Flame },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="text-center p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <Icon className="w-4 h-4 text-white/70 mx-auto mb-1" />
                <p className="font-bold text-white text-sm">{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* XP Progress */}
      <div className="rounded-2xl p-5 mb-4" style={cardBase}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm" style={{ color: t.textPrimary }}>Daraja 8 → 9</h3>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>1,560 / 2,000 XP</p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)', color: t.isDark ? '#818CF8' : '#6366F1' }}>
            78%
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: '78%',
              background: 'linear-gradient(90deg, #818CF8, #6366F1)',
              boxShadow: t.isDark ? '0 0 10px rgba(99,102,241,0.4)' : 'none',
            }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: t.textMuted }}>Keyingi darajaga 440 XP qoldi</p>
      </div>

      {/* Achievements */}
      <div className="rounded-2xl p-5 mb-4" style={cardBase}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5" style={{ color: '#FBBF24' }} />
          <h3 className="font-bold text-sm" style={{ color: t.textPrimary }}>Yutuqlar</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {achievements.map((ach, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 p-3 rounded-xl text-center"
              style={{
                background: ach.earned
                  ? t.isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.06)'
                  : t.bgInner,
                border: `1px solid ${ach.earned ? 'rgba(251,191,36,0.25)' : t.border}`,
                opacity: ach.earned ? 1 : 0.5,
              }}
            >
              <span className="text-2xl">{ach.icon}</span>
              <p style={{ fontSize: '10px', color: t.textSecondary, lineHeight: 1.3 }}>{ach.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings menu */}
      <div className="rounded-2xl overflow-hidden" style={cardBase}>
        {[
          { icon: User, label: 'Profilni tahrirlash' },
          { icon: Settings, label: 'Sozlamalar' },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:opacity-80"
              style={{ borderBottom: i < 1 ? `1px solid ${t.border}` : 'none' }}
              onClick={() => navigate('/student/edit-profile')}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.bgInner }}>
                  <Icon className="w-4 h-4" style={{ color: t.textSecondary }} />
                </div>
                <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: t.textMuted }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

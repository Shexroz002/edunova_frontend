import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Trophy, Medal, Star, Target, ClipboardCheck, TrendingUp, Crown, ChevronDown, X, Search } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu.tsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const PAGE_SIZE = 6;
const ORDER_OPTIONS = [
  { value: 'username', label: 'Username' },
  { value: 'average_score', label: "O'rtacha ball" },
  { value: 'tests_count', label: 'Testlar soni' },
  { value: 'last_activity', label: "So'nggi faollik" },
];

interface LeaderboardApiItem {
  student_id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_image: string | null;
  group_names: string[];
  average_score: number;
  tests_count: number;
  streak_days: number;
  last_activity: string | null;
  status: 'active' | 'inactive';
}

interface LeaderboardApiResponse {
  items: LeaderboardApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface LeaderboardStudent {
  id: number;
  name: string;
  initials: string;
  username: string;
  profileImage: string | null;
  groups: string[];
  class: string;
  avgScore: number;
  testsCompleted: number;
  streak: number;
  lastActivity: string;
  status: 'active' | 'inactive';
}

const AVATAR_COLORS = [
  '#6366F1', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444',
  '#8B5CF6', '#0891B2', '#D97706', '#059669', '#EC4899',
  '#14B8A6', '#F97316',
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function formatLastActivity(value: string | null) {
  if (!value) return "Faollik yo'q";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 60) return `${minutes} daqiqa oldin`;
  if (hours < 24) return `${hours} soat oldin`;
  if (days === 1) return 'Kecha';
  if (days < 7) return `${days} kun oldin`;
  return date.toLocaleDateString('uz-UZ');
}

function mapStudent(item: LeaderboardApiItem): LeaderboardStudent {
  const groups = Array.isArray(item.group_names)
    ? item.group_names.map((group) => group.trim()).filter(Boolean)
    : [];
  const name = item.full_name?.trim() || `${item.first_name} ${item.last_name}`.trim() || item.username;

  return {
    id: item.student_id,
    name,
    initials: getInitials(name),
    username: item.username,
    profileImage: item.profile_image,
    groups,
    class: groups[0] ?? "Guruh yo'q",
    avgScore: item.average_score,
    testsCompleted: item.tests_count,
    streak: item.streak_days,
    lastActivity: formatLastActivity(item.last_activity),
    status: item.status,
  };
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

function scoreColor(score: number) {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' };
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
      <Crown className="w-5 h-5 text-white" strokeWidth={1.75} />
    </div>
  );
  if (rank === 2) return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      style={{ background: 'linear-gradient(135deg, #94A3B8, #64748B)', boxShadow: '0 4px 12px rgba(100,116,139,0.3)' }}>
      <Medal className="w-5 h-5 text-white" strokeWidth={1.75} />
    </div>
  );
  if (rank === 3) return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      style={{ background: 'linear-gradient(135deg, #B45309, #92400E)', boxShadow: '0 4px 12px rgba(180,83,9,0.3)' }}>
      <Medal className="w-5 h-5 text-white" strokeWidth={1.75} />
    </div>
  );
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
      style={{ background: 'transparent', color: '#64748B' }}>
      {rank}
    </div>
  );
}

function GroupNamesDropdown({
  groups,
  t,
}: {
  groups: string[];
  t: ReturnType<typeof useTheme>['theme'];
}) {
  const primaryGroup = groups[0] ?? "Guruh yo'q";
  const extraCount = Math.max(groups.length - 1, 0);
  const isExpandable = groups.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={!isExpandable}
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs transition-all"
          style={{
            background: t.bgInner,
            border: `1px solid ${t.border}`,
            color: t.textMuted,
            cursor: isExpandable ? 'pointer' : 'default',
          }}
        >
          <span className="truncate">{primaryGroup}</span>
          {extraCount > 0 && (
            <span
              className="shrink-0 rounded-full px-1 py-0.5 text-[10px] font-semibold"
              style={{
                background: t.accentMuted,
                color: t.accent,
                border: `1px solid ${t.accentBorder}`,
              }}
            >
              +{extraCount}
            </span>
          )}
          {isExpandable && <ChevronDown className="w-3 h-3 shrink-0" style={{ color: t.textMuted }} />}
        </button>
      </DropdownMenuTrigger>
      {isExpandable && (
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="w-64 rounded-xl p-1.5"
          style={{
            background: t.bgCard,
            color: t.textPrimary,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowCard,
          }}
        >
          {groups.map((group, index) => (
            <DropdownMenuItem
              key={`${group}-${index}`}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm outline-none"
              style={{ color: t.textPrimary }}
            >
              <span className="truncate">{group}</span>
              {index === 0 && (
                <span className="shrink-0 text-[11px] font-semibold" style={{ color: t.textMuted }}>
                  Asosiy
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}

export function LeaderboardPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const scrollTrack = t.isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.18)';
  const scrollThumb = t.isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.38)';
  const scrollThumbHover = t.isDark ? 'rgba(148,163,184,0.58)' : 'rgba(100,116,139,0.54)';
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const [featuredStudents, setFeaturedStudents] = useState<LeaderboardStudent[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [students, setStudents] = useState<LeaderboardStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [ordering, setOrdering] = useState('username');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [ordering, minScore, maxScore]);

  useEffect(() => {
    if (page === 1 && listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [search]);

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedLeaderboard() {
      setFeaturedLoading(true);
      try {
        const params = new URLSearchParams({
          ordering: 'username',
          page: '1',
          size: String(PAGE_SIZE),
        });

        const response = await fetchWithAuthRetry(
          `${API_BASE_URL}/api/v1/teacher/my/student/leaderboard?${params.toString()}`,
          { method: 'GET' },
        );

        if (!response.ok) {
          throw new Error(`Reytingni olishda xatolik: ${response.status}`);
        }

        const data: LeaderboardApiResponse = await response.json();
        if (!isMounted) return;
        setFeaturedStudents(data.items.map(mapStudent));
      } catch {
        if (!isMounted) return;
        setFeaturedStudents([]);
      } finally {
        if (isMounted) {
          setFeaturedLoading(false);
        }
      }
    }

    loadFeaturedLeaderboard();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadLeaderboard() {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');

      const params = new URLSearchParams({
        ordering,
        page: String(page),
        size: String(PAGE_SIZE),
      });

      if (search) params.set('search', search);
      if (minScore.trim()) params.set('min_score', minScore.trim());
      if (maxScore.trim()) params.set('max_score', maxScore.trim());

      try {
        const response = await fetchWithAuthRetry(
          `${API_BASE_URL}/api/v1/teacher/my/student/leaderboard?${params.toString()}`,
          { method: 'GET' },
        );

        if (!response.ok) {
          throw new Error(`Reytingni olishda xatolik: ${response.status}`);
        }

        const data: LeaderboardApiResponse = await response.json();
        if (!isMounted) return;

        const mappedStudents = data.items.map(mapStudent);
        setStudents((prev) => page === 1 ? mappedStudents : [...prev, ...mappedStudents]);
        setTotal(data.total);
        setPages(Math.max(data.pages, 1));
      } catch (err) {
        if (!isMounted) return;
        if (page === 1) {
          setStudents([]);
        }
        setTotal(0);
        setPages(1);
        setError(err instanceof Error ? err.message : "Reytingni yuklab bo'lmadi");
      } finally {
        if (isMounted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, [page, reloadKey, search, minScore, maxScore, ordering]);

  useEffect(() => {
    const node = listContainerRef.current;
    if (!node) return;

    const handleScroll = () => {
      if (loading || loadingMore || page >= pages) return;

      const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
      if (remaining < 120) {
        setPage((prev) => Math.min(prev + 1, pages));
      }
    };

    node.addEventListener('scroll', handleScroll);
    return () => node.removeEventListener('scroll', handleScroll);
  }, [loading, loadingMore, page, pages, students.length]);

  useEffect(() => {
    const node = listContainerRef.current;
    if (!node || loading || loadingMore || page >= pages || students.length === 0) return;

    if (node.scrollHeight <= node.clientHeight + 24) {
      setPage((prev) => Math.min(prev + 1, pages));
    }
  }, [students.length, loading, loadingMore, page, pages]);

  const top3 = featuredStudents.slice(0, 3);
  const summary = useMemo(() => {
    if (featuredStudents.length === 0) return { avg: 0, totalTests: 0, active: 0 };
    return {
      avg: Number((featuredStudents.reduce((sum, student) => sum + student.avgScore, 0) / featuredStudents.length).toFixed(1)),
      totalTests: featuredStudents.reduce((sum, student) => sum + student.testsCompleted, 0),
      active: featuredStudents.filter((student) => student.status === 'active').length,
    };
  }, [featuredStudents]);

  return (
    <>
      <style>{`
        .leaderboard-table-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${scrollThumb} ${scrollTrack};
        }

        .leaderboard-table-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .leaderboard-table-scroll::-webkit-scrollbar-track {
          background: ${scrollTrack};
          border-radius: 999px;
        }

        .leaderboard-table-scroll::-webkit-scrollbar-thumb {
          background: ${scrollThumb};
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .leaderboard-table-scroll::-webkit-scrollbar-thumb:hover {
          background: ${scrollThumbHover};
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .leaderboard-table-scroll::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>Reyting</h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMuted }}>
          Ball va faollik bo'yicha eng yaxshi o'quvchilar
        </p>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-5 sm:mb-6">
        {[top3[1], top3[0], top3[2]].map((s, podiumIdx) => {
          if (!s) {
            return (
              <div
                key={`placeholder-${podiumIdx}`}
                className="h-28 sm:h-36 rounded-2xl"
                style={{
                  background: t.bgCard,
                  border: `1px solid ${t.border}`,
                  boxShadow: t.shadowCard,
                  opacity: featuredLoading ? 0.8 : 0.35,
                }}
              />
            );
          }
          const displayRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
          const sc = scoreColor(s.avgScore);
          const avatarColor = AVATAR_COLORS[s.id % AVATAR_COLORS.length];
          const heights = ['h-28 sm:h-36', 'h-36 sm:h-44', 'h-24 sm:h-32'];
          const podiumColors = [
            { bg: t.isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.2)' },
            { bg: t.isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.3)' },
            { bg: t.isDark ? 'rgba(180,83,9,0.1)' : 'rgba(180,83,9,0.06)', border: 'rgba(180,83,9,0.25)' },
          ];
          const pc = podiumColors[podiumIdx];
          return (
            <div
              key={s.id}
              className={`${heights[podiumIdx]} flex flex-col items-center justify-end rounded-2xl px-2 pb-4 pt-3 cursor-pointer transition-all`}
              style={{ background: pc.bg, border: `1px solid ${pc.border}`, boxShadow: t.shadowCard }}
              onClick={() => navigate(`/students/${s.id}`)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-sm sm:text-base font-bold text-white mb-2 shrink-0 overflow-hidden"
                style={{ background: avatarColor, border: `3px solid ${avatarColor}55`, boxShadow: `0 4px 12px ${avatarColor}44` }}>
                {s.profileImage ? (
                  <img src={s.profileImage} alt={s.name} className="w-full h-full object-cover rounded-full" />
                ) : s.initials}
              </div>
              <p className="text-xs font-semibold text-center truncate w-full" style={{ color: t.textPrimary }}>{s.name.split(' ')[0]}</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg mt-1.5"
                style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                {s.avgScore}%
              </span>
              <div className="mt-2 flex items-center justify-center">
                {displayRank === 1 && <Crown className="w-4 h-4" style={{ color: '#F59E0B' }} />}
                {displayRank === 2 && <Medal className="w-4 h-4" style={{ color: '#94A3B8' }} />}
                {displayRank === 3 && <Medal className="w-4 h-4" style={{ color: '#B45309' }} />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 sm:mb-6">
        {[
          { icon: Target, label: "O'rtacha ball", value: `${summary.avg}%`, tone: '#0F766E' },
          { icon: ClipboardCheck, label: 'Jami testlar', value: `${summary.totalTests} ta`, tone: '#2563EB' },
          { icon: TrendingUp, label: 'Faol o‘quvchi', value: `${summary.active} ta`, tone: '#D97706' },
        ].map((item) => {
          const Icon = item.icon;
          const iconBackground = t.isDark ? `${item.tone}22` : `${item.tone}14`;
          const iconBorder = t.isDark ? `${item.tone}40` : `${item.tone}30`;
          return (
            <div
              key={item.label}
              className="rounded-2xl p-4"
              style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: iconBackground,
                    border: `1px solid ${iconBorder}`,
                    boxShadow: t.isDark
                      ? `inset 0 1px 0 rgba(255,255,255,0.04)`
                      : `inset 0 1px 0 rgba(255,255,255,0.72)`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: item.tone }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>{item.label}</p>
                  <p className="text-lg font-bold mt-1" style={{ color: t.textPrimary }}>{item.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}>
        <div
          className="flex flex-col lg:flex-row gap-3 px-4 sm:px-5 py-4"
          style={{ borderBottom: `1px solid ${t.border}`, background: t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)' }}
        >
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: t.textMuted }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ism yoki username bo'yicha qidiring..."
              className="w-full h-10 rounded-xl pl-10 pr-10 text-sm outline-none"
              style={{
                background: t.bgInner,
                border: `1px solid ${t.border}`,
                color: t.textPrimary,
                boxShadow: t.isDark ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'inset 0 1px 0 rgba(255,255,255,0.65)',
              }}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: t.bgCard, color: t.textMuted, border: `1px solid ${t.border}` }}
              >
                <X className="w-3 h-3" strokeWidth={2.25} />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="number"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="Min ball"
              className="h-10 rounded-xl px-3 text-sm outline-none"
              style={{
                background: t.bgInner,
                border: `1px solid ${t.border}`,
                color: t.textPrimary,
                width: '120px',
                boxShadow: t.isDark ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'inset 0 1px 0 rgba(255,255,255,0.65)',
              }}
            />
            <input
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              placeholder="Max ball"
              className="h-10 rounded-xl px-3 text-sm outline-none"
              style={{
                background: t.bgInner,
                border: `1px solid ${t.border}`,
                color: t.textPrimary,
                width: '120px',
                boxShadow: t.isDark ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'inset 0 1px 0 rgba(255,255,255,0.65)',
              }}
            />
            <div className="relative">
              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                className="appearance-none h-10 rounded-xl pl-3 pr-8 text-sm outline-none"
                style={{
                  background: t.bgInner,
                  border: `1px solid ${t.border}`,
                  color: t.textPrimary,
                  minWidth: '160px',
                  boxShadow: t.isDark ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'inset 0 1px 0 rgba(255,255,255,0.65)',
                }}
              >
                {ORDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: t.textMuted }}
              />
            </div>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden sm:grid grid-cols-12 items-center px-5 py-3"
          style={{
            borderBottom: `1px solid ${t.border}`,
            background: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(148,163,184,0.08)',
          }}>
          {['#', "O'quvchi", 'Grupa', 'Ball', 'Test', 'Streak', 'Faollik'].map((h, i) => (
            <div key={i}
              className={`text-xs font-semibold uppercase tracking-wider ${i === 0 ? 'col-span-1' :
                i === 1 ? 'col-span-4' :
                  i === 2 ? 'col-span-2' :
                    i === 6 ? 'col-span-2' :
                      'col-span-1'
                }`}
              style={{ color: t.textSecondary }}>
              {h}
            </div>
          ))}
        </div>

        <div
          ref={listContainerRef}
          className="leaderboard-table-scroll max-h-[520px] overflow-y-auto"
        >
          {loading && page === 1 ? (
            <div className="px-4 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                <div className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin"
                  style={{ color: '#6366F1' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>Studentlar yuklanmoqda</p>
            </div>
          ) : error ? (
            <div className="px-4 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <X className="w-6 h-6" style={{ color: '#EF4444' }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>Student jadvali yuklanmadi</p>
              <p className="text-xs mb-4" style={{ color: t.textMuted }}>{error}</p>
              <button
                onClick={() => setReloadKey((prev) => prev + 1)}
                className="px-4 h-10 rounded-xl text-sm font-semibold"
                style={{
                  background: t.accentMuted,
                  border: `1px solid ${t.accentBorder}`,
                  color: t.accent,
                }}
              >
                Qayta urinish
              </button>
            </div>
          ) : students.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>Studentlar topilmadi</p>
              <p className="text-xs" style={{ color: t.textMuted }}>Qidiruv yoki filterlarni o'zgartiring</p>
            </div>
          ) : (
            <>
              {/* All rows */}
              {students.map((s, idx) => {
                const rank = idx + 1;
                const sc = scoreColor(s.avgScore);
                const avatarColor = AVATAR_COLORS[s.id % AVATAR_COLORS.length];
                const isTop3 = rank <= 3;
                return (
                  <div key={s.id}>
                    {/* Desktop row */}
                    <div
                      className="hidden sm:grid grid-cols-12 items-center px-5 py-3.5 transition-colors cursor-pointer"
                      style={{
                        borderBottom: idx < students.length - 1 ? `1px solid ${t.border}` : 'none',
                        background: isTop3 ? (t.isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.035)') : 'transparent',
                      }}
                      onClick={() => navigate(`/students/${s.id}`)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isTop3 ? (t.isDark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.02)') : 'transparent'; }}
                    >
                      <div className="col-span-1"><RankBadge rank={rank} /></div>
                      <div className="col-span-4 flex items-center gap-3 pr-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                          style={{ background: avatarColor }}>
                          {s.profileImage ? (
                            <img src={s.profileImage} alt={s.name} className="w-full h-full object-cover rounded-full" />
                          ) : s.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tracking-[0.01em]" style={{ color: t.textPrimary }}>{s.name}</p>
                          <span className="text-xs truncate block mt-1" style={{ color: t.textSecondary }}>@{s.username}</span>
                        </div>
                      </div>
                      <div className="col-span-2 min-w-0 pr-3">
                        <GroupNamesDropdown groups={s.groups} t={t} />
                      </div>
                      <div className="col-span-1 pr-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {s.avgScore}%
                        </span>
                      </div>
                      <div className="col-span-1 pr-2">
                        <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{s.testsCompleted} ta</span>
                      </div>
                      <div className="col-span-1 pr-2">
                        {s.streak > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg"
                            style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
                            🔥 {s.streak} kun
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: t.textMuted }}>—</span>
                        )}
                      </div>
                      <div className="col-span-2 flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4" style={{ color: isTop3 ? '#F59E0B' : t.border }} strokeWidth={isTop3 ? 2 : 1.5} fill={isTop3 ? '#F59E0B' : 'none'} />
                          <span className="text-[11px] font-medium" style={{ color: t.textSecondary }}>
                            {isTop3 ? "Top o'quvchi" : 'Reytingda'}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium" style={{ color: t.textSecondary }}>{s.lastActivity}</span>
                      </div>
                    </div>

                    {/* Mobile row */}
                    <div
                      className="flex sm:hidden items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors"
                      style={{
                        borderBottom: idx < students.length - 1 ? `1px solid ${t.border}` : 'none',
                        background: isTop3 ? (t.isDark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.03)') : 'transparent',
                      }}
                      onClick={() => navigate(`/students/${s.id}`)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isTop3 ? (t.isDark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.03)') : 'transparent'; }}
                    >
                      <div className="w-8 shrink-0 flex items-center justify-center">
                        {rank <= 3
                          ? <RankBadge rank={rank} />
                          : <span className="text-sm font-bold" style={{ color: t.textMuted }}>{rank}</span>}
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                        style={{ background: avatarColor }}>
                        {s.profileImage ? (
                          <img src={s.profileImage} alt={s.name} className="w-full h-full object-cover rounded-full" />
                        ) : s.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{s.name}</p>
                        <span className="text-xs truncate block mt-1" style={{ color: t.textSecondary }}>{s.username}</span>
                        <div className="mt-1">
                          <GroupNamesDropdown groups={s.groups} t={t} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg inline-flex"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {s.avgScore}%
                        </span>
                        <p className="text-[11px] mt-1 font-medium" style={{ color: t.textSecondary }}>{s.lastActivity}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          {loadingMore && (
            <div className="px-4 sm:px-5 py-4 text-center text-xs" style={{ color: t.textMuted }}>
              Yana yuklanmoqda...
            </div>
          )}

          {!loadingMore && page >= pages && students.length > 0 && (
            <div className="px-4 sm:px-5 py-4 text-center text-xs" style={{ color: t.textMuted }}>
              Barcha o'quvchilar ko'rsatildi
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs"
          style={{ borderTop: `1px solid ${t.border}`, background: t.bgInner, color: t.textMuted }}
        >
          <span>Jami {total} ta o'quvchi</span>
          <span>{students.length} tasi yuklandi</span>
        </div>
      </div>
    </>
  );
}

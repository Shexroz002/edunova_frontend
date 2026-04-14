import { useEffect, useRef, useState } from 'react';
import {
  TrendingUp, TrendingDown, Users, FileText,
  Target, AlertTriangle, BarChart2, BookOpen,
  Zap, ChevronRight, Search, Filter, Clock, User,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// ─────────────────────────────────────────────
//  Data
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' };
}

interface OverviewCardApiItem {
  value: number;
  change_percent: number;
  trend: 'up' | 'down' | 'warning';
  label: string;
  sub_label: string | null;
}

interface OverviewResponse {
  average_score: OverviewCardApiItem;
  completed_tests: OverviewCardApiItem;
  active_students: OverviewCardApiItem;
  weak_topics: OverviewCardApiItem;
}

interface GroupStatsApiItem {
  rank: number;
  group_id: number;
  group_name: string;
  student_count: number;
  tests_count: number;
  average_score: number;
  progress_percent: number;
  performance_level: 'high' | 'medium' | 'low';
  performance_color: 'green' | 'amber' | 'red' | string;
}

interface GroupStatsResponse {
  items: GroupStatsApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface WeakTopicApiItem {
  rank: number;
  topic_name: string;
  subject_name: string;
  wrong_count: number;
  average_percent: number;
  progress_percent: number;
  severity: 'critical' | 'warning' | 'normal';
  color: 'red' | 'amber' | 'green' | string;
}

interface WeakTopicsResponse {
  items: WeakTopicApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface LowRatedStudentApiItem {
  student_id: number;
  full_name: string;
  username: string;
  group_names: string[];
  profile_image: string | null;
  average_score: number;
  tests_count: number;
  last_activity: string | null;
  performance_color: 'red' | 'amber' | 'green' | string;
}

interface LowRatedStudentsResponse {
  items: LowRatedStudentApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface GroupShortApiItem {
  id: number;
  name: string;
}

interface GroupShortResponse {
  items: GroupShortApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
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
      throw new Error('Sessiya tugagan. Qayta kiring');
    }

    response = await makeRequest(token);
  }

  return response;
}

// ─────────────────────────────────────────────
//  Card
// ─────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { theme: t } = useTheme();
  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ElementType }) {
  const { theme: t } = useTheme();
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{subtitle}</p>}
      </div>
      {Icon && (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
          <Icon className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Summary KPI cards
// ─────────────────────────────────────────────
function SummaryCards() {
  const { theme: t } = useTheme();
  const [overview, setOverview] = useState<OverviewResponse>({
    average_score: {
      value: 74,
      change_percent: 3,
      trend: 'up',
      label: "O'rtacha ball",
      sub_label: null,
    },
    completed_tests: {
      value: 68,
      change_percent: 12,
      trend: 'up',
      label: 'Yakunlangan testlar',
      sub_label: null,
    },
    active_students: {
      value: 89,
      change_percent: 72,
      trend: 'up',
      label: "Faol o'quvchilar",
      sub_label: null,
    },
    weak_topics: {
      value: 8,
      change_percent: 0,
      trend: 'warning',
      label: 'Zaif mavzular',
      sub_label: 'Diqqat talab etadi',
    },
  });

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      try {
        const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/statistic/overview`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Overview olinmadi: ${response.status}`);
        }

        const data: OverviewResponse = await response.json();
        if (!isMounted) return;
        setOverview(data);
      } catch {
        if (!isMounted) return;
      }
    }

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const items = [
    {
      Icon: Target,
      label: overview.average_score.label,
      value: `${overview.average_score.value}%`,
      sub: overview.average_score.sub_label ?? `${overview.average_score.change_percent}% o'tgan haftaga nisbatan`,
      color: '#6366F1',
      bg: 'rgba(99,102,241,0.08)',
      border: 'rgba(99,102,241,0.2)',
      trend: overview.average_score.trend,
    },
    {
      Icon: FileText,
      label: overview.completed_tests.label,
      value: `${overview.completed_tests.value}`,
      sub: overview.completed_tests.sub_label ?? `${overview.completed_tests.change_percent}% o'tgan haftaga nisbatan`,
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.08)',
      border: 'rgba(59,130,246,0.2)',
      trend: overview.completed_tests.trend,
    },
    {
      Icon: Users,
      label: overview.active_students.label,
      value: `${overview.active_students.value}`,
      sub: overview.active_students.sub_label ?? `${overview.active_students.change_percent}% o'tgan haftaga nisbatan`,
      color: '#22C55E',
      bg: 'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.2)',
      trend: overview.active_students.trend,
    },
    {
      Icon: AlertTriangle,
      label: overview.weak_topics.label,
      value: `${overview.weak_topics.value}`,
      sub: overview.weak_topics.sub_label ?? `${overview.weak_topics.change_percent}% o'tgan haftaga nisbatan`,
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.2)',
      trend: overview.weak_topics.trend,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
      {items.map(({ Icon, label, value, sub, color, bg, border, trend }) => {
        const isUp = trend === 'up';
        const isWarning = trend === 'warning';

        return (
          <Card key={label}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.75} />
              </div>
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg"
                style={{
                  background: isUp ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
                  color: isUp ? '#22C55E' : '#F59E0B',
                  border: `1px solid ${isUp ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}
              >
                {isUp ? <TrendingUp className="w-3 h-3" strokeWidth={2} /> : isWarning ? <AlertTriangle className="w-3 h-3" strokeWidth={2} /> : <TrendingDown className="w-3 h-3" strokeWidth={2} />}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: t.textPrimary }}>{value}</p>
            <p className="text-xs mt-0.5 leading-snug" style={{ color: t.textMuted }}>{label}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: isUp ? '#22C55E' : '#F59E0B' }}>{sub}</p>
          </Card>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Group Performance — leaderboard style
// ─────────────────────────────────────────────
function GroupPerformanceCard() {
  const { theme: t } = useTheme();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [groups, setGroups] = useState<GroupStatsApiItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPerformanceStyles = (item: GroupStatsApiItem) => {
    if (item.performance_color === 'green') {
      return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' };
    }
    if (item.performance_color === 'amber') {
      return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
    }
    return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' };
  };

  useEffect(() => {
    let cancelled = false;

    async function loadInitialGroups() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/statistic/groups?page=1&size=6`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Guruhlar statistikasi olinmadi: ${response.status}`);
        }

        const data: GroupStatsResponse = await response.json();
        if (cancelled) return;

        setGroups(data.items);
        setTotal(data.total);
        setPage(data.page);
        setPages(data.pages);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Guruhlar statistikasi olinmadi");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleScroll = async () => {
    const node = scrollRef.current;
    if (!node || loading || loadingMore || page >= pages) return;

    const threshold = 48;
    const reachedBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - threshold;
    if (!reachedBottom) return;

    try {
      setLoadingMore(true);
      setError(null);

      const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/statistic/groups?page=${page + 1}&size=6`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Guruhlar statistikasi olinmadi: ${response.status}`);
      }

      const data: GroupStatsResponse = await response.json();

      setGroups((current) => {
        const seen = new Set(current.map((item) => item.group_id));
        const nextItems = data.items.filter((item) => !seen.has(item.group_id));
        return [...current, ...nextItems];
      });
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guruhlar statistikasi olinmadi");
    } finally {
      setLoadingMore(false);
    }
  };

  const averageGroupScore = groups.length > 0
    ? Math.round(groups.reduce((sum, group) => sum + group.average_score, 0) / groups.length)
    : 0;
  const topGroupScore = groups[0]?.average_score ?? 0;

  return (
    <Card>
      <CardHeader title="Grupalar bo'yicha natijalar" subtitle="Guruhlar reytingi va statistikasi" icon={Users} />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: `${t.border} transparent`,
        }}
      >
        {loading ? (
          <div className="py-10 text-sm text-center" style={{ color: t.textMuted }}>
            Guruhlar statistikasi yuklanmoqda...
          </div>
        ) : groups.map((g) => {
          const sc = getPerformanceStyles(g);
          const rank = g.rank;
          const isTop3 = rank <= 3;
          const rankColors = ['#FBBF24', '#D1D5DB', '#CD7F32'];
          const rankColor = isTop3 ? rankColors[rank - 1] : t.textMuted;
          const rankBg = isTop3 ? `${rankColors[rank - 1]}20` : t.bgInner;

          return (
            <div
              key={g.group_id}
              className="p-3.5 rounded-xl transition-all duration-200"
              style={{
                background: t.bgInner,
                border: `1px solid ${isTop3 ? `${rankColor}40` : t.border}`,
                boxShadow: isTop3 ? `0 0 0 1px ${rankColor}15` : 'none',
              }}
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: rankBg,
                    border: `1.5px solid ${rankColor}${isTop3 ? '50' : '30'}`,
                  }}
                >
                  <span className="text-sm font-bold" style={{ color: rankColor }}>
                    {rank}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate" style={{ color: t.textPrimary }}>
                    {g.group_name}
                  </h4>
                  <p className="text-xs" style={{ color: t.textSecondary }}>
                    {g.student_count} o'quvchi · {g.tests_count} test
                  </p>
                </div>

                <div
                  className="px-3 py-1.5 rounded-lg shrink-0"
                  style={{
                    background: sc.bg,
                    border: `1px solid ${sc.border}`,
                  }}
                >
                  <span className="text-sm font-bold" style={{ color: sc.color }}>
                    {g.average_score}%
                  </span>
                </div>
              </div>

              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${g.progress_percent}%`,
                    background: `linear-gradient(90deg, ${sc.color}, ${sc.color}dd)`,
                    boxShadow: t.isDark ? `0 0 8px ${sc.color}40` : 'none',
                  }}
                />
              </div>
            </div>
          );
        })}

        {!loading && groups.length === 0 && (
          <div className="py-10 text-sm text-center" style={{ color: t.textMuted }}>
            Guruhlar topilmadi
          </div>
        )}

        {loadingMore && (
          <div className="py-3 text-xs text-center" style={{ color: t.textMuted }}>
            Yana yuklanmoqda...
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-3 px-3.5 py-3 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {error}
        </div>
      )}

      {/*<div className="mt-4 pt-4 flex flex-wrap gap-4" style={{ borderTop: `1px solid ${t.border}` }}>*/}
      {/*  <div>*/}
      {/*    <p className="text-xs" style={{ color: t.textMuted }}>Jami guruhlar</p>*/}
      {/*    <p className="text-lg font-bold" style={{ color: t.textPrimary }}>{total}</p>*/}
      {/*  </div>*/}
      {/*  <div>*/}
      {/*    <p className="text-xs" style={{ color: t.textMuted }}>Eng yuqori</p>*/}
      {/*    <p className="text-lg font-bold" style={{ color: '#22C55E' }}>{topGroupScore}%</p>*/}
      {/*  </div>*/}
      {/*  <div>*/}
      {/*    <p className="text-xs" style={{ color: t.textMuted }}>O'rtacha</p>*/}
      {/*    <p className="text-lg font-bold" style={{ color: '#6366F1' }}>*/}
      {/*      {averageGroupScore}%*/}
      {/*    </p>*/}
      {/*  </div>*/}
      {/*</div>*/}
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Topic Weakness — horizontal bar list
// ─────────────────────────────────────────────
function TopicWeaknessCard() {
  const { theme: t } = useTheme();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [topics, setTopics] = useState<WeakTopicApiItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTopicStyles = (item: WeakTopicApiItem) => {
    if (item.severity === 'critical' || item.color === 'red') {
      return { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' };
    }
    if (item.severity === 'warning' || item.color === 'amber') {
      return { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' };
    }
    return { color: '#6366F1', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.15)' };
  };

  useEffect(() => {
    let cancelled = false;

    async function loadInitialTopics() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/statistic/week-topics?page=1&size=6`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Zaif mavzular olinmadi: ${response.status}`);
        }

        const data: WeakTopicsResponse = await response.json();
        if (cancelled) return;

        setTopics(data.items);
        setPage(data.page);
        setPages(data.pages);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Zaif mavzular olinmadi");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialTopics();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleScroll = async () => {
    const node = scrollRef.current;
    if (!node || loading || loadingMore || page >= pages) return;

    const threshold = 48;
    const reachedBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - threshold;
    if (!reachedBottom) return;

    try {
      setLoadingMore(true);
      setError(null);

      const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/statistic/week-topics?page=${page + 1}&size=6`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Zaif mavzular olinmadi: ${response.status}`);
      }

      const data: WeakTopicsResponse = await response.json();

      setTopics((current) => {
        const seen = new Set(current.map((item) => `${item.topic_name}-${item.subject_name}`));
        const nextItems = data.items.filter((item) => !seen.has(`${item.topic_name}-${item.subject_name}`));
        return [...current, ...nextItems];
      });
      setPage(data.page);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zaif mavzular olinmadi");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Zaif mavzular"
        subtitle="O'quvchilar ko'p xato qilgan mavzular"
        icon={AlertTriangle}
      />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="space-y-3 max-h-[420px] overflow-y-auto pr-1"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: `${t.border} transparent`,
        }}
      >
        {loading ? (
          <div className="py-10 text-sm text-center" style={{ color: t.textMuted }}>
            Zaif mavzular yuklanmoqda...
          </div>
        ) : topics.map((item) => {
          const styles = getTopicStyles(item);
          const isTop = item.rank === 1;

          return (
            <div
              key={`${item.topic_name}-${item.subject_name}-${item.rank}`}
              className="p-3 rounded-xl transition-all duration-200 group"
              style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {isTop && (
                      <span
                        className="text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
                      >
                        #1
                      </span>
                    )}
                    <span className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                      {item.topic_name}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: t.textMuted }}>{item.subject_name}</span>
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0"
                  style={{ background: `${styles.color}18`, color: styles.color, border: `1px solid ${styles.color}35` }}
                >
                  {item.wrong_count} xato
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs" style={{ color: t.textMuted }}>
                  O'zlashtirish darajasi
                </span>
                <span className="text-xs font-semibold" style={{ color: styles.color }}>
                  {item.progress_percent}%
                </span>
              </div>

              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${item.progress_percent}%`, background: styles.color }}
                />
              </div>
            </div>
          );
        })}

        {!loading && topics.length === 0 && (
          <div className="py-10 text-sm text-center" style={{ color: t.textMuted }}>
            Zaif mavzular topilmadi
          </div>
        )}

        {loadingMore && (
          <div className="py-3 text-xs text-center" style={{ color: t.textMuted }}>
            Yana yuklanmoqda...
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-3 px-3.5 py-3 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {error}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Low Rated Students — table with search & filter
// ─────────────────────────────────────────────
function LowRatedStudentsCard() {
  const { theme: t } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [students, setStudents] = useState<LowRatedStudentApiItem[]>([]);
  const [groups, setGroups] = useState<GroupShortApiItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format last activity
  const formatLastActivity = (dateStr: string | null) => {
    if (!dateStr) return 'Faollik yo‘q';

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'Faollik yo‘q';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} daqiqa oldin`;
    if (diffHours < 24) return `${diffHours} soat oldin`;
    if (diffDays === 1) return 'Kecha';
    return `${diffDays} kun oldin`;
  };

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      try {
        const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/group/short?page=1&size=8`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Guruhlar olinmadi: ${response.status}`);
        }

        const data: GroupShortResponse = await response.json();
        if (!cancelled) {
          setGroups(data.items);
        }
      } catch {
        if (!cancelled) {
          setGroups([]);
        }
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedGroup]);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: String(page),
          size: '8',
        });

        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }

        if (selectedGroup !== 'all') {
          params.set('group_id', selectedGroup);
        }

        const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/statistic/week-students?${params.toString()}`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`O'quvchilar statistikasi olinmadi: ${response.status}`);
        }

        const data: LowRatedStudentsResponse = await response.json();
        if (cancelled) return;

        setStudents(data.items);
        setTotal(data.total);
        setPage(data.page);
        setPages(data.pages);
      } catch (err) {
        if (cancelled) return;
        setStudents([]);
        setTotal(0);
        setPages(1);
        setError(err instanceof Error ? err.message : "O'quvchilar statistikasi olinmadi");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [searchQuery, selectedGroup, page]);

  return (
    <Card>
      <CardHeader
        title="Rating past o'quvchilar"
        subtitle="Yaxshilash talab etiladi"
        icon={AlertTriangle}
      />

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: t.textMuted }}
            strokeWidth={1.75}
          />
          <input
            type="text"
            placeholder="Ism yoki familiya bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none"
            style={{
              background: t.bgInner,
              border: `1px solid ${t.border}`,
              color: t.textPrimary,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = t.accent;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${t.accent}15`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = t.border;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Group Filter */}
        <div className="relative">
          <Filter
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: t.textMuted }}
            strokeWidth={1.75}
          />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="pl-10 pr-8 py-2.5 rounded-xl text-sm transition-all outline-none appearance-none cursor-pointer"
            style={{
              background: t.bgInner,
              border: `1px solid ${t.border}`,
              color: t.textPrimary,
              minWidth: 160,
            }}
          >
            <option value="all">Barcha guruhlar</option>
            {groups.map((group) => (
              <option key={group.id} value={String(group.id)}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#DC2626' }}
        >
          {error}
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
              {['O\'quvchi', 'Username', 'Guruh', 'O\'rtacha ball', 'Testlar', 'Faollik'].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: t.textMuted }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-sm text-center" style={{ color: t.textMuted }}>
                  O'quvchilar statistikasi yuklanmoqda...
                </td>
              </tr>
            ) : students.map((student, idx) => {
              const sc = scoreColor(student.average_score);
              const listIndex = (page - 1) * 8 + idx + 1;
              return (
                <tr
                  key={student.student_id}
                  className="transition-colors cursor-pointer"
                  style={{ borderBottom: idx < students.length - 1 ? `1px solid ${t.border}` : 'none' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-6 text-xs font-semibold text-center shrink-0"
                        style={{ color: t.textMuted }}
                      >
                        {listIndex}
                      </span>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: 'rgba(99,102,241,0.1)',
                          border: `1px solid rgba(99,102,241,0.2)`,
                          overflow: 'hidden',
                        }}
                      >
                        {student.profile_image ? (
                          <img src={student.profile_image} alt={student.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
                        )}
                      </div>
                      <span className="text-sm font-medium" style={{ color: t.textPrimary }}>
                        {student.full_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
                      @{student.username}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {student.group_names.map((group) => (
                        <span
                          key={group}
                          className="inline-block text-xs font-medium px-2 py-0.5 rounded-md"
                          style={{
                            background: 'rgba(99,102,241,0.1)',
                            color: '#6366F1',
                            border: `1px solid rgba(99,102,241,0.2)`,
                          }}
                        >
                          {group}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                    >
                      {student.average_score}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm" style={{ color: t.textSecondary }}>{student.tests_count} ta</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" style={{ color: t.textMuted }} strokeWidth={1.75} />
                      <span className="text-xs" style={{ color: t.textSecondary }}>
                        {formatLastActivity(student.last_activity)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div
            className="rounded-2xl px-4 py-10 text-sm text-center"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
          >
            O'quvchilar statistikasi yuklanmoqda...
          </div>
        ) : students.map((student, idx) => {
          const sc = scoreColor(student.average_score);
          const listIndex = (page - 1) * 8 + idx + 1;
          return (
            <div
              key={student.student_id}
              className="p-3.5 rounded-xl transition-all"
              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span
                    className="w-6 text-xs font-semibold text-center shrink-0"
                    style={{ color: t.textMuted }}
                  >
                    {listIndex}
                  </span>
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: 'rgba(99,102,241,0.1)',
                      border: `1px solid rgba(99,102,241,0.2)`,
                      overflow: 'hidden',
                    }}
                  >
                    {student.profile_image ? (
                      <img src={student.profile_image} alt={student.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                      {student.full_name}
                    </h4>
                    <p className="text-xs" style={{ color: t.textSecondary }}>@{student.username}</p>
                  </div>
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0"
                  style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                >
                  {student.average_score}%
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {student.group_names.map((group) => (
                  <span
                    key={group}
                    className="text-xs font-medium px-2 py-0.5 rounded-md"
                    style={{
                      background: 'rgba(99,102,241,0.1)',
                      color: '#6366F1',
                      border: `1px solid rgba(99,102,241,0.2)`,
                    }}
                  >
                    {group}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span style={{ color: t.textMuted }}>{student.tests_count} ta test</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" style={{ color: t.textMuted }} strokeWidth={1.75} />
                  <span style={{ color: t.textSecondary }}>{formatLastActivity(student.last_activity)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {!loading && students.length === 0 && (
        <div className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: t.textMuted }} strokeWidth={1.5} />
          <p className="text-sm font-medium" style={{ color: t.textPrimary }}>
            Natija topilmadi
          </p>
          <p className="text-xs mt-1" style={{ color: t.textMuted }}>
            Qidiruv yoki filtr shartiga mos o'quvchi yo'q
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs sm:text-sm" style={{ color: t.textMuted }}>
          {total > 0 ? `${total} ta o'quvchidan ${page}-sahifa` : "O'quvchilar topilmadi"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textPrimary }}
          >
            Oldingi
          </button>
          <div
            className="px-3 py-2 rounded-xl text-sm min-w-[92px] text-center"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textSecondary }}
          >
            {page} / {pages}
          </div>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pages, current + 1))}
            disabled={page >= pages || loading}
            className="px-3 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textPrimary }}
          >
            Keyingi
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export function AnalyticsPage() {
  const { theme: t } = useTheme();

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.25)' }}
          >
            <BarChart2 className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
            Tahlil
          </h1>
        </div>
        <p className="text-xs sm:text-sm mt-1 ml-12" style={{ color: t.textMuted }}>
          Sinf natijalarini kuzating va o'quv zaifliklarini aniqlang.
        </p>
      </div>

      {/* ── Summary KPI cards ── */}
      <SummaryCards />

      {/* ── Charts row: Group Performance + Topic Weakness ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
        <GroupPerformanceCard />
        <TopicWeaknessCard />
      </div>

      {/* ── Low Rated Students Table (full width) ── */}
      <LowRatedStudentsCard />
    </>
  );
}

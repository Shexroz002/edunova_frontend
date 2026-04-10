import { useEffect, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router';
import { StatsCard } from '../../components/StatsCard';
import { StudentActivityChart, type StudentActivityChartItem } from '../../components/StudentActivityChart';
import { useTheme } from '../../components/ThemeContext';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';
import { CreateSessionModal } from './LivePage';
import { CreateQuizModal } from './QuizzesPage';
import { Users, ClipboardCheck, BarChart3, Activity, Flame, BookOpen, Plus, Link2, ChevronRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

interface MeResponse {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string | null;
  profile_image: string | null;
}

interface DashboardProfile {
  firstName: string;
  fullName: string;
  roleLabel: string;
  profileImage: string | null;
}

interface StatisticCardApiItem {
  value: number;
  change_percent: number;
  trend: 'up' | 'down';
  label: string;
}

interface StatisticCardsResponse {
  total_students: StatisticCardApiItem;
  completed_tests_this_week: StatisticCardApiItem;
  average_score_this_week: StatisticCardApiItem;
  active_students_this_week: StatisticCardApiItem;
}

interface ActivityChartApiItem {
  day_key: string;
  date: string;
  submitted_tests: number;
  average_score: number;
  participated_students: number;
}

interface ActivityChartResponse {
  trend_percent: number;
  trend_label: string;
  items: ActivityChartApiItem[];
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

function buildDashboardProfile(data: MeResponse): DashboardProfile {
  const firstName = data.first_name?.trim() || data.username || 'Ustoz';
  const lastName = data.last_name?.trim() || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    firstName,
    fullName,
    roleLabel: data.role === 'teacher' ? "O'qituvchi" : 'Foydalanuvchi',
    profileImage: data.profile_image ?? null,
  };
}

const defaultStatsCards: StatisticCardsResponse = {
  total_students: {
    value: 42,
    change_percent: 8,
    trend: 'up',
    label: "Jami o'quvchilar",
  },
  completed_tests_this_week: {
    value: 67,
    change_percent: 12,
    trend: 'up',
    label: 'Bu hafta yakunlangan testlar',
  },
  average_score_this_week: {
    value: 71,
    change_percent: 3,
    trend: 'down',
    label: "O'rtacha ball",
  },
  active_students_this_week: {
    value: 19,
    change_percent: 5,
    trend: 'up',
    label: "Faol o'quvchilar",
  },
};

const defaultActivityChart: ActivityChartResponse = {
  trend_percent: 12,
  trend_label: 'bu hafta',
  items: [
    { day_key: 'Du', date: '2026-04-06', submitted_tests: 45, average_score: 68, participated_students: 0 },
    { day_key: 'Se', date: '2026-04-07', submitted_tests: 52, average_score: 72, participated_students: 0 },
    { day_key: 'Ch', date: '2026-04-08', submitted_tests: 38, average_score: 65, participated_students: 0 },
    { day_key: 'Pa', date: '2026-04-09', submitted_tests: 67, average_score: 78, participated_students: 0 },
    { day_key: 'Ju', date: '2026-04-10', submitted_tests: 58, average_score: 74, participated_students: 0 },
    { day_key: 'Sh', date: '2026-04-11', submitted_tests: 42, average_score: 70, participated_students: 0 },
    { day_key: 'Ya', date: '2026-04-12', submitted_tests: 35, average_score: 61, participated_students: 0 },
  ],
};

interface ActionCardProps {
  title: string;
  description: string;
  icon: ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  onClick: () => void;
}

function ActionCard({ title, description, icon: Icon, color, bgColor, borderColor, onClick }: ActionCardProps) {
  const { theme: t } = useTheme();

  return (
      <button
          onClick={onClick}
          className="w-full p-4 rounded-xl transition-all duration-200 text-left group"
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowCard,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = t.isDark
                ? '0 8px 24px rgba(0,0,0,0.4)'
                : '0 8px 24px rgba(0,0,0,0.08)';
            e.currentTarget.style.borderColor = borderColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = t.shadowCard;
            e.currentTarget.style.borderColor = t.border;
          }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: bgColor,
                border: `1.5px solid ${borderColor}`,
              }}
          >
            <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold mb-1" style={{ color: t.textPrimary }}>
              {title}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: t.textSecondary }}>
              {description}
            </p>
          </div>
          <ChevronRight
              className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
              style={{ color: t.textMuted }}
              strokeWidth={1.75}
          />
        </div>
      </button>
  );
}

export function DashboardPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [profile, setProfile] = useState<DashboardProfile>({
    firstName: 'Ustoz',
    fullName: 'Ustoz',
    roleLabel: "O'qituvchi",
    profileImage: null,
  });
  const [statsCards, setStatsCards] = useState<StatisticCardsResponse>(defaultStatsCards);
  const [activityChart, setActivityChart] = useState<ActivityChartResponse>(defaultActivityChart);

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

        setProfile(buildDashboardProfile(data));
      } catch {
        if (!isMounted) return;
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardStats() {
      try {
        const [cardsResponse, activityResponse] = await Promise.all([
          fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/statistic/card`, {
            method: 'GET',
          }),
          fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/statistic/activity-chart`, {
            method: 'GET',
          }),
        ]);

        if (!cardsResponse.ok) {
          throw new Error(`Kartalar statistikasi olinmadi: ${cardsResponse.status}`);
        }

        if (!activityResponse.ok) {
          throw new Error(`Faollik grafigi olinmadi: ${activityResponse.status}`);
        }

        const [cardsData, activityData] = await Promise.all([
          cardsResponse.json() as Promise<StatisticCardsResponse>,
          activityResponse.json() as Promise<ActivityChartResponse>,
        ]);

        if (!isMounted) return;

        setStatsCards(cardsData);
        setActivityChart(activityData);
      } catch {
        if (!isMounted) return;
      }
    }

    loadDashboardStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const chartItems: StudentActivityChartItem[] = activityChart.items.map((item) => ({
    day: item.day_key,
    tests: item.submitted_tests,
    avg: item.average_score,
    participants: item.participated_students,
  }));

  return (
      <>
        {/* Welcome Banner */}
        {t.isDark ? (
            <div
                className="relative overflow-hidden rounded-2xl p-4 sm:p-7 mb-5 sm:mb-7"
                style={{
                  background: 'linear-gradient(135deg, #4C1D95 0%, #6366F1 55%, #3B82F6 100%)',
                  boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
                }}
            >
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20 pointer-events-none"
                   style={{ background: 'radial-gradient(circle, #A5B4FC, transparent)' }} />
              <div className="absolute -bottom-8 right-32 w-32 h-32 rounded-full opacity-15 pointer-events-none"
                   style={{ background: 'radial-gradient(circle, #60A5FA, transparent)' }} />

              <div className="relative">
                <div className="flex items-start gap-4">
                  <div
                      className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    {profile.profileImage ? (
                        <img
                            src={profile.profileImage}
                            alt={profile.fullName}
                            className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
                        />
                    ) : (
                        <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-white">Xush kelibsiz, {profile.firstName}! 👋</h2>
                    <p className="text-white/80 text-sm mt-1">
                      O'quvchilaringizning o'rtacha rivojlanishi{' '}
                      <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded-lg">73%</span>
                    </p>
                    <p className="text-white/60 text-xs mt-1.5 hidden sm:block">
                      O'quvchilaringizni rivojlantiring va o'qituvchi reytingingizni oshiring!
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 mt-4 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                       style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <Flame className="w-4 h-4 text-orange-300" />
                    <div>
                      <p className="text-xs text-white/60">Ketma-ketlik</p>
                      <p className="text-sm font-bold text-white">12 kun</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                       style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <Users className="w-4 h-4 text-blue-300" />
                    <div>
                      <p className="text-xs text-white/60">Onlayn o'quvchilar</p>
                      <p className="text-sm font-bold text-white">8 faol</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        ) : (
            <div
                className="relative overflow-hidden rounded-2xl p-4 sm:p-7 mb-5 sm:mb-7"
                style={{
                  background: t.bgCard,
                  border: `1px solid ${t.border}`,
                  boxShadow: t.shadowCard,
                }}
            >
              <div
                  className="absolute left-0 top-4 bottom-4 sm:top-6 sm:bottom-6 w-1 rounded-r-full"
                  style={{ background: 'linear-gradient(180deg, #6366F1, #4F46E5)' }}
              />
              <div className="pl-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.2)' }}
                  >
                    {profile.profileImage ? (
                        <img
                            src={profile.profileImage}
                            alt={profile.fullName}
                            className="w-full h-full object-cover rounded-xl"
                        />
                    ) : (
                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#6366F1' }} strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold" style={{ color: t.textPrimary }}>
                      Xayrli tong, {profile.firstName}
                    </h2>
                    <p className="text-sm mt-0.5" style={{ color: t.textSecondary }}>
                      O'quvchilaringizning o'rtacha rivojlanishi{' '}
                      <span className="font-bold px-1.5 py-0.5 rounded-md"
                            style={{ color: '#6366F1', background: 'rgba(99,102,241,0.08)' }}>
                    73%
                  </span>{' '}
                      bu hafta.
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: t.textMuted }}>
                      Dushanba, 16 mart, 2026 · {profile.roleLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                       style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Flame className="w-4 h-4" style={{ color: '#F59E0B' }} strokeWidth={1.75} />
                    <div>
                      <p className="text-xs" style={{ color: t.textMuted }}>Dars ketma-ketligi</p>
                      <p className="text-sm font-bold" style={{ color: t.textPrimary }}>12 kun</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                       style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <Users className="w-4 h-4" style={{ color: '#22C55E' }} strokeWidth={1.75} />
                    <div>
                      <p className="text-xs" style={{ color: t.textMuted }}>Onlayn o'quvchilar</p>
                      <p className="text-sm font-bold" style={{ color: t.textPrimary }}>8 faol</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-4 sm:mb-5">
          <StatsCard
              title={statsCards.total_students.label}
              value={statsCards.total_students.value}
              icon={Users}
              trend={`${statsCards.total_students.change_percent}%`}
              trendUp={statsCards.total_students.trend === 'up'}
              statKey="indigo"
          />
          <StatsCard
              title={statsCards.completed_tests_this_week.label}
              value={statsCards.completed_tests_this_week.value}
              icon={ClipboardCheck}
              trend={`${statsCards.completed_tests_this_week.change_percent}%`}
              trendUp={statsCards.completed_tests_this_week.trend === 'up'}
              statKey="green"
          />
          <StatsCard
              title={statsCards.average_score_this_week.label}
              value={`${statsCards.average_score_this_week.value}%`}
              icon={BarChart3}
              trend={`${statsCards.average_score_this_week.change_percent}%`}
              trendUp={statsCards.average_score_this_week.trend === 'up'}
              statKey="amber"
          />
          <StatsCard
              title={statsCards.active_students_this_week.label}
              value={statsCards.active_students_this_week.value}
              icon={Activity}
              trend={`${statsCards.active_students_this_week.change_percent}%`}
              trendUp={statsCards.active_students_this_week.trend === 'up'}
              statKey="blue"
          />
        </div>

        {/* Action Cards + Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-4 sm:mb-5">
          {/* Action Cards - First on mobile */}
          <div className="space-y-4 lg:order-2">
            <ActionCard
                title="Test yaratish"
                description="Yangi test yarating va o'quvchilaringizga ulashing"
                icon={Plus}
                color="#6366F1"
                bgColor="rgba(99,102,241,0.08)"
                borderColor="rgba(99,102,241,0.2)"
                onClick={() => setCreateModalOpen(true)}
            />
            <ActionCard
                title="Test biriktirish"
                description="Mavjud testni guruhga yoki o'quvchiga biriktiring"
                icon={Link2}
                color="#22C55E"
                bgColor="rgba(34,197,94,0.08)"
                borderColor="rgba(34,197,94,0.2)"
                onClick={() => setSessionModalOpen(true)}
            />
          </div>

          {/* Student Activity Chart - Second on mobile */}
          <div className="lg:col-span-2 lg:order-1">
            <StudentActivityChart
                data={chartItems}
                trendPercent={activityChart.trend_percent}
                trendLabel={activityChart.trend_label}
            />
          </div>
        </div>

        <CreateQuizModal
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onCreate={() => {
              setCreateModalOpen(false);
              navigate('/quizzes');
            }}
            onPdfCreated={(quizId) => {
              setCreateModalOpen(false);
              navigate(`/quizzes/${quizId}`);
            }}
        />

        <CreateSessionModal
            open={sessionModalOpen}
            onClose={() => setSessionModalOpen(false)}
        />
      </>
  );
}

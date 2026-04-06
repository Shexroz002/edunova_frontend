import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../components/ThemeContext';
import { TrendingUp, CheckCircle2, Zap, Clock, Target } from 'lucide-react';
import { AIRecommendations } from '../../components/AIRecommendations';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.myedunova.uz';

const weekDays = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sha', 'Ya'];
const weekActivity = [4, 7, 3, 8, 5, 2, 6];
const maxActivity = Math.max(...weekActivity);

const DEFAULT_SUBJECT_STATS = [
  { name: 'Matematika', correct: 75, wrong: 25, color: '#818CF8' },
  { name: 'Fizika', correct: 60, wrong: 40, color: '#38BDF8' },
  { name: "Ona tili", correct: 42, wrong: 58, color: '#34D399' },
  { name: 'Ingliz tili', correct: 88, wrong: 12, color: '#FBBF24' },
];

interface SubjectAnalyticsItem {
  subject_name: string | null;
  correct_answer: number | null;
  wrong_answer: number | null;
  total_answer: number | null;
  percentage: number | null;
  first_attempt_date: string | null;
  last_attempt_date: string | null;
}

interface OverallCardsResponse {
  total_quiz_session: number | null;
  correct_answer: number | null;
  average: string | null;
}

interface RecommendationSection {
  title: string | null;
  icon: string | null;
  text: string | null;
}

interface RecommendationResponse {
  title: string | null;
  badge: string | null;
  subtitle: string | null;
  strong_sides: RecommendationSection | null;
  improvement: RecommendationSection | null;
  next_goal: RecommendationSection | null;
}

interface SubjectUiStat {
  name: string;
  correct: number;
  wrong: number;
  color: string;
}

interface RecommendationUiState {
  title: string;
  badge: string;
  subtitle: string;
  insights: Array<{
    insight_id: string;
    type: 'strength' | 'weakness' | 'goal';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    created_at: Date;
  }>;
}

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function parseNumber(value: string | number | null | undefined, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function getSubjectColor(subject: string) {
  switch (subject.toLowerCase()) {
    case 'mathematics':
    case 'matematika':
      return '#818CF8';
    case 'physics':
    case 'fizika':
      return '#38BDF8';
    case 'chemistry':
    case 'kimyo':
      return '#34D399';
    case 'english':
    case 'ingliz tili':
      return '#FBBF24';
    case 'biology':
    case 'biologiya':
      return '#A78BFA';
    default:
      return '#94A3B8';
  }
}

function formatSubjectName(subject: string | null | undefined) {
  const value = normalizeText(subject, "Noma'lum fan");
  switch (value.toLowerCase()) {
    case 'mathematics':
      return 'Matematika';
    case 'physics':
      return 'Fizika';
    case 'chemistry':
      return 'Kimyo';
    case 'biology':
      return 'Biologiya';
    case 'english':
      return 'Ingliz tili';
    default:
      return value;
  }
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

async function fetchSubjectsAnalytics() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/quizzes/analytics/subjects`, { method: 'GET' });
  if (!response.ok) throw new Error(`Fanlar statistikasi olinmadi: ${response.status}`);
  return response.json() as Promise<SubjectAnalyticsItem[]>;
}

async function fetchOverallCards() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/quizzes/analytics/overall/cards`, { method: 'GET' });
  if (!response.ok) throw new Error(`Umumiy kartalar olinmadi: ${response.status}`);
  return response.json() as Promise<OverallCardsResponse>;
}

async function fetchRecommendation() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/quizzes/analytics/recommendation`, { method: 'GET' });
  if (!response.ok) throw new Error(`AI tavsiya olinmadi: ${response.status}`);
  return response.json() as Promise<RecommendationResponse>;
}

export function StudentStatisticsPage() {
  const { theme: t } = useTheme();
  const cardBase = { background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard };
  const [subjects, setSubjects] = useState<SubjectUiStat[]>(DEFAULT_SUBJECT_STATS);
  const [overallCards, setOverallCards] = useState<OverallCardsResponse>({
    total_quiz_session: 40,
    correct_answer: 0,
    average: '74',
  });
  const [recommendation, setRecommendation] = useState<RecommendationUiState>({
    title: 'AI Tavsiyasi',
    badge: 'Yangi',
    subtitle: "Sun'iy intellekt tahlili",
    insights: [],
  });

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      fetchSubjectsAnalytics(),
      fetchOverallCards(),
      fetchRecommendation(),
    ]).then(([subjectsResult, cardsResult, recommendationResult]) => {
      if (cancelled) return;

      if (subjectsResult.status === 'fulfilled') {
        const mapped = (Array.isArray(subjectsResult.value) ? subjectsResult.value : []).map((item) => {
          const correct = Math.max(0, Math.min(100, Math.round(parseNumber(item.percentage, 0))));
          return {
            name: formatSubjectName(item.subject_name),
            correct,
            wrong: Math.max(0, 100 - correct),
            color: getSubjectColor(normalizeText(item.subject_name)),
          };
        });

        if (mapped.length > 0) {
          setSubjects(mapped);
        }
      }

      if (cardsResult.status === 'fulfilled') {
        setOverallCards({
          total_quiz_session: cardsResult.value.total_quiz_session ?? 0,
          correct_answer: cardsResult.value.correct_answer ?? 0,
          average: normalizeText(cardsResult.value.average, '0'),
        });
      }

      if (recommendationResult.status === 'fulfilled') {
        const data = recommendationResult.value;
        setRecommendation({
          title: normalizeText(data.title, 'AI Tavsiyasi'),
          badge: normalizeText(data.badge, 'Yangi'),
          subtitle: normalizeText(data.subtitle, "Sun'iy intellekt tahlili"),
          insights: [
            {
              insight_id: 'strength',
              type: 'strength',
              title: normalizeText(data.strong_sides?.title, 'Kuchli tomonlaringiz'),
              description: normalizeText(data.strong_sides?.text, "Tavsif mavjud emas"),
              priority: 'high',
              created_at: new Date(),
            },
            {
              insight_id: 'weakness',
              type: 'weakness',
              title: normalizeText(data.improvement?.title, 'Yaxshilash kerak'),
              description: normalizeText(data.improvement?.text, "Tavsif mavjud emas"),
              priority: 'medium',
              created_at: new Date(),
            },
            {
              insight_id: 'goal',
              type: 'goal',
              title: normalizeText(data.next_goal?.title, 'Keyingi maqsad'),
              description: normalizeText(data.next_goal?.text, "Tavsif mavjud emas"),
              priority: 'low',
              created_at: new Date(),
            },
          ],
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const summaryCards = useMemo(() => ([
    {
      label: 'Jami testlar',
      value: String(overallCards.total_quiz_session ?? 0),
      icon: CheckCircle2,
      color: '#818CF8',
      bg: 'rgba(129,140,248,0.12)',
    },
    {
      label: "O'rtacha ball",
      value: `${Math.round(parseNumber(overallCards.average, 0))}%`,
      icon: Target,
      color: '#22C55E',
      bg: 'rgba(34,197,94,0.12)',
    },
    {
      label: "To'g'ri javoblar",
      value: String(overallCards.correct_answer ?? 0),
      icon: Clock,
      color: '#38BDF8',
      bg: 'rgba(56,189,248,0.12)',
    },
    {
      label: 'Jami XP',
      value: String((overallCards.total_quiz_session ?? 0) * 39),
      icon: Zap,
      color: '#FBBF24',
      bg: 'rgba(251,191,36,0.12)',
    },
  ]), [overallCards]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="font-bold text-xl" style={{ color: t.textPrimary }}>Statistika</h2>
        <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>O'z natijalaringizni kuzating</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {summaryCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl p-4" style={cardBase}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: stat.bg }}>
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <p className="font-bold text-lg" style={{ color: t.textPrimary }}>{stat.value}</p>
              <p className="text-xs" style={{ color: t.textMuted }}>{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Weekly activity chart */}
      <div className="rounded-2xl p-5 mb-4" style={cardBase}>
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} />
          <h3 className="font-bold text-sm" style={{ color: t.textPrimary }}>Haftalik faollik</h3>
        </div>
        <div className="flex items-end justify-between gap-2 h-32">
          {weekDays.map((day, i) => {
            const height = (weekActivity[i] / maxActivity) * 100;
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end rounded-t-lg overflow-hidden" style={{ height: '100px' }}>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${height}%`,
                      background: t.isDark
                        ? 'linear-gradient(180deg, #818CF8 0%, #6366F1 100%)'
                        : 'linear-gradient(180deg, #818CF8 0%, #6366F1 100%)',
                      boxShadow: t.isDark ? '0 0 8px rgba(99,102,241,0.4)' : 'none',
                    }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: t.textMuted }}>{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject accuracy */}
      <div className="rounded-2xl p-5 mb-4" style={cardBase}>
        <h3 className="font-bold text-sm mb-4" style={{ color: t.textPrimary }}>Fanlar bo'yicha natija</h3>
        <div className="space-y-4">
          {subjects.map((subj) => (
            <div key={subj.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{subj.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: '#22C55E' }}>✓ {subj.correct}%</span>
                  <span className="text-xs" style={{ color: '#EF4444' }}>✗ {subj.wrong}%</span>
                </div>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden" style={{ background: t.isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${subj.correct}%`,
                    background: `linear-gradient(90deg, ${subj.color}88, ${subj.color})`,
                    boxShadow: t.isDark ? `0 0 6px ${subj.color}44` : 'none',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <AIRecommendations
        title={recommendation.title}
        badge={recommendation.badge}
        subtitle={recommendation.subtitle}
        isNew={Boolean(recommendation.badge)}
        insights={recommendation.insights}
        onActionClick={(insightId) => {
          console.log('Action clicked for insight:', insightId);
          // Navigate to relevant page based on insight type
        }}
      />
    </div>
  );
}

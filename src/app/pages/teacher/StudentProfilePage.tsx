import type { CSSProperties, ReactNode, UIEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Mail, BookOpen, ClipboardCheck, Clock,
  TrendingUp, TrendingDown, AlertTriangle, Target,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { TestHistoryCard } from '../../components/TestHistoryCard';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const WEAK_TOPICS_PAGE_SIZE = 3;
const HISTORY_PAGE_SIZE = 4;
const UZBEKISTAN_TIME_ZONE = 'Asia/Tashkent';

type StudentStatus = 'active' | 'inactive';

interface FallbackStudent {
  id: number;
  name: string;
  initials: string;
  email: string;
  classGroup: string;
  avgScore: number;
  testsCompleted: number;
  lastActivity: string;
  status: StudentStatus;
}

interface StudentCardApiResponse {
  student_id: number;
  full_name: string;
  username: string;
  group_names: string[];
  average_score: number;
  total_tests: number;
  last_activity: string | null;
  profile_image: string | null;
  last_activity_label: string | null;
}

interface WeakTopicApiItem {
  subject_name: string;
  topic_name: string;
  average_percent: number;
  level: string;
}

interface WeakTopicsApiResponse {
  items: WeakTopicApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface SubjectStatApiItem {
  subject_name: string;
  average_percent: number;
}

interface SubjectsStatApiResponse {
  overall_percent: number;
  items: SubjectStatApiItem[];
}

interface HistoryApiItem {
  session_id: number;
  user_id: number;
  title: string;
  subject: string;
  rank: number | null;
  participant_count: number;
  correct_answers: number;
  wrong_answers: number;
  total_questions: number;
  finished_at: string | null;
  created_at: string | null;
}

interface HistoryApiResponse {
  items: HistoryApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface StudentProfileData {
  id: number;
  name: string;
  initials: string;
  email: string;
  classGroup: string;
  avgScore: number;
  testsCompleted: number;
  lastActivity: string;
  status: StudentStatus;
  profileImage: string | null;
}

interface SubjectPerformanceItem {
  subject: string;
  score: number;
}

interface WeakTopicItem {
  subjectName: string;
  topic: string;
  accuracy: number;
  level: string;
}

interface HistoryItem {
  sessionId: number;
  testName: string;
  subject: string;
  correctAnswers: number;
  incorrectAnswers: number;
  notAnswered: number;
  rank: number | null;
  totalQuestions: number;
  scorePercentage: number;
  date: string;
  time: string;
}

const ALL_STUDENTS: FallbackStudent[] = [
  { id: 1, name: 'Ali Karimov', initials: 'AK', email: 'ali.karimov@edu.uz', classGroup: '9-A', avgScore: 88, testsCompleted: 34, lastActivity: '2 soat oldin', status: 'active' },
  { id: 2, name: 'Malika Yusupova', initials: 'MY', email: 'malika.y@edu.uz', classGroup: '10-B', avgScore: 62, testsCompleted: 27, lastActivity: 'Kecha', status: 'active' },
  { id: 3, name: 'Jasur Toshmatov', initials: 'JT', email: 'jasur.t@edu.uz', classGroup: 'Fizika guruhi', avgScore: 45, testsCompleted: 19, lastActivity: '3 kun oldin', status: 'inactive' },
  { id: 4, name: 'Nilufar Rahimova', initials: 'NR', email: 'nilufar.r@edu.uz', classGroup: '9-A', avgScore: 91, testsCompleted: 41, lastActivity: '1 soat oldin', status: 'active' },
  { id: 5, name: 'Bobur Saidov', initials: 'BS', email: 'bobur.s@edu.uz', classGroup: '10-B', avgScore: 73, testsCompleted: 30, lastActivity: 'Kecha', status: 'active' },
  { id: 6, name: 'Zulfiya Norova', initials: 'ZN', email: 'zulfiya.n@edu.uz', classGroup: 'Fizika guruhi', avgScore: 38, testsCompleted: 14, lastActivity: '1 hafta oldin', status: 'inactive' },
  { id: 7, name: 'Sardor Mirzayev', initials: 'SM', email: 'sardor.m@edu.uz', classGroup: '9-A', avgScore: 79, testsCompleted: 36, lastActivity: '3 soat oldin', status: 'active' },
  { id: 8, name: 'Dildora Hasanova', initials: 'DH', email: 'dildora.h@edu.uz', classGroup: '10-B', avgScore: 55, testsCompleted: 22, lastActivity: '2 kun oldin', status: 'active' },
  { id: 9, name: 'Ulugbek Qodirov', initials: 'UQ', email: 'ulugbek.q@edu.uz', classGroup: 'Fizika guruhi', avgScore: 82, testsCompleted: 38, lastActivity: '30 daqiqa oldin', status: 'active' },
  { id: 10, name: 'Mohira Sultanova', initials: 'MS', email: 'mohira.s@edu.uz', classGroup: '9-A', avgScore: 67, testsCompleted: 25, lastActivity: 'Kecha', status: 'inactive' },
  { id: 11, name: 'Firdavs Nazarov', initials: 'FN', email: 'firdavs.n@edu.uz', classGroup: '10-B', avgScore: 94, testsCompleted: 45, lastActivity: '1 soat oldin', status: 'active' },
  { id: 12, name: 'Shahnoza Ergasheva', initials: 'SE', email: 'shahnoza.e@edu.uz', classGroup: 'Fizika guruhi', avgScore: 42, testsCompleted: 16, lastActivity: '5 kun oldin', status: 'inactive' },
];

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

function scoreColor(score: number) {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' };
}

function formatLastActivity(value: string | null | undefined) {
  if (!value) return "Noma'lum";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const nowInUzbekistan = new Date(new Date().toLocaleString('en-US', { timeZone: UZBEKISTAN_TIME_ZONE }));
  const dateInUzbekistan = new Date(date.toLocaleString('en-US', { timeZone: UZBEKISTAN_TIME_ZONE }));
  const diffMs = nowInUzbekistan.getTime() - dateInUzbekistan.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  const weeks = Math.floor(days / 7);

  if (minutes < 60) return `${minutes} daqiqa oldin`;
  if (hours < 24) return `${hours} soat oldin`;
  if (days === 1) return 'Kecha';
  if (days < 7) return `${days} kun oldin`;
  if (weeks <= 1) return '1 hafta oldin';
  return `${weeks} hafta oldin`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return { date: "Sana yo'q", time: '--:--' };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value, time: '--:--' };

  return {
    date: date.toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: UZBEKISTAN_TIME_ZONE,
    }),
    time: date.toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: UZBEKISTAN_TIME_ZONE,
    }),
  };
}

function getLevelPresentation(level: string, accuracy: number) {
  const normalized = level.trim().toLowerCase();

  if (normalized.includes('juda past')) {
    return {
      label: level || 'Juda past',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.08)',
      border: 'rgba(239,68,68,0.2)',
    };
  }

  if (normalized.includes('past')) {
    return {
      label: level || 'Past',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.2)',
    };
  }

  if (normalized.includes("o'rta") || normalized.includes('orta')) {
    return {
      label: level || "O'rta",
      color: '#F97316',
      bg: 'rgba(249,115,22,0.08)',
      border: 'rgba(249,115,22,0.2)',
    };
  }

  const fallbackColor = accuracy < 40 ? '#EF4444' : accuracy < 55 ? '#F59E0B' : '#F97316';
  return {
    label: level || "O'rta",
    color: fallbackColor,
    bg: fallbackColor === '#EF4444' ? 'rgba(239,68,68,0.08)' : fallbackColor === '#F59E0B' ? 'rgba(245,158,11,0.08)' : 'rgba(249,115,22,0.08)',
    border: fallbackColor === '#EF4444' ? 'rgba(239,68,68,0.2)' : fallbackColor === '#F59E0B' ? 'rgba(245,158,11,0.2)' : 'rgba(249,115,22,0.2)',
  };
}

function mapStudentCard(data: StudentCardApiResponse, fallback: FallbackStudent): StudentProfileData {
  const groups = Array.isArray(data.group_names)
    ? data.group_names.map((item) => item.trim()).filter(Boolean)
    : [];

  return {
    id: data.student_id,
    name: data.full_name || fallback.name,
    initials: getInitials(data.full_name || fallback.name),
    email: data.username || fallback.email,
    classGroup: groups.length > 0 ? groups.join(', ') : 'Grupa mavjud emas',
    avgScore: Number(data.average_score ?? fallback.avgScore),
    testsCompleted: data.total_tests ?? fallback.testsCompleted,
    lastActivity: formatLastActivity(data.last_activity_label ?? data.last_activity),
    status: fallback.status,
    profileImage: data.profile_image ?? null,
  };
}

function mapSubjects(items: SubjectStatApiItem[] | undefined) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    subject: item.subject_name || 'Fan',
    score: Math.max(0, Math.min(100, Number(item.average_percent ?? 0))),
  }));
}

function mapWeakTopic(item: WeakTopicApiItem): WeakTopicItem {
  return {
    subjectName: item.subject_name || 'Fan',
    topic: item.topic_name || 'Mavzu',
    accuracy: Math.max(0, Math.min(100, Number(item.average_percent ?? 0))),
    level: item.level || "O'rta daraja",
  };
}

function mapHistoryItem(item: HistoryApiItem): HistoryItem {
  const totalQuestions = Math.max(0, item.total_questions ?? 0);
  const correctAnswers = Math.max(0, item.correct_answers ?? 0);
  const incorrectAnswers = Math.max(0, item.wrong_answers ?? 0);
  const notAnswered = Math.max(0, totalQuestions - correctAnswers - incorrectAnswers);
  const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const { date, time } = formatDateTime(item.finished_at ?? item.created_at);

  return {
    sessionId: item.session_id,
    testName: item.title || "Noma'lum test",
    subject: item.subject || 'Fan',
    correctAnswers,
    incorrectAnswers,
    notAnswered,
    rank: item.rank,
    totalQuestions,
    scorePercentage,
    date,
    time,
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

async function fetchStudentCard(studentId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/my/student/${studentId}/card`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Talaba ma'lumoti olinmadi: ${response.status}`);
  }
  return response.json() as Promise<StudentCardApiResponse>;
}

async function fetchWeakTopicsPage(studentId: number, page: number, size: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/my/student/${studentId}/weak-topics?page=${page}&size=${size}`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Zaif mavzular olinmadi: ${response.status}`);
  }
  return response.json() as Promise<WeakTopicsApiResponse>;
}

async function fetchSubjectsStat(studentId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/my/student/${studentId}/subjects-stat`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Fan statistikasi olinmadi: ${response.status}`);
  }
  return response.json() as Promise<SubjectsStatApiResponse>;
}

async function fetchHistoryPage(studentId: number, page: number, size: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/my/student/${studentId}/history?page=${page}&size=${size}`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Test tarixi olinmadi: ${response.status}`);
  }
  return response.json() as Promise<HistoryApiResponse>;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
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

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme: t } = useTheme();
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold" style={{ color: t.textPrimary, letterSpacing: '0.01em' }}>
        {title}
      </h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{subtitle}</p>}
    </div>
  );
}

function SubjectChart({ data }: { data: SubjectPerformanceItem[] }) {
  const { theme: t } = useTheme();
  const max = 100;
  const chartHeight = 168;
  const chartTop = 18;
  const chartBottom = 56;
  const axisWidth = 34;
  const columns = Math.max(data.length, 1);
  const barWidthClass = data.length === 1 ? 'max-w-20' : data.length === 2 ? 'max-w-16' : 'max-w-14';

  return (
    <div className="relative" style={{ height: chartTop + chartHeight + chartBottom }}>
      {[0, 25, 50, 75, 100].map((pct) => (
        <div
          key={pct}
          className="absolute w-full flex items-center"
          style={{ bottom: chartBottom + (pct / max) * chartHeight }}
        >
          <span className="text-xs w-7 text-right mr-3 shrink-0 tabular-nums" style={{ color: t.textMuted }}>
            {pct}
          </span>
          <div
            className="flex-1 border-t"
            style={{
              borderColor: t.chartGrid,
              borderTopStyle: t.chartGridStyle,
              opacity: t.chartGridOpacity,
              borderTopWidth: pct === 0 ? 2 : 1,
            }}
          />
        </div>
      ))}

      <div
        className="absolute grid items-end gap-3"
        style={{
          bottom: chartBottom,
          top: chartTop,
          left: axisWidth + 6,
          right: 0,
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {data.map((item) => {
          const sc = scoreColor(item.score);
          const barHeight = (item.score / max) * chartHeight;
          return (
            <div key={item.subject} className="flex flex-col items-center h-full justify-end gap-2 min-w-0">
              <span
                className="px-2 py-1 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap"
                style={{
                  color: sc.color,
                  background: t.isDark ? `${sc.color}20` : `${sc.color}14`,
                  border: `1px solid ${sc.border}`,
                }}
              >
                {item.score}%
              </span>
              <div
                className={`rounded-t-[16px] transition-all duration-500 w-full ${barWidthClass}`}
                style={{
                  height: item.score > 0 ? Math.max(barHeight, 8) : 0,
                  background: `linear-gradient(180deg, ${sc.color}, ${sc.color}dd)`,
                  opacity: t.isDark ? 0.88 : 0.8,
                  minHeight: item.score > 0 ? 8 : 0,
                  boxShadow: t.isDark ? `0 0 12px ${sc.color}33` : `0 6px 14px ${sc.color}22`,
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        className="absolute pointer-events-none"
        style={{
          left: axisWidth + 6,
          right: 0,
          bottom: chartBottom - 1,
          borderTop: `1px solid ${t.isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.18)'}`,
        }}
      />

      <div
        className="absolute grid gap-3"
        style={{
          bottom: 0,
          left: axisWidth + 6,
          right: 0,
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {data.map((item) => (
          <div
            key={item.subject}
            className="min-w-0 text-center px-1"
            title={item.subject}
          >
            <span
              className="block text-[11px] sm:text-xs font-medium leading-tight break-words"
              style={{
                color: t.textMuted,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: 32,
              }}
            >
              {item.subject}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme: t } = useTheme();

  const parsedId = Number.parseInt(id || '1', 10);
  const studentId = Number.isFinite(parsedId) ? parsedId : 1;
  const fallbackStudent = useMemo(
    () => ALL_STUDENTS.find((item) => item.id === studentId) ?? ALL_STUDENTS[0],
    [studentId],
  );
  const avatarColor = AVATAR_COLORS[(studentId - 1 + AVATAR_COLORS.length) % AVATAR_COLORS.length];

  const [student, setStudent] = useState<StudentProfileData>({
    id: fallbackStudent.id,
    name: fallbackStudent.name,
    initials: fallbackStudent.initials,
    email: fallbackStudent.email,
    classGroup: fallbackStudent.classGroup,
    avgScore: fallbackStudent.avgScore,
    testsCompleted: fallbackStudent.testsCompleted,
    lastActivity: fallbackStudent.lastActivity,
    status: fallbackStudent.status,
    profileImage: null,
  });
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformanceItem[]>([]);
  const [overallPercent, setOverallPercent] = useState(fallbackStudent.avgScore);
  const [weakTopics, setWeakTopics] = useState<WeakTopicItem[]>([]);
  const [weakTopicsPage, setWeakTopicsPage] = useState(1);
  const [weakTopicsPages, setWeakTopicsPages] = useState(1);
  const [testHistory, setTestHistory] = useState<HistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingWeakTopics, setLoadingWeakTopics] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingMoreWeakTopics, setLoadingMoreWeakTopics] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [weakTopicsError, setWeakTopicsError] = useState('');
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    let cancelled = false;

    setStudent({
      id: fallbackStudent.id,
      name: fallbackStudent.name,
      initials: fallbackStudent.initials,
      email: fallbackStudent.email,
      classGroup: fallbackStudent.classGroup,
      avgScore: fallbackStudent.avgScore,
      testsCompleted: fallbackStudent.testsCompleted,
      lastActivity: fallbackStudent.lastActivity,
      status: fallbackStudent.status,
      profileImage: null,
    });
    setSubjectPerformance([]);
    setOverallPercent(fallbackStudent.avgScore);
    setWeakTopics([]);
    setWeakTopicsPage(1);
    setWeakTopicsPages(1);
    setTestHistory([]);
    setHistoryPage(1);
    setHistoryPages(1);
    setLoadingProfile(true);
    setLoadingWeakTopics(true);
    setLoadingHistory(true);
    setLoadingMoreWeakTopics(false);
    setLoadingMoreHistory(false);
    setProfileError('');
    setWeakTopicsError('');
    setHistoryError('');

    (async () => {
      const [cardResult, subjectsResult, weakTopicsResult, historyResult] = await Promise.allSettled([
        fetchStudentCard(studentId),
        fetchSubjectsStat(studentId),
        fetchWeakTopicsPage(studentId, 1, WEAK_TOPICS_PAGE_SIZE),
        fetchHistoryPage(studentId, 1, HISTORY_PAGE_SIZE),
      ]);

      if (cancelled) return;

      if (cardResult.status === 'fulfilled') {
        setStudent(mapStudentCard(cardResult.value, fallbackStudent));
      } else {
        setProfileError(cardResult.reason instanceof Error ? cardResult.reason.message : "Talaba ma'lumoti olinmadi");
      }

      if (subjectsResult.status === 'fulfilled') {
        setSubjectPerformance(mapSubjects(subjectsResult.value.items));
        setOverallPercent(Number(subjectsResult.value.overall_percent ?? fallbackStudent.avgScore));
      } else {
        setSubjectPerformance([]);
      }

      if (weakTopicsResult.status === 'fulfilled') {
        setWeakTopics((Array.isArray(weakTopicsResult.value.items) ? weakTopicsResult.value.items : []).map(mapWeakTopic));
        setWeakTopicsPage(weakTopicsResult.value.page ?? 1);
        setWeakTopicsPages(weakTopicsResult.value.pages ?? 1);
      } else {
        setWeakTopics([]);
        setWeakTopicsError(weakTopicsResult.reason instanceof Error ? weakTopicsResult.reason.message : "Zaif mavzular olinmadi");
      }

      if (historyResult.status === 'fulfilled') {
        setTestHistory((Array.isArray(historyResult.value.items) ? historyResult.value.items : []).map(mapHistoryItem));
        setHistoryPage(historyResult.value.page ?? 1);
        setHistoryPages(historyResult.value.pages ?? 1);
      } else {
        setTestHistory([]);
        setHistoryError(historyResult.reason instanceof Error ? historyResult.reason.message : "Test tarixi olinmadi");
      }

      setLoadingProfile(false);
      setLoadingWeakTopics(false);
      setLoadingHistory(false);
    })().catch((err: unknown) => {
      if (cancelled) return;
      const message = err instanceof Error ? err.message : "Ma'lumotlarni yuklab bo'lmadi";
      setProfileError(message);
      setWeakTopicsError(message);
      setHistoryError(message);
      setLoadingProfile(false);
      setLoadingWeakTopics(false);
      setLoadingHistory(false);
    });

    return () => {
      cancelled = true;
    };
  }, [fallbackStudent, studentId]);

  const loadMoreWeakTopics = useCallback(async () => {
    if (loadingWeakTopics || loadingMoreWeakTopics || weakTopicsPage >= weakTopicsPages) return;

    try {
      setLoadingMoreWeakTopics(true);
      const nextPage = weakTopicsPage + 1;
      const data = await fetchWeakTopicsPage(studentId, nextPage, WEAK_TOPICS_PAGE_SIZE);
      setWeakTopics((current) => [...current, ...(Array.isArray(data.items) ? data.items : []).map(mapWeakTopic)]);
      setWeakTopicsPage(data.page ?? nextPage);
      setWeakTopicsPages(data.pages ?? weakTopicsPages);
      setWeakTopicsError('');
    } catch (err) {
      setWeakTopicsError(err instanceof Error ? err.message : "Keyingi zaif mavzular olinmadi");
    } finally {
      setLoadingMoreWeakTopics(false);
    }
  }, [loadingMoreWeakTopics, loadingWeakTopics, studentId, weakTopicsPage, weakTopicsPages]);

  const loadMoreHistory = useCallback(async () => {
    if (loadingHistory || loadingMoreHistory || historyPage >= historyPages) return;

    try {
      setLoadingMoreHistory(true);
      const nextPage = historyPage + 1;
      const data = await fetchHistoryPage(studentId, nextPage, HISTORY_PAGE_SIZE);
      setTestHistory((current) => [...current, ...(Array.isArray(data.items) ? data.items : []).map(mapHistoryItem)]);
      setHistoryPage(data.page ?? nextPage);
      setHistoryPages(data.pages ?? historyPages);
      setHistoryError('');
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Keyingi test tarixi olinmadi");
    } finally {
      setLoadingMoreHistory(false);
    }
  }, [historyPage, historyPages, loadingHistory, loadingMoreHistory, studentId]);

  const onWeakTopicsScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 80) {
      void loadMoreWeakTopics();
    }
  }, [loadMoreWeakTopics]);

  const onHistoryScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 80) {
      void loadMoreHistory();
    }
  }, [loadMoreHistory]);

  const overallSc = scoreColor(overallPercent);
  const scrollAreaStyle: CSSProperties = {
    scrollbarWidth: 'thin',
    scrollbarColor: t.isDark
      ? 'rgba(129,140,248,0.55) rgba(255,255,255,0.06)'
      : 'rgba(99,102,241,0.4) rgba(15,23,42,0.08)',
  };
  const scrollAreaClassName = [
    'overflow-y-auto pr-2',
    '[scrollbar-gutter:stable]',
    '[&::-webkit-scrollbar]:w-2',
    '[&::-webkit-scrollbar-track]:rounded-full',
    '[&::-webkit-scrollbar-thumb]:rounded-full',
    '[&::-webkit-scrollbar-thumb]:border-[2px]',
    t.isDark
      ? '[&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:bg-indigo-300/45 [&::-webkit-scrollbar-thumb]:border-[#161A23] [&::-webkit-scrollbar-thumb:hover]:bg-indigo-300/60'
      : '[&::-webkit-scrollbar-track]:bg-slate-900/8 [&::-webkit-scrollbar-thumb]:bg-indigo-500/35 [&::-webkit-scrollbar-thumb]:border-white [&::-webkit-scrollbar-thumb:hover]:bg-indigo-500/50',
  ].join(' ');

  return (
    <>
      <div className="mb-5">
        <button
          onClick={() => navigate('/students')}
          className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl transition-all"
          style={{
            color: t.textSecondary,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowCard,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = t.accent;
            (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = t.textSecondary;
            (e.currentTarget as HTMLElement).style.borderColor = t.border;
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          O'quvchilar ro'yxati
        </button>
      </div>

      <Card className="mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${avatarColor}cc, ${avatarColor})`,
                boxShadow: t.isDark ? `0 0 32px ${avatarColor}44` : `0 4px 20px ${avatarColor}33`,
                border: `3px solid ${avatarColor}55`,
              }}
            >
              {student.profileImage ? (
                <img src={student.profileImage} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                student.initials
              )}
            </div>
            {student.status === 'active' && (
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{ background: '#22C55E', borderColor: t.bgCard }}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
                  {student.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }}
                  >
                    <BookOpen className="w-3 h-3" />
                    {student.classGroup}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: t.textSecondary }}>
                    <Mail className="w-3 h-3" />
                    {student.email}
                  </span>
                </div>
                {profileError && (
                  <p className="text-xs mt-2" style={{ color: '#F59E0B' }}>
                    {profileError}
                  </p>
                )}
              </div>

              {student.status === 'active' ? (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Faol
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: t.bgInner, color: t.textMuted, border: `1px solid ${t.border}` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: t.textMuted }} />
                  Nofaol
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: scoreColor(student.avgScore).bg, border: `1px solid ${scoreColor(student.avgScore).border}` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${scoreColor(student.avgScore).color}22` }}
                >
                  <Target className="w-4 h-4" style={{ color: scoreColor(student.avgScore).color }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>O'rtacha ball</p>
                  <p className="text-base font-bold" style={{ color: scoreColor(student.avgScore).color }}>{student.avgScore}%</p>
                </div>
              </div>

              <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <ClipboardCheck className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>Testlar</p>
                  <p className="text-base font-bold" style={{ color: t.textPrimary }}>{student.testsCompleted}</p>
                </div>
              </div>

              <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.bgButton }}>
                  <Clock className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>So'nggi faollik</p>
                  <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>{loadingProfile ? 'Yuklanmoqda...' : student.lastActivity}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
        <div>
          <Card className="h-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold" style={{ color: t.textPrimary, letterSpacing: '0.01em' }}>
                  Fanlar bo'yicha ko'rsatkich
                </h3>
                <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>O'rtacha ball, %</p>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{ background: overallSc.bg, border: `1px solid ${overallSc.border}` }}
              >
                {overallPercent >= 75
                  ? <TrendingUp className="w-3.5 h-3.5" style={{ color: overallSc.color }} />
                  : <TrendingDown className="w-3.5 h-3.5" style={{ color: overallSc.color }} />}
                <span className="text-xs font-semibold" style={{ color: overallSc.color }}>
                  Umumiy: {overallPercent}%
                </span>
              </div>
            </div>

            {subjectPerformance.length > 0 ? (
              <SubjectChart data={subjectPerformance} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: t.textMuted }}>
                {loadingProfile ? 'Yuklanmoqda...' : "Ko'rsatkich topilmadi"}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardTitle title="Zaif mavzular" subtitle="Yaxshilash talab etiladi" />

            <div
              className={`space-y-3 ${scrollAreaClassName}`}
              style={{ ...scrollAreaStyle, maxHeight: 320 }}
              onScroll={onWeakTopicsScroll}
            >
              {weakTopics.map((topic, idx) => {
                const levelPresentation = getLevelPresentation(topic.level, topic.accuracy);
                return (
                  <div key={`${topic.subjectName}-${topic.topic}-${idx}`} className="p-3.5 rounded-xl" style={{ background: levelPresentation.bg, border: `1px solid ${levelPresentation.border}` }}>
                    <p className="text-[11px] font-semibold mb-1" style={{ color: t.textMuted }}>
                      {topic.subjectName}
                    </p>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: levelPresentation.color }} strokeWidth={1.75} />
                        <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>{topic.topic}</span>
                      </div>
                      <span className="text-xs font-bold shrink-0" style={{ color: levelPresentation.color }}>{topic.accuracy}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${levelPresentation.color}22` }}>
                      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${topic.accuracy}%`, background: levelPresentation.color }} />
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: `${levelPresentation.color}cc` }}>{levelPresentation.label}</p>
                  </div>
                );
              })}

              {loadingWeakTopics && (
                <p className="text-sm" style={{ color: t.textMuted }}>
                  Yuklanmoqda...
                </p>
              )}
              {!loadingWeakTopics && weakTopics.length === 0 && (
                <p className="text-sm" style={{ color: t.textMuted }}>
                  Zaif mavzular topilmadi
                </p>
              )}
              {loadingMoreWeakTopics && (
                <p className="text-xs" style={{ color: t.textMuted }}>
                  Yana yuklanmoqda...
                </p>
              )}
            </div>

            {weakTopicsError && (
              <p className="text-xs mt-3" style={{ color: '#F59E0B' }}>
                {weakTopicsError}
              </p>
            )}

            <div
              className="p-3 rounded-xl mt-3"
              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
            >
              <p className="text-xs" style={{ color: t.textMuted }}>
                💡 Ushbu mavzularga qo'shimcha topshiriqlar bering.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <Card>
          <CardTitle title="Test tarixi" subtitle="So'nggi yakunlangan testlar" />

          <div
            className={`space-y-2.5 ${scrollAreaClassName}`}
            style={{ ...scrollAreaStyle, maxHeight: 420 }}
            onScroll={onHistoryScroll}
          >
            {testHistory.map((test) => (
              <TestHistoryCard
                key={test.sessionId}
                testName={test.testName}
                subject={test.subject}
                correctAnswers={test.correctAnswers}
                incorrectAnswers={test.incorrectAnswers}
                notAnswered={test.notAnswered}
                rank={test.rank}
                totalQuestions={test.totalQuestions}
                scorePercentage={test.scorePercentage}
                date={test.date}
                time={test.time}
              />
            ))}

            {loadingHistory && (
              <p className="text-sm" style={{ color: t.textMuted }}>
                Yuklanmoqda...
              </p>
            )}
            {!loadingHistory && testHistory.length === 0 && (
              <p className="text-sm" style={{ color: t.textMuted }}>
                Test tarixi topilmadi
              </p>
            )}
            {loadingMoreHistory && (
              <p className="text-xs" style={{ color: t.textMuted }}>
                Yana yuklanmoqda...
              </p>
            )}
          </div>

          {historyError && (
            <p className="text-xs mt-3" style={{ color: '#F59E0B' }}>
              {historyError}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

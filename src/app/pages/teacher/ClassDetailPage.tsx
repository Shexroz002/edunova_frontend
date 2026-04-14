import { useParams, useNavigate } from 'react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Users, ClipboardCheck, BarChart3,
  Clock, CheckCircle, AlertTriangle, Zap,
  FlaskConical, Leaf, Calculator, Eye,
  TrendingUp, TrendingDown, BookOpen, Award, Target, Crown, Medal, Search,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';
import { ALL_CLASSES } from './ClassesPage.tsx';
import type { ClassItem } from './ClassesPage.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

interface ClassDetailApi {
  id: number;
  name: string;
  subject_name: string;
  description: string;
  students_count: number;
  tests_count: number;
  average_score: number;
  last_activity: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  color: string | null;
  cover_image: string | null;
}

interface SessionApiItem {
  session_id: number;
  quiz_id: number;
  quiz_name: string;
  average_score: number;
  completed_students: number;
  total_students: number;
  session_date: string;
}

interface StudentPerformanceApiItem {
  student_id: number;
  full_name: string;
  profile_image: string | null;
  correct_answers: number;
  wrong_answers: number;
  tests_count: number;
  average_score: number;
}

interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface ApiEnvelope<T> {
  data: T;
}

type LeaderboardStudent = {
  studentId: number;
  initials: string;
  name: string;
  profileImage?: string | null;
  correct: number;
  incorrect: number;
  tests: number;
  avgScore: number;
};

type QuizCard = {
  sessionId: number;
  name: string;
  date: string;
  avgScore: number;
  submissions: number;
};

const DEFAULT_CLASS_ITEM: ClassItem = {
  id: 0,
  name: 'Noma\'lum sinf',
  subject: 'Fan',
  subjectIcon: 'calculator',
  color: '#6366F1',
  students: 0,
  quizzes: 0,
  lastActivity: 'Noma\'lum',
  activityLevel: 'low',
  avgScore: 0,
  description: 'Tavsif mavjud emas',
};

// ── Per-class mock detail data ─────────────────────────────────────────────────
function getClassDetails(cls: ClassItem) {
  const seed = cls.id * 13;
  const students = [
    { initials: 'NR', name: 'Nilufar Rahimova', correct: 145, incorrect: 28, tests: 12, avgScore: 85 },
    { initials: 'BS', name: 'Bobur Saidov', correct: 138, incorrect: 35, tests: 11, avgScore: 82 },
    { initials: 'AK', name: 'Ali Karimov', correct: 132, incorrect: 41, tests: 11, avgScore: 78 },
    { initials: 'MY', name: 'Malika Yusupova', correct: 125, incorrect: 48, tests: 10, avgScore: 74 },
    { initials: 'DS', name: 'Dilshod Sharipov', correct: 118, incorrect: 55, tests: 10, avgScore: 70 },
  ].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

  const quizzes = [
    { sessionId: cls.id * 1000 + 1, name: `${cls.subject} — 1-bo'lim testi`, date: '14 mart', avgScore: Math.min(98, 72 + seed % 20), submissions: Math.min(cls.students, 22 + seed % 8) },
    { sessionId: cls.id * 1000 + 2, name: `${cls.subject} — Amaliyot testi`, date: '10 mart', avgScore: Math.min(98, 65 + seed % 25), submissions: Math.min(cls.students, 18 + seed % 6) },
    { sessionId: cls.id * 1000 + 3, name: `${cls.subject} — Oraliq nazorat`, date: '5 mart', avgScore: Math.min(98, 78 + seed % 18), submissions: Math.min(cls.students, 25 + seed % 5) },
    { sessionId: cls.id * 1000 + 4, name: `${cls.subject} — Mustaqil topshiriq`, date: '1 mart', avgScore: Math.min(98, 60 + seed % 30), submissions: Math.min(cls.students, 15 + seed % 7) },
  ].slice(0, cls.quizzes > 4 ? 4 : Math.max(2, cls.quizzes));

  return { students, quizzes };
}

function unwrapApiData<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

function colorFromApi(value: string | null) {
  const map: Record<string, string> = {
    BLUE: '#3B82F6',
    GREEN: '#22C55E',
    YELLOW: '#F59E0B',
    RED: '#EF4444',
    PURPLE: '#8B5CF6',
    PINK: '#EC4899',
    ORANGE: '#F97316',
    TEAL: '#14B8A6',
    INDIGO: '#6366F1',
    CYAN: '#0891B2',
  };
  return value ? (map[value] ?? '#6366F1') : '#6366F1';
}

function subjectIconFromName(subjectName: string) {
  const value = subjectName.trim().toLowerCase();
  if (value.includes('fiz')) return 'zap';
  if (value.includes('kim')) return 'flask';
  if (value.includes('bio')) return 'leaf';
  return 'calculator';
}

function formatRelativeActivity(value: string | null) {
  if (!value) return 'Noma\'lum';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Noma\'lum';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  if (hours < 24) return `${hours} soat oldin`;
  if (days === 1) return 'Kecha';
  if (days < 7) return `${days} kun oldin`;
  return `${Math.floor(days / 7)} hafta oldin`;
}

function formatQuizDate(value: string | null | undefined) {
  if (!value) return 'Noma\'lum';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Noma\'lum';
  return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function resolveProfileImage(path: string | null) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = API_BASE_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

async function fetchWithAuthRetry(url: string, init: RequestInit = {}) {
  let token = await getValidAccessToken();
  if (!token) {
    throw new Error('Tizimga qayta kiring');
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

async function fetchClassDetailCard(classId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/group/${classId}/detail-card`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Class detailni olishda xatolik: ${response.status}`);
  }
  const raw = await response.json();
  return unwrapApiData<ClassDetailApi>(raw);
}

async function fetchSessionsPage(classId: number, page: number, size = 20) {
  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/teacher/group/${classId}/sessions?page=${page}&size=${size}`,
    { method: 'GET' },
  );
  if (!response.ok) {
    throw new Error(`Sessionlarni olishda xatolik: ${response.status}`);
  }
  const raw = await response.json();
  return unwrapApiData<PaginationResponse<SessionApiItem>>(raw);
}

async function fetchStudentsPerformancePageWithSearch(classId: number, page: number, size = 20, search = '') {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  const trimmed = search.trim();
  if (trimmed) {
    params.set('search', trimmed);
  }
  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/teacher/group/${classId}/students-performance?${params.toString()}`,
    { method: 'GET' },
  );
  if (!response.ok) {
    throw new Error(`O'quvchilar ko'rsatkichini olishda xatolik: ${response.status}`);
  }
  const raw = await response.json();
  return unwrapApiData<PaginationResponse<StudentPerformanceApiItem>>(raw);
}

function mapPerformanceStudent(s: StudentPerformanceApiItem): LeaderboardStudent {
  return {
    studentId: s.student_id ?? 0,
    initials: initialsFromName(s.full_name || ''),
    name: s.full_name || 'Noma\'lum',
    profileImage: resolveProfileImage(s.profile_image),
    correct: s.correct_answers ?? 0,
    incorrect: s.wrong_answers ?? 0,
    tests: s.tests_count ?? 0,
    avgScore: s.average_score ?? 0,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#6366F1', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444'];

function scoreColor(score: number) {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' };
}

function SubjectIcon({ type, color, size = 20 }: { type: string; color: string; size?: number }) {
  const props = { style: { color }, strokeWidth: 1.75, width: size, height: size };
  switch (type) {
    case 'zap': return <Zap {...props} />;
    case 'flask': return <FlaskConical {...props} />;
    case 'leaf': return <Leaf {...props} />;
    default: return <Calculator {...props} />;
  }
}

function ActivityIcon({ type, t }: { type: string; t: ReturnType<typeof useTheme>['theme'] }) {
  const map: Record<string, { Icon: React.ElementType; color: string }> = {
    check: { Icon: CheckCircle, color: '#22C55E' },
    zap: { Icon: Zap, color: '#6366F1' },
    book: { Icon: BookOpen, color: '#3B82F6' },
    award: { Icon: Award, color: '#F59E0B' },
    warn: { Icon: AlertTriangle, color: '#EF4444' },
  };
  const cfg = map[type] || map['check'];
  const Icon = cfg.Icon;
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: `${cfg.color}18`, border: `1.5px solid ${cfg.color}30` }}>
      <Icon className="w-4 h-4" style={{ color: cfg.color }} strokeWidth={1.75} />
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
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

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme: t } = useTheme();
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{subtitle}</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme: t } = useTheme();

  const classId = useMemo(() => {
    const parsed = Number.parseInt(id || '1', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [id]);

  const initialClass = useMemo(() => {
    return ALL_CLASSES.find((c) => c.id === classId) ?? ALL_CLASSES[0] ?? { ...DEFAULT_CLASS_ITEM, id: classId };
  }, [classId]);

  const initialDetails = useMemo(() => getClassDetails(initialClass), [initialClass]);

  const [cls, setCls] = useState<ClassItem>(initialClass);
  const [students, setStudents] = useState<LeaderboardStudent[]>(initialDetails.students);
  const [performanceStudents, setPerformanceStudents] = useState<LeaderboardStudent[]>(initialDetails.students);
  const [quizzes, setQuizzes] = useState<QuizCard[]>([]);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsPages, setSessionsPages] = useState(1);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsPages, setStudentsPages] = useState(1);
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);
  const [loadingMoreStudents, setLoadingMoreStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setCls(initialClass);
    setStudents(initialDetails.students);
    setPerformanceStudents(initialDetails.students);
    setQuizzes([]);
    setSessionsPage(1);
    setSessionsPages(1);
    setStudentsPage(1);
    setStudentsPages(1);
  }, [initialClass, initialDetails]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const [detail, sessionsData, performanceData] = await Promise.all([
          fetchClassDetailCard(classId),
          fetchSessionsPage(classId, 1, 20),
          fetchStudentsPerformancePageWithSearch(classId, 1, 20, ''),
        ]);

        if (!isMounted) return;

        const mappedClass: ClassItem = {
          id: detail.id ?? classId,
          name: detail.name || initialClass.name || DEFAULT_CLASS_ITEM.name,
          subject: detail.subject_name || initialClass.subject || DEFAULT_CLASS_ITEM.subject,
          subjectIcon: subjectIconFromName(detail.subject_name || initialClass.subject || DEFAULT_CLASS_ITEM.subject),
          color: colorFromApi(detail.color) || initialClass.color || DEFAULT_CLASS_ITEM.color,
          students: detail.students_count ?? initialClass.students ?? 0,
          quizzes: detail.tests_count ?? initialClass.quizzes ?? 0,
          lastActivity: formatRelativeActivity(detail.last_activity) || initialClass.lastActivity || DEFAULT_CLASS_ITEM.lastActivity,
          activityLevel: detail.status === 'ACTIVE' ? 'active' : 'low',
          avgScore: detail.average_score ?? initialClass.avgScore ?? 0,
          description: detail.description || initialClass.description || DEFAULT_CLASS_ITEM.description,
          coverImage: detail.cover_image ?? initialClass.coverImage,
        };

        const mappedStudents: LeaderboardStudent[] = (performanceData.items ?? []).map(mapPerformanceStudent).sort((a, b) => b.avgScore - a.avgScore);

        const mappedQuizzes: QuizCard[] = (sessionsData.items ?? []).map((q) => ({
          sessionId: q.session_id ?? 0,
          name: q.quiz_name || 'Noma\'lum test',
          date: formatQuizDate(q.session_date),
          avgScore: q.average_score ?? 0,
          submissions: q.completed_students ?? 0,
        }));

        setCls(mappedClass);
        if (mappedStudents.length > 0) {
          setStudents(mappedStudents);
          setPerformanceStudents(mappedStudents);
        } else {
          setStudents(initialDetails.students);
          setPerformanceStudents(initialDetails.students);
        }
        setQuizzes(mappedQuizzes);
        setSessionsPage(sessionsData.page ?? 1);
        setSessionsPages(sessionsData.pages ?? 1);
        setStudentsPage(performanceData.page ?? 1);
        setStudentsPages(performanceData.pages ?? 1);
      } catch {
        // Keep defaults if API request fails.
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [classId, initialClass, initialDetails]);

  const loadMoreSessions = useCallback(async () => {
    if (loadingMoreSessions || sessionsPage >= sessionsPages) return;
    try {
      setLoadingMoreSessions(true);
      const nextPage = sessionsPage + 1;
      const nextData = await fetchSessionsPage(classId, nextPage, 20);
      const mapped: QuizCard[] = (nextData.items ?? []).map((q) => ({
        sessionId: q.session_id ?? 0,
        name: q.quiz_name || 'Noma\'lum test',
        date: formatQuizDate(q.session_date),
        avgScore: q.average_score ?? 0,
        submissions: q.completed_students ?? 0,
      }));
      setQuizzes((prev) => {
        const merged = [...prev, ...mapped];
        const seen = new Set<number>();
        return merged.filter((item) => {
          if (seen.has(item.sessionId)) return false;
          seen.add(item.sessionId);
          return true;
        });
      });
      setSessionsPage(nextData.page ?? nextPage);
      setSessionsPages(nextData.pages ?? sessionsPages);
    } catch {
      // noop
    } finally {
      setLoadingMoreSessions(false);
    }
  }, [classId, loadingMoreSessions, sessionsPage, sessionsPages]);

  const loadMoreStudents = useCallback(async () => {
    if (loadingMoreStudents || studentsPage >= studentsPages) return;
    try {
      setLoadingMoreStudents(true);
      const nextPage = studentsPage + 1;
      const nextData = await fetchStudentsPerformancePageWithSearch(classId, nextPage, 20, searchQuery);
      const mapped: LeaderboardStudent[] = (nextData.items ?? []).map(mapPerformanceStudent);
      setPerformanceStudents((prev) => {
        const merged = [...prev, ...mapped];
        const seen = new Set<number>();
        return merged
          .filter((item) => {
            if (seen.has(item.studentId)) return false;
            seen.add(item.studentId);
            return true;
          })
          .sort((a, b) => b.avgScore - a.avgScore);
      });
      if (!searchQuery.trim()) {
        setStudents((prev) => {
          const merged = [...prev, ...mapped];
          const seen = new Set<number>();
          return merged
            .filter((item) => {
              if (seen.has(item.studentId)) return false;
              seen.add(item.studentId);
              return true;
            })
            .sort((a, b) => b.avgScore - a.avgScore);
        });
      }
      setStudentsPage(nextData.page ?? nextPage);
      setStudentsPages(nextData.pages ?? studentsPages);
    } catch {
      // noop
    } finally {
      setLoadingMoreStudents(false);
    }
  }, [classId, loadingMoreStudents, searchQuery, studentsPage, studentsPages]);

  const overallSc = scoreColor(cls.avgScore);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await fetchStudentsPerformancePageWithSearch(classId, 1, 20, searchQuery);
        if (!isMounted) return;
        const mapped = (data.items ?? []).map(mapPerformanceStudent).sort((a, b) => b.avgScore - a.avgScore);
        setPerformanceStudents(mapped);
        setStudentsPage(data.page ?? 1);
        setStudentsPages(data.pages ?? 1);
      } catch {
        // keep previous list
      }
    }, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [classId, searchQuery]);

  const filteredStudents = performanceStudents;

  const displayedStudents = filteredStudents;

  const onSessionsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 100) {
      void loadMoreSessions();
    }
  };

  const onStudentsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 100) {
      void loadMoreStudents();
    }
  };

  return (
    <>
      {/* ── Back nav ── */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/classes')}
          className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl transition-all"
          style={{ color: t.textSecondary, background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.accent; (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textSecondary; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
        >
          <ArrowLeft className="w-4 h-4" />
          Sinflar ro'yxati
        </button>
      </div>

      {/* ── Class Header Card ── */}
      <Card className="mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Icon */}
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: t.isDark ? `${cls.color}22` : `${cls.color}12`,
              border: `2px solid ${cls.color}44`,
              boxShadow: t.isDark ? `0 0 32px ${cls.color}33` : `0 4px 20px ${cls.color}22`,
            }}
          >
            <SubjectIcon type={cls.subjectIcon} color={cls.color} size={36} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>{cls.name}</h2>
                <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: `${cls.color}18`, color: cls.color, border: `1px solid ${cls.color}44` }}
                  >
                    <BookOpen className="w-3 h-3" />
                    {cls.subject}
                  </span>
                  <p className="text-xs" style={{ color: t.textMuted }}>{cls.description}</p>
                </div>
              </div>

              {/* Active badge */}
              {{
                active: <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Faol</span>,
                moderate: <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#F59E0B' }} />O'rtacha</span>,
                low: <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: t.bgInner, color: t.textMuted, border: `1px solid ${t.border}` }}><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: t.textMuted }} />Kam faol</span>,
              }[cls.activityLevel]}
            </div>

            {/* Stat badges */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Users className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>O'quvchilar</p>
                  <p className="text-base font-bold" style={{ color: t.textPrimary }}>{cls.students}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.bgButton }}>
                  <ClipboardCheck className="w-4 h-4" style={{ color: t.textSecondary }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>Testlar</p>
                  <p className="text-base font-bold" style={{ color: t.textPrimary }}>{cls.quizzes}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: overallSc.bg, border: `1px solid ${overallSc.border}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${overallSc.color}22` }}>
                  <Target className="w-4 h-4" style={{ color: overallSc.color }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>O'rtacha ball</p>
                  <p className="text-base font-bold" style={{ color: overallSc.color }}>{cls.avgScore}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.bgButton }}>
                  <Clock className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>So'nggi faollik</p>
                  <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>{cls.lastActivity}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Top grid: Students + Quizzes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 mb-4 sm:mb-5">

        {/* Leaderboard — 3 cols */}
        <div className="lg:col-span-3 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle title="Leaderboard" subtitle="Top 3 o'quvchilar" />
              <button
                onClick={() => navigate('/students')}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.14)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.accentMuted; }}
              >
                <Eye className="w-3.5 h-3.5" />
                Barchasi
              </button>
            </div>

            {/* Podium Layout - Modern Design */}
            <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-6 py-2 sm:py-3">
              {/* 2nd Place - Left */}
              {students[1] && (
                <div className="flex flex-col items-center flex-1 max-w-[140px]">
                  {/* Avatar with decorative elements */}
                  <div className="relative mb-2">
                    {/* Decorative lines */}
                    <div className="absolute -left-8 sm:-left-12 top-1/2 w-6 sm:w-10 h-0.5 bg-gradient-to-r from-transparent to-current opacity-30" style={{ color: '#C0C0C0' }} />
                    <div className="absolute -right-8 sm:-right-12 top-1/2 w-6 sm:w-10 h-0.5 bg-gradient-to-l from-transparent to-current opacity-30" style={{ color: '#C0C0C0' }} />

                    {/* Avatar circle */}
                    <div className="relative">
                      {students[1].profileImage ? (
                        <img
                          src={students[1].profileImage}
                          alt={students[1].name}
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover relative z-10"
                          style={{
                            boxShadow: t.isDark
                              ? '0 10px 30px rgba(192,192,192,0.25), 0 0 0 3px rgba(192,192,192,0.1)'
                              : '0 10px 30px rgba(0,0,0,0.15), 0 0 0 3px rgba(192,192,192,0.15)',
                          }}
                        />
                      ) : (
                        <div
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-sm sm:text-base md:text-lg font-bold relative z-10"
                          style={{
                            background: t.isDark
                              ? 'linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 100%)'
                              : 'linear-gradient(135deg, #F5F5F5 0%, #D1D1D1 100%)',
                            color: t.isDark ? '#1F2937' : '#374151',
                            boxShadow: t.isDark
                              ? '0 10px 30px rgba(192,192,192,0.25), 0 0 0 3px rgba(192,192,192,0.1)'
                              : '0 10px 30px rgba(0,0,0,0.15), 0 0 0 3px rgba(192,192,192,0.15)',
                          }}
                        >
                          {students[1].initials}
                        </div>
                      )}
                      {/* Crown/Badge */}
                      <div
                        className="absolute -top-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold z-20"
                        style={{
                          background: t.isDark ? 'linear-gradient(135deg, #E8E8E8, #C0C0C0)' : 'linear-gradient(135deg, #F5F5F5, #D1D1D1)',
                          color: t.isDark ? '#1F2937' : '#374151',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                          border: `2px solid ${t.bgCard}`,
                        }}
                      >
                        2
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <p className="text-xs sm:text-sm md:text-base font-bold text-center truncate w-full mb-0.5" style={{ color: t.textPrimary }}>
                    {students[1].name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] sm:text-xs text-center mb-2" style={{ color: t.textMuted }}>
                    {students[1].name.split(' ')[1] || ''}
                  </p>

                  {/* Score bar */}
                  <div className="w-full">
                    <div
                      className="h-1.5 sm:h-2 rounded-full mb-1.5"
                      style={{
                        background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${students[1].avgScore}%`,
                          background: 'linear-gradient(90deg, #E8E8E8, #C0C0C0)',
                        }}
                      />
                    </div>
                    <div
                      className="text-center text-xs sm:text-sm font-bold px-2 py-1 rounded-lg"
                      style={{
                        background: t.isDark ? 'rgba(192,192,192,0.12)' : 'rgba(192,192,192,0.15)',
                        color: t.isDark ? '#C0C0C0' : '#808080',
                      }}
                    >
                      {students[1].avgScore}%
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place - Center (Taller) */}
              {students[0] && (
                <div className="flex flex-col items-center flex-1 max-w-[160px] -mt-4 sm:-mt-6">
                  {/* Avatar with decorative elements */}
                  <div className="relative mb-2">
                    {/* Decorative lines */}
                    <div className="absolute -left-10 sm:-left-16 top-1/2 w-8 sm:w-14 h-0.5 bg-gradient-to-r from-transparent to-current opacity-40" style={{ color: '#FFD700' }} />
                    <div className="absolute -right-10 sm:-right-16 top-1/2 w-8 sm:w-14 h-0.5 bg-gradient-to-l from-transparent to-current opacity-40" style={{ color: '#FFD700' }} />

                    {/* Avatar circle */}
                    <div className="relative">
                      {students[0].profileImage ? (
                        <img
                          src={students[0].profileImage}
                          alt={students[0].name}
                          className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover relative z-10"
                          style={{
                            boxShadow: t.isDark
                              ? '0 15px 40px rgba(255,215,0,0.35), 0 0 0 4px rgba(255,215,0,0.15)'
                              : '0 15px 40px rgba(245,158,11,0.3), 0 0 0 4px rgba(251,191,36,0.2)',
                          }}
                        />
                      ) : (
                        <div
                          className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center text-base sm:text-lg md:text-xl font-bold relative z-10"
                          style={{
                            background: t.isDark
                              ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                              : 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                            color: '#FFFFFF',
                            boxShadow: t.isDark
                              ? '0 15px 40px rgba(255,215,0,0.35), 0 0 0 4px rgba(255,215,0,0.15)'
                              : '0 15px 40px rgba(245,158,11,0.3), 0 0 0 4px rgba(251,191,36,0.2)',
                          }}
                        >
                          {students[0].initials}
                        </div>
                      )}
                      {/* Crown Badge */}
                      <div
                        className="absolute -top-1 sm:-top-2 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center z-20"
                        style={{
                          background: t.isDark ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                          boxShadow: '0 4px 16px rgba(255,215,0,0.4)',
                          border: `2px solid ${t.bgCard}`,
                        }}
                      >
                        <Crown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#FFFFFF', fill: '#FFFFFF' }} />
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <p className="text-sm sm:text-base md:text-lg font-bold text-center truncate w-full mb-0.5" style={{ color: t.textPrimary }}>
                    {students[0].name.split(' ')[0]}
                  </p>
                  <p className="text-xs sm:text-sm text-center mb-2" style={{ color: t.textMuted }}>
                    {students[0].name.split(' ')[1] || ''}
                  </p>

                  {/* Score bar */}
                  <div className="w-full">
                    <div
                      className="h-2 sm:h-2.5 rounded-full mb-1.5"
                      style={{
                        background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${students[0].avgScore}%`,
                          background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                          boxShadow: '0 2px 8px rgba(255,215,0,0.3)',
                        }}
                      />
                    </div>
                    <div
                      className="text-center text-sm sm:text-base font-bold px-3 py-1.5 rounded-lg"
                      style={{
                        background: t.isDark ? 'rgba(255,215,0,0.15)' : 'rgba(251,191,36,0.2)',
                        color: t.isDark ? '#FFD700' : '#F59E0B',
                      }}
                    >
                      {students[0].avgScore}%
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place - Right */}
              {students[2] && (
                <div className="flex flex-col items-center flex-1 max-w-[140px]">
                  {/* Avatar with decorative elements */}
                  <div className="relative mb-2">
                    {/* Decorative lines */}
                    <div className="absolute -left-8 sm:-left-12 top-1/2 w-6 sm:w-10 h-0.5 bg-gradient-to-r from-transparent to-current opacity-30" style={{ color: '#CD7F32' }} />
                    <div className="absolute -right-8 sm:-right-12 top-1/2 w-6 sm:w-10 h-0.5 bg-gradient-to-l from-transparent to-current opacity-30" style={{ color: '#CD7F32' }} />

                    {/* Avatar circle */}
                    <div className="relative">
                      {students[2].profileImage ? (
                        <img
                          src={students[2].profileImage}
                          alt={students[2].name}
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover relative z-10"
                          style={{
                            boxShadow: t.isDark
                              ? '0 10px 30px rgba(205,127,50,0.25), 0 0 0 3px rgba(205,127,50,0.1)'
                              : '0 10px 30px rgba(217,119,6,0.2), 0 0 0 3px rgba(217,119,6,0.15)',
                          }}
                        />
                      ) : (
                        <div
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-sm sm:text-base md:text-lg font-bold relative z-10"
                          style={{
                            background: t.isDark
                              ? 'linear-gradient(135deg, #D97706 0%, #B45309 100%)'
                              : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            color: '#FFFFFF',
                            boxShadow: t.isDark
                              ? '0 10px 30px rgba(205,127,50,0.25), 0 0 0 3px rgba(205,127,50,0.1)'
                              : '0 10px 30px rgba(217,119,6,0.2), 0 0 0 3px rgba(217,119,6,0.15)',
                          }}
                        >
                          {students[2].initials}
                        </div>
                      )}
                      {/* Badge */}
                      <div
                        className="absolute -top-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold z-20"
                        style={{
                          background: t.isDark ? 'linear-gradient(135deg, #D97706, #B45309)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 12px rgba(205,127,50,0.3)',
                          border: `2px solid ${t.bgCard}`,
                        }}
                      >
                        3
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <p className="text-xs sm:text-sm md:text-base font-bold text-center truncate w-full mb-0.5" style={{ color: t.textPrimary }}>
                    {students[2].name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] sm:text-xs text-center mb-2" style={{ color: t.textMuted }}>
                    {students[2].name.split(' ')[1] || ''}
                  </p>

                  {/* Score bar */}
                  <div className="w-full">
                    <div
                      className="h-1.5 sm:h-2 rounded-full mb-1.5"
                      style={{
                        background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${students[2].avgScore}%`,
                          background: 'linear-gradient(90deg, #D97706, #B45309)',
                        }}
                      />
                    </div>
                    <div
                      className="text-center text-xs sm:text-sm font-bold px-2 py-1 rounded-lg"
                      style={{
                        background: t.isDark ? 'rgba(205,127,50,0.12)' : 'rgba(217,119,6,0.15)',
                        color: t.isDark ? '#CD7F32' : '#D97706',
                      }}
                    >
                      {students[2].avgScore}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Quizzes — 2 cols */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <SectionTitle title="Testlar" subtitle={`${cls.quizzes} ta test tayinlangan`} />
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1" onScroll={onSessionsScroll}>
              {quizzes.length === 0 ? (
                <div
                  className="p-6 rounded-xl text-center"
                  style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                >
                  <div
                    className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                    style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}
                  >
                    <ClipboardCheck className="w-5 h-5" style={{ color: t.accent }} strokeWidth={1.75} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>Testlar hali mavjud emas</p>
                </div>
              ) : quizzes.map((q, idx) => {
                const sc = scoreColor(q.avgScore);
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl transition-colors cursor-default"
                    style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}>
                          <BarChart3 className="w-3.5 h-3.5" style={{ color: t.accent }} strokeWidth={1.75} />
                        </div>
                        <p className="text-sm font-medium leading-tight" style={{ color: t.textPrimary }}>{q.name}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/live/results/${q.sessionId}`, {
                          state: {
                            returnTo: `/classes/${classId}`,
                            fromClassDetail: true,
                          },
                        })}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all shrink-0"
                        style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.14)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.accentMuted; }}
                      >
                        Ko'rish
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {q.avgScore}%
                        </span>
                        <span className="text-xs" style={{ color: t.textMuted }}>{q.submissions}/{cls.students} ta</span>
                      </div>
                      <span className="text-xs" style={{ color: t.textMuted }}>{q.date}</span>
                    </div>
                    <div className="mt-2 w-full h-1 rounded-full overflow-hidden" style={{ background: t.border }}>
                      <div className="h-1 rounded-full transition-all duration-500"
                        style={{ width: `${cls.students > 0 ? (q.submissions / cls.students) * 100 : 0}%`, background: t.accent, opacity: 0.7 }} />
                    </div>
                  </div>
                );
              })}
              {loadingMoreSessions && (
                <p className="text-xs text-center py-2" style={{ color: t.textMuted }}>Yuklanmoqda...</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Bottom section: Student Performance Details ── */}
      <div className="grid grid-cols-1">
        <Card>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>O'quvchilar ko'rsatkichi</h3>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Batafsil natijalar va statistika</p>
            </div>

            {/* Search input */}
            <div className="relative w-full sm:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: t.textMuted }}
              />
              <input
                type="text"
                placeholder="Ism bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: t.bgInner,
                  border: `1px solid ${t.border}`,
                  color: t.textPrimary,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = t.accentBorder; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = t.border; }}
              />
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 mb-2" style={{ borderBottom: `1px solid ${t.border}` }}>
              <div className="col-span-3 text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>O'quvchi</div>
              <div className="col-span-3 text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>To'g'ri / Noto'g'ri</div>
              <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: t.textMuted }}>Testlar</div>
              <div className="col-span-4 text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>O'rtacha ball</div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm" style={{ color: t.textMuted }}>Hech qanday o'quvchi topilmadi</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1" onScroll={onStudentsScroll}>
                {displayedStudents.map((s, idx) => {
                  const sc = scoreColor(s.avgScore);
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-3 items-center px-4 py-3 rounded-xl transition-all"
                      style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; }}
                    >
                      {/* Student name */}
                      <div className="col-span-3 flex items-center gap-2.5">
                        {s.profileImage ? (
                          <img
                            src={s.profileImage}
                            alt={s.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                          >
                            {s.initials}
                          </div>
                        )}
                        <span className="text-sm font-medium truncate" style={{ color: t.textPrimary }}>{s.name}</span>
                      </div>

                      {/* Correct / Incorrect */}
                      <div className="col-span-3 flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
                          <span className="text-sm font-bold" style={{ color: '#22C55E' }}>{s.correct}</span>
                        </div>
                        <span className="text-sm" style={{ color: t.textMuted }}>/</span>
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                          <span className="text-sm font-bold" style={{ color: '#EF4444' }}>{s.incorrect}</span>
                        </div>
                      </div>

                      {/* Tests */}
                      <div className="col-span-2 text-center">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', color: t.accent, border: `1px solid ${t.accentBorder}` }}>
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          {s.tests}
                        </span>
                      </div>

                      {/* Average score with progress bar */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: t.border }}>
                          <div
                            className="h-2 rounded-full transition-all duration-700"
                            style={{ width: `${s.avgScore}%`, background: sc.color, opacity: t.isDark ? 0.9 : 0.75 }}
                          />
                        </div>
                        <span className="text-xs font-bold w-12 text-right tabular-nums shrink-0"
                          style={{ color: sc.color }}>
                          {s.avgScore}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                {loadingMoreStudents && (
                  <p className="text-xs text-center py-2" style={{ color: t.textMuted }}>Yuklanmoqda...</p>
                )}
              </div>
            )}
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="block md:hidden space-y-3 max-h-[520px] overflow-y-auto pr-1" onScroll={onStudentsScroll}>
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm" style={{ color: t.textMuted }}>Hech qanday o'quvchi topilmadi</p>
              </div>
            ) : (
              displayedStudents.map((s, idx) => {
                const sc = scoreColor(s.avgScore);
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl space-y-3"
                    style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                  >
                    {/* Student header */}
                    <div className="flex items-center gap-3 pb-3" style={{ borderBottom: `1px solid ${t.border}` }}>
                      {s.profileImage ? (
                        <img
                          src={s.profileImage}
                          alt={s.name}
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                        >
                          {s.initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{s.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                            {s.avgScore}%
                          </span>
                          <span className="text-xs" style={{ color: t.textMuted }}>{s.tests} ta test</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Correct */}
                      <div className="flex flex-col gap-1.5 p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
                          <span className="text-xs font-medium" style={{ color: t.textMuted }}>To'g'ri</span>
                        </div>
                        <span className="text-lg font-bold" style={{ color: '#22C55E' }}>{s.correct}</span>
                      </div>

                      {/* Incorrect */}
                      <div className="flex flex-col gap-1.5 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                          <span className="text-xs font-medium" style={{ color: t.textMuted }}>Noto'g'ri</span>
                        </div>
                        <span className="text-lg font-bold" style={{ color: '#EF4444' }}>{s.incorrect}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs mb-2" style={{ color: t.textMuted }}>
                        <span>O'rtacha natija</span>
                        <span className="font-bold" style={{ color: sc.color }}>{s.avgScore}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: t.border }}>
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${s.avgScore}%`, background: sc.color, opacity: 0.8 }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {loadingMoreStudents && (
              <p className="text-xs text-center py-2" style={{ color: t.textMuted }}>Yuklanmoqda...</p>
            )}
          </div>

          {/* Legend - only show if there are results */}
          {filteredStudents.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-5 pt-5" style={{ borderTop: `1px solid ${t.border}` }}>
              {[
                { color: '#22C55E', label: "A'lo (≥75%)" },
                { color: '#F59E0B', label: "O'rta (50–74%)" },
                { color: '#EF4444', label: 'Past (<50%)' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <span className="text-xs" style={{ color: t.textMuted }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Search, X, CheckCircle2, XCircle,
  Clock, Hash, TrendingUp, TrendingDown,
  Calculator, FlaskConical, Leaf, BookOpen, Languages,
  Users, Medal, ChevronRight, Target,
  Layers, Zap, Filter, CalendarDays, Trophy,
  SkipForward, Eye, Star,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { getStoredAuthSession, getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const PAGE_SIZE = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface LeaderboardEntry {
  id: number;
  name: string;
  isMe: boolean;
  avatar: string;
  avatarUrl?: string | null;
  correct: number;
  total: number;
  score: number;
}

interface QuizResult {
  quiz_id: string;
  id: number;
  title: string;
  subject: string;
  subjectIcon: string;
  subjectColor: string;
  // answer stats
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  // meta
  timeMin: number;
  score: number;
  rank: number;
  totalParticipants: number;
  date: string;
  dateRaw: string;
  leaderboard: LeaderboardEntry[];
}

interface SessionHistoryApiItem {
  session_id: number;
  user_id: number;
  title: string | null;
  subject: string | null;
  rank: number | null;
  participant_count: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  total_questions: number | null;
  finished_at: string | null;
  created_at: string | null;
}

interface SessionHistoryApiResponse {
  items: SessionHistoryApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface LeaderboardApiItem {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image: string | null;
  score: number | null;
  wrong_answers: number | null;
  total_questions: number | null;
  spend_time_seconds: string | null;
}

interface LeaderboardApiResponse {
  items: LeaderboardApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────
const RESULTS: QuizResult[] = [
  {
    quiz_id: '#1', id: 1,
    title: 'Algebra asoslari', subject: 'Matematika',
    subjectIcon: 'calculator', subjectColor: '#818CF8',
    correct: 30, wrong: 0, skipped: 0, total: 30,
    timeMin: 18, score: 100, rank: 1, totalParticipants: 48,
    date: '4 mart', dateRaw: '2026-03-15',
    leaderboard: [
      { id: 1, name: 'Azamat Karimov', isMe: true, avatar: '🎓', correct: 30, total: 30, score: 100 },
      { id: 2, name: 'Malika Toshmatova', isMe: false, avatar: '👩‍🎓', correct: 28, total: 30, score: 93 },
      { id: 3, name: 'Jasur Aliyev', isMe: false, avatar: '🎓', correct: 27, total: 30, score: 90 },
      { id: 4, name: 'Dilnoza Yusupova', isMe: false, avatar: '👩‍🎓', correct: 26, total: 30, score: 87 },
      { id: 5, name: 'Sardor Rahimov', isMe: false, avatar: '🎓', correct: 25, total: 30, score: 83 },
      { id: 6, name: 'Feruza Saidova', isMe: false, avatar: '👩‍🎓', correct: 24, total: 30, score: 80 },
      { id: 7, name: 'Bobur Xasanov', isMe: false, avatar: '🎓', correct: 23, total: 30, score: 77 },
      { id: 8, name: 'Nilufar Qodirova', isMe: false, avatar: '👩‍🎓', correct: 22, total: 30, score: 73 },
    ],
  },
  {
    quiz_id: '#2', id: 2,
    title: 'Mexanika asoslari', subject: 'Fizika',
    subjectIcon: 'flask', subjectColor: '#38BDF8',
    correct: 20, wrong: 5, skipped: 0, total: 25,
    timeMin: 22, score: 80, rank: 5, totalParticipants: 32,
    date: '12 mart', dateRaw: '2026-03-12',
    leaderboard: [
      { id: 1, name: 'Sherzod Nazarov', isMe: false, avatar: '🎓', correct: 25, total: 25, score: 100 },
      { id: 2, name: 'Kamola Ergasheva', isMe: false, avatar: '👩‍🎓', correct: 24, total: 25, score: 96 },
      { id: 3, name: 'Ulugbek Mirzayev', isMe: false, avatar: '🎓', correct: 23, total: 25, score: 92 },
      { id: 4, name: 'Zulfiya Hamidova', isMe: false, avatar: '👩‍🎓', correct: 22, total: 25, score: 88 },
      { id: 5, name: 'Azamat Karimov', isMe: true, avatar: '🎓', correct: 20, total: 25, score: 80 },
      { id: 6, name: 'Barno Yuldasheva', isMe: false, avatar: '👩‍🎓', correct: 19, total: 25, score: 76 },
    ],
  },
  {
    quiz_id: '#3', id: 3,
    title: 'Kimyoviy reaksiyalar', subject: 'Kimyo',
    subjectIcon: 'leaf', subjectColor: '#34D399',
    correct: 14, wrong: 4, skipped: 2, total: 20,
    timeMin: 17, score: 70, rank: 8, totalParticipants: 19,
    date: '8 mart', dateRaw: '2026-03-08',
    leaderboard: [
      { id: 1, name: 'Mohira Salimova', isMe: false, avatar: '👩‍🎓', correct: 20, total: 20, score: 100 },
      { id: 2, name: "Jahongir To'xtayev", isMe: false, avatar: '🎓', correct: 19, total: 20, score: 95 },
      { id: 3, name: 'Gulnora Axmedova', isMe: false, avatar: '👩‍🎓', correct: 18, total: 20, score: 90 },
      { id: 4, name: 'Sanjar Ibragimov', isMe: false, avatar: '🎓', correct: 17, total: 20, score: 85 },
      { id: 5, name: 'Oydin Ruziyeva', isMe: false, avatar: '👩‍🎓', correct: 16, total: 20, score: 80 },
      { id: 6, name: 'Davron Qosimov', isMe: false, avatar: '🎓', correct: 15, total: 20, score: 75 },
      { id: 7, name: 'Iroda Xoliqova', isMe: false, avatar: '👩‍🎓', correct: 15, total: 20, score: 75 },
      { id: 8, name: 'Azamat Karimov', isMe: true, avatar: '🎓', correct: 14, total: 20, score: 70 },
    ],
  },
  {
    quiz_id: '#4', id: 4,
    title: 'Hujayra nazariyasi', subject: 'Biologiya',
    subjectIcon: 'book', subjectColor: '#A78BFA',
    correct: 29, wrong: 6, skipped: 0, total: 35,
    timeMin: 28, score: 83, rank: 3, totalParticipants: 61,
    date: '5 mart', dateRaw: '2026-03-05',
    leaderboard: [
      { id: 1, name: 'Nodira Hasanova', isMe: false, avatar: '👩‍🎓', correct: 35, total: 35, score: 100 },
      { id: 2, name: 'Farrux Toshmatov', isMe: false, avatar: '🎓', correct: 33, total: 35, score: 94 },
      { id: 3, name: 'Azamat Karimov', isMe: true, avatar: '🎓', correct: 29, total: 35, score: 83 },
      { id: 4, name: 'Maftuna Ergasheva', isMe: false, avatar: '👩‍🎓', correct: 28, total: 35, score: 80 },
      { id: 5, name: 'Husan Normatov', isMe: false, avatar: '🎓', correct: 27, total: 35, score: 77 },
    ],
  },
  {
    quiz_id: '#5', id: 5,
    title: 'Trigonometriya', subject: 'Matematika',
    subjectIcon: 'calculator', subjectColor: '#818CF8',
    correct: 32, wrong: 8, skipped: 0, total: 40,
    timeMin: 25, score: 80, rank: 4, totalParticipants: 55,
    date: '2 mart', dateRaw: '2026-03-02',
    leaderboard: [
      { id: 1, name: 'Akbar Jurayev', isMe: false, avatar: '🎓', correct: 40, total: 40, score: 100 },
      { id: 2, name: 'Sarvinoz Raimova', isMe: false, avatar: '👩‍🎓', correct: 38, total: 40, score: 95 },
      { id: 3, name: 'Ilhom Baxtiyorov', isMe: false, avatar: '🎓', correct: 36, total: 40, score: 90 },
      { id: 4, name: 'Azamat Karimov', isMe: true, avatar: '🎓', correct: 32, total: 40, score: 80 },
      { id: 5, name: 'Lobar Qodirov', isMe: false, avatar: '👩‍🎓', correct: 31, total: 40, score: 78 },
    ],
  },
  {
    quiz_id: '#6', id: 6,
    title: 'Ingliz tili — Grammar', subject: 'Ingliz tili',
    subjectIcon: 'languages', subjectColor: '#FBBF24',
    correct: 22, wrong: 4, skipped: 2, total: 28,
    timeMin: 12, score: 79, rank: 6, totalParticipants: 44,
    date: '28 fevral', dateRaw: '2026-02-28',
    leaderboard: [
      { id: 1, name: 'Shahlo Usmonova', isMe: false, avatar: '👩‍🎓', correct: 28, total: 28, score: 100 },
      { id: 2, name: 'Temur Yunusov', isMe: false, avatar: '🎓', correct: 27, total: 28, score: 96 },
      { id: 3, name: 'Dilshod Mirzayev', isMe: false, avatar: '🎓', correct: 26, total: 28, score: 93 },
      { id: 4, name: 'Nasiba Qosimova', isMe: false, avatar: '👩‍🎓', correct: 25, total: 28, score: 89 },
      { id: 5, name: 'Eldor Xoliqov', isMe: false, avatar: '🎓', correct: 24, total: 28, score: 86 },
      { id: 6, name: 'Azamat Karimov', isMe: true, avatar: '🎓', correct: 22, total: 28, score: 79 },
      { id: 7, name: 'Ziyoda Hamroyeva', isMe: false, avatar: '👩‍🎓', correct: 21, total: 28, score: 75 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function scoreGrade(score: number) {
  if (score >= 90) return { label: 'A+', status: "A'lo natija!", emoji: '🏆', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', glow: 'rgba(34,197,94,0.25)' };
  if (score >= 75) return { label: 'A', status: 'Yaxshi natija!', emoji: '⭐', color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', glow: 'rgba(52,211,153,0.2)' };
  if (score >= 60) return { label: 'B', status: "O'rta natija", emoji: '👍', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(245,158,11,0.3)', glow: 'rgba(251,191,36,0.2)' };
  if (score >= 45) return { label: 'C', status: "Qoniqarli natija", emoji: '📘', color: '#FB923C', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)', glow: 'rgba(251,146,60,0.2)' };
  return { label: 'D', status: "Ko'proq mashq qiling", emoji: '💪', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', glow: 'rgba(239,68,68,0.2)' };
}

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function mapSubjectMeta(subject: string | null | undefined) {
  const normalized = normalizeText(subject).toLowerCase();

  switch (normalized) {
    case 'mathematics':
    case 'matematika':
      return { label: 'Matematika', icon: 'calculator', color: '#818CF8' };
    case 'physics':
    case 'fizika':
      return { label: 'Fizika', icon: 'flask', color: '#38BDF8' };
    case 'chemistry':
    case 'kimyo':
      return { label: 'Kimyo', icon: 'leaf', color: '#34D399' };
    case 'biology':
    case 'biologiya':
      return { label: 'Biologiya', icon: 'book', color: '#A78BFA' };
    case 'english':
    case 'ingliz tili':
      return { label: 'Ingliz tili', icon: 'languages', color: '#FBBF24' };
    default:
      return { label: normalizeText(subject, "Noma'lum fan"), icon: 'calculator', color: '#94A3B8' };
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Noma'lum sana";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const uzbekMonths = [
    'yanvar',
    'fevral',
    'mart',
    'aprel',
    'may',
    'iyun',
    'iyul',
    'avgust',
    'sentyabr',
    'oktyabr',
    'noyabr',
    'dekabr',
  ];

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const monthIndex = Number(parts.find((part) => part.type === 'month')?.value ?? '1') - 1;
  const month = uzbekMonths[monthIndex] ?? 'yanvar';
  const day = parts.find((part) => part.type === 'day')?.value ?? '0';
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';

  return `${day}-${month}, ${year} yil, ${hour}:${minute}`;
}

function diffMinutes(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

function toScore(correct: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
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

async function fetchStudentResultsPage(search: string, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(PAGE_SIZE),
  });

  if (search.trim()) {
    params.set('search', search.trim());
  }

  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/me/history/?${params.toString()}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Natijalarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<SessionHistoryApiResponse>;
}

function mapSessionToQuizResult(item: SessionHistoryApiItem): QuizResult {
  const meta = mapSubjectMeta(item.subject);
  const correct = item.correct_answers ?? 0;
  const wrong = item.wrong_answers ?? 0;
  const total = item.total_questions ?? 0;
  const dateRaw = item.finished_at ?? item.created_at ?? '';

  return {
    quiz_id: `#${item.session_id}`,
    id: item.session_id,
    title: normalizeText(item.title, 'Nomsiz test'),
    subject: meta.label,
    subjectIcon: meta.icon,
    subjectColor: meta.color,
    correct,
    wrong,
    skipped: Math.max(0, total - correct - wrong),
    total,
    timeMin: diffMinutes(item.created_at, item.finished_at),
    score: toScore(correct, total),
    rank: item.rank ?? 0,
    totalParticipants: item.participant_count ?? 0,
    date: formatDate(dateRaw),
    dateRaw,
    leaderboard: [],
  };
}

function toInitials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  const combined = `${first}${last}`.trim().toUpperCase();
  return combined || '👤';
}

function mapLeaderboardItem(item: LeaderboardApiItem): LeaderboardEntry {
  const firstName = normalizeText(item.first_name, '');
  const lastName = normalizeText(item.last_name, '');
  const correct = item.score ?? 0;
  const total = item.total_questions ?? 0;
  const currentUserId = getStoredAuthSession()?.user?.id ?? null;

  return {
    id: item.user_id,
    name: `${firstName} ${lastName}`.trim() || 'Foydalanuvchi',
    isMe: currentUserId === item.user_id,
    avatar: toInitials(firstName, lastName),
    avatarUrl: item.profile_image,
    correct,
    total,
    score: toScore(correct, total),
  };
}

async function fetchLeaderboardPage(sessionId: number, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(PAGE_SIZE),
  });

  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/${sessionId}/leaderboard/?${params.toString()}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Reytingni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<LeaderboardApiResponse>;
}

function SubjectIcon({ type, color, size = 16 }: { type: string; color: string; size?: number }) {
  const p = { style: { color }, strokeWidth: 1.75, width: size, height: size };
  switch (type) {
    case 'flask': return <FlaskConical {...p} />;
    case 'leaf': return <Leaf {...p} />;
    case 'book': return <BookOpen {...p} />;
    case 'languages': return <Languages {...p} />;
    default: return <Calculator {...p} />;
  }
}

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, { bg: string; color: string; border: string }> = {
    1: { bg: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: 'rgba(251,191,36,0.35)' },
    2: { bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF', border: 'rgba(156,163,175,0.35)' },
    3: { bg: 'rgba(251,146,60,0.15)', color: '#FB923C', border: 'rgba(251,146,60,0.35)' },
  };
  const s = colors[rank] ?? { bg: 'rgba(100,116,139,0.12)', color: '#94A3B8', border: 'rgba(100,116,139,0.25)' };
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {rank <= 3 && <Medal style={{ width: 11, height: 11 }} strokeWidth={2} />}
      #{rank}
    </span>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 26, circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 68, height: 68 }}>
      <svg width={68} height={68} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={34} cy={34} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <circle cx={34} cy={34} r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{score}%</span>
    </div>
  );
}

function SummaryCard({ emoji, value, label, color, bg, border }: {
  emoji: string; value: string; label: string; color: string; bg: string; border: string;
}) {
  const { theme: t } = useTheme();
  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl"
      style={{ background: bg, border: `1px solid ${border}` }}>
      <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-none truncate" style={{ fontSize: 12, color }}>{value}</p>
        <p className="mt-0.5 leading-tight truncate" style={{ fontSize: 10, color: t.textMuted }}>{label}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared modal shell (bottom-sheet on mobile, centered on sm+)
// ─────────────────────────────────────────────────────────────────────────────
function useModalAnimation(onClose: () => void) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id); }, []);
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  function close() { setVisible(false); setTimeout(onClose, 230); }
  return { visible, close };
}

// ─────────────────────────────────────────────────────────────────────────────
// Result Detail Modal  (Ko'rish)
// ─────────────────────────────────────────────────────────────────────────────
function ResultDetailModal({ result, onClose }: { result: QuizResult; onClose: () => void }) {
  const { theme: t } = useTheme();
  const { visible, close } = useModalAnimation(onClose);
  const grade = scoreGrade(result.score);
  const barW = `${result.score}%`;

  // Session detail rows
  const details = [
    { icon: Users, label: 'Ishtirokchilar', value: `${result.totalParticipants} ta o'quvchi` },
    { icon: Clock, label: 'Vaqt', value: `${result.timeMin} daqiqa` },
    { icon: Trophy, label: 'Reyting', value: `#${result.rank} / ${result.totalParticipants}` },
    { icon: CalendarDays, label: 'Sana', value: result.date },
    { icon: Hash, label: 'Quiz ID', value: result.quiz_id },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{
        background: visible ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(5px)' : 'none',
        transition: 'background 0.23s ease, backdrop-filter 0.23s ease',
        padding: '0 0 0 0',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Sheet */}
      <div
        className="w-full sm:max-w-sm flex flex-col overflow-hidden sm:mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: '24px 24px 0 0',
          maxHeight: '92dvh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.23s cubic-bezier(0.32,0.72,0,1)',
          boxShadow: t.isDark
            ? '0 -12px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.08)'
            : '0 -12px 60px rgba(0,0,0,0.18)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)' }} />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${t.border} transparent` }}>

          {/* ── 1. HEADER ── */}
          <div className="px-5 pt-3 pb-4 relative"
            style={{
              background: t.isDark
                ? `linear-gradient(160deg, ${result.subjectColor}14 0%, transparent 60%)`
                : `linear-gradient(160deg, ${result.subjectColor}09 0%, transparent 60%)`,
              borderBottom: `1px solid ${t.border}`,
            }}>
            {/* Subject + close */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: `${result.subjectColor}18`, border: `1px solid ${result.subjectColor}30` }}>
                  <SubjectIcon type={result.subjectIcon} color={result.subjectColor} size={14} />
                </div>
                <span className="text-xs font-bold tracking-wide" style={{ color: result.subjectColor }}>
                  {result.subject}
                </span>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  border: `1px solid ${t.border}`,
                  color: t.textMuted,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)';
                  (e.currentTarget as HTMLElement).style.color = '#EF4444';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
                  (e.currentTarget as HTMLElement).style.color = t.textMuted;
                  (e.currentTarget as HTMLElement).style.borderColor = t.border;
                }}
              >
                <X style={{ width: 14, height: 14 }} strokeWidth={2.5} />
              </button>
            </div>
            {/* Quiz title */}
            <h2 className="font-bold leading-snug" style={{ fontSize: 17, color: t.textPrimary }}>
              {result.title}
            </h2>
          </div>

          <div className="px-5 py-5 space-y-4">

            {/* ── 2. MAIN SCORE ── */}
            <div
              className="flex flex-col items-center justify-center py-6 rounded-2xl relative overflow-hidden"
              style={{
                background: t.isDark
                  ? `radial-gradient(ellipse at 50% 0%, ${grade.glow} 0%, transparent 65%), ${t.bgInner}`
                  : `radial-gradient(ellipse at 50% 0%, ${grade.glow} 0%, transparent 65%), rgba(0,0,0,0.02)`,
                border: `1px solid ${grade.border}`,
              }}
            >
              {/* Big ring */}
              <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
                <svg width={110} height={110} style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={55} cy={55} r={46} fill="none"
                    stroke={t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} strokeWidth={7} />
                  <circle cx={55} cy={55} r={46} fill="none"
                    stroke={grade.color} strokeWidth={7} strokeLinecap="round"
                    strokeDasharray={`${(result.score / 100) * 2 * Math.PI * 46} ${2 * Math.PI * 46}`}
                    style={{ filter: `drop-shadow(0 0 8px ${grade.color}70)`, transition: 'stroke-dasharray 0.8s ease' }} />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-bold" style={{ fontSize: 28, color: grade.color, lineHeight: 1 }}>
                    {result.score}%
                  </span>
                  <span className="font-semibold mt-1" style={{ fontSize: 11, color: t.textMuted }}>ball</span>
                </div>
              </div>
              {/* Grade label */}
              <div className="flex items-center gap-2 mt-3">
                <span className="px-2.5 py-1 rounded-xl font-bold"
                  style={{ fontSize: 12, background: grade.bg, color: grade.color, border: `1px solid ${grade.border}` }}>
                  {grade.label}
                </span>
              </div>
            </div>

            {/* ── 3. ANSWER STATS ── */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Correct */}
              <div className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl"
                style={{
                  background: t.isDark ? 'rgba(34,197,94,0.14)' : 'rgba(34,197,94,0.08)',
                  border: `1px solid ${t.isDark ? 'rgba(34,197,94,0.28)' : 'rgba(34,197,94,0.2)'}`,
                }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: t.isDark ? 'rgba(34,197,94,0.22)' : 'rgba(34,197,94,0.14)',
                    border: `1px solid ${t.isDark ? 'rgba(34,197,94,0.34)' : 'rgba(34,197,94,0.26)'}`,
                  }}>
                  <CheckCircle2 style={{ width: 15, height: 15, color: '#22C55E' }} strokeWidth={2} />
                </div>
                <span className="font-bold" style={{ fontSize: 20, color: '#22C55E', lineHeight: 1 }}>{result.correct}</span>
                <span className="text-xs font-medium" style={{ color: t.isDark ? '#BBF7D0' : '#15803D' }}>To'g'ri</span>
              </div>
              {/* Wrong */}
              <div className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl"
                style={{
                  background: t.isDark ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${t.isDark ? 'rgba(239,68,68,0.28)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: t.isDark ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.14)',
                    border: `1px solid ${t.isDark ? 'rgba(239,68,68,0.34)' : 'rgba(239,68,68,0.26)'}`,
                  }}>
                  <XCircle style={{ width: 15, height: 15, color: '#EF4444' }} strokeWidth={2} />
                </div>
                <span className="font-bold" style={{ fontSize: 20, color: '#EF4444', lineHeight: 1 }}>{result.wrong}</span>
                <span className="text-xs font-medium" style={{ color: t.isDark ? '#FECACA' : '#B91C1C' }}>Noto'g'ri</span>
              </div>
              {/* Skipped */}
              <div className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl"
                style={{
                  background: t.isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.07)',
                  border: `1px solid ${t.isDark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.18)'}`,
                }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: t.isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.1)',
                    border: `1px solid ${t.isDark ? 'rgba(148,163,184,0.24)' : 'rgba(148,163,184,0.18)'}`,
                  }}>
                  <SkipForward style={{ width: 15, height: 15, color: t.isDark ? '#CBD5E1' : '#64748B' }} strokeWidth={2} />
                </div>
                <span className="font-bold" style={{ fontSize: 20, color: t.isDark ? '#E2E8F0' : '#475569', lineHeight: 1 }}>{result.skipped}</span>
                <span className="text-xs font-medium" style={{ color: t.isDark ? '#CBD5E1' : '#64748B' }}>O'tkazilgan</span>
              </div>
            </div>

            {/* ── 4. PROGRESS ── */}
            <div className="rounded-2xl px-4 py-3.5"
              style={{
                background: t.isDark ? 'rgba(15,23,42,0.52)' : 'rgba(248,250,252,0.92)',
                border: `1px solid ${t.isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.16)'}`,
              }}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold" style={{ color: t.isDark ? '#E2E8F0' : '#334155' }}>Umumiy progress</span>
                <span className="text-xs font-bold" style={{ color: grade.color }}>
                  {result.correct} / {result.total}
                </span>
              </div>
              {/* Segmented bar */}
              <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden w-full">
                {/* Correct segment */}
                <div style={{
                  width: `${(result.correct / result.total) * 100}%`,
                  background: `linear-gradient(90deg, #16A34A, #22C55E)`,
                  boxShadow: t.isDark ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
                  transition: 'width 0.7s ease',
                  borderRadius: result.wrong === 0 && result.skipped === 0 ? '999px' : '999px 0 0 999px',
                }} />
                {/* Wrong segment */}
                {result.wrong > 0 && (
                  <div style={{
                    width: `${(result.wrong / result.total) * 100}%`,
                    background: 'linear-gradient(90deg, #DC2626, #EF4444)',
                    transition: 'width 0.7s ease',
                    borderRadius: result.skipped === 0 ? '0 999px 999px 0' : '0',
                  }} />
                )}
                {/* Skipped segment */}
                {result.skipped > 0 && (
                  <div style={{
                    width: `${(result.skipped / result.total) * 100}%`,
                    background: t.isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.2)',
                    borderRadius: '0 999px 999px 0',
                    transition: 'width 0.7s ease',
                  }} />
                )}
                {/* Remaining (empty) */}
                <div style={{ flex: 1, background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: '0 999px 999px 0' }} />
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
                  <span style={{ fontSize: 10, color: t.isDark ? '#BBF7D0' : '#15803D' }}>To'g'ri</span>
                </div>
                {result.wrong > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
                    <span style={{ fontSize: 10, color: t.isDark ? '#FECACA' : '#B91C1C' }}>Xato</span>
                  </div>
                )}
                {result.skipped > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: t.isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.4)' }} />
                    <span style={{ fontSize: 10, color: t.isDark ? '#CBD5E1' : '#64748B' }}>O'tkazilgan</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 5. SESSION DETAILS ── */}
            <div className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${t.border}` }}>
              {details.map(({ icon: Icon, label, value }, idx) => (
                <div key={label}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    borderTop: idx > 0 ? `1px solid ${t.borderSubtle}` : 'none',
                    background: idx % 2 === 0
                      ? (t.isDark ? 'rgba(30,41,59,0.34)' : 'rgba(248,250,252,0.72)')
                      : 'transparent',
                  }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: t.isDark ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.09)',
                      border: `1px solid ${t.isDark ? 'rgba(129,140,248,0.24)' : 'rgba(99,102,241,0.16)'}`,
                    }}>
                    <Icon style={{ width: 13, height: 13, color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.75} />
                  </div>
                  <span className="text-xs flex-1" style={{ color: t.isDark ? '#CBD5E1' : '#64748B' }}>{label}</span>
                  <span className="text-xs font-semibold" style={{ color: t.isDark ? '#F8FAFC' : '#0F172A' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* ── 6. PERFORMANCE STATUS ── */}
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
              style={{
                background: t.isDark
                  ? `linear-gradient(135deg, ${grade.glow} 0%, rgba(0,0,0,0) 100%)`
                  : `linear-gradient(135deg, ${grade.bg} 0%, transparent 100%)`,
                border: `1px solid ${grade.border}`,
              }}>
              <span style={{ fontSize: 24 }}>{grade.emoji}</span>
              <div>
                <p className="font-bold text-sm" style={{ color: grade.color }}>{grade.status}</p>
                <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                  {result.score}% ball to'pladingiz — {grade.label} daraja
                </p>
              </div>
            </div>
          </div>

          {/* Bottom padding */}
          <div className="h-5" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rating Modal  (Reyting)
// ─────────────────────────────────────────────────────────────────────────────
function LeaderMedal({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
      style={{ background: 'linear-gradient(135deg,#FDE68A,#F59E0B)', boxShadow: '0 2px 8px rgba(245,158,11,0.4)' }}>
      <Medal style={{ width: 15, height: 15, color: '#fff' }} strokeWidth={2.5} />
    </div>
  );
  if (rank === 2) return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
      style={{ background: 'linear-gradient(135deg,#E2E8F0,#94A3B8)', boxShadow: '0 2px 8px rgba(148,163,184,0.4)' }}>
      <Medal style={{ width: 15, height: 15, color: '#fff' }} strokeWidth={2.5} />
    </div>
  );
  if (rank === 3) return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
      style={{ background: 'linear-gradient(135deg,#FCD9B0,#F97316)', boxShadow: '0 2px 8px rgba(249,115,22,0.35)' }}>
      <Medal style={{ width: 15, height: 15, color: '#fff' }} strokeWidth={2.5} />
    </div>
  );
  return (
    <div className="flex items-center justify-center w-8 h-8 shrink-0">
      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>#{rank}</span>
    </div>
  );
}

function RatingModal({ result, onClose }: { result: QuizResult; onClose: () => void }) {
  const { theme: t } = useTheme();
  const { visible, close } = useModalAnimation(onClose);
  const listRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(result.leaderboard);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadingMore(false);
    setError('');

    fetchLeaderboardPage(result.id, 1)
      .then((data) => {
        if (cancelled) return;
        setEntries((Array.isArray(data.items) ? data.items : []).map(mapLeaderboardItem));
        setPage(data.page ?? 1);
        setPages(data.pages ?? 1);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setEntries([]);
        setPage(1);
        setPages(1);
        setError(err instanceof Error ? err.message : "Reytingni yuklab bo'lmadi");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [result.id]);

  useEffect(() => {
    const root = listRef.current;
    const node = loadMoreRef.current;
    if (!root || !node || loading || loadingMore || page >= pages) return;

    const observer = new IntersectionObserver((entriesList) => {
      const [entry] = entriesList;
      if (!entry?.isIntersecting) return;

      setLoadingMore(true);

      fetchLeaderboardPage(result.id, page + 1)
        .then((data) => {
          setEntries((current) => [...current, ...(Array.isArray(data.items) ? data.items : []).map(mapLeaderboardItem)]);
          setPage(data.page ?? (page + 1));
          setPages(data.pages ?? 1);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Keyingi reytingni yuklab bo'lmadi");
        })
        .finally(() => {
          setLoadingMore(false);
        });
    }, { root, rootMargin: '120px 0px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, page, pages, result.id]);

  const myEntry = entries.find((e) => e.isMe);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{
        background: visible ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(5px)' : 'none',
        transition: 'background 0.23s ease, backdrop-filter 0.23s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full sm:max-w-md flex flex-col overflow-hidden sm:mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: '24px 24px 0 0',
          maxHeight: '88dvh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.23s cubic-bezier(0.32,0.72,0,1)',
          boxShadow: t.isDark
            ? '0 -8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)'
            : '0 -8px 48px rgba(0,0,0,0.15)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)' }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: `${result.subjectColor}18`, border: `1px solid ${result.subjectColor}30` }}>
                <SubjectIcon type={result.subjectIcon} color={result.subjectColor} size={13} />
              </div>
              <span className="text-xs font-semibold" style={{ color: result.subjectColor }}>{result.subject}</span>
            </div>
            <button onClick={close}
              className="w-7 h-7 rounded-xl flex items-center justify-center transition-all"
              style={{ background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', border: `1px solid ${t.border}`, color: t.textMuted }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}>
              <X style={{ width: 13, height: 13 }} strokeWidth={2.5} />
            </button>
          </div>
          <h2 className="font-bold text-lg mt-2 leading-tight" style={{ color: t.textPrimary }}>{result.title}</h2>
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.08)',
                border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.18)'}`,
              }}
            >
              <Users style={{ width: 12, height: 12, color: '#6366F1' }} strokeWidth={1.9} />
              <span className="text-xs font-medium" style={{ color: t.isDark ? '#C7D2FE' : '#4338CA' }}>
                {result.totalParticipants} ishtirokchi
              </span>
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{
                background: t.isDark ? 'rgba(245,158,11,0.14)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${t.isDark ? 'rgba(245,158,11,0.26)' : 'rgba(245,158,11,0.18)'}`,
              }}
            >
              <CalendarDays style={{ width: 12, height: 12, color: '#F59E0B' }} strokeWidth={1.9} />
              <span className="text-xs font-medium" style={{ color: t.isDark ? '#FDE68A' : '#B45309' }}>
                {result.date}
              </span>
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{
                background: t.isDark ? 'rgba(16,185,129,0.14)' : 'rgba(16,185,129,0.08)',
                border: `1px solid ${t.isDark ? 'rgba(16,185,129,0.26)' : 'rgba(16,185,129,0.18)'}`,
              }}
            >
              <Hash style={{ width: 12, height: 12, color: '#10B981' }} strokeWidth={1.9} />
              <span className="text-xs font-medium" style={{ color: t.isDark ? '#A7F3D0' : '#047857' }}>
                {result.total} ta savol
              </span>
            </div>
          </div>
          {myEntry && (
            <div className="flex items-center gap-3 mt-3 px-3 py-2.5 rounded-xl"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)',
                border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.18)'}`,
              }}>
              <Trophy style={{ width: 14, height: 14, color: '#818CF8', flexShrink: 0 }} strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}>Mening natijam</span>
                  <span className="text-xs font-bold" style={{ color: scoreGrade(myEntry.score).color }}>{myEntry.score}%</span>
                </div>
                <div className="w-full h-1 rounded-full overflow-hidden"
                  style={{ background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${myEntry.score}%`, background: `linear-gradient(90deg, ${scoreGrade(myEntry.score).color}80, ${scoreGrade(myEntry.score).color})` }} />
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs font-bold" style={{ color: t.textPrimary }}>{myEntry.correct}</span>
                <span className="text-xs" style={{ color: t.textMuted }}>/{myEntry.total}</span>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard list */}
        <div ref={listRef} className="overflow-y-auto flex-1 px-4 py-3 space-y-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${t.border} transparent` }}>
          {loading ? (
            <div className="py-8 text-center">
              <span className="text-xs" style={{ color: t.textMuted }}>Reyting yuklanmoqda...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>
            </div>
          ) : entries.map((entry, idx) => {
            const rank = idx + 1;
            const g = scoreGrade(entry.score);
            return (
              <div key={entry.id}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all"
                style={{
                  background: entry.isMe
                    ? (t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)')
                    : (t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                  border: `1px solid ${entry.isMe ? (t.isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.22)') : t.border}`,
                  boxShadow: entry.isMe && t.isDark ? '0 0 16px rgba(99,102,241,0.12)' : 'none',
                }}>
                <LeaderMedal rank={rank} />
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                  style={{
                    background: entry.isMe
                      ? (t.isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.1)')
                      : (t.isDark ? 'rgba(51,65,85,0.72)' : 'rgba(241,245,249,0.95)'),
                    border: `1.5px solid ${entry.isMe ? (t.isDark ? 'rgba(129,140,248,0.52)' : 'rgba(99,102,241,0.28)') : (t.isDark ? 'rgba(148,163,184,0.24)' : 'rgba(148,163,184,0.26)')}`,
                    color: entry.isMe ? (t.isDark ? '#C7D2FE' : '#4F46E5') : (t.isDark ? '#E2E8F0' : '#334155'),
                    fontWeight: 700,
                  }}>
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    entry.avatar
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold truncate"
                      style={{ color: entry.isMe ? (t.isDark ? '#818CF8' : '#6366F1') : t.textPrimary }}>
                      {entry.name}
                    </span>
                    {entry.isMe && (
                      <span className="px-1.5 py-0.5 rounded-md shrink-0"
                        style={{ fontSize: 9, fontWeight: 700, background: t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)', color: t.isDark ? '#818CF8' : '#6366F1', border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.25)'}` }}>
                        Siz
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 rounded-full mt-1.5 overflow-hidden"
                    style={{ background: t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${entry.score}%`, background: `linear-gradient(90deg,${g.color}70,${g.color})`, boxShadow: t.isDark ? `0 0 4px ${g.color}60` : 'none' }} />
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-0.5">
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-bold text-sm" style={{ color: t.textPrimary }}>{entry.correct}</span>
                    <span className="text-xs" style={{ color: t.textMuted }}>/{entry.total}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: g.color }}>{entry.score}%</span>
                </div>
              </div>
            );
          })}
          <div ref={loadMoreRef} className="h-3" />
          {loadingMore && (
            <div className="pb-3 text-center">
              <span className="text-xs" style={{ color: t.textMuted }}>Yana yuklanmoqda...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Result Card
// ─────────────────────────────────────────────────────────────────────────────
function ResultCard({
  result,
  onView,
  onRating,
}: {
  result: QuizResult;
  onView: (r: QuizResult) => void;
  onRating: (r: QuizResult) => void;
}) {
  const { theme: t } = useTheme();
  const grade = scoreGrade(result.score);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = result.subjectColor + '40';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLElement).style.boxShadow = t.shadowHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = t.border;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = t.shadowCard;
      }}
    >
      <div className="h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, ${result.subjectColor}, ${result.subjectColor}30)` }} />

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${result.subjectColor}14`, border: `1px solid ${result.subjectColor}30` }}>
            <SubjectIcon type={result.subjectIcon} color={result.subjectColor} size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base leading-tight truncate" style={{ color: t.textPrimary }}>
                  {result.title}
                </h3>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-xs font-medium" style={{ color: result.subjectColor }}>{result.subject}</span>
                  <span className="w-1 h-1 rounded-full" style={{ background: t.textMuted }} />
                  <span className="flex items-center gap-1 text-xs" style={{ color: t.textMuted }}>
                    <Clock style={{ width: 11, height: 11 }} strokeWidth={1.75} />
                    {result.timeMin} daqiqa
                  </span>
                  <span className="w-1 h-1 rounded-full" style={{ background: t.textMuted }} />
                  <span className="text-xs" style={{ color: t.textMuted }}>{result.date}</span>
                </div>
              </div>
              {/* Score ring desktop */}
              <div className="hidden sm:flex shrink-0">
                <ScoreRing score={result.score} color={grade.color} />
              </div>
            </div>
            {/* Mobile score pill */}
            <div className="flex items-center gap-2 mt-2 sm:hidden">
              <span className="px-2.5 py-1 rounded-lg text-sm font-bold"
                style={{ background: grade.bg, color: grade.color, border: `1px solid ${grade.border}` }}>
                {result.score}%
              </span>
              <span className="px-2 py-1 rounded-lg text-xs font-bold"
                style={{ background: grade.bg, color: grade.color, border: `1px solid ${grade.border}` }}>
                {grade.label}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3.5">
          <div className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <div className="h-full rounded-full"
              style={{
                width: `${result.score}%`,
                background: `linear-gradient(90deg, ${grade.color}70, ${grade.color})`,
                boxShadow: t.isDark ? `0 0 6px ${grade.color}50` : 'none',
              }} />
          </div>
        </div>

        {/* Stats + action buttons */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <CheckCircle2 style={{ width: 12, height: 12, color: '#22C55E' }} strokeWidth={2} />
            <span className="text-xs font-semibold" style={{ color: '#22C55E' }}>{result.correct}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <XCircle style={{ width: 12, height: 12, color: '#EF4444' }} strokeWidth={2} />
            <span className="text-xs font-semibold" style={{ color: '#EF4444' }}>{result.wrong}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${t.border}` }}>
            <Hash style={{ width: 12, height: 12, color: t.textMuted }} strokeWidth={1.75} />
            <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>{result.total}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RankBadge rank={result.rank} />
            <span className="text-xs" style={{ color: t.textMuted }}>/ {result.totalParticipants}</span>
          </div>

          {/* Action buttons */}
          <div className="ml-auto flex items-center gap-1.5">
            {/* Ko'rish */}
            <button
              onClick={() => onView(result)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: t.isDark ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.08)',
                border: `1px solid ${t.isDark ? 'rgba(56,189,248,0.28)' : 'rgba(56,189,248,0.22)'}`,
                color: t.isDark ? '#38BDF8' : '#0284C7',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.18)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(56,189,248,0.18)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.08)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <Eye style={{ width: 12, height: 12 }} strokeWidth={2} />
              Ko'rish
            </button>
            {/* Reyting */}
            <button
              onClick={() => onRating(result)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
                color: t.isDark ? '#818CF8' : '#6366F1',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.2)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(99,102,241,0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <Users style={{ width: 12, height: 12 }} strokeWidth={2} />
              Reyting
              <ChevronRight style={{ width: 12, height: 12 }} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filters
// ─────────────────────────────────────────────────────────────────────────────
type FilterKey = 'all' | 'best' | 'worst';
const FILTERS: { key: FilterKey; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'Barchasi', icon: Layers },
  { key: 'best', label: 'Eng yaxshi', icon: TrendingUp },
  { key: 'worst', label: 'Eng yomon', icon: TrendingDown },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export function StudentResultsPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [viewResult, setViewResult] = useState<QuizResult | null>(null);
  const [ratingResult, setRatingResult] = useState<QuizResult | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(search.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadingMore(false);
    setError('');

    fetchStudentResultsPage(searchQuery, 1)
      .then((data) => {
        if (cancelled) return;
        setResults((Array.isArray(data.items) ? data.items : []).map(mapSessionToQuizResult));
        setTotalCount(data.total ?? 0);
        setPage(data.page ?? 1);
        setPages(data.pages ?? 1);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResults([]);
        setTotalCount(0);
        setPage(1);
        setPages(1);
        setError(err instanceof Error ? err.message : "Natijalarni yuklab bo'lmadi");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || loadingMore || page >= pages) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;

      setLoadingMore(true);

      fetchStudentResultsPage(searchQuery, page + 1)
        .then((data) => {
          setResults((current) => [...current, ...(Array.isArray(data.items) ? data.items : []).map(mapSessionToQuizResult)]);
          setTotalCount(data.total ?? 0);
          setPage(data.page ?? (page + 1));
          setPages(data.pages ?? 1);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Keyingi natijalarni yuklab bo'lmadi");
        })
        .finally(() => {
          setLoadingMore(false);
        });
    }, { rootMargin: '180px 0px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, page, pages, searchQuery]);

  const totalTests = results.length;
  const totalMinutes = results.reduce((s, r) => s + r.timeMin, 0);
  const totalQuestions = results.reduce((s, r) => s + r.total, 0);
  const avgScore = totalTests > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / totalTests) : 0;
  const bestScore = totalTests > 0 ? Math.max(...results.map((r) => r.score)) : 0;
  const avgGrade = scoreGrade(avgScore);

  const filtered = useMemo(() => {
    let list = [...results];
    if (activeFilter === 'best') list = [...list].sort((a, b) => b.score - a.score);
    if (activeFilter === 'worst') list = [...list].sort((a, b) => a.score - b.score);
    return list;
  }, [results, activeFilter]);

  return (
    <div className="max-w-3xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6366F1'; (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}>
            <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="font-bold text-lg sm:text-xl" style={{ color: t.textPrimary }}>Natijalar</h1>
            <p className="text-xs" style={{ color: t.textMuted }}>Barcha test natijalari</p>
          </div>
        </div>
        <button
          onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setSearch(''); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: searchOpen ? (t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)') : t.bgCard,
            border: `1px solid ${searchOpen ? 'rgba(99,102,241,0.4)' : t.border}`,
            color: searchOpen ? '#818CF8' : t.textSecondary,
          }}>
          {searchOpen ? <X style={{ width: 16, height: 16 }} strokeWidth={2.5} /> : <Search style={{ width: 16, height: 16 }} strokeWidth={2} />}
        </button>
      </div>

      {/* Search */}
      <div className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: searchOpen ? '64px' : '0px', opacity: searchOpen ? 1 : 0, marginBottom: searchOpen ? '16px' : '0' }}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ width: 15, height: 15, color: t.textMuted }} strokeWidth={2} />
          <input type="text" placeholder="Test nomi yoki fan bo'yicha qidiring..."
            value={search} onChange={(e) => setSearch(e.target.value)} autoFocus={searchOpen}
            className="w-full pl-10 pr-4 rounded-xl text-sm focus:outline-none transition-all"
            style={{ background: t.bgCard, border: `1.5px solid ${t.border}`, color: t.textPrimary, height: '44px' }}
            onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
            onBlur={(e) => { (e.target as HTMLElement).style.borderColor = t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* OVERALL STATS */}
      <div className="rounded-2xl p-4 sm:p-5 mb-5 relative overflow-hidden"
        style={{
          background: t.isDark
            ? 'linear-gradient(135deg,rgba(99,102,241,0.18) 0%,rgba(124,58,237,0.1) 50%,rgba(56,189,248,0.08) 100%)'
            : 'linear-gradient(135deg,rgba(99,102,241,0.07) 0%,rgba(124,58,237,0.05) 50%,rgba(56,189,248,0.04) 100%)',
          border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.18)'}`,
          boxShadow: t.isDark ? '0 8px 32px rgba(99,102,241,0.12)' : t.shadowCard,
        }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.12),transparent)' }} />
        <div className="absolute -bottom-6 left-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(56,189,248,0.08),transparent)' }} />

        <div className="flex items-center gap-3 sm:gap-4 relative">
          <div className="flex flex-col items-center justify-center shrink-0 rounded-2xl p-2 sm:p-3"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`, width: 84 }}>
            <div className="relative flex items-center justify-center sm:hidden" style={{ width: 60, height: 60 }}>
              <svg width={60} height={60} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={30} cy={30} r={24} fill="none" stroke={t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} strokeWidth={5} />
                <circle cx={30} cy={30} r={24} fill="none" stroke={avgGrade.color} strokeWidth={5} strokeLinecap="round"
                  strokeDasharray={`${(avgScore / 100) * 2 * Math.PI * 24} ${2 * Math.PI * 24}`}
                  style={{ filter: `drop-shadow(0 0 4px ${avgGrade.color}70)` }} />
              </svg>
              <div className="absolute flex flex-col items-center leading-none gap-0.5">
                <span className="font-bold" style={{ fontSize: 13, color: avgGrade.color }}>{avgScore}%</span>
                <span className="font-semibold" style={{ fontSize: 9, color: avgGrade.color, opacity: 0.8 }}>{totalTests} ta</span>
              </div>
            </div>
            <div className="relative hidden sm:flex items-center justify-center" style={{ width: 76, height: 76 }}>
              <svg width={76} height={76} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={38} cy={38} r={31} fill="none" stroke={t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} strokeWidth={5.5} />
                <circle cx={38} cy={38} r={31} fill="none" stroke={avgGrade.color} strokeWidth={5.5} strokeLinecap="round"
                  strokeDasharray={`${(avgScore / 100) * 2 * Math.PI * 31} ${2 * Math.PI * 31}`}
                  style={{ filter: `drop-shadow(0 0 5px ${avgGrade.color}70)` }} />
              </svg>
              <div className="absolute flex flex-col items-center leading-none gap-0.5">
                <span className="font-bold" style={{ fontSize: 16, color: avgGrade.color }}>{avgScore}%</span>
                <span className="font-semibold" style={{ fontSize: 10, color: avgGrade.color, opacity: 0.8 }}>{totalTests} ta</span>
              </div>
            </div>
            <p className="mt-1.5 font-medium text-center" style={{ fontSize: 9, color: t.textMuted }}>o'rtacha ball</p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 flex-1 min-w-0">
            <SummaryCard emoji="📋" value={`${totalTests} ta`} label="Sessiyalar"
              color={t.isDark ? '#818CF8' : '#6366F1'} bg={t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)'} border={t.isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.15)'} />
            <SummaryCard emoji="🏆" value={`${bestScore}%`} label="Eng yuqori"
              color={t.isDark ? '#FBBF24' : '#D97706'} bg={t.isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.06)'} border={t.isDark ? 'rgba(251,191,36,0.25)' : 'rgba(245,158,11,0.15)'} />
            <SummaryCard emoji="⏱" value={`${totalMinutes}d`} label="Jami vaqt"
              color={t.isDark ? '#38BDF8' : '#0284C7'} bg={t.isDark ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.06)'} border={t.isDark ? 'rgba(56,189,248,0.25)' : 'rgba(56,189,248,0.15)'} />
            <SummaryCard emoji="❓" value={`${totalQuestions}`} label="Savollar"
              color={t.isDark ? '#34D399' : '#059669'} bg={t.isDark ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.06)'} border={t.isDark ? 'rgba(52,211,153,0.25)' : 'rgba(52,211,153,0.15)'} />
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 mr-1">
          <Filter style={{ width: 13, height: 13, color: t.textMuted }} strokeWidth={1.75} />
          <span className="text-xs font-medium" style={{ color: t.textMuted }}>Saralash:</span>
        </div>
        {FILTERS.map(({ key, label, icon: Icon }) => {
          const active = activeFilter === key;
          return (
            <button key={key} onClick={() => setActiveFilter(key)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: active ? (t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)') : t.bgCard,
                border: `1.5px solid ${active ? (t.isDark ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.3)') : t.border}`,
                color: active ? (t.isDark ? '#818CF8' : '#6366F1') : t.textSecondary,
                boxShadow: active && t.isDark ? '0 0 12px rgba(99,102,241,0.15)' : 'none',
              }}>
              <Icon style={{ width: 12, height: 12 }} strokeWidth={active ? 2.5 : 1.75} />
              {label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.border}` }}>
          <Zap style={{ width: 12, height: 12, color: t.textMuted }} strokeWidth={1.75} />
          <span className="text-xs font-medium" style={{ color: t.textMuted }}>{totalCount} natija</span>
        </div>
      </div>

      {/* RESULTS LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
          style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
          <p className="font-semibold text-sm" style={{ color: t.textPrimary }}>Natijalar yuklanmoqda...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
          style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
          <p className="font-semibold text-sm" style={{ color: '#EF4444' }}>Natijalarni yuklab bo'lmadi</p>
          <p className="text-xs mt-1" style={{ color: t.textMuted }}>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
          style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
            <Search style={{ width: 22, height: 22, color: t.textMuted }} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm" style={{ color: t.textPrimary }}>Natija topilmadi</p>
            <p className="text-xs mt-1" style={{ color: t.textMuted }}>Qidiruvni o'zgartiring</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((result) => (
            <ResultCard key={result.id} result={result} onView={setViewResult} onRating={setRatingResult} />
          ))}
          <div ref={loadMoreRef} className="h-6" />
          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <span className="text-xs font-medium" style={{ color: t.textMuted }}>Yana yuklanmoqda...</span>
            </div>
          )}
        </div>
      )}

      <div className="h-6" />

      {/* Ko'rish modal */}
      {viewResult && <ResultDetailModal result={viewResult} onClose={() => setViewResult(null)} />}

      {/* Reyting modal */}
      {ratingResult && <RatingModal result={ratingResult} onClose={() => setRatingResult(null)} />}
    </div>
  );
}

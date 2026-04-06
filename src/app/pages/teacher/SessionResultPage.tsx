import { useEffect, useState, type UIEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Trophy, Users, CalendarDays, Target,
  CheckCircle2, XCircle, Clock, Award, TrendingUp,
  BarChart3, Medal, Star, Download,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.myedunova.uz';

// ─────────────────────────────────────────────
//  Mock data (keyed by session id)
// ─────────────────────────────────────────────
interface SessionMeta {
  sessionId: number;
  quizId: number;
  quizName: string;
  subject: string;
  status: string;
  date: string;
  participants: number;
  duration: string;
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  hardestQuestionNumber: number;
  hardestQuestionAccuracy: number;
  totalQ: number;
}

const DEFAULT_META: SessionMeta = {
  sessionId: 0,
  quizId: 0,
  quizName: 'Mathematics Test',
  subject: 'Matematika',
  status: 'finished',
  date: '4 aprel, 2025',
  participants: 32,
  duration: '24 daq',
  avgScore: 71,
  highestScore: 92,
  lowestScore: 10,
  hardestQuestionNumber: 9,
  hardestQuestionAccuracy: 38,
  totalQ: 10,
};

interface SessionResultDetailsResponse {
  session_id: number;
  quiz_id: number;
  quiz_name: string;
  subject_name: string;
  status: string;
  session_date: string;
  participants_count: number;
  duration_minutes: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  hardest_question_number: number;
  hardest_question_accuracy: number;
}

interface QuestionAccuracyResponseItem {
  question_id: number;
  question_number: number;
  label: string;
  total_answers: number;
  correct_answers: number;
  accuracy_percent: number;
  level: 'easy' | 'medium' | 'hard' | string;
}

interface QuestionAccuracyItem {
  id: number;
  q: number;
  label: string;
  accuracy: number;
  level: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface LeaderboardResponseItem {
  user_id: number;
  first_name: string;
  last_name: string;
  profile_image: string | null;
  score: number;
  wrong_answers: number;
  total_questions: number;
  spend_time_seconds: string;
}

interface StudentResult {
  id: number;
  name: string;
  initials: string;
  profileImage: string | null;
  color: string;
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  time: string;
  scorePercent: number;
}

const COLORS = [
  '#6366F1','#8B5CF6','#3B82F6','#22C55E',
  '#F59E0B','#14B8A6','#EC4899','#0EA5E9',
  '#A855F7','#10B981','#F97316','#EF4444',
];

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function scoreColor(score: number): { color: string; bg: string; border: string } {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return               { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  };
}

function accuracyColor(a: number): string {
  if (a >= 75) return '#22C55E';
  if (a >= 50) return '#F59E0B';
  return '#EF4444';
}

function rankMedal(rank: number) {
  if (rank === 1) return { Icon: Trophy, color: '#F59E0B' };
  if (rank === 2) return { Icon: Medal,  color: '#94A3B8' };
  if (rank === 3) return { Icon: Award,  color: '#CD7C2F' };
  return null;
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

function formatSessionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sana mavjud emas';

  const datePart = new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);

  const timePart = new Intl.DateTimeFormat('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${datePart} ${timePart}`;
}

function mapSessionMeta(details: SessionResultDetailsResponse) {
  return {
    sessionId: details.session_id,
    quizId: details.quiz_id,
    quizName: details.quiz_name,
    subject: details.subject_name,
    status: details.status,
    date: formatSessionDate(details.session_date),
    participants: details.participants_count,
    duration: `${details.duration_minutes} daq`,
    avgScore: details.average_score,
    highestScore: details.highest_score,
    lowestScore: details.lowest_score,
    hardestQuestionNumber: details.hardest_question_number,
    hardestQuestionAccuracy: details.hardest_question_accuracy,
    totalQ: Math.max(details.hardest_question_number, 10),
  };
}

function mapQuestionAccuracy(item: QuestionAccuracyResponseItem): QuestionAccuracyItem {
  return {
    id: item.question_id,
    q: item.question_number,
    label: item.label,
    accuracy: item.accuracy_percent,
    level: item.level,
  };
}

function secondsToDuration(value: string) {
  const totalSeconds = Math.max(0, Math.round(Number.parseFloat(value) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function initialsFromName(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function mapLeaderboardItem(item: LeaderboardResponseItem, index: number): StudentResult {
  const correct = item.score;
  const wrong = item.wrong_answers;
  const skipped = Math.max(item.total_questions - correct - wrong, 0);
  const scorePercent = item.total_questions > 0
    ? Math.round((correct / item.total_questions) * 100)
    : 0;

  return {
    id: item.user_id,
    name: `${item.first_name} ${item.last_name}`.trim(),
    initials: initialsFromName(item.first_name, item.last_name),
    profileImage: item.profile_image,
    color: COLORS[index % COLORS.length],
    score: scorePercent,
    correct,
    wrong,
    skipped,
    time: secondsToDuration(item.spend_time_seconds),
    scorePercent,
  };
}

function sortStudentResults(items: StudentResult[], sortBy: 'score' | 'time' | 'correct') {
  return [...items].sort((a, b) => {
    if (sortBy === 'score') return b.scorePercent - a.scorePercent;
    if (sortBy === 'correct') return b.correct - a.correct;
    const toSecs = (ts: string) => {
      const [m, s] = ts.split(':').map(Number);
      return m * 60 + s;
    };
    return toSecs(a.time) - toSecs(b.time);
  });
}

async function fetchSessionMeta(sessionId: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/quiz-sessions/live/results/${sessionId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Session tafsilotlarini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<SessionResultDetailsResponse>;
}

async function fetchQuestionAccuracy(sessionId: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/quiz-sessions/live/${sessionId}/question-accuracy`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Savol aniqligini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<QuestionAccuracyResponseItem[]>;
}

async function fetchLeaderboard(sessionId: string, page: number, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/teacher/quiz-sessions/live/${sessionId}/leaderboard/?${params.toString()}`,
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(`Reyting jadvalini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<PaginatedResponse<LeaderboardResponseItem>>;
}

async function fetchAllLeaderboardEntries(sessionId: string) {
  const firstPage = await fetchLeaderboard(sessionId, 1, 50);
  const allItems = Array.isArray(firstPage.items) ? [...firstPage.items] : [];
  const totalPages = firstPage.pages ?? 1;

  for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
    const nextPage = await fetchLeaderboard(sessionId, currentPage, 50);
    if (Array.isArray(nextPage.items)) {
      allItems.push(...nextPage.items);
    }
  }

  return allItems.map((item, index) => mapLeaderboardItem(item, index));
}

// ─────────────────────────────────────────────
//  Shared Card
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

// ─────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────
export function SessionResultPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<SessionMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questionAccuracy, setQuestionAccuracy] = useState<QuestionAccuracyItem[]>([]);
  const [accuracyLoading, setAccuracyLoading] = useState(true);
  const [accuracyError, setAccuracyError] = useState('');
  const [leaderboard, setLeaderboard] = useState<StudentResult[]>([]);
  const [leaderboardTotal, setLeaderboardTotal] = useState(0);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [leaderboardPages, setLeaderboardPages] = useState(1);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardLoadingMore, setLeaderboardLoadingMore] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const [sortBy, setSortBy] = useState<'score' | 'time' | 'correct'>('score');

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setLoading(false);
      setError('Session ID topilmadi');
      return () => {
        cancelled = true;
      };
    }

    const loadSessionMeta = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchSessionMeta(id);
        if (cancelled) return;
        setMeta(mapSessionMeta(data));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Session tafsilotlarini yuklab bo‘lmadi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSessionMeta();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setAccuracyLoading(false);
      setAccuracyError('Session ID topilmadi');
      return () => {
        cancelled = true;
      };
    }

    const loadQuestionAccuracy = async () => {
      setAccuracyLoading(true);
      setAccuracyError('');

      try {
        const data = await fetchQuestionAccuracy(id);
        if (cancelled) return;
        setQuestionAccuracy(data.map(mapQuestionAccuracy));
      } catch (err) {
        if (cancelled) return;
        setAccuracyError(err instanceof Error ? err.message : 'Savol aniqligini yuklab bo‘lmadi');
      } finally {
        if (!cancelled) setAccuracyLoading(false);
      }
    };

    loadQuestionAccuracy();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setLeaderboardLoading(false);
      setLeaderboardError('Session ID topilmadi');
      return () => {
        cancelled = true;
      };
    }

    const loadLeaderboard = async () => {
      setLeaderboardLoading(true);
      setLeaderboardError('');

      try {
        const data = await fetchLeaderboard(id, 1);
        if (cancelled) return;
        setLeaderboard(data.items.map((item, index) => mapLeaderboardItem(item, index)));
        setLeaderboardTotal(data.total);
        setLeaderboardPage(data.page);
        setLeaderboardPages(data.pages);
      } catch (err) {
        if (cancelled) return;
        setLeaderboard([]);
        setLeaderboardTotal(0);
        setLeaderboardError(err instanceof Error ? err.message : "Reyting jadvalini yuklab bo‘lmadi");
      } finally {
        if (!cancelled) setLeaderboardLoading(false);
      }
    };

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const sorted = sortStudentResults(leaderboard, sortBy);

  const top3 = sorted.slice(0, 3);
  const hardestQ = questionAccuracy.length > 0
    ? questionAccuracy.reduce((lowest, current) => (
      current.accuracy < lowest.accuracy ? current : lowest
    ))
    : {
      id: 0,
      q: meta.hardestQuestionNumber,
      label: `Q${meta.hardestQuestionNumber}`,
      accuracy: meta.hardestQuestionAccuracy,
      level: 'hard',
    };

  // Scrollbar colors
  const scrollThumb  = t.isDark ? '#334155' : '#CBD5E1';
  const scrollThumbH = t.isDark ? '#475569' : '#94A3B8';
  const scrollTrack  = t.isDark ? '#0F172A' : '#F1F5F9';

  const statusLabel = meta.status === 'finished' ? 'Yakunlangan' : meta.status;
  const statusColor = meta.status === 'finished' ? '#22C55E' : '#F59E0B';
  const statusBg = meta.status === 'finished' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)';
  const statusBorder = meta.status === 'finished' ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(245,158,11,0.25)';

  const loadMoreLeaderboard = async () => {
    if (!id || leaderboardLoading || leaderboardLoadingMore || leaderboardPage >= leaderboardPages) return;

    setLeaderboardLoadingMore(true);
    setLeaderboardError('');

    try {
      const data = await fetchLeaderboard(id, leaderboardPage + 1);
      setLeaderboard((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const nextItems = data.items
          .map((item, index) => mapLeaderboardItem(item, prev.length + index))
          .filter((item) => !seen.has(item.id));
        return [...prev, ...nextItems];
      });
      setLeaderboardTotal(data.total);
      setLeaderboardPage(data.page);
      setLeaderboardPages(data.pages);
    } catch (err) {
      setLeaderboardError(err instanceof Error ? err.message : "Reyting jadvalini yuklab bo‘lmadi");
    } finally {
      setLeaderboardLoadingMore(false);
    }
  };

  const handleLeaderboardScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const threshold = 32;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
      loadMoreLeaderboard().catch(() => {});
    }
  };

  const handleDownloadPdf = async () => {
    if (!id || exporting) return;

    setExporting(true);
    setExportError('');

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const autoTable = autoTableModule.default;
      const entries = sortStudentResults(await fetchAllLeaderboardEntries(id), sortBy);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(meta.quizName, 14, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Fan: ${meta.subject}`, 14, 24);
      doc.text(`Sana: ${meta.date}`, 14, 29);
      doc.text(`Ishtirokchilar: ${entries.length}`, 14, 34);
      doc.text("O'quvchi Natijalari", 14, 39);

      autoTable(doc, {
        startY: 45,
        head: [["#", "O'quvchi", 'Ball', "To'g'ri", "Noto'g'ri", "O'tkazilgan", 'Vaqt']],
        body: entries.map((entry, index) => [
          String(index + 1),
          entry.name,
          `${entry.scorePercent}%`,
          String(entry.correct),
          String(entry.wrong),
          String(entry.skipped),
          entry.time,
        ]),
        styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: 2.5,
        },
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: [255, 255, 255],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { top: 14, right: 14, bottom: 14, left: 14 },
      });

      const safeTitle = meta.quizName.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'natijalar';
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${safeTitle}-natijalar.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "PDFni tayyorlab bo'lmadi");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {/* Theme-aware scrollbar */}
      <style>{`
        .lb-scroll::-webkit-scrollbar        { width: 5px; }
        .lb-scroll::-webkit-scrollbar-track  { background: ${scrollTrack}; border-radius: 6px; }
        .lb-scroll::-webkit-scrollbar-thumb  { background: ${scrollThumb}; border-radius: 6px; }
        .lb-scroll::-webkit-scrollbar-thumb:hover { background: ${scrollThumbH}; }
        .lb-scroll { scrollbar-width: thin; scrollbar-color: ${scrollThumb} ${scrollTrack}; }
      `}</style>

      {/* ══════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════ */}
      <div className="mb-6">
        {/* Back */}
        <button
          onClick={() => navigate('/live')}
          className="flex items-center gap-1.5 mb-4 text-sm transition-colors group"
          style={{ color: t.textMuted }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.accent; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
          Sessionlar
        </button>

        {/* Hero header card */}
        <div
          className="rounded-2xl p-5 sm:p-6"
          style={{
            background: t.isDark
              ? 'linear-gradient(135deg,rgba(99,102,241,0.12) 0%,rgba(139,92,246,0.07) 100%)'
              : 'linear-gradient(135deg,rgba(99,102,241,0.06) 0%,rgba(139,92,246,0.03) 100%)',
            border: `1.5px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.18)'}`,
            boxShadow: t.isDark ? '0 0 32px rgba(99,102,241,0.1)' : t.shadowCard,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(99,102,241,0.3)' }}
            >
              <Trophy className="w-6 h-6" style={{ color: '#6366F1' }} strokeWidth={1.75} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
                  Session Natijalari
                </h1>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: statusBg, color: statusColor, border: statusBorder }}
                >
                  <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                  {statusLabel}
                </span>
              </div>
              <p className="text-sm font-semibold mb-3" style={{ color: t.textSecondary }}>
                {meta.quizName}
              </p>
              <div className="flex flex-wrap gap-5">
                {[
                  { Icon: CalendarDays, label: meta.date,                              id: 'date'     },
                  { Icon: Users,        label: `${meta.participants} ta o'quvchi`,     id: 'students' },
                  { Icon: Clock,        label: `${meta.duration} davomiylik`,          id: 'duration' },
                  { Icon: TrendingUp,   label: `${meta.avgScore}% o'rtacha ball`,      id: 'avg'      },
                ].map(({ Icon, label, id: metaId }) => (
                  <div key={metaId} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                    <span className="text-xs" style={{ color: t.textSecondary }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Export button */}
            <button
              onClick={() => { handleDownloadPdf().catch(() => {}); }}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0"
              style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                color: t.textSecondary,
                opacity: exporting ? 0.7 : 1,
                cursor: exporting ? 'wait' : 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.accentMuted;
                (e.currentTarget as HTMLElement).style.color = t.accent;
                (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.bgCard;
                (e.currentTarget as HTMLElement).style.color = t.textSecondary;
                (e.currentTarget as HTMLElement).style.borderColor = t.border;
              }}
            >
              <Download className="w-4 h-4" strokeWidth={1.75} />
              {exporting ? 'Tayyorlanmoqda...' : 'Yuklab olish'}
            </button>
          </div>
          {loading && (
            <p className="text-xs mt-4" style={{ color: t.textMuted }}>
              Session tafsilotlari yuklanmoqda...
            </p>
          )}
          {error && (
            <p className="text-xs mt-4" style={{ color: '#EF4444' }}>
              {error}
            </p>
          )}
          {exportError && (
            <p className="text-xs mt-4" style={{ color: '#EF4444' }}>
              {exportError}
            </p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          SUMMARY STAT CHIPS
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "O'rtacha Ball",    val: `${meta.avgScore}%`,                          color: '#6366F1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)',  Icon: Target     },
          { label: 'Eng Yuqori Ball',  val: `${meta.highestScore}%`,                      color: '#22C55E', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   Icon: Star       },
          { label: 'Eng Past Ball',    val: `${meta.lowestScore}%`,                       color: '#3B82F6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  Icon: TrendingUp },
          { label: 'Qiyin Savol',      val: `Q${hardestQ.q} (${hardestQ.accuracy}%)`,    color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', Icon: BarChart3  },
        ].map(({ label, val, color, bg, border, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}25` }}
            >
              <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tabular-nums truncate" style={{ color: t.textPrimary }}>{val}</p>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════
          ROW — Leaderboard | Question Accuracy
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">

        {/* ─── LEADERBOARD ─── */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>Reyting Jadvali</h3>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Shu sessiyaning eng yaxshi natijalari</p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <Trophy className="w-4 h-4" style={{ color: '#F59E0B' }} strokeWidth={1.75} />
            </div>
          </div>

          {leaderboardLoading ? (
            <div className="py-6 text-center text-sm" style={{ color: t.textMuted }}>
              Reyting jadvali yuklanmoqda...
            </div>
          ) : leaderboardError && sorted.length === 0 ? (
            <div className="py-6 text-center text-sm" style={{ color: '#EF4444' }}>
              {leaderboardError}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-6 text-center text-sm" style={{ color: t.textMuted }}>
              Reyting jadvali mavjud emas
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {([top3[1], top3[0], top3[2]] as (StudentResult | undefined)[]).map((s, visualIdx) => {
                  if (!s) return <div key={visualIdx} />;
                  const actualRank = sorted.indexOf(s) + 1;
                  const heights = ['h-20', 'h-28', 'h-16'];
                  const medal = rankMedal(actualRank);
                  const sc = scoreColor(s.scorePercent);
                  return (
                    <div
                      key={s.id}
                      className={`flex flex-col items-center justify-end ${heights[visualIdx]} rounded-2xl px-2 pb-3 pt-2`}
                      style={{
                        background: visualIdx === 1
                          ? (t.isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.07)')
                          : t.bgInner,
                        border: `1px solid ${visualIdx === 1 ? 'rgba(245,158,11,0.3)' : t.border}`,
                      }}
                    >
                      {medal && (
                        <medal.Icon className="w-4 h-4 mb-1 shrink-0" style={{ color: medal.color }} strokeWidth={1.75} />
                      )}
                      {s.profileImage ? (
                        <img
                          src={s.profileImage}
                          alt={s.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 mb-1"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1"
                          style={{ background: s.color }}
                        >
                          {s.initials}
                        </div>
                      )}
                      <p className="text-xs font-semibold text-center truncate w-full" style={{ color: t.textPrimary }}>
                        {s.name.split(' ')[0]}
                      </p>
                      <span className="text-xs font-bold mt-0.5" style={{ color: sc.color }}>{s.scorePercent}%</span>
                    </div>
                  );
                })}
              </div>

              <div className="lb-scroll space-y-1.5 max-h-72 overflow-y-auto" onScroll={handleLeaderboardScroll}>
                {sorted.map((s, idx) => {
                  const rank = idx + 1;
                  const medal = rankMedal(rank);
                  const sc = scoreColor(s.scorePercent);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                      style={{ background: rank <= 3 ? (t.isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)') : 'transparent' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          rank <= 3 ? (t.isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)') : 'transparent';
                      }}
                    >
                      <div className="w-6 text-center shrink-0">
                        {medal
                          ? <medal.Icon className="w-4 h-4 mx-auto" style={{ color: medal.color }} strokeWidth={1.75} />
                          : <span className="text-xs tabular-nums" style={{ color: t.textMuted }}>{rank}</span>}
                      </div>
                      {s.profileImage ? (
                        <img
                          src={s.profileImage}
                          alt={s.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: s.color }}
                        >
                          {s.initials}
                        </div>
                      )}
                      <span className="flex-1 text-sm truncate" style={{ color: t.textPrimary }}>{s.name}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-lg"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                      >
                        {s.scorePercent}%
                      </span>
                    </div>
                  );
                })}
              </div>
              {leaderboardLoadingMore && (
                <p className="text-xs text-center mt-3" style={{ color: t.textMuted }}>
                  Yana o'quvchilar yuklanmoqda...
                </p>
              )}
              {leaderboardError && sorted.length > 0 && (
                <p className="text-xs text-center mt-3" style={{ color: '#EF4444' }}>
                  {leaderboardError}
                </p>
              )}
            </>
          )}
        </Card>

        {/* ─── QUESTION ACCURACY CHART ─── */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>Savol Aniqligi</h3>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>To'g'ri javob bergan o'quvchilar foizi</p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}
            >
              <BarChart3 className="w-4 h-4" style={{ color: t.accent }} strokeWidth={1.75} />
            </div>
          </div>

          {/* Horizontal bar chart */}
          {accuracyLoading ? (
            <div className="py-6 text-center text-sm" style={{ color: t.textMuted }}>
              Savol aniqligi yuklanmoqda...
            </div>
          ) : accuracyError ? (
            <div className="py-6 text-center text-sm" style={{ color: '#EF4444' }}>
              {accuracyError}
            </div>
          ) : questionAccuracy.length === 0 ? (
            <div className="py-6 text-center text-sm" style={{ color: t.textMuted }}>
              Savol aniqligi mavjud emas
            </div>
          ) : (
            <div className="lb-scroll space-y-3 max-h-[22.5rem] overflow-y-auto pr-1">
            {questionAccuracy.map(({ id: questionId, q, label, accuracy }) => {
              const barColor = accuracyColor(accuracy);
              return (
                <div key={questionId} className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-6 shrink-0 tabular-nums" style={{ color: t.textMuted }}>
                    {label || `Q${q}`}
                  </span>
                  <div className="flex-1 h-5 rounded-lg overflow-hidden relative" style={{ background: t.bgInner }}>
                    <div
                      className="h-full rounded-lg"
                      style={{ width: `${accuracy}%`, background: `${barColor}22`, border: `1px solid ${barColor}44` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg"
                      style={{
                        width: `${accuracy}%`,
                        background: `linear-gradient(90deg,${barColor}55,${barColor}22)`,
                        transition: 'width 0.7s ease',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-9 text-right shrink-0" style={{ color: barColor }}>
                    {accuracy}%
                  </span>
                </div>
              );
            })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4" style={{ borderTop: `1px solid ${t.border}` }}>
            {[
              { label: '≥75% Oson',     color: '#22C55E' },
              { label: '50–74% O\'rta', color: '#F59E0B' },
              { label: '<50% Qiyin',    color: '#EF4444' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <span className="text-xs" style={{ color: t.textMuted }}>{label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════
          STUDENT RESULTS TABLE (full width)
      ══════════════════════════════════════ */}
      <Card>
        {/* Header + sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>O'quvchi Natijalari</h3>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
              {leaderboardTotal || meta.participants} ta o'quvchi · tartib: {sortBy === 'score' ? 'ball' : sortBy === 'correct' ? "to'g'ri javoblar" : 'vaqt'}
            </p>
          </div>
          {/* Sort pills */}
          <div className="flex gap-1.5">
            {(['score', 'correct', 'time'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  background: sortBy === s ? t.accentMuted : t.bgInner,
                  color:      sortBy === s ? t.accent      : t.textMuted,
                  border:    `1px solid ${sortBy === s ? t.accentBorder : t.border}`,
                }}
              >
                {s === 'correct' ? "To'g'ri" : s === 'time' ? 'Vaqt' : 'Ball'}
              </button>
            ))}
          </div>
        </div>

        {leaderboardLoading ? (
          <div className="py-6 text-center text-sm" style={{ color: t.textMuted }}>
            O'quvchi natijalari yuklanmoqda...
          </div>
        ) : leaderboardError && sorted.length === 0 ? (
          <div className="py-6 text-center text-sm" style={{ color: '#EF4444' }}>
            {leaderboardError}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-6 text-center text-sm" style={{ color: t.textMuted }}>
            O'quvchi natijalari mavjud emas
          </div>
        ) : (
          <>
            <div
              className="hidden sm:block rounded-xl overflow-hidden max-h-[34rem] overflow-y-auto lb-scroll"
              style={{ border: `1px solid ${t.border}` }}
              onScroll={handleLeaderboardScroll}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
                    {['#', "O'quvchi", 'Ball', "To'g'ri", "Noto'g'ri", "O'tkazilgan", 'Vaqt'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: t.textMuted }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s, idx) => {
                    const rank = idx + 1;
                    const medal = rankMedal(rank);
                    const sc = scoreColor(s.scorePercent);
                    return (
                      <tr
                        key={s.id}
                        className="transition-colors"
                        style={{ borderBottom: idx < sorted.length - 1 ? `1px solid ${t.border}` : 'none' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <td className="px-4 py-3 w-10">
                          {medal
                            ? <medal.Icon className="w-4 h-4" style={{ color: medal.color }} strokeWidth={1.75} />
                            : <span className="text-xs tabular-nums" style={{ color: t.textMuted }}>{rank}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {s.profileImage ? (
                              <img
                                src={s.profileImage}
                                alt={s.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                style={{ background: s.color }}
                              >
                                {s.initials}
                              </div>
                            )}
                            <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{s.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                          >
                            {s.scorePercent}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#22C55E' }} strokeWidth={2} />
                            <span className="text-sm tabular-nums font-medium" style={{ color: '#22C55E' }}>{s.correct}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#EF4444' }} strokeWidth={2} />
                            <span className="text-sm tabular-nums font-medium" style={{ color: '#EF4444' }}>{s.wrong}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm tabular-nums" style={{ color: s.skipped > 0 ? '#F59E0B' : t.textMuted }}>
                            {s.skipped}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                            <span className="text-sm tabular-nums" style={{ color: t.textSecondary }}>{s.time}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="block sm:hidden space-y-2.5 max-h-[34rem] overflow-y-auto lb-scroll pr-1" onScroll={handleLeaderboardScroll}>
              {sorted.map((s, idx) => {
                const rank = idx + 1;
                const medal = rankMedal(rank);
                const sc = scoreColor(s.scorePercent);
                return (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl"
                    style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-6 shrink-0 text-center">
                        {medal
                          ? <medal.Icon className="w-4 h-4 mx-auto" style={{ color: medal.color }} strokeWidth={1.75} />
                          : <span className="text-xs" style={{ color: t.textMuted }}>{rank}</span>}
                      </div>
                      {s.profileImage ? (
                        <img
                          src={s.profileImage}
                          alt={s.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: s.color }}
                        >
                          {s.initials}
                        </div>
                      )}
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: t.textPrimary }}>{s.name}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-lg"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                      >
                        {s.scorePercent}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 pl-9">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" style={{ color: '#22C55E' }} strokeWidth={2} />
                        <span className="text-xs font-medium" style={{ color: '#22C55E' }}>{s.correct}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="w-3 h-3" style={{ color: '#EF4444' }} strokeWidth={2} />
                        <span className="text-xs font-medium" style={{ color: '#EF4444' }}>{s.wrong}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={1.75} />
                        <span className="text-xs" style={{ color: t.textSecondary }}>{s.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {leaderboardLoadingMore && (
              <p className="text-xs text-center mt-4" style={{ color: t.textMuted }}>
                Yana o'quvchilar yuklanmoqda...
              </p>
            )}
            {leaderboardError && sorted.length > 0 && (
              <p className="text-xs text-center mt-4" style={{ color: '#EF4444' }}>
                {leaderboardError}
              </p>
            )}
          </>
        )}
      </Card>
    </>
  );
}

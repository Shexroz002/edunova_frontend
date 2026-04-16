import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Search, X, Clock, Hash,
  Calculator, FlaskConical, Leaf, Languages, BookOpen,
  Play, Users, Eye, Sparkles, ChevronRight,
  Target, Zap, User, Globe,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { TestTimeModal } from '../../components/TestTimeModal';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const PAGE_SIZE = 50;

type Difficulty = 'Oson' | "O'rta" | 'Qiyin';
type QuizGenerateType = 'AI_GENERATE' | 'PDF' | 'MANUAL' | 'UNDEFINED';

interface Quiz {
  id: number;
  title: string;
  subject: string;
  description: string;
  questions: number;
  difficulty: Difficulty;
  generateType: QuizGenerateType;
  durationMin: number;
  participants: number;
  subjectColor: string;
  subjectIcon: string;
  isNew: boolean;
}

interface StudentQuizApiItem {
  created_at: string;
  question_count: number;
  description: string | null;
  subject: string | null;
  is_new: boolean;
  quiz_id: number;
  title: string | null;
  quiz_generate_type: QuizGenerateType | null;
}

interface StudentQuizListResponse {
  items: StudentQuizApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface StartSinglePlayerSessionResponse {
  session_id: number;
  quiz_id: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function difficultyStyle(d: Difficulty) {
  switch (d) {
    case 'Oson': return { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' };
    case "O'rta": return { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' };
    case 'Qiyin': return { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' };
  }
}

function quizTypeStyle(type: QuizGenerateType) {
  switch (type) {
    case 'AI_GENERATE':
      return { label: 'AI Generated', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' };
    case 'PDF':
      return { label: 'PDF', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' };
    case 'MANUAL':
      return { label: "Qo'lda", color: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' };
    case 'UNDEFINED':
    default:
      return { label: "Noma'lum", color: '#64748B', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.22)' };
  }
}

function SubjectIcon({ type, color, size = 20 }: { type: string; color: string; size?: number }) {
  const p = { style: { color }, strokeWidth: 1.75, width: size, height: size };
  switch (type) {
    case 'flask': return <FlaskConical {...p} />;
    case 'leaf': return <Leaf {...p} />;
    case 'book': return <BookOpen {...p} />;
    case 'languages': return <Languages {...p} />;
    case 'globe': return <Globe {...p} />;
    default: return <Calculator {...p} />;
  }
}

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function getSubjectPresentation(subject: string | null | undefined) {
  const normalized = normalizeText(subject).toLowerCase();

  switch (normalized) {
    case 'fizika':
      return { color: '#3B82F6', icon: 'flask' };
    case 'kimyo':
      return { color: '#22C55E', icon: 'leaf' };
    case 'biologiya':
      return { color: '#10B981', icon: 'leaf' };
    case 'ona tili':
    case 'adabiyot':
      return { color: '#F59E0B', icon: 'book' };
    case 'ingliz tili':
    case 'rus tili':
      return { color: '#EC4899', icon: 'languages' };
    case 'geografiya':
    case 'tarix':
      return { color: '#14B8A6', icon: 'globe' };
    case 'matematika':
    default:
      return { color: '#6366F1', icon: 'calculator' };
  }
}

function mapQuiz(item: StudentQuizApiItem): Quiz {
  const subject = normalizeText(item.subject, "Noma'lum fan");
  const title = normalizeText(item.title, 'Nomsiz test');
  const description = normalizeText(item.description, "Tavsif mavjud emas");
  const questionCount = typeof item.question_count === 'number' ? item.question_count : 0;
  const subjectPresentation = getSubjectPresentation(subject);
  const generateType = item.quiz_generate_type ?? 'UNDEFINED';

  return {
    id: item.quiz_id,
    title,
    subject,
    description,
    questions: questionCount,
    difficulty: questionCount >= 30 ? 'Qiyin' : questionCount >= 15 ? "O'rta" : 'Oson',
    generateType,
    durationMin: Math.max(10, questionCount),
    participants: 0,
    subjectColor: subjectPresentation.color,
    subjectIcon: subjectPresentation.icon,
    isNew: item.is_new,
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

async function fetchStudentQuizzes(search: string, page = 1, size = PAGE_SIZE) {
  const normalizedSearch = normalizeText(search);
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (normalizedSearch) {
    params.set('search', normalizedSearch);
  }

  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/student/quizzes/list?${params.toString()}`,
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(`Testlarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<StudentQuizListResponse>;
}

async function startSinglePlayerSession(quizId: number, durationMinute: number) {
  const params = new URLSearchParams({
    duration_minute: String(durationMinute),
  });

  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/student/sessions/${quizId}/start-single-player/?${params.toString()}`,
    {
      method: 'POST',
    },
  );

  if (!response.ok) {
    throw new Error(`Testni boshlashda xatolik: ${response.status}`);
  }

  return response.json() as Promise<StartSinglePlayerSessionResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Start Toast
// ─────────────────────────────────────────────────────────────────────────────
function StartToast({ message, onDone }: { message: string; onDone: () => void }) {
  const { theme: t } = useTheme();
  const [show, setShow] = useState(false);

  useState(() => {
    const a = requestAnimationFrame(() => setShow(true));
    const b = setTimeout(() => { setShow(false); setTimeout(onDone, 300); }, 2500);
    return () => { cancelAnimationFrame(a); clearTimeout(b); };
  });

  return (
    <div className="fixed bottom-6 left-1/2 z-[60] pointer-events-none"
      style={{
        transform: `translate(-50%, 0) scale(${show ? 1 : 0.95})`,
        opacity: show ? 1 : 0,
        transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl whitespace-nowrap"
        style={{
          background: t.isDark ? '#1E293B' : '#fff',
          border: `1px solid ${t.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          color: t.textPrimary,
          fontSize: 14,
          fontWeight: 600,
        }}>
        <Play style={{ width: 14, height: 14, color: '#818CF8' }} strokeWidth={2.5} fill="#818CF8" />
        {message}
      </div>
    </div>
  );
}

function getNearestTimeOption(value: number) {
  const options = [10, 15, 20, 30, 45, 60, 90, 120];

  return options.reduce((closest, current) => {
    return Math.abs(current - value) < Math.abs(closest - value) ? current : closest;
  }, 15);
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz Card
// ─────────────────────────────────────────────────────────────────────────────
function QuizCard({
  quiz,
  onView,
  onStart,
  onMulti,
  isStarting,
}: {
  quiz: Quiz;
  onView: (q: Quiz) => void;
  onStart: (q: Quiz) => void;
  onMulti: (q: Quiz) => void;
  isStarting: boolean;
}) {
  const { theme: t } = useTheme();
  const diff = difficultyStyle(quiz.difficulty);
  const typeCfg = quizTypeStyle(quiz.generateType);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200 group"
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = quiz.subjectColor + '45';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = t.shadowHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = t.border;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = t.shadowCard;
      }}
    >
      {/* Top accent bar */}
      <div className="h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, ${quiz.subjectColor}, ${quiz.subjectColor}20)` }} />

      <div className="p-4 sm:p-5">
        {/* ── Row 1: icon + title + badges ── */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${quiz.subjectColor}15`, border: `1.5px solid ${quiz.subjectColor}30` }}>
            <SubjectIcon type={quiz.subjectIcon} color={quiz.subjectColor} size={20} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: quiz.subjectColor }}>
                {quiz.subject}
              </span>
              {quiz.isNew && (
                <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md"
                  style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff' }}>
                  <Sparkles style={{ width: 8, height: 8 }} strokeWidth={2.5} />
                  YANGI
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded-md text-xs font-semibold"
                style={{ background: typeCfg.bg, color: typeCfg.color, border: `1px solid ${typeCfg.border}` }}>
                {typeCfg.label}
              </span>
              <span className="px-1.5 py-0.5 rounded-md text-xs font-semibold ml-auto"
                style={{ background: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}>
                {quiz.difficulty}
              </span>
            </div>

            <h3 className="font-bold mt-1 leading-snug" style={{ fontSize: 15, color: t.textPrimary }}>
              {quiz.title}
            </h3>

            <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: t.textSecondary }}>
              {quiz.description}
            </p>
          </div>
        </div>

        {/* ── Row 2: metadata chips ── */}
        <div className="flex items-center gap-2 mt-3.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.border}` }}>
            <Hash style={{ width: 12, height: 12, color: t.textMuted }} strokeWidth={1.75} />
            <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>{quiz.questions} savol</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.border}` }}>
            <Clock style={{ width: 12, height: 12, color: t.textMuted }} strokeWidth={1.75} />
            <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>{quiz.durationMin} daqiqa</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.border}` }}>
            <Users style={{ width: 12, height: 12, color: t.textMuted }} strokeWidth={1.75} />
            <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>{quiz.participants} ta</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-4 mb-3.5"
          style={{ height: 1, background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />

        {/* ── Row 3: Action buttons ── */}
        <div className="flex items-center gap-2">
          {/* Testni boshlash — PRIMARY */}
          <button
            onClick={() => onStart(quiz)}
            disabled={isStarting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              opacity: isStarting ? 0.8 : 1,
              cursor: isStarting ? 'wait' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (isStarting) return;
              (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(99,102,241,0.45)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            {isStarting ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Boshlanmoqda...
              </>
            ) : (
              <>
                <Play style={{ width: 13, height: 13 }} strokeWidth={2.5} fill="currentColor" />
                Testni boshlash
              </>
            )}
          </button>

          {/* Do'stlar bilan — SECONDARY */}
          <button
            onClick={() => onMulti(quiz)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold transition-all text-xs"
            style={{
              background: t.isDark ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.08)',
              color: t.isDark ? '#38BDF8' : '#0284C7',
              border: `1px solid ${t.isDark ? 'rgba(56,189,248,0.28)' : 'rgba(56,189,248,0.22)'}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.18)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.08)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <Users style={{ width: 13, height: 13 }} strokeWidth={2} />
            <span className="hidden sm:inline">Do'stlar bilan</span>
            <span className="sm:hidden">Multiplayer</span>
          </button>

          {/* Ko'rish — ICON → navigates to detail page */}
          <button
            onClick={() => onView(quiz)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all shrink-0"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${t.border}`,
              color: t.textMuted,
            }}
            title="Batafsil ko'rish"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)';
              (e.currentTarget as HTMLElement).style.color = t.isDark ? '#818CF8' : '#6366F1';
              (e.currentTarget as HTMLElement).style.borderColor = t.isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
              (e.currentTarget as HTMLElement).style.color = t.textMuted;
              (e.currentTarget as HTMLElement).style.borderColor = t.border;
            }}
          >
            <Eye style={{ width: 15, height: 15 }} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export function StudentTestsPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedTime, setSelectedTime] = useState(15);
  const [startError, setStartError] = useState<string | null>(null);
  const [startingQuizId, setStartingQuizId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchStudentQuizzes(search);
        if (cancelled) return;

        setQuizzes(data.items.map(mapQuiz));
        setTotal(data.total);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Testlarni yuklab bo'lmadi");
        setQuizzes([]);
        setTotal(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [search, reloadKey]);

  function handleView(quiz: Quiz) {
    navigate(`/student/tests/${quiz.id}`);
  }
  function handleStart(quiz: Quiz) {
    setSelectedQuiz(quiz);
    setSelectedTime(getNearestTimeOption(quiz.durationMin));
    setStartError(null);
    setStartModalOpen(true);
  }

  async function handleConfirmStart(timeLimit: number) {
    if (!selectedQuiz) return;

    try {
      setSelectedTime(timeLimit);
      setStartingQuizId(selectedQuiz.id);
      setStartError(null);
      const data = await startSinglePlayerSession(selectedQuiz.id, timeLimit);
      setStartModalOpen(false);
      setSelectedQuiz(null);
      navigate(`/student/test-taking/${data.session_id}?quiz_id=${data.quiz_id}`);
    } catch (err: unknown) {
      setStartError(err instanceof Error ? err.message : "Testni boshlab bo'lmadi");
    } finally {
      setStartingQuizId(null);
    }
  }
  function handleMulti(quiz: Quiz) {
    navigate('/student/competition', {
      state: {
        preselectedQuizId: quiz.id,
      },
    });
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6366F1'; (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="font-bold text-lg sm:text-xl" style={{ color: t.textPrimary }}>Testlar</h1>
            <p className="text-xs" style={{ color: t.textMuted }}>Mavjud testlar ro'yxati</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/student/profile')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textSecondary }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6366F1'; (e.currentTarget as HTMLElement).style.color = '#818CF8'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}
        >
          <User style={{ width: 16, height: 16 }} strokeWidth={2} />
        </button>
      </div>

      {/* ── INTRO BANNER ── */}
      <div
        className="rounded-2xl px-5 py-5 mb-6 relative overflow-hidden"
        style={{
          background: t.isDark
            ? 'linear-gradient(135deg,rgba(99,102,241,0.22) 0%,rgba(139,92,246,0.14) 50%,rgba(56,189,248,0.08) 100%)'
            : 'linear-gradient(135deg,rgba(99,102,241,0.09) 0%,rgba(139,92,246,0.06) 50%,rgba(56,189,248,0.04) 100%)',
          border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.2)'}`,
          boxShadow: t.isDark ? '0 8px 32px rgba(99,102,241,0.15)' : t.shadowCard,
        }}
      >
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.15),transparent)' }} />
        <div className="absolute -bottom-8 left-12 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(56,189,248,0.1),transparent)' }} />

        <div className="flex items-center gap-4 relative">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)',
              border: `1.5px solid ${t.isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.25)'}`,
              boxShadow: t.isDark ? '0 0 20px rgba(99,102,241,0.25)' : 'none',
            }}>
            <Zap style={{ width: 22, height: 22, color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg" style={{ color: t.textPrimary }}>Testlar</h2>
            <p className="text-xs sm:text-sm mt-0.5 leading-relaxed" style={{ color: t.textSecondary }}>
              Bilimingizni sinab ko'ring va natijalarni yaxshilang
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {[
            { label: `${total} ta test`, color: t.isDark ? '#818CF8' : '#6366F1', bg: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)', border: t.isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.15)' },
            { label: `${quizzes.filter((q) => q.isNew).length} ta yangi`, color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
            { label: `${[...new Set(quizzes.map((q) => q.subject))].length} ta fan`, color: t.isDark ? '#38BDF8' : '#0284C7', bg: t.isDark ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.07)', border: t.isDark ? 'rgba(56,189,248,0.25)' : 'rgba(56,189,248,0.18)' },
          ].map(({ label, color, bg, border }) => (
            <span key={label} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: bg, color, border: `1px solid ${border}` }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── SEARCH ── */}
      <div className="relative mb-5">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width: 15, height: 15, color: t.textMuted }}
          strokeWidth={2}
        />
        <input
          type="text"
          placeholder="Testlarni izlash..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 rounded-xl text-sm focus:outline-none transition-all"
          style={{ background: t.bgCard, border: `1.5px solid ${t.border}`, color: t.textPrimary, height: '46px' }}
          onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
          onBlur={(e) => { (e.target as HTMLElement).style.borderColor = t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center transition-all"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted }}>
            <X style={{ width: 12, height: 12 }} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── RESULT COUNTER ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#6366F1' }} />
          <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>
            {loading ? 'Yuklanmoqda...' : `${total} ta test topildi`}
          </span>
        </div>
        {search && (
          <span className="text-xs" style={{ color: t.textMuted }}>
            "<span style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}>{search}</span>" bo'yicha
          </span>
        )}
      </div>

      {/* ── QUIZ LIST ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
          style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
          <div
            className="w-12 h-12 rounded-2xl border-2 animate-spin"
            style={{ borderColor: `${t.border}`, borderTopColor: '#6366F1' }}
          />
          <p className="text-sm font-semibold" style={{ color: t.textSecondary }}>
            Testlar yuklanmoqda...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-5"
          style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <Target style={{ width: 26, height: 26, color: '#EF4444' }} strokeWidth={1.75} />
          </div>
          <div className="text-center px-6">
            <p className="font-bold text-base" style={{ color: t.textPrimary }}>Testlarni yuklab bo'lmadi</p>
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: t.textMuted }}>
              {error}
            </p>
          </div>
          <button
            onClick={() => {
              setReloadKey((current) => current + 1);
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', color: t.isDark ? '#818CF8' : '#6366F1', border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}` }}
          >
            Qayta urinish
          </button>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-5"
          style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)', border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}` }}>
            <Search style={{ width: 26, height: 26, color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.5} />
          </div>
          <div className="text-center px-6">
            <p className="font-bold text-base" style={{ color: t.textPrimary }}>Test topilmadi</p>
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: t.textMuted }}>
              "<span style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}>{search}</span>" bo'yicha hech narsa topilmadi.
            </p>
          </div>
          <button onClick={() => setSearch('')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', color: t.isDark ? '#818CF8' : '#6366F1', border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}` }}>
            Qidiruvni tozalash
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onView={handleView}
              onStart={handleStart}
              onMulti={handleMulti}
              isStarting={startingQuizId === quiz.id}
            />
          ))}
        </div>
      )}

      <TestTimeModal
        open={startModalOpen}
        onClose={() => {
          if (startingQuizId !== null) return;
          setStartModalOpen(false);
          setSelectedQuiz(null);
          setStartError(null);
        }}
        onStart={handleConfirmStart}
        testTitle={selectedQuiz?.title ?? 'Test'}
        questionCount={selectedQuiz?.questions}
        initialTimeLimit={selectedTime}
        isStarting={selectedQuiz !== null && startingQuizId === selectedQuiz.id}
        error={startError}
      />

      <div className="h-6" />

      {/* ── TOAST ── */}
      {toast && <StartToast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

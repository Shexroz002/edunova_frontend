import { useState, useMemo, useEffect, useDeferredValue, useRef } from 'react';
import {
  Search, Plus, ChevronDown, FileText, Clock,
  Eye, Edit2, BarChart3, Cpu, Upload, PenLine,
  BookOpen, Users, Hash, X, Check, ChevronRight,
  ArrowLeft, FileUp, Sparkles, Zap, Calculator,
  FlaskConical, Leaf, GraduationCap, AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTheme } from '../../components/ThemeContext.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';
import { QuizCreatedSuccessModal, type QuizCreationResult } from '../../components/QuizCreatedSuccessModal.tsx';

// ── Data ──────────────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const AI_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const WS_BASE_URL = import.meta.env.WEBSOCKET_BASE_URL ?? 'ws://127.0.0.1:8000';
const AI_WS_BASE_URL = import.meta.env.WEBSOCKET_BASE_URL ?? 'ws://127.0.0.1:8000';
const PAGE_SIZE = 10;
const QUIZ_JOB_STORAGE_KEY = 'teacher_dashboard_quiz_job';

export type QuizType = 'manual' | 'pdf' | 'ai' | 'undefined';
type QuizGenerateType = 'AI_GENERATE' | 'PDF' | 'MANUAL' | 'UNDEFINED';

export interface Quiz {
  id: number;
  title: string;
  subject: string;
  questions: number;
  type: QuizType;
  createdDate: string;
  createdMonth: string;
  attempts: number;
  avgScore: number;
}

export const QUIZZES: Quiz[] = [];

const SUBJECT_OPTIONS = ['Barchasi', 'Matematika', 'Fizika', 'Kimyo', 'Biologiya'];
const TYPE_OPTIONS = ['Barchasi', "Qo'lda", 'PDF', 'AI Generated', 'Noma\'lum'];

const TYPE_KEY_MAP: Record<string, QuizGenerateType | null> = {
  'Barchasi': null,
  "Qo'lda": 'MANUAL',
  'PDF': 'PDF',
  'AI Generated': 'AI_GENERATE',
  "Noma'lum": 'UNDEFINED',
};

interface QuizApiItem {
  id: number;
  title: string;
  subject: string;
  quiz_generate_type: QuizGenerateType;
  question_count: number;
  attempts: number;
  average_score: string;
  created_at: string;
}

interface QuizListResponse {
  items: QuizApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface PdfJobCreateResponse {
  job_id: string;
  status: string;
  progress: number;
  message: string;
  task_id: string;
}

interface PdfJobSocketEvent {
  type: string;
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  quiz_id: number | null;
  question_count: number | null;
  error: string | null;
}

interface SubjectApiItem {
  id: number;
  name: string;
}

interface StoredQuizJob {
  jobId: string;
  method: CreateMethod;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' };
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

function mapQuizType(type: QuizGenerateType): QuizType {
  switch (type) {
    case 'AI_GENERATE':
      return 'ai';
    case 'PDF':
      return 'pdf';
    case 'MANUAL':
      return 'manual';
    case 'UNDEFINED':
    default:
      return 'undefined';
  }
}

function formatQuizDate(value: string) {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const monthNumber = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const monthNames = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
  const month = monthNames[date.getUTCMonth()] ?? '';

  return {
    createdDate: `${year}-${monthNumber}-${day}`,
    createdMonth: month,
  };
}

function mapQuiz(item: QuizApiItem): Quiz {
  const { createdDate, createdMonth } = formatQuizDate(item.created_at);

  return {
    id: item.id,
    title: item.title,
    subject: item.subject,
    questions: item.question_count,
    type: mapQuizType(item.quiz_generate_type),
    createdDate,
    createdMonth,
    attempts: item.attempts,
    avgScore: Number.parseFloat(item.average_score) || 0,
  };
}

async function fetchQuizPage(search: string, quizType: QuizGenerateType | null, page: number, size = PAGE_SIZE) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (search.trim()) {
    params.set('search', search.trim());
  }

  if (quizType) {
    params.set('quiz_generate_type', quizType);
  }

  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/teacher/quizzes/list?${params.toString()}`,
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(`Testlarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<QuizListResponse>;
}

async function uploadPdfQuizJob(file: File) {
  let token = await getValidAccessToken();
  if (!token) {
    throw new Error('Sessiya topilmadi. Qayta kiring');
  }

  const formData = new FormData();
  formData.append('file', file);

  const makeRequest = (accessToken: string) => fetch(`${AI_API_BASE_URL}/api/v1/quiz-generator/pdf-jobs`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
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

  if (!response.ok) {
    throw new Error(`PDF yuklashda xatolik: ${response.status}`);
  }

  return {
    token,
    data: await response.json() as PdfJobCreateResponse,
  };
}

function buildPdfJobSocketUrl(jobId: string, token: string) {
  const url = new URL(`${AI_WS_BASE_URL}/ws/jobs/${jobId}/`);
  url.searchParams.set('token', token);
  return url.toString();
}

function buildJobSocketUrl(baseUrl: string, jobId: string, token: string) {
  const socketBaseUrl = baseUrl === AI_API_BASE_URL ? AI_WS_BASE_URL : WS_BASE_URL;
  const url = new URL(`${socketBaseUrl}/ws/jobs/${jobId}/`);
  url.searchParams.set('token', token);
  return url.toString();
}

async function fetchSubjects() {
  const response = await fetch(`${API_BASE_URL}/api/v1/subject/list/`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Fanlarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<SubjectApiItem[]>;
}

async function createAiQuizJob(subjectId: number, description: string, questionCount: number) {
  let token = await getValidAccessToken();
  if (!token) {
    throw new Error('Sessiya topilmadi. Qayta kiring');
  }

  const params = new URLSearchParams({
    subject: String(subjectId),
    description,
    question_count: String(questionCount),
  });

  const makeRequest = (accessToken: string) => fetch(`${API_BASE_URL}/api/v1/quiz-generator/quiz/generate?${params.toString()}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
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

  if (!response.ok) {
    throw new Error(`AI test yaratishda xatolik: ${response.status}`);
  }

  return {
    token,
    data: await response.json() as PdfJobCreateResponse,
  };
}

async function fetchQuizJobStatus(jobId: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/quiz-generator/jobs/${jobId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Job holatini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<PdfJobSocketEvent>;
}

function getStoredQuizJob(): StoredQuizJob | null {
  const raw = localStorage.getItem(QUIZ_JOB_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredQuizJob;
  } catch {
    localStorage.removeItem(QUIZ_JOB_STORAGE_KEY);
    return null;
  }
}

function persistQuizJob(job: StoredQuizJob) {
  localStorage.setItem(QUIZ_JOB_STORAGE_KEY, JSON.stringify(job));
}

function clearStoredQuizJob() {
  localStorage.removeItem(QUIZ_JOB_STORAGE_KEY);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function QuizTypeBadge({ type }: { type: QuizType }) {
  const cfg = {
    manual: { label: "Qo'lda", Icon: PenLine, color: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' },
    pdf: { label: 'PDF', Icon: Upload, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
    ai: { label: 'AI Generated', Icon: Cpu, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
    undefined: { label: "Noma'lum", Icon: FileText, color: '#64748B', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.22)' },
  }[type];
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <Icon className="w-3 h-3" strokeWidth={2} />
      {cfg.label}
    </span>
  );
}

function FilterSelect({
  value, options, onChange, placeholder,
}: {
  value: string; options: string[]; onChange: (v: string) => void; placeholder?: string;
}) {
  const { theme: t } = useTheme();
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pr-8 pl-3 rounded-xl text-sm focus:outline-none cursor-pointer transition-all"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          color: value === 'Barchasi' ? t.textMuted : t.textPrimary,
          height: '40px',
          minWidth: '138px',
          boxShadow: t.shadowCard,
        }}
        onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; }}
        onBlur={(e) => { (e.target as HTMLElement).style.borderColor = t.border; }}
      >
        {options.map((o) => (
          <option key={o} value={o} style={{ background: t.bgCard }}>{o}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: t.textMuted }} />
    </div>
  );
}

function IconBtn({
  icon: Icon, label, color, onClick,
}: {
  icon: React.ElementType; label: string; color?: string; onClick?: () => void;
}) {
  const { theme: t } = useTheme();
  return (
    <button
      title={label}
      onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0"
      style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: color ?? t.textMuted }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = color ? `${color}18` : t.bgCardHover;
        (e.currentTarget as HTMLElement).style.borderColor = color ?? t.accentBorder;
        (e.currentTarget as HTMLElement).style.color = color ?? t.accent;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = t.bgInner;
        (e.currentTarget as HTMLElement).style.borderColor = t.border;
        (e.currentTarget as HTMLElement).style.color = color ?? t.textMuted;
      }}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
    </button>
  );
}

// ── Stat summary chips ────────────────────────────────────────────────────────
function SummaryChips({ quizzes }: { quizzes: Quiz[] }) {
  const { theme: t } = useTheme();
  const totalAttempts = quizzes.reduce((s, q) => s + q.attempts, 0);
  const avgScore = quizzes.length
    ? Math.round(quizzes.reduce((s, q) => s + q.avgScore, 0) / quizzes.length)
    : 0;
  const sc = scoreColor(avgScore);

  const chips = [
    { Icon: FileText, val: `${quizzes.length}`, label: 'Test', color: t.accent, bg: t.accentMuted, border: t.accentBorder },
    { Icon: Users, val: `${totalAttempts}`, label: 'Urinish', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
    { Icon: BarChart3, val: `${avgScore}%`, label: "O'rtacha", color: sc.color, bg: sc.bg, border: sc.border },
  ];

  return (
    <div className="flex flex-wrap gap-2.5 mb-5">
      {chips.map(({ Icon, val, label, color, bg, border }) => (
        <div
          key={label}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
          style={{ background: bg, border: `1px solid ${border}` }}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} strokeWidth={1.75} />
          <span className="text-xs font-bold" style={{ color }}>{val}</span>
          <span className="text-xs" style={{ color: t.textMuted }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  const { theme: t } = useTheme();
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
      >
        <FileText className="w-7 h-7" style={{ color: t.textMuted }} strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>Test topilmadi</p>
        <p className="text-xs mt-1" style={{ color: t.textMuted }}>Qidiruv yoki filterni o'zgartiring</p>
      </div>
    </div>
  );
}

// ── Subject Icon Component ────────────────────────────────────────────────────
function SubjectIcon({ type, color, size = 20 }: { type: string; color: string; size?: number }) {
  const props = { style: { color }, strokeWidth: 1.75, width: size, height: size };
  switch (type) {
    case 'zap': return <Zap {...props} />;
    case 'flask': return <FlaskConical {...props} />;
    case 'leaf': return <Leaf {...props} />;
    case 'graduate': return <GraduationCap {...props} />;
    default: return <Calculator {...props} />;
  }
}

// ── Create Quiz Modal ─────────────────────────────────────────────────────────
interface CreateQuizModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (quiz: Partial<Quiz>) => void;
  onPdfCreated: (payload: QuizCreationResult) => void;
}

type CreateMethod = 'pdf' | 'ai' | null;

const SUBJECTS = [
  { id: null, label: 'Matematika', icon: 'calculator', color: '#6366F1' },
  { id: null, label: 'Fizika', icon: 'zap', color: '#3B82F6' },
  { id: null, label: 'Kimyo', icon: 'flask', color: '#22C55E' },
  { id: null, label: 'Biologiya', icon: 'leaf', color: '#8B5CF6' },
  { id: null, label: 'Tarix', icon: 'graduate', color: '#F59E0B' },
  { id: null, label: 'Geografiya', icon: 'graduate', color: '#14B8A6' },
  { id: null, label: 'Ingliz tili', icon: 'graduate', color: '#EC4899' },
  { id: null, label: 'Adabiyot', icon: 'graduate', color: '#EF4444' },
];

function PdfJobErrorModal({
  open,
  message,
  onClose,
  onRetry,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { theme: t } = useTheme();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6"
        style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle className="w-6 h-6" style={{ color: '#EF4444' }} strokeWidth={1.9} />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: t.textPrimary }}>
          PDF qayta ishlanmadi
        </h3>
        <p className="text-sm leading-6 mb-6" style={{ color: t.textSecondary }}>
          {message}
        </p>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl text-sm font-semibold"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
          >
            Yopish
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 h-11 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
          >
            Qayta urinish
          </button>
        </div>
      </div>
    </div>
  );
}

export function CreateQuizModal({ open, onClose, onCreate, onPdfCreated }: CreateQuizModalProps) {
  const { theme: t } = useTheme();
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<number | null>(null);
  const activeJobRef = useRef<string | null>(null);
  const closedManuallyRef = useRef(false);

  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<CreateMethod>(null);
  const [creating, setCreating] = useState(false);

  // Common fields
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjects, setSubjects] = useState(SUBJECTS);
  const [subjectsError, setSubjectsError] = useState('');

  // PDF fields
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDragActive, setPdfDragActive] = useState(false);

  // AI fields
  const [aiTopic, setAiTopic] = useState('');
  const [aiQuestions, setAiQuestions] = useState(20);
  const [topicError, setTopicError] = useState('');
  const [pdfJob, setPdfJob] = useState<PdfJobSocketEvent | null>(null);
  const [pdfJobError, setPdfJobError] = useState<string | null>(null);

  const handleCloseModal = () => {
    closedManuallyRef.current = true;
    onClose();
  };

  // Filter subjects based on search
  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return subjects;
    const q = subjectSearch.toLowerCase();
    return subjects.filter((s) => s.label.toLowerCase().includes(q));
  }, [subjectSearch, subjects]);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      closedManuallyRef.current = false;
      setStep(1);
      setMethod(null);
      setCreating(false);
      setSubject(SUBJECTS[0]);
      setPdfFile(null);
      setAiTopic('');
      setAiQuestions(20);
      setTopicError('');
      setSubjectDropdownOpen(false);
      setSubjectSearch('');
      setPdfJob(null);
      setPdfJobError(null);
      setSubjects(SUBJECTS);
      setSubjectsError('');
    }
  }, [open]);

  useEffect(() => () => {
    wsRef.current?.close();
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    fetchSubjects()
      .then((items) => {
        if (cancelled || items.length === 0) return;
        const mapped = items.map((item) => {
          const existing = SUBJECTS.find((subjectItem) => subjectItem.label.toLowerCase() === item.name.toLowerCase());
          return {
            id: item.id,
            label: item.name,
            icon: existing?.icon ?? 'graduate',
            color: existing?.color ?? '#6366F1',
          };
        });
        setSubjects(mapped);
        setSubject((current) => mapped.find((item) => item.label === current.label) ?? mapped[0]);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSubjectsError(err instanceof Error ? err.message : "Fanlarni yuklab bo'lmadi");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const finishTrackedJob = (payload: PdfJobSocketEvent) => {
    clearStoredQuizJob();
    activeJobRef.current = null;
    wsRef.current?.close();
    stopPolling();
    setPdfJob(payload);
    setCreating(false);

    if (payload.status === 'completed' && payload.quiz_id) {
      onClose();
      onPdfCreated({
        type: 'completed',
        job_id: payload.job_id,
        status: 'completed',
        progress: payload.progress,
        message: payload.message,
        quiz_id: payload.quiz_id,
        question_count: payload.question_count ?? 0,
        error: null,
      });
      return;
    }

    if (payload.status === 'failed') {
      setPdfJobError(payload.error || payload.message || "Jarayonni yakunlashda xatolik yuz berdi");
    }
  };

  const pollJobStatus = (jobId: string) => {
    stopPolling();
    pollRef.current = window.setInterval(async () => {
      try {
        const payload = await fetchQuizJobStatus(jobId);
        setPdfJob(payload);

        if (payload.status === 'completed' || payload.status === 'failed') {
          finishTrackedJob(payload);
        }
      } catch (err: unknown) {
        setPdfJobError(err instanceof Error ? err.message : "Job holatini tekshirishda xatolik yuz berdi");
      }
    }, 3000);
  };

  const connectToTrackedJob = async (jobId: string, jobMethod: CreateMethod) => {
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('Sessiya topilmadi. Qayta kiring');
    }

    activeJobRef.current = jobId;
    wsRef.current?.close();
    stopPolling();

    const socket = new WebSocket(buildJobSocketUrl(jobMethod === 'pdf' ? AI_API_BASE_URL : API_BASE_URL, jobId, token));
    wsRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as PdfJobSocketEvent;
        setPdfJob(payload);

        if (payload.status === 'completed' || payload.status === 'failed') {
          finishTrackedJob(payload);
        }
      } catch {
        pollJobStatus(jobId);
      }
    };

    socket.onerror = () => {
      pollJobStatus(jobId);
    };

    socket.onclose = () => {
      wsRef.current = null;
      if (!closedManuallyRef.current && activeJobRef.current === jobId) {
        pollJobStatus(jobId);
      }
    };
  };

  useEffect(() => {
    if (!open) return;

    const storedJob = getStoredQuizJob();
    if (!storedJob?.jobId || !storedJob.method) return;

    let cancelled = false;

    setMethod(storedJob.method);
    setStep(2);
    setCreating(true);

    fetchQuizJobStatus(storedJob.jobId)
      .then((payload) => {
        if (cancelled) return;
        setPdfJob(payload);

        if (payload.status === 'completed' || payload.status === 'failed') {
          finishTrackedJob(payload);
          return;
        }

        connectToTrackedJob(storedJob.jobId, storedJob.method).catch((err: unknown) => {
          if (!cancelled) {
            setPdfJobError(err instanceof Error ? err.message : "Jobga ulanishda xatolik yuz berdi");
            pollJobStatus(storedJob.jobId);
          }
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPdfJobError(err instanceof Error ? err.message : "Job holatini tekshirishda xatolik yuz berdi");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleMethodSelect(m: CreateMethod) {
    setMethod(m);
    setStep(2);
  }

  async function handleNext() {
    if (step === 2) {
      // Validate method-specific fields
      if (method === 'pdf') {
        if (!pdfFile) {
          setPdfJobError('Iltimos PDF faylni yuklang');
          return;
        }
      }

      if (method === 'ai') {
        if (!aiTopic.trim()) {
          setTopicError('Mavzuni kiriting');
          return;
        }
        if (!subject.id) {
          setPdfJobError("Fan identifikatori topilmadi. Fanlar ro'yxatini qayta yuklang");
          return;
        }
        setTopicError('');
      }

      // Create quiz
      setCreating(true);

      if (method === 'pdf' && pdfFile) {
        try {
          setPdfJobError(null);
          const { token, data } = await uploadPdfQuizJob(pdfFile);
          const initialPayload = {
            type: 'snapshot',
            job_id: data.job_id,
            status: data.status as PdfJobSocketEvent['status'],
            progress: data.progress,
            message: data.message,
            quiz_id: null,
            question_count: null,
            error: null,
          };
          setPdfJob(initialPayload);
          persistQuizJob({ jobId: data.job_id, method: 'pdf' });
          activeJobRef.current = data.job_id;

          const socket = new WebSocket(buildPdfJobSocketUrl(data.job_id, token));
          wsRef.current?.close();
          wsRef.current = socket;

          socket.onmessage = (event) => {
            try {
              const payload = JSON.parse(event.data) as PdfJobSocketEvent;
              setPdfJob(payload);

              if (payload.status === 'completed' || payload.status === 'failed') {
                finishTrackedJob(payload);
              }
            } catch {
              pollJobStatus(data.job_id);
            }
          };

          socket.onerror = () => {
            pollJobStatus(data.job_id);
          };

          socket.onclose = () => {
            wsRef.current = null;
            if (!closedManuallyRef.current && activeJobRef.current === data.job_id) {
              pollJobStatus(data.job_id);
            }
          };
        } catch (err: unknown) {
          setCreating(false);
          setPdfJobError(err instanceof Error ? err.message : 'PDF yuklashda xatolik yuz berdi');
        }
        return;
      }

      if (method === 'ai' && subject.id) {
        try {
          setPdfJobError(null);
          const { token, data } = await createAiQuizJob(subject.id, aiTopic.trim(), aiQuestions);
          const initialPayload = {
            type: 'snapshot',
            job_id: data.job_id,
            status: data.status as PdfJobSocketEvent['status'],
            progress: data.progress,
            message: data.message,
            quiz_id: null,
            question_count: null,
            error: null,
          };
          setPdfJob(initialPayload);
          persistQuizJob({ jobId: data.job_id, method: 'ai' });
          activeJobRef.current = data.job_id;

          const socket = new WebSocket(buildJobSocketUrl(API_BASE_URL, data.job_id, token));
          wsRef.current?.close();
          wsRef.current = socket;

          socket.onmessage = (event) => {
            try {
              const payload = JSON.parse(event.data) as PdfJobSocketEvent;
              setPdfJob(payload);

              if (payload.status === 'completed' || payload.status === 'failed') {
                finishTrackedJob(payload);
              }
            } catch {
              pollJobStatus(data.job_id);
            }
          };

          socket.onerror = () => {
            pollJobStatus(data.job_id);
          };

          socket.onclose = () => {
            wsRef.current = null;
            if (!closedManuallyRef.current && activeJobRef.current === data.job_id) {
              pollJobStatus(data.job_id);
            }
          };
        } catch (err: unknown) {
          setCreating(false);
          setPdfJobError(err instanceof Error ? err.message : 'AI test yaratishda xatolik yuz berdi');
        }
        return;
      }

      onCreate({
        // title: title.trim(),
        subject: subject.label,
        questions: aiQuestions,
        type: method!,
      });
      setCreating(false);
      onClose();
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((s) => s - 1);
      if (step === 2) setMethod(null);
    }
  }

  // PDF file handlers
  function handlePdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  }

  function handlePdfDrop(e: React.DragEvent) {
    e.preventDefault();
    setPdfDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  }

  if (!open) return null;

  const accentColor = method === 'pdf' ? '#3B82F6' : method === 'ai' ? '#8B5CF6' : '#6366F1';
  const isJobProcessing = creating && pdfJob !== null;
  const progressTitle = method === 'ai' ? 'AI test yaratilmoqda' : 'PDF testga aylantirilmoqda';
  const progressIntro = method === 'ai' ? 'AI sizning so‘rovingiz bo‘yicha test tayyorlamoqda' : 'AI yuklangan PDF faylni testga aylantirmoqda';
  const jobMilestones = method === 'ai'
    ? ['So‘rov qabul qilindi', 'AI tayyorlanmoqda', 'Savollar yaratilmoqda', 'Test saqlanmoqda']
    : ['Fayl qabul qilindi', 'PDF tahlil qilinmoqda', 'AI savollar yaratmoqda', 'Test tayyorlanmoqda'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(7px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !creating) handleCloseModal(); }}
    >
      <div
        className="w-full max-w-2xl flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.isDark ? accentColor + '30' : t.border}`,
          boxShadow: t.isDark
            ? `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${accentColor}15`
            : '0 32px 80px rgba(15,23,42,0.2)',
          maxHeight: '92vh',
        }}
      >
        {/* Gradient top bar */}
        <div className="h-1 w-full shrink-0"
          style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80, #8B5CF6)` }} />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: accentColor + '18', border: `1.5px solid ${accentColor}40` }}
            >
              {method === 'pdf' ? (
                <FileUp style={{ width: 18, height: 18, color: accentColor }} strokeWidth={1.75} />
              ) : method === 'ai' ? (
                <Sparkles style={{ width: 18, height: 18, color: accentColor }} strokeWidth={1.75} />
              ) : (
                <Plus style={{ width: 18, height: 18, color: accentColor }} strokeWidth={1.75} />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: t.textPrimary }}>
                {step === 1 ? 'Test yaratish usulini tanlang' : 'Yangi test yaratish'}
              </h2>
              <p className="text-xs" style={{ color: t.textMuted }}>
                {step === 1 ? 'PDF yoki AI yordamida' : method === 'pdf' ? 'PDF fayldan' : 'AI yordamida'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            disabled={creating}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted, opacity: creating ? 0.5 : 1 }}
            onMouseEnter={(e) => { if (!creating) { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)'; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
          >
            <X style={{ width: 15, height: 15 }} strokeWidth={2} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-5 pb-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${t.border} transparent` } as React.CSSProperties}>
          {isJobProcessing ? (
            <div className="space-y-5 pb-5">
              <div
                className="rounded-3xl p-5 sm:p-6"
                style={{
                  background: t.isDark
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(14,165,233,0.06))'
                    : 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(14,165,233,0.03))',
                  border: `1px solid ${t.isDark ? 'rgba(59,130,246,0.28)' : 'rgba(59,130,246,0.18)'}`,
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.22)' }}
                  >
                    <div className="w-7 h-7 rounded-full border-2 border-[#3B82F6]/20 border-t-[#3B82F6] animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: '#3B82F6' }}>
                      AI Jarayoni
                    </p>
                    <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: t.textPrimary }}>
                      {progressTitle}
                    </h3>
                    <p className="text-sm leading-6" style={{ color: t.textSecondary }}>
                      {pdfJob?.message || progressIntro}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                      Jarayon holati
                    </span>
                    <span className="text-sm font-bold" style={{ color: '#3B82F6' }}>
                      {pdfJob?.progress ?? 0}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: t.bgInner }}>
                    <div
                      className="h-3 rounded-full transition-all duration-700"
                      style={{
                        width: `${pdfJob?.progress ?? 0}%`,
                        background: 'linear-gradient(90deg, #3B82F6, #06B6D4)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {jobMilestones.map((label, index) => {
                  const active = (pdfJob?.progress ?? 0) >= index * 25;
                  return (
                    <div
                      key={label}
                      className="flex items-center gap-3 p-4 rounded-2xl"
                      style={{
                        background: active ? 'rgba(59,130,246,0.08)' : t.bgInner,
                        border: `1px solid ${active ? 'rgba(59,130,246,0.18)' : t.border}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: active ? 'rgba(59,130,246,0.14)' : t.bgCard,
                          border: `1px solid ${active ? 'rgba(59,130,246,0.24)' : t.border}`,
                          color: active ? '#3B82F6' : t.textMuted,
                        }}
                      >
                        {active ? <Check className="w-4 h-4" strokeWidth={2.3} /> : <Clock className="w-4 h-4" strokeWidth={1.9} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color: active ? t.textPrimary : t.textSecondary }}>
                          {label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                          {active ? 'Bajarilmoqda' : 'Kutilmoqda'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
              >
                <p className="text-xs" style={{ color: t.textMuted }}>
                  Jarayon tugagach test sahifasi avtomatik ochiladi.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ═════ STEP 1: Choose Method ═════ */}
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5">
                  {/* PDF Option */}
                  <button
                    onClick={() => handleMethodSelect('pdf')}
                    className="group p-6 rounded-2xl text-left transition-all relative overflow-hidden"
                    style={{
                      background: t.isDark ? t.bgInner : t.bgCard,
                      border: `2px solid ${t.border}`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#3B82F6';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.04)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(59,130,246,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = t.border;
                      (e.currentTarget as HTMLElement).style.background = t.isDark ? t.bgInner : t.bgCard;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}
                    >
                      <FileUp style={{ width: 24, height: 24, color: '#3B82F6' }} strokeWidth={1.75} />
                    </div>
                    <h3 className="text-base font-bold mb-2" style={{ color: t.textPrimary }}>
                      PDF fayldan
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>
                      Mavjud PDF hujjatingizdan testni avtomatik yarating. AI savollarni tahlil qiladi va test tuzadi.
                    </p>
                    <div className="mt-4 pt-3 border-t flex items-center gap-2" style={{ borderColor: t.border }}>
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textSecondary }}>
                        <Clock style={{ width: 12, height: 12 }} strokeWidth={1.75} />
                        <span>~2-3 daqiqa</span>
                      </div>
                      <div className="w-1 h-1 rounded-full" style={{ background: t.textMuted }} />
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textSecondary }}>
                        <Zap style={{ width: 12, height: 12 }} strokeWidth={1.75} />
                        <span>Avtomatik</span>
                      </div>
                    </div>
                  </button>

                  {/* AI Option */}
                  <button
                    onClick={() => handleMethodSelect('ai')}
                    className="group p-6 rounded-2xl text-left transition-all relative overflow-hidden"
                    style={{
                      background: t.isDark ? t.bgInner : t.bgCard,
                      border: `2px solid ${t.border}`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#8B5CF6';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.04)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(139,92,246,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = t.border;
                      (e.currentTarget as HTMLElement).style.background = t.isDark ? t.bgInner : t.bgCard;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}
                    >
                      <Sparkles style={{ width: 24, height: 24, color: '#8B5CF6' }} strokeWidth={1.75} />
                    </div>
                    <h3 className="text-base font-bold mb-2" style={{ color: t.textPrimary }}>
                      AI bilan yaratish
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>
                      Mavzu va parametrlarni kiriting, AI sizga qiyin va sifatli test savollarini yaratib beradi.
                    </p>
                    <div className="mt-4 pt-3 border-t flex items-center gap-2" style={{ borderColor: t.border }}>
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textSecondary }}>
                        <Clock style={{ width: 12, height: 12 }} strokeWidth={1.75} />
                        <span>~1-2 daqiqa</span>
                      </div>
                      <div className="w-1 h-1 rounded-full" style={{ background: t.textMuted }} />
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textSecondary }}>
                        <Sparkles style={{ width: 12, height: 12 }} strokeWidth={1.75} />
                        <span>Intellektual</span>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* ═════ STEP 2: Create Form ═════ */}
              {step === 2 && (
                <div className="space-y-5 pb-5">
                  {method === 'ai' && (
                    <>
                      {/* Subject selection */}
                      <div className="relative">
                        <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
                          Fan *
                        </label>
                        <button
                          type="button"
                          onClick={() => setSubjectDropdownOpen((current) => !current)}
                          className="w-full rounded-2xl px-4 py-3 text-left transition-all"
                          style={{
                            background: t.bgInner,
                            border: `1.5px solid ${subjectDropdownOpen ? accentColor : t.border}`,
                            boxShadow: subjectDropdownOpen ? `0 0 0 3px ${accentColor}15` : 'none',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: `${subject.color}18`, border: `1px solid ${subject.color}35` }}
                            >
                              <SubjectIcon type={subject.icon} color={subject.color} size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                                {subject.label}
                              </div>
                              <div className="text-xs truncate" style={{ color: t.textMuted }}>
                                AI test shu fan asosida yaratiladi
                              </div>
                            </div>
                            <ChevronDown
                              className={`shrink-0 transition-transform ${subjectDropdownOpen ? 'rotate-180' : ''}`}
                              style={{ width: 16, height: 16, color: t.textMuted }}
                            />
                          </div>
                        </button>

                        {subjectDropdownOpen && (
                          <div
                            className="mt-3 overflow-hidden rounded-2xl"
                            style={{
                              background: t.bgCard,
                              border: `1px solid ${t.border}`,
                              boxShadow: t.isDark
                                ? '0 20px 48px rgba(15,23,42,0.42)'
                                : '0 18px 40px rgba(15,23,42,0.12)',
                            }}
                          >
                            <div className="p-3 border-b" style={{ borderColor: t.border }}>
                              <div
                                className="flex items-center gap-2 rounded-xl px-3"
                                style={{ background: t.bgInner, border: `1px solid ${t.border}`, height: '42px' }}
                              >
                                <Search style={{ width: 15, height: 15, color: t.textMuted }} strokeWidth={1.75} />
                                <input
                                  type="text"
                                  value={subjectSearch}
                                  onChange={(e) => setSubjectSearch(e.target.value)}
                                  placeholder="Qidirish..."
                                  className="w-full bg-transparent text-sm focus:outline-none"
                                  style={{ color: t.textPrimary }}
                                />
                              </div>
                            </div>

                            <div className="max-h-64 overflow-y-auto py-1">
                              {filteredSubjects.map((s) => {
                                const isSelected = subject.id === s.id;
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      setSubject(s);
                                      setSubjectDropdownOpen(false);
                                      setSubjectSearch('');
                                    }}
                                    className="w-full px-4 py-3 text-left transition-colors"
                                    style={{
                                      background: isSelected ? `${s.color}14` : 'transparent',
                                      borderBottom: `1px solid ${t.border}`,
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: `${s.color}15`, border: `1px solid ${s.color}2E` }}
                                      >
                                        <SubjectIcon type={s.icon} color={s.color} size={16} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div
                                          className="text-sm font-semibold truncate"
                                          style={{ color: isSelected ? s.color : t.textPrimary }}
                                        >
                                          {s.label}
                                        </div>
                                        <div className="text-xs truncate" style={{ color: t.textMuted }}>
                                          Fan
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <div
                                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                          style={{ border: `1px solid ${s.color}66`, background: `${s.color}15` }}
                                        >
                                          <Check style={{ width: 12, height: 12, color: s.color }} strokeWidth={2.5} />
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                              {filteredSubjects.length === 0 && (
                                <div className="px-4 py-6 text-sm text-center" style={{ color: t.textMuted }}>
                                  Hech qanday fan topilmadi
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {subjectsError && (
                          <p className="text-xs mt-2" style={{ color: '#EF4444' }}>
                            {subjectsError}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* ─── PDF specific fields ─── */}
                  {method === 'pdf' && (
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
                        PDF fayl *
                      </label>
                      <div
                        className="relative rounded-2xl border-2 border-dashed transition-all"
                        style={{
                          borderColor: pdfDragActive ? '#3B82F6' : pdfFile ? '#22C55E' : t.border,
                          background: pdfDragActive ? 'rgba(59,130,246,0.05)' : pdfFile ? 'rgba(34,197,94,0.03)' : t.bgInner,
                        }}
                        onDragEnter={() => setPdfDragActive(true)}
                        onDragLeave={() => setPdfDragActive(false)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handlePdfDrop}
                      >
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handlePdfSelect}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="p-8 flex flex-col items-center text-center">
                          {pdfFile ? (
                            <>
                              <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
                              >
                                <FileUp style={{ width: 28, height: 28, color: '#22C55E' }} strokeWidth={1.75} />
                              </div>
                              <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>
                                {pdfFile.name}
                              </p>
                              <p className="text-xs" style={{ color: t.textMuted }}>
                                {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              <button
                                onClick={(e) => { e.stopPropagation(); setPdfFile(null); }}
                                className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                              >
                                O'chirish
                              </button>
                            </>
                          ) : (
                            <>
                              <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                                style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}
                              >
                                <FileUp style={{ width: 28, height: 28, color: '#3B82F6' }} strokeWidth={1.75} />
                              </div>
                              <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>
                                PDF faylni yuklang
                              </p>
                              <p className="text-xs" style={{ color: t.textMuted }}>
                                Faylni bu yerga sudrab oling yoki tanlash uchun bosing
                              </p>
                              <p className="text-xs mt-2" style={{ color: t.textMuted }}>
                                Maksimal: 10 MB
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── AI specific fields ─── */}
                  {method === 'ai' && (
                    <>
                      {/* Description */}
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
                          Tavsif *
                        </label>
                        <textarea
                          value={aiTopic}
                          onChange={(e) => { setAiTopic(e.target.value); setTopicError(''); }}
                          placeholder="Masalan: Fizika fanidan dinamika va saqlanish qonunlari bo'yicha test yaratib ber"
                          rows={4}
                          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all resize-none"
                          style={{
                            background: t.bgInner,
                            border: `1.5px solid ${topicError ? '#EF4444' : t.border}`,
                            color: t.textPrimary,
                          }}
                          onFocus={(e) => {
                            (e.target as HTMLElement).style.borderColor = topicError ? '#EF4444' : accentColor;
                            (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${topicError ? 'rgba(239,68,68,0.15)' : accentColor + '15'}`;
                          }}
                          onBlur={(e) => {
                            (e.target as HTMLElement).style.borderColor = topicError ? '#EF4444' : t.border;
                            (e.target as HTMLElement).style.boxShadow = 'none';
                          }}
                        />
                        {topicError && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <AlertCircle style={{ width: 12, height: 12, color: '#EF4444' }} strokeWidth={2} />
                            <p className="text-xs" style={{ color: '#EF4444' }}>{topicError}</p>
                          </div>
                        )}
                      </div>

                      {/* Questions count */}
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
                          Savollar soni
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={aiQuestions}
                            onChange={(e) => setAiQuestions(Math.max(5, Math.min(50, parseInt(e.target.value) || 10)))}
                            min={5}
                            max={50}
                            className="w-full px-4 rounded-xl text-sm focus:outline-none transition-all"
                            style={{
                              background: t.bgInner,
                              border: `1.5px solid ${t.border}`,
                              color: t.textPrimary,
                              height: '48px',
                            }}
                            onFocus={(e) => {
                              (e.target as HTMLElement).style.borderColor = accentColor;
                              (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${accentColor}15`;
                            }}
                            onBlur={(e) => {
                              (e.target as HTMLElement).style.borderColor = t.border;
                              (e.target as HTMLElement).style.boxShadow = 'none';
                            }}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Hash style={{ width: 14, height: 14, color: t.textMuted }} strokeWidth={1.75} />
                          </div>
                        </div>
                        <p className="text-xs mt-1" style={{ color: t.textMuted }}>5-50 oralig'ida</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!isJobProcessing && step > 0 && (
          <div
            className="px-6 py-4 shrink-0 flex gap-2.5"
            style={{ borderTop: `1px solid ${t.border}`, background: t.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}
          >
            {step > 1 ? (
              <button
                onClick={handleBack}
                disabled={creating}
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
                style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary, opacity: creating ? 0.5 : 1 }}
                onMouseEnter={(e) => { if (!creating) { (e.currentTarget as HTMLElement).style.borderColor = accentColor; (e.currentTarget as HTMLElement).style.color = accentColor; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}
              >
                <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                onClick={handleCloseModal}
                className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all"
                style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.textMuted; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
              >
                Bekor qilish
              </button>
            )}

            {step === 2 && (
              <button
                onClick={handleNext}
                disabled={creating}
                className="flex-[2] h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all text-white"
                style={{
                  background: creating ? accentColor + '55' : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                  boxShadow: creating ? 'none' : `0 5px 18px ${accentColor}40`,
                  cursor: creating ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!creating) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${accentColor}55`; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = creating ? 'none' : `0 5px 18px ${accentColor}40`; }}
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Yaratilmoqda...
                  </>
                ) : (
                  <>
                    <Check style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                    Test yaratish
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <PdfJobErrorModal
        open={pdfJobError !== null}
        message={pdfJobError ?? ''}
        onClose={() => setPdfJobError(null)}
        onRetry={() => {
          setPdfJobError(null);
          setPdfJob(null);
          setCreating(false);
          stopPolling();
        }}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function QuizzesPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [subjectF, setSubjectF] = useState('Barchasi');
  const [typeF, setTypeF] = useState('Barchasi');
  const deferredSearch = useDeferredValue(search);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, typeF]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchQuizPage(deferredSearch, TYPE_KEY_MAP[typeF], page, PAGE_SIZE)
      .then((data) => {
        if (cancelled) return;
        setQuizzes(data.items.map(mapQuiz));
        setTotal(data.total);
        setPages(Math.max(1, data.pages));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setQuizzes([]);
        setTotal(0);
        setPages(1);
        setError(err instanceof Error ? err.message : 'Testlarni yuklashda xatolik yuz berdi');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, typeF, page]);

  const filtered = useMemo(() => quizzes.filter((q) => {
    if (subjectF !== 'Barchasi' && q.subject !== subjectF) return false;
    return true;
  }), [quizzes, subjectF]);

  const TABLE_HEADERS = ['Test', 'Savollar', 'Test turi', 'Sana', 'Urinishlar', "O'rtacha ball", ''];

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [quizCreatedModalData, setQuizCreatedModalData] = useState<QuizCreationResult | null>(null);

  useEffect(() => {
    if (getStoredQuizJob()) {
      setCreateModalOpen(true);
    }
  }, []);

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>Testlar</h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMuted }}>
          Barcha testlarni boshqaring, tahrirlang va tahlil qiling
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: t.textMuted }}
          />
          <input
            type="text"
            placeholder="Testlarni qidiring..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 rounded-xl text-sm focus:outline-none transition-all"
            style={{
              background: t.bgCard, border: `1px solid ${t.border}`,
              color: t.textPrimary, height: '40px', boxShadow: t.shadowCard,
            }}
            onFocus={(e) => {
              (e.target as HTMLElement).style.borderColor = '#6366F1';
              (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
            }}
            onBlur={(e) => {
              (e.target as HTMLElement).style.borderColor = t.border;
              (e.target as HTMLElement).style.boxShadow = t.shadowCard;
            }}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <FilterSelect value={subjectF} options={SUBJECT_OPTIONS} onChange={setSubjectF} />
          <FilterSelect value={typeF} options={TYPE_OPTIONS} onChange={setTypeF} />
        </div>

        {/* Create button */}
        <button
          className="flex items-center justify-center gap-2 px-5 rounded-xl text-sm font-semibold text-white transition-all shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            height: '40px',
            boxShadow: t.isDark ? '0 4px 16px rgba(99,102,241,0.3)' : '0 3px 12px rgba(99,102,241,0.22)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(99,102,241,0.35)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = t.isDark ? '0 4px 16px rgba(99,102,241,0.3)' : '0 3px 12px rgba(99,102,241,0.22)'; }}
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Test yaratish
        </button>
      </div>

      {/* ── Summary chips ── */}
      <SummaryChips quizzes={filtered} />

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#DC2626' }}
        >
          {error}
        </div>
      )}

      {/* ════════════════════════════════════════
          DESKTOP / TABLET — Table
      ═════════════════════════════════���══════ */}
      <div
        className="hidden sm:block rounded-2xl overflow-hidden"
        style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
      >
        {loading ? (
          <div className="px-4 py-10 text-sm text-center" style={{ color: t.textMuted }}>
            Testlar yuklanmoqda...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
                {TABLE_HEADERS.map((h, i) => (
                  <th
                    key={i}
                    className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${i === TABLE_HEADERS.length - 1 ? 'text-right' : ''}`}
                    style={{ color: t.textMuted }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, idx) => {
                const sc = scoreColor(q.avgScore);
                return (
                  <tr
                    key={q.id}
                    className="group transition-colors cursor-default"
                    style={{ borderBottom: idx < filtered.length - 1 ? `1px solid ${t.border}` : 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {/* Quiz title + metadata */}
                    <td className="px-4 py-3.5" style={{ maxWidth: '280px' }}>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: q.type === 'ai'
                              ? 'rgba(139,92,246,0.1)'
                              : q.type === 'pdf'
                                ? 'rgba(59,130,246,0.1)'
                                : q.type === 'undefined'
                                  ? 'rgba(100,116,139,0.12)'
                                  : t.accentMuted,
                            border: `1px solid ${q.type === 'ai'
                              ? 'rgba(139,92,246,0.25)'
                              : q.type === 'pdf'
                                ? 'rgba(59,130,246,0.25)'
                                : q.type === 'undefined'
                                  ? 'rgba(100,116,139,0.22)'
                                  : t.accentBorder}`,
                          }}
                        >
                          {q.type === 'ai'
                            ? <Cpu className="w-4 h-4" style={{ color: '#8B5CF6' }} strokeWidth={1.75} />
                            : q.type === 'pdf'
                              ? <Upload className="w-4 h-4" style={{ color: '#3B82F6' }} strokeWidth={1.75} />
                              : q.type === 'undefined'
                                ? <FileText className="w-4 h-4" style={{ color: '#64748B' }} strokeWidth={1.75} />
                                : <PenLine className="w-4 h-4" style={{ color: t.accent }} strokeWidth={1.75} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{q.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <BookOpen className="w-3 h-3 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                            <span className="text-xs" style={{ color: t.textMuted }}>{q.subject}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Questions count */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={1.75} />
                        <span className="text-sm" style={{ color: t.textSecondary }}>{q.questions} ta</span>
                      </div>
                    </td>

                    {/* Quiz type */}
                    <td className="px-4 py-3.5">
                      <QuizTypeBadge type={q.type} />
                    </td>

                    {/* Created date */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={1.75} />
                        <span className="text-xs" style={{ color: t.textMuted }}>{q.createdDate}</span>
                      </div>
                    </td>

                    {/* Attempts */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={1.75} />
                        <span className="text-sm" style={{ color: t.textSecondary }}>{q.attempts}</span>
                      </div>
                    </td>

                    {/* Average score */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-lg"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                        >
                          {q.avgScore}%
                        </span>
                        <div className="w-14 h-1.5 rounded-full overflow-hidden hidden lg:block" style={{ background: t.bgInner }}>
                          <div
                            className="h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${q.avgScore}%`, background: sc.color, opacity: 0.7 }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <IconBtn icon={Eye} label="Ko'rish" color="#6366F1" onClick={() => navigate(`/quizzes/${q.id}`)} />
                        {/*<IconBtn icon={Edit2}    label="Tahrirlash" color="#3B82F6" />*/}
                        {/*<IconBtn icon={BarChart3} label="Tahlil"   color="#8B5CF6" />*/}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ════════════════════════════════════════
          MOBILE — Stacked cards
      ════════════════════════════════════════ */}
      <div className="block sm:hidden space-y-3">
        {loading ? (
          <div
            className="rounded-2xl px-4 py-10 text-sm text-center"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard, color: t.textMuted }}
          >
            Testlar yuklanmoqda...
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-2xl"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
          >
            <EmptyState />
          </div>
        ) : (
          filtered.map((q) => {
            const sc = scoreColor(q.avgScore);
            return (
              <div
                key={q.id}
                className="p-4 rounded-2xl"
                style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
              >
                {/* Top row */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: q.type === 'ai'
                        ? 'rgba(139,92,246,0.1)'
                        : q.type === 'pdf'
                          ? 'rgba(59,130,246,0.1)'
                          : q.type === 'undefined'
                            ? 'rgba(100,116,139,0.12)'
                            : t.accentMuted,
                      border: `1px solid ${q.type === 'ai'
                        ? 'rgba(139,92,246,0.25)'
                        : q.type === 'pdf'
                          ? 'rgba(59,130,246,0.25)'
                          : q.type === 'undefined'
                            ? 'rgba(100,116,139,0.22)'
                            : t.accentBorder}`,
                    }}
                  >
                    {q.type === 'ai'
                      ? <Cpu className="w-4.5 h-4.5" style={{ color: '#8B5CF6' }} strokeWidth={1.75} />
                      : q.type === 'pdf'
                        ? <Upload className="w-4.5 h-4.5" style={{ color: '#3B82F6' }} strokeWidth={1.75} />
                        : q.type === 'undefined'
                          ? <FileText className="w-4.5 h-4.5" style={{ color: '#64748B' }} strokeWidth={1.75} />
                          : <PenLine className="w-4.5 h-4.5" style={{ color: t.accent }} strokeWidth={1.75} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug" style={{ color: t.textPrimary }}>{q.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{q.subject}</p>
                  </div>
                  <QuizTypeBadge type={q.type} />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { Icon: Hash, val: `${q.questions}`, label: 'Savol', color: t.textPrimary },
                    { Icon: Users, val: `${q.attempts}`, label: 'Urinish', color: '#3B82F6' },
                    { Icon: BarChart3, val: `${q.avgScore}%`, label: "O'rtacha", color: sc.color },
                  ].map(({ Icon, val, label, color }) => (
                    <div
                      key={label}
                      className="p-2.5 rounded-xl text-center"
                      style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                    >
                      <p className="text-sm font-bold" style={{ color }}>{val}</p>
                      <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={1.75} />
                    <span className="text-xs" style={{ color: t.textMuted }}>{q.createdDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconBtn icon={Eye} label="Ko'rish" color="#6366F1" onClick={() => navigate(`/quizzes/${q.id}`)} />
                    {/*<IconBtn icon={Edit2}     label="Tahrirlash" color="#3B82F6" />*/}
                    {/*<IconBtn icon={BarChart3} label="Tahlil"     color="#8B5CF6" />*/}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs sm:text-sm" style={{ color: t.textMuted }}>
          {total > 0 ? `${total} ta testdan ${page}-sahifa` : 'Testlar topilmadi'}
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

      {/* ── Create Quiz Modal ── */}
      <CreateQuizModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={(quiz) => {
          const newQuiz: Quiz = {
            id: Date.now(),
            title: quiz.title!,
            subject: quiz.subject!,
            questions: quiz.questions!,
            type: quiz.type!,
            createdDate: 'Bugun',
            createdMonth: 'mart',
            attempts: 0,
            avgScore: 0,
          };
          QUIZZES.unshift(newQuiz);
          setQuizzes((current) => [newQuiz, ...current]);
        }}
        onPdfCreated={(payload) => {
          setCreateModalOpen(false);
          setQuizCreatedModalData(payload);
        }}
      />

      <QuizCreatedSuccessModal
        open={quizCreatedModalData !== null}
        onClose={() => setQuizCreatedModalData(null)}
        getQuizPath={(quizId) => `/quizzes/${quizId}`}
        data={quizCreatedModalData ?? {
          type: 'completed',
          job_id: '',
          status: 'completed',
          progress: 100,
          message: "Test tayyor bo'ldi",
          quiz_id: null,
          question_count: 0,
          error: null,
        }}
      />
    </>
  );
}

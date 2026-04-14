import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  ArrowLeft, Edit2, BookOpen,
  Clock, Users, Hash, CheckCircle, XCircle,
  AlertCircle, Cpu, Upload, PenLine,
  Target, TrendingUp, Award, X, Save,
  ChevronDown, Eye,
  Image as ImageIcon, Table2,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';
import { QuestionDetailModal } from '../../components/QuestionDetailModal.tsx';
import { QUIZZES } from './QuizzesPage.tsx';
import type { QuizType, Quiz } from './QuizzesPage.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// ─────────────────────────────────────────────
//  Mock data generators  (exported for reuse)
// ─────────────────────────────────────────────
export type Difficulty = 'oson' | "o'rta" | 'qiyin';

export interface Question {
  id: number;
  num: number;
  text: string;
  topic: string;
  difficulty: Difficulty;
  correctRate: number;
}

interface QuizQuestionApiItem {
  id: number;
  question_text: string;
  topic: string;
  difficulty: string;
}

interface QuizDetailApiResponse {
  id: number;
  title: string;
  description: string;
  subject: string;
  questions: QuizQuestionApiItem[];
}

interface QuizDetailView extends Quiz {
  description: string;
}

type QuizGenerateTypeApi = 'AI_GENERATE' | 'PDF' | 'MANUAL' | 'UNDEFINED';

// Question detail interface for modal
export interface QuestionDetail {
  id: number;
  subject: string;
  question_text: string;
  table_markdown: string;
  difficulty: Difficulty;
  topic: string;
  images: Array<{ id: number; image_url: string }>;
  options: Array<{
    id: number;
    label: string;
    text: string;
    is_correct: boolean;
  }>;
}

interface QuestionDetailApiResponse {
  id: number;
  subject: string;
  question_text: string;
  table_markdown: string;
  difficulty: string;
  topic: string;
  images: Array<{ id: number; image_url: string }>;
  options: Array<{
    id: number;
    label: string;
    text: string;
    is_correct: boolean;
  }>;
}

interface QuizStatisticsResponse {
  total_attempts: number;
  average_score: number;
  completion_rate: number;
  success_rate: number;
  highest_score: number;
  champions_count: number;
}

type StatisticKey =
  | 'average_score'
  | 'completion_rate'
  | 'success_rate'
  | 'total_attempts'
  | 'highest_score'
  | 'champions_count';

const STATISTIC_DESCRIPTIONS: Record<StatisticKey, string> = {
  average_score: "O‘quvchilarning ushbu test bo‘yicha o‘rtacha natijasini ko‘rsatadi. Ya’ni barcha ishlangan testlardan olingan ballarning o‘rtacha qiymati.",
  completion_rate: "Testni boshlagan o‘quvchilarning nechta foizi uni oxirigacha bajarganini bildiradi. Bu ko‘rsatkich o‘quvchilarning testni yakunlash darajasini ko‘rsatadi.",
  success_rate: "Testdan muvaffaqiyatli o‘tgan o‘quvchilar foizini bildiradi. Ya’ni belgilangan minimal ball yoki mezondan yuqori natija ko‘rsatganlar ulushi.",
  total_attempts: "Ushbu test necha marta ishlanganini ko‘rsatadi. Har bir o‘quvchining urinishlari ham hisobga olinadi.",
  highest_score: "Test bo‘yicha qayd etilgan eng yuqori natijani bildiradi. Ya’ni o‘quvchilar orasida eng yaxshi ishlangan ball.",
  champions_count: "Eng yuqori natija ko‘rsatgan o‘quvchilar sonini bildiradi. Ya’ni liderlar yoki eng yaxshi natijaga ega bo‘lganlar.",
};

export const TOPIC_BANKS: Record<string, string[]> = {
  Matematika: ['Algebra', 'Geometriya', 'Trigonometriya', 'Statistika', 'Sonlar nazariyasi'],
  Fizika: ['Mexanika', 'Optika', 'Elektr', 'Termodinamika', 'Yadro fizikasi'],
  Kimyo: ['Anorganik kimyo', 'Organik kimyo', 'Elektrokimyo', 'Termokimyo', 'Moddalar'],
  Biologiya: ['Hujayra', 'Genetika', 'Evolyutsiya', 'Ekologiya', 'Anatomiya'],
};

export const QUESTION_TEXTS: Record<string, string[]> = {
  Matematika: [
    'Ikkinchi darajali tenglamaning diskriminantini toping.',
    'Uchburchakning perimetrini hisoblang.',
    'sin(30°) + cos(60°) = ?',
    'Arifmetik progressiyaning 10-hadini toping.',
    'Kvadrat tenglamani yechish usullarini sanab bering.',
    "Funksiyaning hosilasini toping: f(x) = x³ – 2x + 1.",
    'Logarifmik tengsizlikni yeching.',
    "Vektorlar skalyar ko'paytmasini hisoblang.",
    "Cheksiz geometrik progressiya yig'indisi formulasi nima?",
    'Matritsa determinantini hisoblang.',
  ],
  Fizika: [
    "Nyutonning ikkinchi qonunini ifodalang.",
    "Kinetik energiya formulasini yozing.",
    "Ohm qonuni nimani ifodalaydi?",
    "Yorug'lik tezligi qancha m/s?",
    "Termodinamikaning birinchi boshi nima?",
    "Elektr zanjirida quvvat qanday hisoblanadi?",
    "Erkin tushish tezlanishi qancha?",
    "Magnit maydon kuchlanganligini ifodalang.",
    "Ideal gaz qonunlarini yozing.",
    "Rezonans hodisasi nima?",
  ],
  Kimyo: [
    "Vodorod atomi elektron konfiguratsiyasini yozing.",
    "Kislota va ishqor reaksiyasi mahsulotlari nima?",
    "Mendeleev jadvali qanday tartibda tuzilgan?",
    "Oksidlanish-qaytarilish reaksiyasi nima?",
    "Organik kimyoda alken guruhini aniqlang.",
    "pH qiymati 7 dan kichik bo'lsa, eritma qanday?",
    "Mol massasini qanday hisoblash mumkin?",
    "Elektroliz jarayonini tushuntiring.",
    "Kimyoviy muvozanat nima?",
    "Polimer va monomer o'rtasidagi farq nima?",
  ],
  Biologiya: [
    "Hujayra membranasining asosiy funksiyasi nima?",
    "DNK replikatsiyasi nima?",
    "Mendel qonunlarini sanab bering.",
    "Fotosintez jarayonida nima hosil bo'ladi?",
    "Ekosistema va biotsenoz o'rtasidagi farq nima?",
    "Mitozning bosqichlarini sanang.",
    "Qon guruhlarini belgilovchi antigenlar qaysilar?",
    "Evolyutsiyaning asosiy omillari nima?",
    "Ferment nima va u qanday ishlaydi?",
    "Immunitet tizimi nima uchun kerak?",
  ],
};

export const DIFFICULTIES: Difficulty[] = ['oson', "o'rta", 'qiyin'];

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

async function fetchQuizDetail(quizId: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/quizzes/${quizId}/`, {
    method: 'GET',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Test ma'lumotlarini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<QuizDetailApiResponse>;
}

function mapQuizTypeToApi(type: QuizType): QuizGenerateTypeApi {
  switch (type) {
    case 'ai':
      return 'AI_GENERATE';
    case 'pdf':
      return 'PDF';
    case 'manual':
      return 'MANUAL';
    case 'undefined':
    default:
      return 'UNDEFINED';
  }
}

async function updateQuizDetail(quizId: number, payload: {
  title: string;
  quiz_generate_type: QuizGenerateTypeApi;
  subject: string;
  description: string;
}) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/quizzes/${quizId}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Testni saqlashda xatolik: ${response.status}`);
  }

  return response.json().catch(() => null);
}

async function fetchQuestionDetail(questionId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/question/detail/${questionId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Savol tafsilotlarini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<QuestionDetailApiResponse>;
}

async function fetchQuizStatistics(quizId: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/quizzes/${quizId}/statistic`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Test statistikasini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<QuizStatisticsResponse>;
}

function normalizeDifficulty(value: string): Difficulty {
  if (value === 'oson' || value === "o'rta" || value === 'qiyin') {
    return value;
  }

  return "o'rta";
}

function buildQuizDetail(apiQuiz: QuizDetailApiResponse, fallback: Quiz | undefined): QuizDetailView {
  return {
    id: apiQuiz.id,
    title: apiQuiz.title,
    description: apiQuiz.description,
    subject: apiQuiz.subject,
    questions: apiQuiz.questions.length,
    type: fallback?.type ?? 'manual',
    createdDate: fallback?.createdDate ?? '-',
    createdMonth: fallback?.createdMonth ?? '',
    attempts: fallback?.attempts ?? 0,
    avgScore: fallback?.avgScore ?? 0,
  };
}

function mapQuestions(apiQuestions: QuizQuestionApiItem[]): Question[] {
  return apiQuestions.map((question, index) => ({
    id: question.id,
    num: index + 1,
    text: question.question_text,
    topic: question.topic,
    difficulty: normalizeDifficulty(question.difficulty),
    correctRate: Math.max(28, Math.min(95, 85 - ((index * 11 + 7) % 50))),
  }));
}

function mapQuestionDetail(detail: QuestionDetailApiResponse): QuestionDetail {
  return {
    id: detail.id,
    subject: detail.subject,
    question_text: detail.question_text,
    table_markdown: detail.table_markdown,
    difficulty: normalizeDifficulty(detail.difficulty),
    topic: detail.topic,
    images: detail.images ?? [],
    options: detail.options ?? [],
  };
}

export function genQuestions(subject: string, count: number): Question[] {
  const topics = TOPIC_BANKS[subject] ?? TOPIC_BANKS['Matematika'];
  const texts = QUESTION_TEXTS[subject] ?? QUESTION_TEXTS['Matematika'];
  return Array.from({ length: Math.min(count, 10) }, (_, i) => ({
    id: i + 1,
    num: i + 1,
    text: texts[i % texts.length],
    topic: topics[i % topics.length],
    difficulty: DIFFICULTIES[(i * 7 + 3) % 3],
    correctRate: Math.max(28, Math.min(95, 85 - (i * 11 + 7) % 50)),
  }));
}

// Mock question detail generator
export function genQuestionDetail(quizId: number, questionNum: number, subject: string): QuestionDetail {
  const topics = TOPIC_BANKS[subject] ?? TOPIC_BANKS['Matematika'];
  const texts = QUESTION_TEXTS[subject] ?? QUESTION_TEXTS['Matematika'];
  const idx = questionNum - 1;

  // Sample table markdown
  const sampleTables = [
    "| X | Y | Z |\n| --- | --- | --- |\n| 10 | 20 | 30 |\n| 15 | 25 | 35 |",
    "| Qiymat | Natija | Farq |\n| --- | --- | --- |\n| 100 | 85 | 15 |\n| 200 | 170 | 30 |",
    "", // No table
    "| Fan | Ball | Reyting |\n| --- | --- | --- |\n| Matematika | 95 | A |\n| Fizika | 88 | B |",
  ];

  // Sample images
  const sampleImages = idx % 3 === 0 ? [
    { id: 100 + idx, image_url: `http://localhost:8000/media/image/${questionNum}/sample1.png` },
    { id: 200 + idx, image_url: `http://localhost:8000/media/image/${questionNum}/sample2.png` },
  ] : idx % 2 === 0 ? [
    { id: 100 + idx, image_url: `http://localhost:8000/media/image/${questionNum}/sample.png` },
  ] : [];

  // Options
  const optionLabels = ['A', 'B', 'C', 'D'];
  const correctIdx = idx % 4;

  const optionTexts: Record<string, string[][]> = {
    Matematika: [
      ['10', '20', '30', '40'],
      ['x=2', 'x=3', 'x=4', 'x=5'],
      ['45°', '90°', '60°', '30°'],
      ['100', '200', '150', '250'],
    ],
    Fizika: [
      ['10 m/s', '20 m/s', '15 m/s', '25 m/s'],
      ['Newton', 'Joule', 'Watt', 'Pascal'],
      ['Kinetik', 'Potensial', 'Mexanik', 'Issiqlik'],
      ['100 V', '220 V', '110 V', '50 V'],
    ],
    Kimyo: [
      ['H₂O', 'CO₂', 'O₂', 'N₂'],
      ['Kislota', 'Ishqor', 'Tuz', 'Oksid'],
      ['pH=7', 'pH=3', 'pH=10', 'pH=14'],
      ['Vodorod', 'Kislorod', 'Azot', 'Uglerod'],
    ],
    Biologiya: [
      ['DNK', 'RNK', 'Protein', 'Lipid'],
      ['Mitoz', 'Meyoz', 'Amitoz', 'Sitokinez'],
      ['Hujayra', 'To\'qima', 'Organ', 'Organizm'],
      ['Fotosintez', 'Nafas olish', 'Fermentatsiya', 'Glikoliz'],
    ],
  };

  const opts = (optionTexts[subject] ?? optionTexts['Matematika'])[idx % 4];

  return {
    id: quizId * 100 + questionNum,
    subject,
    question_text: texts[idx % texts.length],
    table_markdown: sampleTables[idx % sampleTables.length],
    difficulty: DIFFICULTIES[(idx * 7 + 3) % 3],
    topic: topics[idx % topics.length],
    images: sampleImages,
    options: optionLabels.map((label, i) => ({
      id: questionNum * 10 + i,
      label,
      text: opts[i],
      is_correct: i === correctIdx,
    })),
  };
}

export const CLASSES_LIST = ["9-A", "10-B", "Fizika guruhi", "Kimyo guruhi", "Biologiya 10", "Matematika guruhi"];

const SUBJECTS = ['Matematika', 'Fizika', 'Kimyo', 'Biologiya'];
const TYPE_OPTIONS: { value: QuizType; label: string; Icon: React.FC<any>; color: string; bg: string; border: string }[] = [
  { value: 'manual', label: "Qo'lda", Icon: PenLine, color: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)' },
  { value: 'pdf', label: 'PDF', Icon: Upload, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  { value: 'ai', label: 'AI Generated', Icon: Cpu, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
];

// ─────────────────────────────────────────────
//  Shared helpers / tiny components
// ─────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' };
}

function wrongColor(pct: number) {
  if (pct >= 60) return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' };
  if (pct >= 40) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' };
}

type MathSegment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; displayMode: boolean };

function parseMathSegments(value: string): MathSegment[] {
  const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+\$)/g;
  const segments: MathSegment[] = [];
  let lastIndex = 0;

  value.replace(pattern, (match, _group, offset) => {
    if (offset > lastIndex) {
      segments.push({ type: 'text', value: value.slice(lastIndex, offset) });
    }

    const displayMode = match.startsWith('$$') || match.startsWith('\\[');
    const mathValue = match.startsWith('$$')
      ? match.slice(2, -2)
      : match.startsWith('\\[')
        ? match.slice(2, -2)
        : match.startsWith('\\(')
          ? match.slice(2, -2)
          : match.slice(1, -1);

    segments.push({ type: 'math', value: mathValue, displayMode });
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < value.length) {
    segments.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value }];
}

function renderMath(value: string, displayMode: boolean) {
  return katex.renderToString(value, {
    throwOnError: false,
    displayMode,
    strict: 'ignore',
  });
}

function MathText({
  text,
  className = '',
  color,
}: {
  text: string;
  className?: string;
  color: string;
}) {
  const segments = parseMathSegments(text);

  return (
    <div className={className} style={{ color }}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <span key={`${segment.type}-${index}`} style={{ whiteSpace: 'pre-wrap' }}>
              {segment.value}
            </span>
          );
        }

        return (
          <span
            key={`${segment.type}-${index}`}
            className={segment.displayMode ? 'block my-1 overflow-x-auto overflow-y-hidden' : 'inline-block align-middle'}
            dangerouslySetInnerHTML={{ __html: renderMath(segment.value, segment.displayMode) }}
          />
        );
      })}
    </div>
  );
}

function DifficultyBadge({ level }: { level: Difficulty }) {
  const { theme: t } = useTheme();
  const cfg = {
    "oson": { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', label: 'Oson' },
    "o'rta": { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', label: "O'rta" },
    "qiyin": { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', label: 'Qiyin' },
  }[level] ?? { color: t.textMuted, bg: t.bgInner, border: t.border, label: level };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function QuizTypeIcon({ type }: { type: QuizType }) {
  if (type === 'ai') return <Cpu className="w-5 h-5" style={{ color: '#8B5CF6' }} strokeWidth={1.75} />;
  if (type === 'pdf') return <Upload className="w-5 h-5" style={{ color: '#3B82F6' }} strokeWidth={1.75} />;
  return <PenLine className="w-5 h-5" style={{ color: '#6366F1' }} strokeWidth={1.75} />;
}

function typeStyle(type: QuizType) {
  if (type === 'ai') return { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)', label: 'AI Generated' };
  if (type === 'pdf') return { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', label: 'PDF' };
  return { color: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', label: "Qo'lda" };
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { theme: t } = useTheme();
  return (
    <div className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}>
      {children}
    </div>
  );
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme: t } = useTheme();
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{subtitle}</p>}
    </div>
  );
}

function DonutRing({ value, color, size = 96, strokeWidth = 10 }: {
  value: number; color: string; size?: number; strokeWidth?: number;
}) {
  const { theme: t } = useTheme();
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={t.bgInner} strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
    </svg>
  );
}

function StatisticInfoSheet({
  open,
  title,
  value,
  description,
  onClose,
}: {
  open: boolean;
  title: string;
  value: string;
  description: string;
  onClose: () => void;
}) {
  const { theme: t } = useTheme();

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          boxShadow: t.isDark
            ? '0 32px 80px rgba(0,0,0,0.6)'
            : '0 24px 60px rgba(15,23,42,0.18)',
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>
              Statistik ma'lumot
            </p>
            <h3 className="text-lg sm:text-xl font-bold mt-1" style={{ color: t.textPrimary }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div
          className="rounded-2xl px-4 py-3 mb-4"
          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
        >
          <p className="text-xs mb-1" style={{ color: t.textMuted }}>Joriy qiymat</p>
          <p className="text-2xl sm:text-3xl font-bold" style={{ color: t.textPrimary }}>
            {value}
          </p>
        </div>

        <p className="text-sm sm:text-[15px] leading-7" style={{ color: t.textSecondary }}>
          {description}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Edit Quiz Modal
// ─────────────────────────────────────────────
interface EditQuizModalProps {
  open: boolean;
  quiz: QuizDetailView;
  onClose: () => void;
  onSave: (updated: QuizDetailView) => Promise<void>;
}

function EditQuizModal({ open, quiz, onClose, onSave }: EditQuizModalProps) {
  const { theme: t } = useTheme();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(quiz.title);
  const [subject, setSubject] = useState(quiz.subject);
  const [description, setDescription] = useState(quiz.description);
  const [quizType, setQuizType] = useState<QuizType>(quiz.type);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Sync when quiz changes
  useEffect(() => {
    if (open) {
      setTitle(quiz.title);
      setSubject(quiz.subject);
      setDescription(quiz.description);
      setQuizType(quiz.type);
      setSaving(false);
      setSaveError('');
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [open, quiz]);

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const canSave = title.trim().length > 0;
  const selectedType = TYPE_OPTIONS.find((t) => t.value === quizType)!;

  function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveError('');

    onSave({
      ...quiz,
      title: title.trim(),
      subject,
      description: description.trim(),
      type: quizType,
    })
      .then(() => {
        setSaving(false);
        onClose();
      })
      .catch((err: unknown) => {
        setSaving(false);
        setSaveError(err instanceof Error ? err.message : "Testni saqlashda xatolik yuz berdi");
      });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          boxShadow: t.isDark
            ? '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.12)'
            : '0 32px 80px rgba(15,23,42,0.2)',
          maxHeight: '92vh',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.25)' }}
            >
              <Edit2 className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: t.textPrimary }}>Testni tahrirlash</h2>
              <p className="text-xs" style={{ color: t.textMuted }}>Test ma'lumotlarini yangilang</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5 space-y-5">

          {/* Test nomi */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>
              Test nomi <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Test nomini kiriting..."
              className="w-full px-3.5 rounded-xl text-sm focus:outline-none transition-all"
              style={{
                background: t.bgInner,
                border: `1.5px solid ${title.trim() ? 'rgba(99,102,241,0.5)' : t.border}`,
                color: t.textPrimary,
                height: '42px',
              }}
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
              onBlur={(e) => { (e.target as HTMLElement).style.borderColor = title.trim() ? 'rgba(99,102,241,0.5)' : t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
            />
          </div>

          {/* Fan */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>Fan</label>
            <div className="relative">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-9 rounded-xl text-sm focus:outline-none transition-all cursor-pointer"
                style={{
                  background: t.bgInner,
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                  height: '42px',
                }}
                onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                onBlur={(e) => { (e.target as HTMLElement).style.borderColor = t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s} style={{ background: t.bgCard, color: t.textPrimary }}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: t.textMuted }} />
            </div>
          </div>

          {/* Tavsif */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>
              Tavsif
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Test tavsifini kiriting..."
              className="w-full px-3.5 py-3 rounded-xl text-sm focus:outline-none transition-all resize-none"
              style={{
                background: t.bgInner,
                border: `1.5px solid ${t.border}`,
                color: t.textPrimary,
              }}
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
              onBlur={(e) => { (e.target as HTMLElement).style.borderColor = t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
            />
          </div>

          {saveError && (
            <div
              className="px-3.5 py-3 rounded-xl text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}
            >
              {saveError}
            </div>
          )}

          {/* Test turi */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>Test turi</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const active = quizType === opt.value;
                const Icon = opt.Icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setQuizType(opt.value)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
                    style={{
                      background: active ? opt.bg : t.bgInner,
                      border: `1.5px solid ${active ? opt.border : t.border}`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: active ? opt.bg : t.bgCard, border: `1px solid ${active ? opt.border : t.border}` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: active ? opt.color : t.textMuted }} strokeWidth={1.75} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: active ? opt.color : t.textSecondary }}>
                      {opt.label}
                    </span>
                    {active && (
                      <div className="w-4 h-1 rounded-full" style={{ background: opt.color }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info row — read-only */}
          <div
            className="flex items-center gap-3 p-3.5 rounded-xl"
            style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <AlertCircle className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
            </div>
            <p className="text-xs" style={{ color: t.textMuted }}>
              Urinishlar soni ({quiz.attempts} ta) va o'rtacha ball ({quiz.avgScore}%) avtomatik hisoblanadi va tahrirlanmaydi.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-5 py-4 shrink-0 flex gap-2.5"
          style={{ borderTop: `1px solid ${t.border}`, background: t.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.textMuted; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-[2] h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: canSave ? 'linear-gradient(135deg, #6366F1, #4F46E5)' : (t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
              color: canSave ? '#fff' : t.textMuted,
              cursor: canSave ? 'pointer' : 'not-allowed',
              boxShadow: canSave ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
            }}
            onMouseEnter={(e) => { if (canSave) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 22px rgba(99,102,241,0.5)'; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = canSave ? '0 4px 16px rgba(99,102,241,0.35)' : 'none'; }}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" strokeWidth={2} />
                Saqlash
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export function QuizDetailPage() {
  const { theme: t } = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const base = QUIZZES.find((q) => q.id === Number(id));

  const [quiz, setQuiz] = useState<QuizDetailView | null>(base ? { ...base, description: '' } : null);
  const [questions, setQuestions] = useState<Question[]>(base ? genQuestions(base.subject, base.questions) : []);
  const [editOpen, setEditOpen] = useState(false);
  const [questionDetail, setQuestionDetail] = useState<QuestionDetail | null>(null);
  const [questionDetailLoadingId, setQuestionDetailLoadingId] = useState<number | null>(null);
  const [questionDetailError, setQuestionDetailError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<QuizStatisticsResponse | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [statisticsError, setStatisticsError] = useState<string | null>(null);
  const [selectedStatistic, setSelectedStatistic] = useState<StatisticKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setQuiz(null);
      setQuestions([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    fetchQuizDetail(id)
      .then((data) => {
        if (cancelled) return;

        if (!data) {
          setQuiz(null);
          setQuestions([]);
          return;
        }

        const fallbackQuiz = QUIZZES.find((item) => item.id === data.id);
        setQuiz(buildQuizDetail(data, fallbackQuiz));
        setQuestions(mapQuestions(data.questions));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Test ma'lumotlarini yuklashda xatolik yuz berdi");
        setQuiz(null);
        setQuestions([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setStatistics(null);
      setStatisticsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setStatisticsLoading(true);
    setStatisticsError(null);

    fetchQuizStatistics(id)
      .then((data) => {
        if (!cancelled) {
          setStatistics(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStatistics(null);
          setStatisticsError(err instanceof Error ? err.message : "Test statistikasini yuklashda xatolik yuz berdi");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStatisticsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
          <BookOpen className="w-7 h-7 animate-pulse" style={{ color: t.textMuted }} strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>Test yuklanmoqda...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
          <AlertCircle className="w-7 h-7" style={{ color: t.textMuted }} strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>
          {error ?? 'Test topilmadi'}
        </p>
        <button onClick={() => navigate('/quizzes')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
          <ArrowLeft className="w-4 h-4" /> Testlar ro'yxatiga qaytish
        </button>
      </div>
    );
  }

  const totalAttempts = statistics?.total_attempts ?? quiz.attempts;
  const averageScore = statistics?.average_score ?? quiz.avgScore;
  const completionRate = statistics?.completion_rate ?? 0;
  const successRate = statistics?.success_rate ?? 0;
  const highestScore = statistics?.highest_score ?? averageScore;
  const championsCount = statistics?.champions_count ?? 0;
  const tStyle = typeStyle(quiz.type);
  const statisticDetails = [
    { key: 'average_score' as const, label: "O'rtacha ball", value: `${averageScore}%`, ringValue: averageScore, color: scoreColor(averageScore).color, bg: scoreColor(averageScore).bg, border: scoreColor(averageScore).border, Icon: Target },
    { key: 'completion_rate' as const, label: 'Bajarilish', value: `${completionRate}%`, ringValue: completionRate, color: scoreColor(completionRate).color, bg: scoreColor(completionRate).bg, border: scoreColor(completionRate).border, Icon: CheckCircle },
    { key: 'success_rate' as const, label: 'Muvaffaqiyat', value: `${successRate}%`, ringValue: successRate, color: '#6366F1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', Icon: TrendingUp },
  ];
  const statisticList = [
    { key: 'total_attempts' as const, label: 'Jami urinishlar', value: String(totalAttempts), color: '#6366F1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', Icon: Users },
    { key: 'average_score' as const, label: "O'rtacha ball", value: `${averageScore}%`, color: scoreColor(averageScore).color, bg: scoreColor(averageScore).bg, border: scoreColor(averageScore).border, Icon: Target },
    { key: 'completion_rate' as const, label: 'Bajarilish darajasi', value: `${completionRate}%`, color: scoreColor(completionRate).color, bg: scoreColor(completionRate).bg, border: scoreColor(completionRate).border, Icon: CheckCircle },
    { key: 'highest_score' as const, label: "Eng yuqori ball", value: `${highestScore}%`, color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', Icon: TrendingUp },
    { key: 'champions_count' as const, label: "A'lochilar", value: `${championsCount} ta`, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', Icon: Award },
  ];

  const handleOpenQuestionDetail = async (questionId: number) => {
    setQuestionDetailError(null);
    setQuestionDetailLoadingId(questionId);

    try {
      const data = await fetchQuestionDetail(questionId);
      setQuestionDetail(mapQuestionDetail(data));
    } catch (err: unknown) {
      setQuestionDetailError(err instanceof Error ? err.message : "Savol tafsilotlarini yuklashda xatolik yuz berdi");
    } finally {
      setQuestionDetailLoadingId(null);
    }
  };

  return (
    <>
      {/* ── Edit Modal ── */}
      <EditQuizModal
        open={editOpen}
        quiz={quiz}
        onClose={() => setEditOpen(false)}
        onSave={async (updated) => {
          await updateQuizDetail(quiz.id, {
            title: updated.title,
            subject: updated.subject,
            description: updated.description,
            quiz_generate_type: mapQuizTypeToApi(updated.type),
          });

          setQuiz((current) => (current ? { ...current, ...updated } : current));
        }}
      />

      {/* ── Question Detail Modal ── */}
      <QuestionDetailModal
        open={questionDetail !== null}
        question={questionDetail}
        onClose={() => {
          setQuestionDetail(null);
          setQuestionDetailError(null);
        }}
      />

      <StatisticInfoSheet
        open={selectedStatistic !== null}
        title={selectedStatistic ? statisticList.find((item) => item.key === selectedStatistic)?.label ?? statisticDetails.find((item) => item.key === selectedStatistic)?.label ?? '' : ''}
        value={selectedStatistic ? statisticList.find((item) => item.key === selectedStatistic)?.value ?? statisticDetails.find((item) => item.key === selectedStatistic)?.value ?? '' : ''}
        description={selectedStatistic ? STATISTIC_DESCRIPTIONS[selectedStatistic] : ''}
        onClose={() => setSelectedStatistic(null)}
      />

      {/* ════════════════════════════════════��═
          PAGE HEADER
      ══════════════════════════════════════ */}
      <div className="mb-6 sm:mb-7">
        {/* Back */}
        <button
          onClick={() => navigate('/quizzes')}
          className="flex items-center gap-2 mb-5 text-sm transition-all group"
          style={{ color: t.textMuted }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.accent; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
          Testlar ro'yxati
        </button>

        {/* Header card */}
        <div className="rounded-2xl p-5 sm:p-6"
          style={{
            background: t.isDark
              ? 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 100%)'
              : 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.03) 100%)',
            border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.15)'}`,
            boxShadow: t.shadowCard,
          }}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: tStyle.bg, border: `1.5px solid ${tStyle.border}` }}>
              <QuizTypeIcon type={quiz.type} />
            </div>

            {/* Title & meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
                  {quiz.title}
                </h1>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: tStyle.bg, color: tStyle.color, border: `1px solid ${tStyle.border}` }}>
                  {quiz.type === 'ai' && <Cpu className="w-3 h-3" strokeWidth={2} />}
                  {quiz.type === 'pdf' && <Upload className="w-3 h-3" strokeWidth={2} />}
                  {quiz.type === 'manual' && <PenLine className="w-3 h-3" strokeWidth={2} />}
                  {tStyle.label}
                </span>
              </div>

              {quiz.description && (
                <p className="text-sm leading-relaxed mt-2 max-w-3xl" style={{ color: t.textSecondary }}>
                  {quiz.description}
                </p>
              )}

              <div className="flex flex-wrap gap-3 mt-2">
                {[
                  { Icon: BookOpen, label: quiz.subject },
                  { Icon: Hash, label: `${quiz.questions} ta savol` },
                  { Icon: Clock, label: quiz.createdDate },
                  { Icon: Users, label: `${quiz.attempts} urinish` },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                    <span className="text-sm" style={{ color: t.textSecondary }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Single action button — Taxrirlash */}
            <div className="flex shrink-0">
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  color: '#fff',
                  boxShadow: t.isDark
                    ? '0 4px 16px rgba(99,102,241,0.35)'
                    : '0 3px 12px rgba(99,102,241,0.25)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 22px rgba(99,102,241,0.5)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = t.isDark ? '0 4px 16px rgba(99,102,241,0.35)' : '0 3px 12px rgba(99,102,241,0.25)'; }}
              >
                <Edit2 className="w-4 h-4" strokeWidth={2} />
                Taxrirlash
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          ROW 1 — Questions | Statistics
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 mb-4 sm:mb-5 items-start">
        {questionDetailError && (
          <div
            className="lg:col-span-5 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#DC2626' }}
          >
            {questionDetailError}
          </div>
        )}

        {/* ─── Questions list (3 cols) ─── */}
        <Card className="order-2 lg:order-1 lg:col-span-3 flex flex-col self-start">
          <CardTitle
            title="Savollar"
            subtitle={`${questions.length} ta savol ko'rsatilmoqda`}
          />

          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl overflow-hidden flex-1"
            style={{ border: `1px solid ${t.border}` }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
                  {['#', 'Savol', 'Mavzu', "Qiyinlik", '', ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: t.textMuted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => {
                  const sc = scoreColor(q.correctRate);
                  return (
                    <tr key={q.num}
                      style={{ borderBottom: idx < questions.length - 1 ? `1px solid ${t.border}` : 'none' }}
                      className="transition-colors"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-4 py-3">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: t.bgInner, color: t.textMuted }}>
                          {q.num}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ maxWidth: '200px' }}>
                        <MathText
                          text={q.text}
                          className="text-sm leading-relaxed overflow-hidden"
                          color={t.textPrimary}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: t.textMuted }}>{q.topic}</span>
                      </td>
                      <td className="px-4 py-3">
                        <DifficultyBadge level={q.difficulty} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleOpenQuestionDetail(q.id)}
                          disabled={questionDetailLoadingId === q.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)'; (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
                          title="Ko'rish"
                        >
                          {questionDetailLoadingId === q.id ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/quizzes/${quiz.id}/questions/${q.id}/edit`)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.3)'; (e.currentTarget as HTMLElement).style.color = '#3B82F6'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
                        >
                          <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="block sm:hidden space-y-2">
            {questions.map((q) => {
              return (
                <div key={q.num} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    style={{ background: t.bgCard, color: t.textMuted, border: `1px solid ${t.border}` }}>
                    {q.num}
                  </span>
                  <div className="flex-1 min-w-0">
                    <MathText
                      text={q.text}
                      className="text-xs font-medium leading-relaxed"
                      color={t.textPrimary}
                    />
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs" style={{ color: t.textMuted }}>{q.topic}</span>
                      <DifficultyBadge level={q.difficulty} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenQuestionDetail(q.id)}
                      disabled={questionDetailLoadingId === q.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textMuted }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)'; (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCard; (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
                      title="Ko'rish"
                    >
                      {questionDetailLoadingId === q.id ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/quizzes/${quiz.id}/questions/${q.id}/edit`)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textMuted }}
                    >
                      <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ─── Quiz Statistics (2 cols) ─── */}
        <Card className="order-1 lg:order-2 lg:col-span-2 flex flex-col self-start">
          <CardTitle title="Test statistikasi" subtitle="Umumiy ko'rsatkichlar" />

          {statisticsLoading ? (
            <div className="py-10 text-sm text-center" style={{ color: t.textMuted }}>
              Test statistikasi yuklanmoqda...
            </div>
          ) : statisticsError ? (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#DC2626' }}
            >
              {statisticsError}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {statisticDetails.map(({ key, label, value, ringValue, color }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedStatistic(key)}
                    className="flex flex-col items-center gap-2 rounded-2xl p-2 transition-all"
                    style={{ background: t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                  >
                    <div className="relative">
                      <DonutRing value={ringValue} color={color} size={80} strokeWidth={8} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold" style={{ color }}>{value}</span>
                      </div>
                    </div>
                    <span className="text-xs text-center" style={{ color: t.textMuted }}>{label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {statisticList.map(({ key, Icon, label, value, color, bg, border }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedStatistic(key)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-left"
                    style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = border;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = t.border;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: bg, border: `1px solid ${border}` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.75} />
                      </div>
                      <span className="text-xs" style={{ color: t.textSecondary }}>{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color }}>{value}</span>
                      <ChevronDown className="w-3.5 h-3.5 rotate-[-90deg]" style={{ color: t.textMuted }} />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  Clock, CheckCircle, Circle, AlertCircle, ChevronLeft, ChevronRight,
  Grid3x3, X, Send, BookOpen, BarChart3, AlertTriangle,
} from 'lucide-react';
import katex from 'katex';
import { useTheme } from '../../components/ThemeContext';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';
import 'katex/dist/katex.min.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface QuestionOption {
  label: string;
  text: string;
}

interface QuestionImage {
  id?: number;
  image_url?: string | null;
}

interface Question {
  id: number;
  question_order_id?: number;
  subject: string;
  question_text: string;
  table_markdown: string;
  difficulty: string;
  topic: string;
  images: Array<string | QuestionImage>;
  options: QuestionOption[];
}

interface TestSession {
  session_id: number;
  quiz_id: number;
  status: string;
  questions_count: number;
  started_at: string;
  finished_at: string;
  questions: Question[];
}

interface MultiplayerSessionInfo {
  session_id: number;
  quiz_id: number;
  quiz_name: string;
  subject_name: string;
  host_id: number;
  join_code: string;
  status: string;
  duration_minutes: number;
  questions_count: number;
  started_at: string;
  finished_at: string;
  session_type: string;
  current_participant_id: number | null;
}

interface StoredTestProgress {
  currentQuestionIndex: number;
  answers: Record<number, string>;
}

interface FinishSessionAnswerPayload {
  question_id: number;
  selected_option: string;
}

interface FinishSessionResponse {
  session_id: number;
  attempt_id: number;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  wrong_answers: number;
  spend_time: number;
  score: number;
  finished: boolean;
  topic_statistic: Array<{
    topic_name: string;
    total_questions: number;
    correct_answers: number;
  }>;
}

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getQuestionImageUrl(image: string | QuestionImage) {
  if (typeof image === 'string') {
    return normalizeText(image);
  }

  return normalizeText(image.image_url);
}

function getTestProgressStorageKey(sessionId: number) {
  return `student_test_progress_${sessionId}`;
}

function loadStoredTestProgress(sessionId: number): StoredTestProgress | null {
  try {
    const raw = localStorage.getItem(getTestProgressStorageKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredTestProgress;
  } catch {
    localStorage.removeItem(getTestProgressStorageKey(sessionId));
    return null;
  }
}

function persistTestProgress(sessionId: number, progress: StoredTestProgress) {
  localStorage.setItem(getTestProgressStorageKey(sessionId), JSON.stringify(progress));
}

function clearStoredTestProgress(sessionId: number) {
  localStorage.removeItem(getTestProgressStorageKey(sessionId));
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

async function fetchTestSession(sessionId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/multiplayer/${sessionId}/questions/`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Savollarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<TestSession>;
}

async function fetchMultiplayerSessionInfo(sessionId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/multiplayer/${sessionId}/info/`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Sessiya ma'lumoti olinmadi: ${response.status}`);
  }

  return response.json() as Promise<MultiplayerSessionInfo>;
}

async function submitMultiplayerAnswer(sessionId: number, payload: FinishSessionAnswerPayload) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/multiplayer/${sessionId}/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Javob yuborilmadi: ${response.status}`);
  }
}

async function syncMultiplayerQuestionOrder(sessionId: number, payload: { question_order_id: number; participant_id: number }) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/multiplayer/${sessionId}/change/question/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Savol tartibi yuborilmadi: ${response.status}`);
  }
}

async function finishTestSession(sessionId: number, payload: FinishSessionAnswerPayload[]) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/${sessionId}/finish-single-player/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Testni yakunlashda xatolik: ${response.status}`);
  }

  return response.json() as Promise<FinishSessionResponse>;
}

function getInitialTimeRemaining(finishedAt: string) {
  const end = new Date(finishedAt).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - Date.now()) / 1000));
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_TEST_SESSION: TestSession = {
  session_id: 59,
  quiz_id: 72,
  status: 'running',
  questions_count: 30,
  started_at: '2026-04-01T06:17:58.684239',
  finished_at: '2026-04-01T06:47:58.684239',
  questions: [
    {
      id: 2481,
      subject: 'mathematics',
      question_text: 'Tengsizlikni yeching: $5+4x-x^2 \\ge 2(x^2 +3,5x-0,5)$',
      table_markdown: '',
      difficulty: "o'rta",
      topic: 'Tengsizliklar',
      images: [],
      options: [
        { label: 'A', text: '[-1;1]' },
        { label: 'B', text: '[-2;1]' },
        { label: 'C', text: '[1;2]' },
        { label: 'D', text: '[-2;2]' },
      ],
    },
    {
      id: 2482,
      subject: 'mathematics',
      question_text: 'Ifodani soddalashtiring: $(a+b)^2 - (a-b)^2$',
      table_markdown: '',
      difficulty: 'oson',
      topic: 'Algebraik ifodalar',
      images: [],
      options: [
        { label: 'A', text: '$2ab$' },
        { label: 'B', text: '$4ab$' },
        { label: 'C', text: '$2a^2$' },
        { label: 'D', text: '$2b^2$' },
      ],
    },
    {
      id: 2483,
      subject: 'mathematics',
      question_text: "Agar $\\sin x = 0.6$ bo'lsa, $\\cos^2 x$ ning qiymatini toping.",
      table_markdown: '',
      difficulty: "o'rta",
      topic: 'Trigonometriya',
      images: [],
      options: [
        { label: 'A', text: '0.36' },
        { label: 'B', text: '0.64' },
        { label: 'C', text: '0.8' },
        { label: 'D', text: '0.48' },
      ],
    },
    {
      id: 2484,
      subject: 'physics',
      question_text: "Jismning massasi 5 kg, tezligi 10 m/s bo'lsa, kinetik energiyasini toping.",
      table_markdown: '',
      difficulty: 'oson',
      topic: 'Mexanika',
      images: [],
      options: [
        { label: 'A', text: '50 J' },
        { label: 'B', text: '100 J' },
        { label: 'C', text: '250 J' },
        { label: 'D', text: '500 J' },
      ],
    },
    {
      id: 2485,
      subject: 'chemistry',
      question_text: 'Suvning molekulyar formulasi qanday?',
      table_markdown: '',
      difficulty: 'oson',
      topic: 'Umumiy kimyo',
      images: [],
      options: [
        { label: 'A', text: '$H_2O$' },
        { label: 'B', text: '$H_2O_2$' },
        { label: 'C', text: '$HO$' },
        { label: 'D', text: '$H_3O$' },
      ],
    },
  ],
};

// Generate more questions to reach 30
for (let i = 6; i <= 30; i++) {
  MOCK_TEST_SESSION.questions.push({
    id: 2480 + i,
    subject: i % 3 === 0 ? 'physics' : i % 2 === 0 ? 'chemistry' : 'mathematics',
    question_text: `Test savoli ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit?`,
    table_markdown: '',
    difficulty: i % 3 === 0 ? 'qiyin' : i % 2 === 0 ? "o'rta" : 'oson',
    topic: `Mavzu ${i}`,
    images: [],
    options: [
      { label: 'A', text: `Variant A - ${i}` },
      { label: 'B', text: `Variant B - ${i}` },
      { label: 'C', text: `Variant C - ${i}` },
      { label: 'D', text: `Variant D - ${i}` },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getSubjectColor(subject: string): string {
  switch (subject) {
    case 'mathematics': return '#6366F1';
    case 'physics': return '#22C55E';
    case 'chemistry': return '#F59E0B';
    case 'biology': return '#10B981';
    default: return '#8B5CF6';
  }
}

function getSubjectLabel(subject: string): string {
  switch (subject) {
    case 'mathematics': return 'Matematika';
    case 'physics': return 'Fizika';
    case 'chemistry': return 'Kimyo';
    case 'biology': return 'Biologiya';
    default: return subject;
  }
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'oson': return '#22C55E';
    case "o'rta": return '#FBBF24';
    case 'qiyin': return '#EF4444';
    default: return '#9CA3AF';
  }
}

function parseMathSegments(value: string) {
  const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+\$)/g;
  const segments: Array<{ type: 'text' | 'math'; value: string; displayMode?: boolean }> = [];
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

function renderMathText(text: string) {
  return parseMathSegments(text).map((segment, index) => {
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
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(segment.value, {
            throwOnError: false,
            displayMode: segment.displayMode,
            strict: 'ignore',
          }),
        }}
      />
    );
  });
}

function parseMarkdownTable(markdown: string) {
  const normalizedMarkdown = markdown
    .replace(/\|\|/g, '|\n|')
    .replace(/\r\n/g, '\n')
    .trim();

  const lines = normalizedMarkdown.split('\n').filter((line) => line.trim());
  if (lines.length < 2) return null;

  const headerCells = lines[0]
    .split('|')
    .map((cell) => cell.trim())
    .filter(Boolean);

  const dataRows = lines
    .slice(2)
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
    .filter((row) => row.length > 0);

  if (headerCells.length === 0) return null;

  return { headerCells, dataRows };
}

function MarkdownTable({
  markdown,
  borderColor,
  headerBackground,
  headerTextColor,
  cellTextColor,
}: {
  markdown: string;
  borderColor: string;
  headerBackground: string;
  headerTextColor: string;
  cellTextColor: string;
}) {
  const parsed = parseMarkdownTable(markdown);
  if (!parsed) return null;

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${borderColor}` }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: headerBackground, borderBottom: `1px solid ${borderColor}` }}>
            {parsed.headerCells.map((cell, index) => (
              <th
                key={index}
                className="px-4 py-2.5 text-left text-xs font-semibold"
                style={{ color: headerTextColor }}
              >
                {renderMathText(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parsed.dataRows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              style={{ borderBottom: rowIndex < parsed.dataRows.length - 1 ? `1px solid ${borderColor}` : 'none' }}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-2.5 text-sm align-top"
                  style={{ color: cellTextColor }}
                >
                  {renderMathText(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Question Map Modal Component
// ─────────────────────────────────────────────────────────────────────────────
function QuestionMapModal({
  questions,
  currentQuestionIndex,
  answers,
  onSelectQuestion,
  onClose,
}: {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<number, string>;
  onSelectQuestion: (index: number) => void;
  onClose: () => void;
}) {
  const { theme: t } = useTheme();

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.7)' }}
      />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                border: `1.5px solid rgba(99,102,241,0.25)`,
              }}
            >
              <Grid3x3 className="w-5 h-5" style={{ color: '#6366F1' }} strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: t.textPrimary }}>
                Savollar xaritasi
              </h2>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                {answeredCount} javob berildi • {unansweredCount} javobsiz
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${t.border}`,
            }}
          >
            <X className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={2} />
          </button>
        </div>

        {/* Legend */}
        <div
          className="px-6 py-4 flex flex-wrap gap-4"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)',
                border: `2px solid #6366F1`,
              }}
            >
              <Circle className="w-3 h-3" style={{ color: '#6366F1' }} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
              Joriy savol
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{
                background: t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
                border: `1.5px solid rgba(34,197,94,0.3)`,
              }}
            >
              <CheckCircle className="w-3 h-3" style={{ color: '#22C55E' }} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
              Javob berilgan
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${t.border}`,
              }}
            />
            <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
              Javobsiz
            </span>
          </div>
        </div>

        {/* Question Grid */}
        <div
          className="p-6 overflow-y-auto"
          style={{ maxHeight: 'calc(90vh - 200px)' }}
        >
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {questions.map((question, index) => {
              const isAnswered = !!answers[question.id];
              const isCurrent = index === currentQuestionIndex;

              return (
                <button
                  key={question.id}
                  onClick={() => {
                    onSelectQuestion(index);
                    onClose();
                  }}
                  className="aspect-square rounded-xl font-bold text-sm transition-all relative"
                  style={{
                    background: isCurrent
                      ? (t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)')
                      : isAnswered
                        ? (t.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)')
                        : (t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                    border: isCurrent
                      ? `2px solid #6366F1`
                      : isAnswered
                        ? `1.5px solid rgba(34,197,94,0.3)`
                        : `1.5px solid ${t.border}`,
                    color: isCurrent
                      ? '#6366F1'
                      : isAnswered
                        ? '#22C55E'
                        : t.textSecondary,
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                      (e.currentTarget as HTMLElement).style.borderColor = isAnswered ? '#22C55E' : '#6366F1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLElement).style.borderColor = isCurrent
                      ? '#6366F1'
                      : isAnswered
                        ? 'rgba(34,197,94,0.3)'
                        : t.border;
                  }}
                >
                  {index + 1}
                  {isAnswered && !isCurrent && (
                    <CheckCircle
                      className="absolute -top-1 -right-1 w-3.5 h-3.5"
                      style={{ color: '#22C55E' }}
                      strokeWidth={2.5}
                      fill="currentColor"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit Confirmation Modal
// ─────────────────────────────────────────────────────────────────────────────
function SubmitConfirmationModal({
  answeredCount,
  totalCount,
  onConfirm,
  onCancel,
  submitting,
}: {
  answeredCount: number;
  totalCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const { theme: t } = useTheme();
  const unansweredCount = totalCount - answeredCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.7)' }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: t.isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.1)',
              border: `2px solid rgba(251,191,36,0.3)`,
            }}
          >
            <AlertTriangle className="w-8 h-8" style={{ color: '#FBBF24' }} strokeWidth={2} />
          </div>

          <h3 className="text-xl font-bold mb-2" style={{ color: t.textPrimary }}>
            Testni yakunlash
          </h3>
          <p className="text-sm mb-4" style={{ color: t.textSecondary }}>
            Testni yakunlamoqchimisiz? Yakunlangandan keyin javoblarni o'zgartira olmaysiz.
          </p>

          {/* Stats */}
          <div className="w-full space-y-2">
            <div
              className="px-4 py-3 rounded-xl flex items-center justify-between"
              style={{
                background: t.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)',
                border: `1.5px solid rgba(34,197,94,0.25)`,
              }}
            >
              <span className="text-sm font-semibold" style={{ color: '#22C55E' }}>
                Javob berilgan
              </span>
              <span className="text-sm font-bold" style={{ color: '#22C55E' }}>
                {answeredCount} ta
              </span>
            </div>

            {unansweredCount > 0 && (
              <div
                className="px-4 py-3 rounded-xl flex items-center justify-between"
                style={{
                  background: t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                  border: `1.5px solid rgba(239,68,68,0.25)`,
                }}
              >
                <span className="text-sm font-semibold" style={{ color: '#EF4444' }}>
                  Javobsiz
                </span>
                <span className="text-sm font-bold" style={{ color: '#EF4444' }}>
                  {unansweredCount} ta
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          className="px-6 py-4 flex gap-3"
          style={{ borderTop: `1px solid ${t.border}` }}
        >
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: `1.5px solid ${t.border}`,
              color: t.textSecondary,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            Bekor qilish
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-[2] py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
              opacity: submitting ? 0.85 : 1,
            }}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Yakunlanmoqda...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" strokeWidth={2.5} />
                Yakunlash
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function StudentTestTakingPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = Number.parseInt(searchParams.get('session_id') ?? id ?? '', 10);
  const participantIdFromQuery = Number.parseInt(searchParams.get('participant_id') ?? '', 10);

  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [sessionInfo, setSessionInfo] = useState<MultiplayerSessionInfo | null>(null);
  const [resolvedParticipantId, setResolvedParticipantId] = useState<number | null>(
    Number.isFinite(participantIdFromQuery) && participantIdFromQuery > 0 ? participantIdFromQuery : null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showQuestionMap, setShowQuestionMap] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [syncingQuestionOrder, setSyncingQuestionOrder] = useState(false);
  const lastSyncedQuestionIndexRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      setError('Sessiya identifikatori topilmadi');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.allSettled([fetchTestSession(sessionId), fetchMultiplayerSessionInfo(sessionId)])
      .then(([sessionResult, infoResult]) => {
        if (cancelled) return;
        if (sessionResult.status !== 'fulfilled') {
          throw sessionResult.reason;
        }

        const data = sessionResult.value;
        const info = infoResult.status === 'fulfilled' ? infoResult.value : null;
        const nextSession: TestSession = {
          ...data,
          status: normalizeText(data.status, 'running'),
          questions: Array.isArray(data.questions) ? data.questions : [],
          questions_count: typeof data.questions_count === 'number'
            ? data.questions_count
            : Array.isArray(data.questions) ? data.questions.length : 0,
        };
        const storedProgress = loadStoredTestProgress(sessionId);
        const validQuestionIds = new Set(nextSession.questions.map((question) => question.id));
        const restoredAnswers = Object.fromEntries(
          Object.entries(storedProgress?.answers ?? {}).filter(([questionId, answer]) => {
            const parsedQuestionId = Number.parseInt(questionId, 10);
            return validQuestionIds.has(parsedQuestionId) && typeof answer === 'string' && answer.trim();
          }),
        ) as Record<number, string>;
        const restoredQuestionIndex = Math.max(
          0,
          Math.min(
            nextSession.questions.length > 0 ? nextSession.questions.length - 1 : 0,
            storedProgress?.currentQuestionIndex ?? 0,
          ),
        );

        setSessionInfo(info);
        setResolvedParticipantId(
          Number.isFinite(participantIdFromQuery) && participantIdFromQuery > 0
            ? participantIdFromQuery
            : info?.current_participant_id ?? null,
        );
        setTestSession(nextSession);
        setCurrentQuestionIndex(restoredQuestionIndex);
        setAnswers(restoredAnswers);
        setTimeRemaining(getInitialTimeRemaining(info?.finished_at || data.finished_at));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Savollarni yuklab bo'lmadi");
        setTestSession(null);
        setSessionInfo(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const currentQuestion = testSession?.questions[currentQuestionIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const answeredCount = Object.keys(answers).length;
  const progress = testSession && testSession.questions_count > 0
    ? (answeredCount / testSession.questions_count) * 100
    : 0;
  const shouldSyncMultiplayerState = ['public', 'group'].includes(normalizeText(sessionInfo?.session_type).toLowerCase());

  // Timer countdown
  useEffect(() => {
    if (!testSession || !currentQuestion || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [testSession, currentQuestion, timeRemaining]);

  useEffect(() => {
    if (!testSession) return;

    persistTestProgress(testSession.session_id, {
      currentQuestionIndex,
      answers,
    });
  }, [testSession, currentQuestionIndex, answers]);

  useEffect(() => {
    if (!testSession) return;

    if (lastSyncedQuestionIndexRef.current === null) {
      lastSyncedQuestionIndexRef.current = currentQuestionIndex;
      return;
    }

    if (
      !shouldSyncMultiplayerState
      || !resolvedParticipantId
      || syncingQuestionOrder
      || lastSyncedQuestionIndexRef.current === currentQuestionIndex
    ) {
      return;
    }

    const questionOrderId = currentQuestionIndex + 1;
    lastSyncedQuestionIndexRef.current = currentQuestionIndex;

    void (async () => {
      try {
        setSyncingQuestionOrder(true);
        await syncMultiplayerQuestionOrder(sessionId, {
          question_order_id: questionOrderId,
          participant_id: resolvedParticipantId,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setSyncingQuestionOrder(false);
      }
    })();
  }, [currentQuestionIndex, resolvedParticipantId, sessionId, shouldSyncMultiplayerState, syncingQuestionOrder, testSession]);

  // Time warning colors
  const timeColor = useMemo(() => {
    if (timeRemaining < 300) return '#EF4444'; // Red - less than 5 minutes
    if (timeRemaining < 600) return '#FBBF24'; // Yellow - less than 10 minutes
    return '#22C55E'; // Green
  }, [timeRemaining]);

  async function handleSelectAnswer(optionLabel: string) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionLabel,
    }));

    if (!shouldSyncMultiplayerState || submittingAnswer) return;

    try {
      setSubmittingAnswer(true);
      await submitMultiplayerAnswer(sessionId, {
        question_id: currentQuestion.id,
        selected_option: optionLabel,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAnswer(false);
    }
  }

  async function changeQuestionIndex(nextIndex: number) {
    if (!testSession || nextIndex < 0 || nextIndex >= testSession.questions.length || nextIndex === currentQuestionIndex) {
      return;
    }

    setCurrentQuestionIndex(nextIndex);
  }

  function handleNextQuestion() {
    if (testSession && currentQuestionIndex < testSession.questions.length - 1) {
      void changeQuestionIndex(currentQuestionIndex + 1);
    }
  }

  function handlePreviousQuestion() {
    if (currentQuestionIndex > 0) {
      void changeQuestionIndex(currentQuestionIndex - 1);
    }
  }

  async function handleSubmitTest() {
    if (!testSession) return;
    if (submitting) return;

    try {
      setSubmitting(true);
      const payload: FinishSessionAnswerPayload[] = Object.entries(answers)
        .map(([questionId, selectedOption]) => ({
          question_id: Number.parseInt(questionId, 10),
          selected_option: selectedOption,
        }))
        .filter((item) => Number.isFinite(item.question_id) && item.selected_option.trim());

      const result = await finishTestSession(testSession.session_id, payload);
      clearStoredTestProgress(testSession.session_id);
      navigate(`/student/test-results/${result.session_id}`, {
        state: {
          result,
          session: testSession,
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Testni yakunlab bo'lmadi");
      setShowSubmitModal(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: t.bgBase }}>
        <div
          className="rounded-2xl px-5 py-4 flex items-center gap-3"
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard, color: t.textPrimary }}
        >
          <div className="w-5 h-5 rounded-full border-2 border-[#6366F1]/30 border-t-[#6366F1] animate-spin" />
          Savollar yuklanmoqda...
        </div>
      </div>
    );
  }

  if (error || !testSession || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: t.bgBase }}>
        <div
          className="max-w-md w-full rounded-2xl p-5"
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertCircle className="w-5 h-5" style={{ color: '#EF4444' }} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base" style={{ color: t.textPrimary }}>
                Test ochilmadi
              </h2>
              <p className="text-sm mt-1" style={{ color: t.textSecondary }}>
                {error ?? 'Sessiya savollari mavjud emas.'}
              </p>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => navigate('/student/tests')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
                >
                  Testlarga qaytish
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
                >
                  Qayta urinish
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: t.bgBase }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-3 sm:px-6 py-3 sm:py-4"
        style={{
          background: t.bgCard,
          borderBottom: `1px solid ${t.border}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Progress Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                border: `1.5px solid rgba(99,102,241,0.25)`,
              }}
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#6366F1' }} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base truncate" style={{ color: t.textPrimary }}>
                  Savol {currentQuestionIndex + 1}/{testSession.questions_count}
                </h1>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0"
                  style={{
                    background: t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
                    color: '#22C55E',
                  }}
                >
                  {answeredCount}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{
                    background: t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
                    minWidth: '60px',
                    maxWidth: '200px',
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #6366F1, #22C55E)',
                    }}
                  />
                </div>
                <span className="text-xs font-medium shrink-0" style={{ color: t.textMuted }}>
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          </div>

          {/* Timer & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Timer */}
            <div
              className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 sm:gap-2"
              style={{
                background: t.isDark
                  ? `rgba(${timeColor === '#EF4444' ? '239,68,68' : timeColor === '#FBBF24' ? '251,191,36' : '34,197,94'},0.15)`
                  : `rgba(${timeColor === '#EF4444' ? '239,68,68' : timeColor === '#FBBF24' ? '251,191,36' : '34,197,94'},0.1)`,
                border: `1.5px solid ${timeColor}40`,
              }}
            >
              <Clock className="w-4 h-4" style={{ color: timeColor }} strokeWidth={2} />
              <span className="text-xs sm:text-sm font-bold" style={{ color: timeColor }}>
                {formatTime(timeRemaining)}
              </span>
            </div>

            {/* Question Map Button */}
            <button
              onClick={() => setShowQuestionMap(true)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                border: `1.5px solid rgba(99,102,241,0.25)`,
                color: '#6366F1',
              }}
            >
              <Grid3x3 className="w-4 h-4" strokeWidth={2} />
              <span className="text-xs sm:text-sm font-semibold hidden sm:inline">Xarita</span>
            </button>

            {/* Submit Button */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 sm:gap-2 transition-all"
              style={{
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }}
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Yakunlash</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="grid lg:grid-cols-[1fr,300px] gap-4 sm:gap-6">
          {/* Question Section */}
          <div
            className="rounded-2xl p-4 sm:p-6 shadow-lg"
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
            }}
          >
            {/* Question Header */}
            <div className="flex flex-wrap items-center gap-2 mb-6 pb-5" style={{ borderBottom: `1px solid ${t.border}` }}>
              <span
                className="text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{
                  background: t.isDark ? `${getSubjectColor(currentQuestion.subject)}20` : `${getSubjectColor(currentQuestion.subject)}15`,
                  color: getSubjectColor(currentQuestion.subject),
                  border: `1.5px solid ${getSubjectColor(currentQuestion.subject)}40`,
                }}
              >
                {getSubjectLabel(currentQuestion.subject)}
              </span>
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{
                  background: t.isDark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.1)',
                  color: t.isDark ? '#E2E8F0' : '#334155',
                  border: `1px solid ${t.isDark ? 'rgba(148,163,184,0.24)' : 'rgba(148,163,184,0.18)'}`,
                }}
              >
                {currentQuestion.topic}
              </span>
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{
                  background: t.isDark ? `${getDifficultyColor(currentQuestion.difficulty)}20` : `${getDifficultyColor(currentQuestion.difficulty)}15`,
                  color: getDifficultyColor(currentQuestion.difficulty),
                  border: `1.5px solid ${getDifficultyColor(currentQuestion.difficulty)}30`,
                }}
              >
                {currentQuestion.difficulty}
              </span>
            </div>

            {/* Question Text */}
            <div className="mb-8">
              <div
                className="text-base sm:text-lg leading-relaxed"
                style={{ color: t.textPrimary }}
              >
                {renderMathText(currentQuestion.question_text)}
              </div>

              {currentQuestion.table_markdown && (
                <div
                  className="mt-4 p-4 rounded-xl"
                  style={{
                    background: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <MarkdownTable
                    markdown={currentQuestion.table_markdown}
                    borderColor={t.border}
                    headerBackground={t.bgInner}
                    headerTextColor={t.textPrimary}
                    cellTextColor={t.textSecondary}
                  />
                </div>
              )}

              {currentQuestion.images.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.images.map((image, idx) => {
                    const imageUrl = getQuestionImageUrl(image);
                    if (!imageUrl) return null;

                    return (
                      <div
                        key={typeof image === 'string' ? `${image}-${idx}` : `${image.id ?? idx}-${imageUrl}`}
                        className="rounded-xl overflow-hidden w-full"
                        style={{
                          border: `1px solid ${t.border}`,
                          background: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        }}
                      >
                        <div
                          className="w-full flex items-center justify-center"
                          style={{
                            minHeight: '180px',
                            maxHeight: '320px',
                          }}
                        >
                          <img
                            src={imageUrl}
                            alt={`Question image ${idx + 1}`}
                            className="block w-full h-auto object-contain"
                            style={{
                              maxHeight: '320px',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Answer Options */}
            <div className="space-y-2.5 sm:space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = currentAnswer === option.label;

                return (
                  <button
                    key={option.label}
                    onClick={() => handleSelectAnswer(option.label)}
                    className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl flex items-center gap-3 sm:gap-4 transition-all text-left"
                    style={{
                      background: isSelected
                        ? (t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)')
                        : (t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                      border: isSelected
                        ? `2px solid #6366F1`
                        : `1.5px solid ${t.border}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                        (e.currentTarget as HTMLElement).style.borderColor = '#6366F1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
                        (e.currentTarget as HTMLElement).style.borderColor = t.border;
                      }
                    }}
                  >
                    {/* Option Label */}
                    <div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold shrink-0 text-sm sm:text-base"
                      style={{
                        background: isSelected
                          ? (t.isDark ? '#818CF8' : '#6366F1')
                          : (t.isDark ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.08)'),
                        color: isSelected ? '#FFFFFF' : (t.isDark ? '#C7D2FE' : '#4338CA'),
                        border: isSelected
                          ? 'none'
                          : `1px solid ${t.isDark ? 'rgba(129,140,248,0.24)' : 'rgba(99,102,241,0.16)'}`,
                      }}
                    >
                      {option.label}
                    </div>

                    {/* Option Text */}
                    <div
                      className="flex-1 font-medium text-sm sm:text-base"
                      style={{ color: isSelected ? '#6366F1' : t.textPrimary }}
                    >
                      {renderMathText(option.text)}
                    </div>

                    {/* Checkmark */}
                    {isSelected && (
                      <CheckCircle
                        className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
                        style={{ color: '#6366F1' }}
                        strokeWidth={2.5}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-2.5 sm:gap-3 mt-6 sm:mt-8 pt-5 sm:pt-6" style={{ borderTop: `1px solid ${t.border}` }}>
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="flex-1 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  border: `1.5px solid ${t.border}`,
                  color: currentQuestionIndex === 0 ? t.textMuted : t.textSecondary,
                  opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                  cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                Oldingi
              </button>
              <button
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === testSession.questions.length - 1}
                className="flex-1 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: currentQuestionIndex === testSession.questions.length - 1
                    ? (t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                    : (t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'),
                  border: `1.5px solid ${currentQuestionIndex === testSession.questions.length - 1 ? t.border : 'rgba(99,102,241,0.3)'}`,
                  color: currentQuestionIndex === testSession.questions.length - 1 ? t.textMuted : '#6366F1',
                  opacity: currentQuestionIndex === testSession.questions.length - 1 ? 0.5 : 1,
                  cursor: currentQuestionIndex === testSession.questions.length - 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Keyingi
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Stats Sidebar (Desktop only) */}
          <div className="hidden lg:block">
            <div
              className="rounded-2xl p-5 sticky top-24"
              style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                    border: `1.5px solid rgba(99,102,241,0.25)`,
                  }}
                >
                  <BarChart3 className="w-5 h-5" style={{ color: '#6366F1' }} strokeWidth={2} />
                </div>
                <h3 className="font-bold" style={{ color: t.textPrimary }}>
                  Statistika
                </h3>
              </div>

              <div className="space-y-3">
                <div
                  className="px-4 py-3 rounded-xl flex items-center justify-between"
                  style={{
                    background: t.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)',
                    border: `1.5px solid rgba(34,197,94,0.25)`,
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: '#22C55E' }}>
                    Javob berilgan
                  </span>
                  <span className="text-lg font-bold" style={{ color: '#22C55E' }}>
                    {answeredCount}
                  </span>
                </div>

                <div
                  className="px-4 py-3 rounded-xl flex items-center justify-between"
                  style={{
                    background: t.isDark ? 'rgba(156,163,175,0.12)' : 'rgba(156,163,175,0.08)',
                    border: `1.5px solid rgba(156,163,175,0.25)`,
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: t.textMuted }}>
                    Qolgan
                  </span>
                  <span className="text-lg font-bold" style={{ color: t.textMuted }}>
                    {testSession.questions_count - answeredCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Map Modal */}
      {showQuestionMap && (
        <QuestionMapModal
          questions={testSession.questions}
          currentQuestionIndex={currentQuestionIndex}
          answers={answers}
          onSelectQuestion={(index) => {
            void changeQuestionIndex(index);
          }}
          onClose={() => setShowQuestionMap(false)}
        />
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <SubmitConfirmationModal
          answeredCount={answeredCount}
          totalCount={testSession.questions_count}
          onConfirm={handleSubmitTest}
          onCancel={() => setShowSubmitModal(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}

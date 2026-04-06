import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, BookOpen,
  ChevronLeft, ChevronRight, Home, BarChart3, Lightbulb,
  Grid3x3, X, Circle,
} from 'lucide-react';
import katex from 'katex';
import { useTheme } from '../../components/ThemeContext';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';
import 'katex/dist/katex.min.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.myedunova.uz';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ReviewOption {
  id: number;
  label: string;
  text: string;
  is_correct: boolean;
}

interface ReviewImage {
  id?: number;
  image_url?: string | null;
}

interface ErrorAnalysisApiItem {
  id: number;
  question_id: number;
  difficulty: string;
  question_text: string;
  subject: string;
  table_markdown: string;
  images: ReviewImage[];
  topic: string;
  options: ReviewOption[];
  user_select_option: string | null;
  user_select_option_is_correct: boolean | null;
}

interface QuestionReview {
  id: number;
  question_number: number;
  subject: string;
  topic: string;
  difficulty: string;
  question_text: string;
  table_markdown: string;
  images: ReviewImage[];
  options: ReviewOption[];
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean;
}

interface ErrorAnalysis {
  session_id: number;
  quiz_name: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  questions: QuestionReview[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
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

async function fetchErrorAnalysis(sessionId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/${sessionId}/single-player-error-analysis/`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Xatolar tahlilini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<ErrorAnalysisApiItem[]>;
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

  const headerCells = lines[0].split('|').map((cell) => cell.trim()).filter(Boolean);
  const dataRows = lines.slice(2).map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean)).filter((row) => row.length > 0);
  if (headerCells.length === 0) return null;

  return { headerCells, dataRows };
}

function getReviewImageUrl(image: ReviewImage) {
  return normalizeText(image.image_url);
}

function normalizeOptionLabel(value: string | null | undefined) {
  return normalizeText(value).toUpperCase();
}

function mapErrorAnalysis(sessionId: number, items: ErrorAnalysisApiItem[]): ErrorAnalysis {
  const questions = (Array.isArray(items) ? items : []).map((item, index) => {
    const correctOption = item.options.find((option) => option.is_correct);
    return {
      id: item.id,
      question_number: index + 1,
      subject: normalizeText(item.subject, "Noma'lum fan"),
      topic: normalizeText(item.topic, "Noma'lum mavzu"),
      difficulty: normalizeText(item.difficulty, "Noma'lum"),
      question_text: normalizeText(item.question_text),
      table_markdown: normalizeText(item.table_markdown),
      images: Array.isArray(item.images) ? item.images : [],
      options: Array.isArray(item.options) ? item.options : [],
      correct_answer: normalizeOptionLabel(correctOption?.label),
      user_answer: normalizeOptionLabel(item.user_select_option) || null,
      is_correct: item.user_select_option_is_correct === true,
    };
  });

  const correctCount = questions.filter((question) => question.is_correct).length;
  const unansweredCount = questions.filter((question) => question.user_answer === null).length;
  const incorrectCount = Math.max(0, questions.length - correctCount - unansweredCount);

  return {
    session_id: sessionId,
    quiz_name: `Sessiya #${sessionId}`,
    total_questions: questions.length,
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    unanswered_count: unansweredCount,
    questions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function StudentErrorAnalysisPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const sessionId = Number.parseInt(id ?? '', 10);
  const [analysis, setAnalysis] = useState<ErrorAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'incorrect' | 'unanswered'>('all');
  const [showQuestionMap, setShowQuestionMap] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      setError('Sessiya identifikatori topilmadi');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    fetchErrorAnalysis(sessionId)
      .then((data) => {
        if (cancelled) return;
        const mappedAnalysis = mapErrorAnalysis(sessionId, Array.isArray(data) ? data : []);
        setAnalysis(mappedAnalysis);
        setFilterType('all');
        setCurrentQuestionIndex(0);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAnalysis(null);
        setError(err instanceof Error ? err.message : "Xatolar tahlilini yuklab bo'lmadi");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: t.bgBase }}>
        <div
          className="rounded-2xl px-5 py-4 flex items-center gap-3"
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard, color: t.textPrimary }}
        >
          <div className="w-5 h-5 rounded-full border-2 border-[#6366F1]/30 border-t-[#6366F1] animate-spin" />
          Xatolar tahlili yuklanmoqda...
        </div>
      </div>
    );
  }

  if (error || !analysis) {
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
                Tahlil ochilmadi
              </h2>
              <p className="text-sm mt-1" style={{ color: t.textSecondary }}>
                {error || "Xatolar tahlili mavjud emas."}
              </p>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => navigate(`/student/test-results/${id}`)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
                >
                  Natijalarga qaytish
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

  // Filter questions based on selected type
  const filteredQuestions = analysis.questions.filter(q => {
    if (filterType === 'incorrect') return q.user_answer !== null && !q.is_correct;
    if (filterType === 'unanswered') return q.user_answer === null;
    return true;
  });

  const visibleQuestions = filteredQuestions.length > 0 ? filteredQuestions : analysis.questions;
  const safeQuestionIndex = Math.min(currentQuestionIndex, Math.max(visibleQuestions.length - 1, 0));

  const currentQuestion = visibleQuestions[safeQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: t.bgBase }}>
        <div className="text-center">
          <p className="text-lg font-semibold mb-4" style={{ color: t.textPrimary }}>
            Xatolar topilmadi
          </p>
          <button
            onClick={() => navigate(`/student/test-results/${id}`)}
            className="px-6 py-3 rounded-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
          >
            Natijalar sahifasiga qaytish
          </button>
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
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => navigate(`/student/test-results/${id}`)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${t.border}`,
              }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: t.textSecondary }} strokeWidth={2} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-sm sm:text-base truncate" style={{ color: t.textPrimary }}>
                Xatolar tahlili
              </h1>
              <p className="text-xs truncate" style={{ color: t.textMuted }}>
                {safeQuestionIndex + 1} / {visibleQuestions.length} savol
              </p>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Question Map Button */}
            <button
              onClick={() => setShowQuestionMap(true)}
              className="px-2 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                border: `1.5px solid rgba(99,102,241,0.25)`,
                color: '#6366F1',
              }}
            >
              <Grid3x3 className="w-4 h-4" strokeWidth={2} />
              <span className="text-xs font-semibold hidden sm:inline">Xarita</span>
            </button>

            <button
              onClick={() => {
                setFilterType('incorrect');
                setCurrentQuestionIndex(0);
              }}
              className="px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filterType === 'incorrect'
                  ? (t.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)')
                  : 'transparent',
                color: filterType === 'incorrect' ? '#EF4444' : t.textMuted,
                border: filterType === 'incorrect' ? '1.5px solid rgba(239,68,68,0.3)' : '1.5px solid transparent',
              }}
            >
              Xato
            </button>
            <button
              onClick={() => {
                setFilterType('unanswered');
                setCurrentQuestionIndex(0);
              }}
              className="px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filterType === 'unanswered'
                  ? (t.isDark ? 'rgba(156,163,175,0.15)' : 'rgba(156,163,175,0.1)')
                  : 'transparent',
                color: filterType === 'unanswered' ? t.textMuted : t.textMuted,
                border: filterType === 'unanswered' ? '1.5px solid rgba(156,163,175,0.3)' : '1.5px solid transparent',
              }}
            >
              Javobsiz
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
        {/* Question Card */}
        <div
          className="rounded-2xl p-4 sm:p-6 mb-4"
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
          }}
        >
          {/* Question Header */}
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-4" style={{ borderBottom: `1px solid ${t.border}` }}>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                color: '#6366F1',
                border: '1.5px solid rgba(99,102,241,0.25)',
              }}
            >
              #{currentQuestion.question_number}
            </span>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{
                background: t.isDark ? `${getSubjectColor(currentQuestion.subject)}20` : `${getSubjectColor(currentQuestion.subject)}15`,
                color: getSubjectColor(currentQuestion.subject),
                border: `1.5px solid ${getSubjectColor(currentQuestion.subject)}40`,
              }}
            >
              {getSubjectLabel(currentQuestion.subject)}
            </span>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                color: t.textMuted,
                border: `1px solid ${t.border}`,
              }}
            >
              {currentQuestion.topic}
            </span>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-lg"
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
          <div className="mb-6">
            <div className="text-base sm:text-lg leading-relaxed" style={{ color: t.textPrimary }}>
              {renderMathText(currentQuestion.question_text)}
            </div>

            {currentQuestion.table_markdown && (
              <div
                className="mt-4 p-4 rounded-xl overflow-x-auto"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${t.border}`,
                }}
              >
                {(() => {
                  const parsed = parseMarkdownTable(currentQuestion.table_markdown);
                  if (!parsed) {
                    return (
                      <pre className="text-sm whitespace-pre-wrap" style={{ color: t.textSecondary }}>
                        {currentQuestion.table_markdown}
                      </pre>
                    );
                  }

                  return (
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
                          {parsed.headerCells.map((cell, index) => (
                            <th key={index} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: t.textPrimary }}>
                              {renderMathText(cell)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.dataRows.map((row, rowIndex) => (
                          <tr key={rowIndex} style={{ borderBottom: rowIndex < parsed.dataRows.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-4 py-2.5 text-sm align-top" style={{ color: t.textSecondary }}>
                                {renderMathText(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}

            {currentQuestion.images.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.images.map((image, index) => {
                  const imageUrl = getReviewImageUrl(image);
                  if (!imageUrl) return null;

                  return (
                    <div
                      key={`${image.id ?? index}-${imageUrl}`}
                      className="rounded-xl overflow-hidden w-full"
                      style={{
                        border: `1px solid ${t.border}`,
                        background: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <div className="w-full flex items-center justify-center" style={{ minHeight: '180px', maxHeight: '320px' }}>
                        <img
                          src={imageUrl}
                          alt={`Question image ${index + 1}`}
                          className="block w-full h-auto object-contain"
                          style={{ maxHeight: '320px' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Answer Options */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((option) => {
              const isUserAnswer = currentQuestion.user_answer === option.label;
              const isCorrectAnswer = currentQuestion.correct_answer === option.label;
              
              let borderColor = t.border;
              let bgColor = t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
              let icon = null;

              if (isCorrectAnswer) {
                borderColor = '#22C55E';
                bgColor = t.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)';
                icon = <CheckCircle className="w-5 h-5 shrink-0" style={{ color: '#22C55E' }} strokeWidth={2.5} />;
              }

              if (isUserAnswer && !isCorrectAnswer) {
                borderColor = '#EF4444';
                bgColor = t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)';
                icon = <XCircle className="w-5 h-5 shrink-0" style={{ color: '#EF4444' }} strokeWidth={2.5} />;
              }

              return (
                <div
                  key={option.label}
                  className="px-4 sm:px-5 py-3 sm:py-4 rounded-xl flex items-center gap-3 sm:gap-4"
                  style={{
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                  }}
                >
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold shrink-0 text-sm sm:text-base"
                    style={{
                      background: isCorrectAnswer
                        ? '#22C55E'
                        : isUserAnswer && !isCorrectAnswer
                        ? '#EF4444'
                        : (t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                      color: isCorrectAnswer || (isUserAnswer && !isCorrectAnswer) ? '#fff' : t.textMuted,
                      border: isCorrectAnswer || (isUserAnswer && !isCorrectAnswer) ? 'none' : `1px solid ${t.border}`,
                    }}
                  >
                    {option.label}
                  </div>
                  
                  <div
                    className="flex-1 font-medium text-sm sm:text-base"
                    style={{
                      color: isCorrectAnswer
                        ? '#22C55E'
                        : isUserAnswer && !isCorrectAnswer
                        ? '#EF4444'
                        : t.textPrimary,
                    }}
                  >
                    {renderMathText(option.text)}
                  </div>

                  {icon}
                </div>
              );
            })}
          </div>

          <div
            className="mt-4 p-4 rounded-xl flex items-start gap-3"
            style={{
              background: currentQuestion.user_answer === null
                ? (t.isDark ? 'rgba(156,163,175,0.12)' : 'rgba(156,163,175,0.08)')
                : currentQuestion.is_correct
                ? (t.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)')
                : (t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)'),
              border: currentQuestion.user_answer === null
                ? '1.5px solid rgba(156,163,175,0.25)'
                : currentQuestion.is_correct
                ? '1.5px solid rgba(34,197,94,0.25)'
                : '1.5px solid rgba(239,68,68,0.25)',
            }}
          >
            {currentQuestion.user_answer === null ? (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: t.textMuted }} strokeWidth={2} />
            ) : currentQuestion.is_correct ? (
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#22C55E' }} strokeWidth={2} />
            ) : (
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#EF4444' }} strokeWidth={2} />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm mb-1" style={{ color: t.textPrimary }}>
                {currentQuestion.user_answer === null
                  ? 'Javob berilmagan'
                  : currentQuestion.is_correct
                  ? "Siz bu savolga to'gri javob bergansiz!"
                  : "Siz bu savolga noto'g'ri javob bergansiz!"}
              </p>
              {!currentQuestion.is_correct && currentQuestion.user_answer !== null && (
                <p className="text-xs" style={{ color: t.textMuted }}>
                  Sizning javobingiz: {currentQuestion.user_answer} • To'g'ri javob: {currentQuestion.correct_answer}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={safeQuestionIndex === 0}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: `1.5px solid ${t.border}`,
              color: safeQuestionIndex === 0 ? t.textMuted : t.textSecondary,
              opacity: safeQuestionIndex === 0 ? 0.5 : 1,
              cursor: safeQuestionIndex === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            Oldingi
          </button>
          <button
            onClick={() => setCurrentQuestionIndex(Math.min(visibleQuestions.length - 1, safeQuestionIndex + 1))}
            disabled={safeQuestionIndex === visibleQuestions.length - 1}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: safeQuestionIndex === visibleQuestions.length - 1
                ? (t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                : (t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'),
              border: `1.5px solid ${safeQuestionIndex === visibleQuestions.length - 1 ? t.border : 'rgba(99,102,241,0.3)'}`,
              color: safeQuestionIndex === visibleQuestions.length - 1 ? t.textMuted : '#6366F1',
              opacity: safeQuestionIndex === visibleQuestions.length - 1 ? 0.5 : 1,
              cursor: safeQuestionIndex === visibleQuestions.length - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Keyingi
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Question Map Modal */}
      {showQuestionMap && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowQuestionMap(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              maxHeight: '90vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
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
                    {analysis.incorrect_count} xato • {analysis.unanswered_count} javobsiz
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuestionMap(false)}
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
                  To'g'ri javob
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{
                    background: t.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
                    border: `1.5px solid rgba(239,68,68,0.3)`,
                  }}
                >
                  <XCircle className="w-3 h-3" style={{ color: '#EF4444' }} strokeWidth={2.5} />
                </div>
                <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
                  Xato javob
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
                {analysis.questions.map((question, index) => {
                  const isCorrect = question.user_answer !== null && question.is_correct;
                  const isIncorrect = question.user_answer !== null && !question.is_correct;
                  const isUnanswered = question.user_answer === null;
                  const isCurrent = visibleQuestions[safeQuestionIndex]?.id === question.id;

                  // Determine background and border
                  let bgColor = t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                  let borderColor = t.border;
                  let textColor = t.textSecondary;

                  if (isCurrent) {
                    bgColor = t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)';
                    borderColor = '#6366F1';
                    textColor = '#6366F1';
                  } else if (isCorrect) {
                    bgColor = t.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)';
                    borderColor = 'rgba(34,197,94,0.3)';
                    textColor = '#22C55E';
                  } else if (isIncorrect) {
                    bgColor = t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)';
                    borderColor = 'rgba(239,68,68,0.3)';
                    textColor = '#EF4444';
                  } else if (isUnanswered) {
                    bgColor = t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                    borderColor = t.border;
                    textColor = t.textMuted;
                  }

                  return (
                    <button
                      key={question.id}
                      onClick={() => {
                        // Find index in filtered list
                        const filteredIndex = visibleQuestions.findIndex(q => q.id === question.id);
                        if (filteredIndex !== -1) {
                          setCurrentQuestionIndex(filteredIndex);
                          setShowQuestionMap(false);
                        }
                      }}
                      className="aspect-square rounded-lg flex items-center justify-center font-bold text-sm transition-all"
                      style={{
                        background: bgColor,
                        border: `${isCurrent ? '2px' : '1.5px'} solid ${borderColor}`,
                        color: textColor,
                      }}
                    >
                      {question.question_number}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

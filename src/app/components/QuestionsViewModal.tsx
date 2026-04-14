import { useEffect, useMemo, useState } from 'react';
import { useTheme } from './ThemeContext';
import { getValidAccessToken, refreshStoredAuthToken } from '../lib/auth.ts';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
    X,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Hash,
    BookOpen,
    Target,
    Image as ImageIcon,
    Map,
    Loader2,
    AlertCircle,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

interface QuestionImage {
    id: number;
    image_url: string;
}

interface QuestionOption {
    id: number;
    label: string;
    text: string;
    is_correct: boolean;
}

interface Question {
    id: number;
    subject: string;
    question_text: string;
    table_markdown?: string;
    difficulty: string;
    topic: string;
    images: QuestionImage[];
    options: QuestionOption[];
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

interface QuestionDetailApiResponse {
    id: number;
    subject: string;
    question_text: string;
    table_markdown: string;
    difficulty: string;
    topic: string;
    images: QuestionImage[];
    options: QuestionOption[];
}

interface QuestionSummary {
    id: number;
    subject: string;
    question_text: string;
    difficulty: string;
    topic: string;
}

interface QuestionsViewModalProps {
    open: boolean;
    onClose: () => void;
    quizId: number | null;
}

async function fetchWithAuthRetry(url: string, init: RequestInit = {}) {
    let token = await getValidAccessToken();
    if (!token) {
        throw new Error('Sessiya topilmadi. Qayta kiring');
    }

    const makeRequest = (accessToken: string) =>
        fetch(url, {
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

async function fetchQuizQuestions(quizId: number) {
    const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/quizzes/${quizId}/`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(`Savollar xaritasini olishda xatolik: ${response.status}`);
    }

    return response.json() as Promise<QuizDetailApiResponse>;
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

function toAbsoluteMediaUrl(path: string | null) {
    if (!path) return path;
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

function mapQuestionSummary(item: QuizQuestionApiItem, subject: string): QuestionSummary {
    return {
        id: item.id,
        subject,
        question_text: item.question_text,
        difficulty: item.difficulty,
        topic: item.topic,
    };
}

function mapQuestionDetail(detail: QuestionDetailApiResponse): Question {
    return {
        id: detail.id,
        subject: detail.subject,
        question_text: detail.question_text,
        table_markdown: detail.table_markdown ?? '',
        difficulty: detail.difficulty,
        topic: detail.topic,
        images: Array.isArray(detail.images)
            ? detail.images.map((image) => ({
                ...image,
                image_url: toAbsoluteMediaUrl(image.image_url) ?? image.image_url,
            }))
            : [],
        options: Array.isArray(detail.options) ? detail.options : [],
    };
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

export function QuestionsViewModal({ open, onClose, quizId }: QuestionsViewModalProps) {
    const { theme: t } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showMap, setShowMap] = useState(false);
    const [questions, setQuestions] = useState<QuestionSummary[]>([]);
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [questionsError, setQuestionsError] = useState('');
    const [questionDetails, setQuestionDetails] = useState<Record<number, Question>>({});
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    useEffect(() => {
        if (!open) {
            setShowMap(false);
            setCurrentIndex(0);
            setQuestionsError('');
            setDetailError('');
            setDetailLoading(false);
            return;
        }

        if (!quizId) {
            setQuestions([]);
            setQuestionsError("Test ID topilmadi. Savollarni ochib bo'lmadi.");
            return;
        }

        let cancelled = false;

        setQuestionsLoading(true);
        setQuestionsError('');
        setDetailError('');
        setCurrentIndex(0);
        setQuestionDetails({});

        fetchQuizQuestions(quizId)
            .then((data) => {
                if (cancelled) return;
                setQuestions(
                    (Array.isArray(data.questions) ? data.questions : []).map((item) =>
                        mapQuestionSummary(item, data.subject),
                    ),
                );
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                setQuestions([]);
                setQuestionsError(error instanceof Error ? error.message : "Savollar xaritasini yuklab bo'lmadi");
            })
            .finally(() => {
                if (!cancelled) {
                    setQuestionsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [open, quizId]);

    const currentSummary = questions[currentIndex] ?? null;
    const currentQuestion = currentSummary ? questionDetails[currentSummary.id] ?? null : null;

    useEffect(() => {
        if (!open || !currentSummary) {
            return;
        }

        if (questionDetails[currentSummary.id]) {
            setDetailError('');
            return;
        }

        let cancelled = false;

        setDetailLoading(true);
        setDetailError('');

        fetchQuestionDetail(currentSummary.id)
            .then((data) => {
                if (cancelled) return;
                setQuestionDetails((prev) => ({
                    ...prev,
                    [currentSummary.id]: mapQuestionDetail(data),
                }));
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                setDetailError(error instanceof Error ? error.message : "Savol tafsilotlarini yuklab bo'lmadi");
            })
            .finally(() => {
                if (!cancelled) {
                    setDetailLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [open, currentSummary, questionDetails]);

    const difficultyColors: Record<string, { color: string; bg: string; border: string }> = {
        oson: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
        "o'rtacha": { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
        "o'rta": { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
        qiyin: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
    };

    const activeDifficulty = currentQuestion?.difficulty ?? currentSummary?.difficulty ?? 'oson';
    const diffColor = difficultyColors[activeDifficulty.toLowerCase()] || difficultyColors.oson;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < questions.length - 1;

    const tableData = useMemo(() => {
        const markdown = currentQuestion?.table_markdown;
        if (!markdown) return null;

        const lines = markdown.trim().split('\n');
        if (lines.length < 2) return null;

        const headers = lines[0].split('|').map((header) => header.trim()).filter(Boolean);
        const rows = lines.slice(2).map((line) =>
            line.split('|').map((cell) => cell.trim()).filter(Boolean),
        );

        return { headers, rows };
    }, [currentQuestion?.table_markdown]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-8"
                style={{
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    boxShadow: t.isDark
                        ? '0 25px 50px rgba(0,0,0,0.5)'
                        : '0 25px 50px rgba(0,0,0,0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-all z-10"
                    style={{
                        background: t.bgInner,
                        border: `1px solid ${t.border}`,
                        color: t.textMuted,
                    }}
                >
                    <X className="w-4 h-4" strokeWidth={2} />
                </button>

                <div className="mb-6">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
                            Savollar ro'yxati
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowMap(!showMap)}
                                disabled={questionsLoading || questions.length === 0}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                style={{
                                    background: showMap ? t.accentMuted : t.bgInner,
                                    border: `1px solid ${showMap ? t.accentBorder : t.border}`,
                                    color: showMap ? t.accent : t.textSecondary,
                                }}
                            >
                                <Map className="w-4 h-4" strokeWidth={1.75} />
                                <span className="hidden sm:inline">Xarita</span>
                            </button>
                            <span className="text-sm font-medium px-3 py-1.5 rounded-lg" style={{ background: t.bgInner, color: t.textSecondary }}>
                                {questions.length > 0 ? `${currentIndex + 1} / ${questions.length}` : '0 / 0'}
                            </span>
                        </div>
                    </div>

                    {questionsLoading ? (
                        <div className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
                            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                            Savollar xaritasi yuklanmoqda...
                        </div>
                    ) : questionsError ? (
                        <div
                            className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
                            style={{
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.18)',
                                color: '#EF4444',
                            }}
                        >
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
                            <span>{questionsError}</span>
                        </div>
                    ) : currentSummary ? (
                        <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                                <Hash className="w-3.5 h-3.5" style={{ color: t.textMuted }} strokeWidth={1.75} />
                                <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
                                    ID: {currentSummary.id}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <BookOpen className="w-3.5 h-3.5" style={{ color: '#6366F1' }} strokeWidth={1.75} />
                                <span className="text-xs font-medium" style={{ color: '#6366F1' }}>
                                    {currentQuestion?.subject ?? currentSummary.subject}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: diffColor.bg, border: `1px solid ${diffColor.border}` }}>
                                <Target className="w-3.5 h-3.5" style={{ color: diffColor.color }} strokeWidth={1.75} />
                                <span className="text-xs font-medium capitalize" style={{ color: diffColor.color }}>
                                    {currentQuestion?.difficulty ?? currentSummary.difficulty}
                                </span>
                            </div>

                            {(currentQuestion?.topic ?? currentSummary.topic) && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                                    <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
                                        Mavzu: {currentQuestion?.topic ?? currentSummary.topic}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm" style={{ color: t.textMuted }}>
                            Savollar topilmadi.
                        </div>
                    )}
                </div>

                {!questionsLoading && !questionsError && currentSummary && (
                    <>
                        {detailLoading && !currentQuestion ? (
                            <div className="flex items-center gap-2 py-10 text-sm" style={{ color: t.textMuted }}>
                                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
                                Savol tafsilotlari yuklanmoqda...
                            </div>
                        ) : detailError && !currentQuestion ? (
                            <div
                                className="rounded-xl px-4 py-3 text-sm flex items-start gap-2 mb-6"
                                style={{
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.18)',
                                    color: '#EF4444',
                                }}
                            >
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
                                <span>{detailError}</span>
                            </div>
                        ) : currentQuestion ? (
                            <>
                                <div className="mb-6 p-4 rounded-xl" style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                                    <h3 className="text-sm font-semibold mb-2" style={{ color: t.textMuted }}>
                                        Savol matni:
                                    </h3>
                                    <div className="text-base leading-relaxed" style={{ color: t.textPrimary }}>
                                        {renderMathText(currentQuestion.question_text)}
                                    </div>
                                </div>

                                {currentQuestion.images.length > 0 && (
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <ImageIcon className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
                                            <h3 className="text-sm font-semibold" style={{ color: t.textSecondary }}>
                                                Rasmlar ({currentQuestion.images.length})
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {currentQuestion.images.map((img) => (
                                                <div key={img.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
                                                    <img
                                                        src={img.image_url}
                                                        alt={`Question ${currentQuestion.id} image ${img.id}`}
                                                        className="w-full h-auto"
                                                        style={{ maxHeight: '300px', objectFit: 'contain', background: t.bgInner }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {tableData && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold mb-3" style={{ color: t.textSecondary }}>
                                            Jadval:
                                        </h3>
                                        <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${t.border}` }}>
                                            <table className="w-full">
                                                <thead>
                                                    <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
                                                        {tableData.headers.map((header, idx) => (
                                                            <th key={idx} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>
                                                                {header}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tableData.rows.map((row, rowIdx) => (
                                                        <tr key={rowIdx} style={{ borderBottom: rowIdx < tableData.rows.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                                                            {row.map((cell, cellIdx) => (
                                                                <td key={cellIdx} className="px-4 py-2.5 text-sm" style={{ color: t.textSecondary }}>
                                                                    {renderMathText(cell)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold mb-3" style={{ color: t.textSecondary }}>
                                        Javob variantlari:
                                    </h3>
                                    <div className="space-y-2.5">
                                        {currentQuestion.options.map((option) => (
                                            <div
                                                key={option.id}
                                                className="flex items-start gap-3 p-3.5 rounded-xl transition-all"
                                                style={{
                                                    background: option.is_correct ? 'rgba(34,197,94,0.08)' : t.bgInner,
                                                    border: `1px solid ${option.is_correct ? 'rgba(34,197,94,0.3)' : t.border}`,
                                                }}
                                            >
                                                <div className="shrink-0 mt-0.5">
                                                    {option.is_correct ? (
                                                        <CheckCircle2 className="w-5 h-5" style={{ color: '#22C55E' }} strokeWidth={2} />
                                                    ) : (
                                                        <XCircle className="w-5 h-5" style={{ color: t.textMuted }} strokeWidth={1.75} />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span
                                                            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold"
                                                            style={{
                                                                background: option.is_correct ? 'rgba(34,197,94,0.15)' : t.bgCard,
                                                                color: option.is_correct ? '#22C55E' : t.textSecondary,
                                                                border: `1px solid ${option.is_correct ? 'rgba(34,197,94,0.4)' : t.border}`,
                                                            }}
                                                        >
                                                            {option.label}
                                                        </span>
                                                        {option.is_correct && (
                                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                                                                To'g'ri javob
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm leading-relaxed" style={{ color: option.is_correct ? '#22C55E' : t.textPrimary }}>
                                                        {renderMathText(option.text)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : null}

                        {detailError && currentQuestion && (
                            <div
                                className="rounded-xl px-4 py-3 text-sm flex items-start gap-2 mb-6"
                                style={{
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.18)',
                                    color: '#EF4444',
                                }}
                            >
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
                                <span>{detailError}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-3 pt-4" style={{ borderTop: `1px solid ${t.border}` }}>
                            <button
                                onClick={() => setCurrentIndex((value) => value - 1)}
                                disabled={!hasPrev}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    background: hasPrev ? t.bgInner : t.bgCard,
                                    border: `1px solid ${t.border}`,
                                    color: t.textSecondary,
                                }}
                            >
                                <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                                Oldingi
                            </button>

                            <span className="text-sm font-medium" style={{ color: t.textMuted }}>
                                Savol {currentIndex + 1} / {questions.length}
                            </span>

                            <button
                                onClick={() => setCurrentIndex((value) => value + 1)}
                                disabled={!hasNext}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    background: hasNext ? t.bgInner : t.bgCard,
                                    border: `1px solid ${t.border}`,
                                    color: t.textSecondary,
                                }}
                            >
                                Keyingi
                                <ChevronRight className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {showMap && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
                    onClick={() => setShowMap(false)}
                >
                    <div
                        className="relative w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl p-6 sm:p-8"
                        style={{
                            background: t.bgCard,
                            border: `1px solid ${t.border}`,
                            boxShadow: t.isDark
                                ? '0 25px 50px rgba(0,0,0,0.6)'
                                : '0 25px 50px rgba(0,0,0,0.2)',
                            scrollbarWidth: 'thin',
                            scrollbarColor: t.isDark
                                ? 'rgba(129,140,248,0.65) rgba(30,41,59,0.4)'
                                : 'rgba(99,102,241,0.45) rgba(226,232,240,0.9)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowMap(false)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-all z-10"
                            style={{
                                background: t.bgInner,
                                border: `1px solid ${t.border}`,
                                color: t.textMuted,
                            }}
                        >
                            <X className="w-4 h-4" strokeWidth={2} />
                        </button>

                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: t.accentMuted,
                                        border: `1px solid ${t.accentBorder}`,
                                    }}
                                >
                                    <Map className="w-5 h-5" style={{ color: t.accent }} strokeWidth={1.75} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
                                        Savollar xaritasi
                                    </h2>
                                    <p className="text-sm" style={{ color: t.textMuted }}>
                                        {questions.length} ta savol
                                    </p>
                                </div>
                            </div>
                        </div>

                        {questionsLoading ? (
                            <div className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
                                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                                Savollar xaritasi yuklanmoqda...
                            </div>
                        ) : questionsError ? (
                            <div
                                className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
                                style={{
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.18)',
                                    color: '#EF4444',
                                }}
                            >
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
                                <span>{questionsError}</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                                {questions.map((question, idx) => {
                                    const isCurrent = idx === currentIndex;
                                    const hasLoadedDetail = Boolean(questionDetails[question.id]);
                                    const mapDiffColor = difficultyColors[question.difficulty.toLowerCase()] || difficultyColors.oson;

                                    return (
                                        <button
                                            key={question.id}
                                            onClick={() => {
                                                setCurrentIndex(idx);
                                                setShowMap(false);
                                            }}
                                            className="p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                                            style={{
                                                background: isCurrent
                                                    ? t.isDark
                                                        ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(79,70,229,0.15))'
                                                        : 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.08))'
                                                    : t.bgInner,
                                                border: `1.5px solid ${isCurrent ? t.accentBorder : t.border}`,
                                                boxShadow: isCurrent ? `0 4px 12px ${t.accent}40` : 'none',
                                            }}
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span className="text-lg font-bold" style={{ color: isCurrent ? t.accent : t.textPrimary }}>
                                                    #{idx + 1}
                                                </span>
                                                {hasLoadedDetail && (
                                                    <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E' }} strokeWidth={2} />
                                                )}
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <BookOpen className="w-3 h-3 shrink-0" style={{ color: '#6366F1' }} strokeWidth={1.75} />
                                                    <span className="text-xs font-medium truncate" style={{ color: '#6366F1' }}>
                                                        {question.subject}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Target className="w-3 h-3 shrink-0" style={{ color: mapDiffColor.color }} strokeWidth={1.75} />
                                                    <span className="text-xs capitalize truncate" style={{ color: mapDiffColor.color }}>
                                                        {question.difficulty}
                                                    </span>
                                                </div>
                                            </div>

                                            {question.topic && (
                                                <p className="text-xs mt-2 truncate" style={{ color: t.textMuted }}>
                                                    {question.topic}
                                                </p>
                                            )}

                                            <p className="text-xs mt-2 line-clamp-2" style={{ color: t.textSecondary }}>
                                                {renderMathText(question.question_text)}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div
                            className="flex flex-wrap gap-4 p-4 rounded-xl"
                            style={{
                                background: t.bgInner,
                                border: `1px solid ${t.border}`,
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-5 h-5 rounded-md"
                                    style={{
                                        background: t.isDark
                                            ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(79,70,229,0.15))'
                                            : 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.08))',
                                        border: `1.5px solid ${t.accentBorder}`,
                                    }}
                                />
                                <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
                                    Joriy savol
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" style={{ color: '#22C55E' }} strokeWidth={2} />
                                <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
                                    Tafsiloti yuklangan savol
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

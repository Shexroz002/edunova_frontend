import { useParams, useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft, Users, ClipboardCheck, BarChart3,
    Clock, CheckCircle, AlertTriangle, Zap,
    FlaskConical, Leaf, Calculator, Eye,
    TrendingUp, TrendingDown, BookOpen, Award, Target, Crown, Medal, Search,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { ALL_GROUPS } from './StudentGroupsPage';
import type { GroupItem } from './StudentGroupsPage';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

interface GroupDetailApi {
    id: number;
    name: string;
    subject_name: string;
    description: string;
    students_count: number;
    tests_count: number;
    average_score: number;
    last_activity: string | null;
    status: 'ACTIVE' | 'INACTIVE' | string;
    color: string | null;
    cover_image: string | null;
}

interface GroupSessionApiItem {
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

interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

interface ApiEnvelope<T> {
    data: T;
}

type GroupPerformanceStudent = {
    initials: string;
    name: string;
    profileImage?: string | null;
    correct: number;
    incorrect: number;
    tests: number;
    avgScore: number;
};

type GroupQuizCard = {
    sessionId: number;
    name: string;
    date: string;
    avgScore: number;
    submissions: number;
};

const DEFAULT_GROUP: GroupItem = {
    id: 0,
    name: "Noma'lum guruh",
    subject: 'Fan',
    subjectIcon: 'calculator',
    color: '#6366F1',
    students: 0,
    quizzes: 0,
    lastActivity: "Noma'lum",
    activityLevel: 'low',
    avgScore: 0,
    description: "Tavsif yo'q",
};

function unwrapApiData<T>(payload: T | ApiEnvelope<T>): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as ApiEnvelope<T>).data;
    }
    return payload as T;
}

// ── Per-group mock detail data ─────────────────────────────────────────────────
function getGroupDetails(grp: GroupItem) {
    const seed = grp.id * 13;
    const students: GroupPerformanceStudent[] = [
        { initials: 'NR', name: 'Nilufar Rahimova',   profileImage: null, correct: 145, incorrect: 28, tests: 12, avgScore: 85 },
        { initials: 'BS', name: 'Bobur Saidov',       profileImage: null, correct: 138, incorrect: 35, tests: 11, avgScore: 82 },
        { initials: 'AK', name: 'Ali Karimov',        profileImage: null, correct: 132, incorrect: 41, tests: 11, avgScore: 78 },
        { initials: 'MY', name: 'Malika Yusupova',    profileImage: null, correct: 125, incorrect: 48, tests: 10, avgScore: 74 },
        { initials: 'DS', name: 'Dilshod Sharipov',   profileImage: null, correct: 118, incorrect: 55, tests: 10, avgScore: 70 },
    ].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

    const quizzes: GroupQuizCard[] = [
        { sessionId: seed + 1, name: `${grp.subject} — 1-bo'lim testi`,    date: '14 mart', avgScore: Math.min(98, 72 + seed % 20), submissions: Math.min(grp.students, 22 + seed % 8) },
        { sessionId: seed + 2, name: `${grp.subject} — Amaliyot testi`,    date: '10 mart', avgScore: Math.min(98, 65 + seed % 25), submissions: Math.min(grp.students, 18 + seed % 6) },
        { sessionId: seed + 3, name: `${grp.subject} — Oraliq nazorat`,    date: '5 mart',  avgScore: Math.min(98, 78 + seed % 18), submissions: Math.min(grp.students, 25 + seed % 5) },
        { sessionId: seed + 4, name: `${grp.subject} — Mustaqil topshiriq`,date: '1 mart',  avgScore: Math.min(98, 60 + seed % 30), submissions: Math.min(grp.students, 15 + seed % 7) },
    ].slice(0, grp.quizzes > 4 ? 4 : Math.max(2, grp.quizzes));

    return { students, quizzes };
}

function initialsFromName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NN';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function subjectIconFromName(subject: string) {
    const normalized = subject.trim().toLowerCase();
    if (normalized.includes('fiz')) return 'zap';
    if (normalized.includes('kim')) return 'flask';
    if (normalized.includes('bio')) return 'leaf';
    return 'calculator';
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
    return value ? map[value] ?? '#6366F1' : '#6366F1';
}

function formatRelativeActivity(value: string | null) {
    if (!value) return "Noma'lum";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Noma'lum";

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
    if (!value) return "Noma'lum";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Noma'lum";
    return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
}

function mapApiGroup(detail: GroupDetailApi, fallback: GroupItem): GroupItem {
    return {
        id: detail.id ?? fallback.id,
        name: detail.name || fallback.name,
        subject: detail.subject_name || fallback.subject,
        subjectIcon: subjectIconFromName(detail.subject_name || fallback.subject),
        color: colorFromApi(detail.color) || fallback.color,
        students: detail.students_count ?? fallback.students ?? 0,
        quizzes: detail.tests_count ?? fallback.quizzes ?? 0,
        lastActivity: formatRelativeActivity(detail.last_activity),
        activityLevel: detail.status === 'ACTIVE' ? 'active' : 'low',
        avgScore: detail.average_score ?? fallback.avgScore ?? 0,
        description: detail.description || fallback.description || "Tavsif yo'q",
        coverImage: detail.cover_image ?? fallback.coverImage,
    };
}

function mapApiPerformanceStudent(item: StudentPerformanceApiItem): GroupPerformanceStudent {
    return {
        initials: initialsFromName(item.full_name || ''),
        name: item.full_name || "Noma'lum",
        profileImage: item.profile_image ?? null,
        correct: item.correct_answers ?? 0,
        incorrect: item.wrong_answers ?? 0,
        tests: item.tests_count ?? 0,
        avgScore: item.average_score ?? 0,
    };
}

function mapApiSession(item: GroupSessionApiItem): GroupQuizCard {
    return {
        sessionId: item.session_id ?? 0,
        name: item.quiz_name || "Noma'lum test",
        date: formatQuizDate(item.session_date),
        avgScore: item.average_score ?? 0,
        submissions: item.completed_students ?? 0,
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#6366F1','#3B82F6','#22C55E','#F59E0B','#EF4444'];

function scoreColor(score: number) {
    if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'   };
    if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
    return              { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'   };
}

function SubjectIcon({ type, color, size = 20 }: { type: string; color: string; size?: number }) {
    const props = { style: { color }, strokeWidth: 1.75, width: size, height: size };
    switch (type) {
        case 'zap':    return <Zap {...props} />;
        case 'flask':  return <FlaskConical {...props} />;
        case 'leaf':   return <Leaf {...props} />;
        default:       return <Calculator {...props} />;
    }
}

function ActivityIcon({ type, t }: { type: string; t: ReturnType<typeof useTheme>['theme'] }) {
    const map: Record<string, { Icon: React.ElementType; color: string }> = {
        check: { Icon: CheckCircle, color: '#22C55E' },
        zap:   { Icon: Zap,         color: '#6366F1' },
        book:  { Icon: BookOpen,    color: '#3B82F6' },
        award: { Icon: Award,       color: '#F59E0B' },
        warn:  { Icon: AlertTriangle, color: '#EF4444' },
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

function StudentAvatar({
    name,
    initials,
    profileImage,
    color,
    sizeClass,
    textClass,
    ringShadow,
    imageClassName = 'w-full h-full object-cover',
}: {
    name: string;
    initials: string;
    profileImage?: string | null;
    color: string;
    sizeClass: string;
    textClass: string;
    ringShadow?: string;
    imageClassName?: string;
}) {
    const [imageError, setImageError] = useState(false);
    const hasImage = Boolean(profileImage) && !imageError;

    return (
        <div
            className={`${sizeClass} rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden ${textClass}`}
            style={{
                background: color,
                boxShadow: ringShadow ?? 'none',
            }}
        >
            {hasImage ? (
                <img
                    src={profileImage ?? undefined}
                    alt={name}
                    className={imageClassName}
                    onError={() => setImageError(true)}
                />
            ) : (
                initials
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function StudentGroupDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { theme: t } = useTheme();

    const groupId = useMemo(() => {
        const parsed = Number.parseInt(id || '1', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }, [id]);

    const fallbackGroup = useMemo(() => {
        return ALL_GROUPS.find((c) => c.id === groupId) ?? ALL_GROUPS[0] ?? { ...DEFAULT_GROUP, id: groupId };
    }, [groupId]);

    const fallbackDetails = useMemo(() => getGroupDetails(fallbackGroup), [fallbackGroup]);

    const [grp, setGrp] = useState<GroupItem>(fallbackGroup);
    const [leaderboardStudents, setLeaderboardStudents] = useState<GroupPerformanceStudent[]>(fallbackDetails.students);
    const [students, setStudents] = useState<GroupPerformanceStudent[]>(fallbackDetails.students);
    const [quizzes, setQuizzes] = useState<GroupQuizCard[]>(fallbackDetails.quizzes);

    const [searchQuery, setSearchQuery] = useState('');
    const [showAllStudents, setShowAllStudents] = useState(false);

    useEffect(() => {
        setGrp(fallbackGroup);
        setLeaderboardStudents(fallbackDetails.students);
        setStudents(fallbackDetails.students);
        setQuizzes(fallbackDetails.quizzes);
    }, [fallbackGroup, fallbackDetails]);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const [detailRes, sessionsRes, studentsRes] = await Promise.all([
                    fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/group/${groupId}/detail-card`, { method: 'GET' }),
                    fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/group/${groupId}/sessions?page=1&size=50`, { method: 'GET' }),
                    fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/group/${groupId}/students-performance?page=1&size=50`, { method: 'GET' }),
                ]);
                if (!detailRes.ok || !sessionsRes.ok || !studentsRes.ok || !isMounted) return;

                const detail = unwrapApiData<GroupDetailApi>(await detailRes.json());
                const sessionsData = unwrapApiData<PaginatedResponse<GroupSessionApiItem>>(await sessionsRes.json());
                const studentsData = unwrapApiData<PaginatedResponse<StudentPerformanceApiItem>>(await studentsRes.json());

                setGrp(mapApiGroup(detail, fallbackGroup));

                const mappedStudents = (studentsData.items ?? []).map(mapApiPerformanceStudent).sort((a, b) => b.avgScore - a.avgScore);
                setLeaderboardStudents(mappedStudents.length > 0 ? mappedStudents : fallbackDetails.students);
                setStudents(mappedStudents.length > 0 ? mappedStudents : fallbackDetails.students);

                const mappedQuizzes = (sessionsData.items ?? []).map(mapApiSession);
                setQuizzes(mappedQuizzes.length > 0 ? mappedQuizzes : fallbackDetails.quizzes);
            } catch {
                // Keep fallback values on API errors.
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [groupId, fallbackGroup, fallbackDetails]);

    useEffect(() => {
        let isMounted = true;
        const timeoutId = window.setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    page: '1',
                    size: '50',
                });
                if (searchQuery.trim()) {
                    params.set('search', searchQuery.trim());
                }

                const response = await fetchWithAuthRetry(
                    `${API_BASE_URL}/api/v1/student/group/${groupId}/students-performance?${params.toString()}`,
                    { method: 'GET' },
                );
                if (!response.ok || !isMounted) return;
                const data = unwrapApiData<PaginatedResponse<StudentPerformanceApiItem>>(await response.json());
                const mapped = (data.items ?? []).map(mapApiPerformanceStudent).sort((a, b) => b.avgScore - a.avgScore);
                setStudents(mapped);
            } catch {
                // Keep current list if search API fails.
            }
        }, 300);

        return () => {
            isMounted = false;
            window.clearTimeout(timeoutId);
        };
    }, [groupId, searchQuery]);

    const overallSc = scoreColor(grp.avgScore);

    // Filter students based on search query
    const filteredStudents = students.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination: show 5 students by default
    const STUDENTS_PER_PAGE = 5;
    const displayedStudents = showAllStudents
        ? filteredStudents
        : filteredStudents.slice(0, STUDENTS_PER_PAGE);
    const hasMoreStudents = filteredStudents.length > STUDENTS_PER_PAGE;

    return (
        <>
            {/* ── Back nav ── */}
            <div className="mb-5">
                <button
                    onClick={() => navigate('/student/group')}
                    className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl transition-all"
                    style={{ color: t.textSecondary, background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.accent; (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textSecondary; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Guruhlar ro'yxati
                </button>
            </div>

            {/* ── Group Header Card ── */}
            <Card className="mb-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {/* Icon */}
                    <div
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                            background: t.isDark ? `${grp.color}22` : `${grp.color}12`,
                            border: `2px solid ${grp.color}44`,
                            boxShadow: t.isDark ? `0 0 32px ${grp.color}33` : `0 4px 20px ${grp.color}22`,
                        }}
                    >
                        <SubjectIcon type={grp.subjectIcon} color={grp.color} size={36} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>{grp.name}</h2>
                                <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                  <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: `${grp.color}18`, color: grp.color, border: `1px solid ${grp.color}44` }}
                  >
                    <BookOpen className="w-3 h-3" />
                      {grp.subject}
                  </span>
                                    <p className="text-xs" style={{ color: t.textMuted }}>{grp.description}</p>
                                </div>
                            </div>

                            {/* Active badge */}
                            {{
                                active:   <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Faol</span>,
                                moderate: <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#F59E0B' }} />O'rtacha</span>,
                                low:      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: t.bgInner, color: t.textMuted, border: `1px solid ${t.border}` }}><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: t.textMuted }} />Kam faol</span>,
                            }[grp.activityLevel]}
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
                                    <p className="text-base font-bold" style={{ color: t.textPrimary }}>{grp.students}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                                 style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.bgButton }}>
                                    <ClipboardCheck className="w-4 h-4" style={{ color: t.textSecondary }} strokeWidth={1.75} />
                                </div>
                                <div>
                                    <p className="text-xs" style={{ color: t.textMuted }}>Testlar</p>
                                    <p className="text-base font-bold" style={{ color: t.textPrimary }}>{grp.quizzes}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                                 style={{ background: overallSc.bg, border: `1px solid ${overallSc.border}` }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${overallSc.color}22` }}>
                                    <Target className="w-4 h-4" style={{ color: overallSc.color }} strokeWidth={1.75} />
                                </div>
                                <div>
                                    <p className="text-xs" style={{ color: t.textMuted }}>O'rtacha ball</p>
                                    <p className="text-base font-bold" style={{ color: overallSc.color }}>{grp.avgScore}%</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                                 style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.bgButton }}>
                                    <Clock className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
                                </div>
                                <div>
                                    <p className="text-xs" style={{ color: t.textMuted }}>So'nggi faollik</p>
                                    <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>{grp.lastActivity}</p>
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
                        </div>

                        {/* Podium Layout - Modern Design */}
                        <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-6 py-2 sm:py-3">
                            {/* 2nd Place - Left */}
                            {leaderboardStudents[1] && (
                                <div className="flex flex-col items-center flex-1 max-w-[140px]">
                                    {/* Avatar with decorative elements */}
                                    <div className="relative mb-2">
                                        {/* Decorative lines */}
                                        <div className="absolute -left-8 sm:-left-12 top-1/2 w-6 sm:w-10 h-0.5 bg-gradient-to-r from-transparent to-current opacity-30" style={{ color: '#C0C0C0' }} />
                                        <div className="absolute -right-8 sm:-right-12 top-1/2 w-6 sm:w-10 h-0.5 bg-gradient-to-l from-transparent to-current opacity-30" style={{ color: '#C0C0C0' }} />

                                        {/* Avatar circle */}
                                        <div className="relative">
                                            <StudentAvatar
                                                name={leaderboardStudents[1].name}
                                                initials={leaderboardStudents[1].initials}
                                                profileImage={leaderboardStudents[1].profileImage}
                                                color={t.isDark
                                                    ? 'linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 100%)'
                                                    : 'linear-gradient(135deg, #F5F5F5 0%, #D1D1D1 100%)'}
                                                sizeClass="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative z-10"
                                                textClass="text-sm sm:text-base md:text-lg"
                                                ringShadow={t.isDark
                                                    ? '0 10px 30px rgba(192,192,192,0.25), 0 0 0 3px rgba(192,192,192,0.1)'
                                                    : '0 10px 30px rgba(0,0,0,0.15), 0 0 0 3px rgba(192,192,192,0.15)'}
                                                imageClassName="w-full h-full object-cover"
                                            />
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
                                        {leaderboardStudents[1].name.split(' ')[0]}
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-center mb-2" style={{ color: t.textMuted }}>
                                        {leaderboardStudents[1].name.split(' ')[1] || ''}
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
                                                    width: `${leaderboardStudents[1].avgScore}%`,
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
                                            {leaderboardStudents[1].avgScore}%
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 1st Place - Center (Taller) */}
                            {leaderboardStudents[0] && (
                                <div className="flex flex-col items-center flex-1 max-w-[160px] -mt-4 sm:-mt-6">
                                    {/* Avatar with decorative elements */}
                                    <div className="relative mb-2">
                                        {/* Decorative lines */}
                                        <div className="absolute -left-10 sm:-left-16 top-1/2 w-8 sm:w-14 h-0.5 bg-gradient-to-r from-transparent to-current opacity-40" style={{ color: '#FFD700' }} />
                                        <div className="absolute -right-10 sm:-right-16 top-1/2 w-8 sm:w-14 h-0.5 bg-gradient-to-l from-transparent to-current opacity-40" style={{ color: '#FFD700' }} />

                                        {/* Avatar circle */}
                                        <div className="relative">
                                            <StudentAvatar
                                                name={leaderboardStudents[0].name}
                                                initials={leaderboardStudents[0].initials}
                                                profileImage={leaderboardStudents[0].profileImage}
                                                color={t.isDark
                                                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                                                    : 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)'}
                                                sizeClass="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 relative z-10"
                                                textClass="text-base sm:text-lg md:text-xl text-white"
                                                ringShadow={t.isDark
                                                    ? '0 15px 40px rgba(255,215,0,0.35), 0 0 0 4px rgba(255,215,0,0.15)'
                                                    : '0 15px 40px rgba(245,158,11,0.3), 0 0 0 4px rgba(251,191,36,0.2)'}
                                                imageClassName="w-full h-full object-cover"
                                            />
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
                                        {leaderboardStudents[0].name.split(' ')[0]}
                                    </p>
                                    <p className="text-xs sm:text-sm text-center mb-2" style={{ color: t.textMuted }}>
                                        {leaderboardStudents[0].name.split(' ')[1] || ''}
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
                                                    width: `${leaderboardStudents[0].avgScore}%`,
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
                                            {leaderboardStudents[0].avgScore}%
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3rd Place - Right */}
                            {leaderboardStudents[2] && (
                                <div className="flex flex-col items-center flex-1 max-w-[140px]">
                                    {/* Avatar with decorative elements */}
                                    <div className="relative mb-2">
                                        {/* Decorative lines */}
                                        <div className="absolute -left-8 sm:-left-12 top-1/2 w-6 sm:w-10 h-0.5 bg-gradient-to-r from-transparent to-current opacity-30" style={{ color: '#CD7F32' }} />
                                        <div className="absolute -right-8 sm:-right-12 top-1/2 w-6 sm:w-10 h-0.5 bg-gradient-to-l from-transparent to-current opacity-30" style={{ color: '#CD7F32' }} />

                                        {/* Avatar circle */}
                                        <div className="relative">
                                            <StudentAvatar
                                                name={leaderboardStudents[2].name}
                                                initials={leaderboardStudents[2].initials}
                                                profileImage={leaderboardStudents[2].profileImage}
                                                color={t.isDark
                                                    ? 'linear-gradient(135deg, #D97706 0%, #B45309 100%)'
                                                    : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'}
                                                sizeClass="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative z-10"
                                                textClass="text-sm sm:text-base md:text-lg text-white"
                                                ringShadow={t.isDark
                                                    ? '0 10px 30px rgba(205,127,50,0.25), 0 0 0 3px rgba(205,127,50,0.1)'
                                                    : '0 10px 30px rgba(217,119,6,0.2), 0 0 0 3px rgba(217,119,6,0.15)'}
                                                imageClassName="w-full h-full object-cover"
                                            />
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
                                        {leaderboardStudents[2].name.split(' ')[0]}
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-center mb-2" style={{ color: t.textMuted }}>
                                        {leaderboardStudents[2].name.split(' ')[1] || ''}
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
                                                    width: `${leaderboardStudents[2].avgScore}%`,
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
                                            {leaderboardStudents[2].avgScore}%
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
                        <SectionTitle title="Testlar" subtitle={`${grp.quizzes} ta test tayinlangan`} />
                        <div className="space-y-3">
                            {quizzes.map((q, idx) => {
                                const sc = scoreColor(q.avgScore);
                                return (
                                    <div
                                        key={`${q.sessionId}-${idx}`}
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
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {q.avgScore}%
                        </span>
                                                <span className="text-xs" style={{ color: t.textMuted }}>{q.submissions}/{grp.students} ta</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs" style={{ color: t.textMuted }}>{q.date}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/student/session-results/${q.sessionId}`, {
                                                        state: { returnTo: `/student/group/${groupId}`, groupId },
                                                    })}
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-colors"
                                                    style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }}
                                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Ko'rish
                                                </button>
                                            </div>
                                        </div>
                                        {/* Submissions bar */}
                                        <div className="mt-2 w-full h-1 rounded-full overflow-hidden" style={{ background: t.border }}>
                                            <div className="h-1 rounded-full transition-all duration-500"
                                                 style={{ width: `${grp.students > 0 ? (q.submissions / grp.students) * 100 : 0}%`, background: t.accent, opacity: 0.7 }} />
                                        </div>
                                    </div>
                                );
                            })}
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
                            <div className="space-y-2">
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
                                                <StudentAvatar
                                                    name={s.name}
                                                    initials={s.initials}
                                                    profileImage={s.profileImage}
                                                    color={AVATAR_COLORS[idx % AVATAR_COLORS.length]}
                                                    sizeClass="w-9 h-9"
                                                    textClass="text-xs text-white"
                                                />
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
                            </div>
                        )}
                    </div>

                    {/* Mobile/Tablet Cards */}
                    <div className="block md:hidden space-y-3">
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
                                            <StudentAvatar
                                                name={s.name}
                                                initials={s.initials}
                                                profileImage={s.profileImage}
                                                color={AVATAR_COLORS[idx % AVATAR_COLORS.length]}
                                                sizeClass="w-12 h-12"
                                                textClass="text-sm text-white"
                                            />
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

                        {/* Pagination Button - Mobile */}
                        {hasMoreStudents && !showAllStudents && filteredStudents.length > 0 && (
                            <button
                                onClick={() => setShowAllStudents(true)}
                                className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all"
                                style={{
                                    background: t.bgInner,
                                    border: `1px solid ${t.border}`,
                                    color: t.textSecondary,
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = t.bgCardHover;
                                    (e.currentTarget as HTMLElement).style.color = t.accent;
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = t.bgInner;
                                    (e.currentTarget as HTMLElement).style.color = t.textSecondary;
                                }}
                            >
                                Barcha {filteredStudents.length} ta o'quvchini ko'rsatish
                            </button>
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

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
    Search, ChevronDown, Users, ClipboardCheck,
    Clock, ArrowRight, BookOpen, Zap, FlaskConical,
    Leaf, Calculator, GraduationCap,
    Palette, AlignLeft, UserCheck,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.myedunova.uz';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface GroupItem {
    id: number;
    name: string;
    subject: string;
    subjectIcon: string;
    color: string;
    students: number;
    quizzes: number;
    lastActivity: string;
    activityLevel: 'active' | 'moderate' | 'low';
    avgScore: number;
    description: string;
    coverImage?: string;
    memberIds?: number[];
}

interface GroupApiItem {
    id: number;
    name: string;
    subject_name: string;
    description: string;
    students_count: number;
    tests_count: number;
    average_score: number;
    status: 'ACTIVE' | 'INACTIVE' | string;
    last_activity: string | null;
    color: string | null;
    cover_image: string | null;
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

export const ALL_GROUPS: GroupItem[] = [];

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

    return value ? map[value] ?? '#6366F1' : '#6366F1';
}

function subjectIconFromName(subject: string) {
    const normalized = subject.trim().toLowerCase();
    if (normalized.includes('fiz')) return 'zap';
    if (normalized.includes('kim')) return 'flask';
    if (normalized.includes('bio')) return 'leaf';
    return 'calculator';
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

function mapApiGroup(item: GroupApiItem): GroupItem {
    return {
        id: item.id,
        name: item.name || "Noma'lum guruh",
        subject: item.subject_name || 'Fan',
        subjectIcon: subjectIconFromName(item.subject_name || 'Fan'),
        color: colorFromApi(item.color),
        students: item.students_count ?? 0,
        quizzes: item.tests_count ?? 0,
        lastActivity: formatRelativeActivity(item.last_activity),
        activityLevel: item.status === 'ACTIVE' ? 'active' : 'low',
        avgScore: item.average_score ?? 0,
        description: item.description || "Tavsif yo'q",
        coverImage: item.cover_image ?? undefined,
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

async function fetchStudentGroups(search: string, page = 1, size = 50) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    });

    const trimmed = search.trim();
    if (trimmed) {
        params.set('search', trimmed);
    }

    const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/group/?${params.toString()}`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(`Guruhlarni olishda xatolik: ${response.status}`);
    }

    const raw = await response.json();
    return unwrapApiData<PaginatedResponse<GroupApiItem>>(raw);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function SubjectIcon({ type, color, size = 20 }: { type: string; color: string; size?: number }) {
    const props = { style: { color }, strokeWidth: 1.75, width: size, height: size };
    switch (type) {
        case 'zap':    return <Zap {...props} />;
        case 'flask':  return <FlaskConical {...props} />;
        case 'leaf':   return <Leaf {...props} />;
        default:       return <Calculator {...props} />;
    }
}

function Card({
    children,
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode; className?: string }) {
    const { theme: t } = useTheme();
    return (
        <div
            {...props}
            className={`rounded-2xl p-5 sm:p-6 ${className}`}
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
        >
            {children}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function StudentGroupsPage() {
    const navigate = useNavigate();
    const { theme: t } = useTheme();

    const [groups, setGroups] = useState<GroupItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'subject' | 'activity'>('name');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        let isMounted = true;
        const timeoutId = window.setTimeout(async () => {
            try {
                const data = await fetchStudentGroups(searchQuery, 1, 50);
                if (!isMounted) return;
                setGroups((data.items ?? []).map(mapApiGroup));
            } catch {
                if (!isMounted) return;
                setGroups([]);
            }
        }, 300);

        return () => {
            isMounted = false;
            window.clearTimeout(timeoutId);
        };
    }, [searchQuery]);

    // Filter and sort
    const filteredGroups = useMemo(() => {
        const result = [...groups];

        // Sort
        if (sortBy === 'name') {
            result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'subject') {
            result.sort((a, b) => a.subject.localeCompare(b.subject));
        } else if (sortBy === 'activity') {
            const activityOrder = { active: 0, moderate: 1, low: 2 };
            result.sort((a, b) => activityOrder[a.activityLevel] - activityOrder[b.activityLevel]);
        }

        return result;
    }, [groups, sortBy]);

    // Stats
    const stats = {
        total: groups.length,
        active: groups.filter((g) => g.activityLevel === 'active').length,
        totalStudents: groups.reduce((sum, g) => sum + g.students, 0),
        avgScore: groups.length > 0
            ? Math.round(groups.reduce((sum, g) => sum + g.avgScore, 0) / groups.length)
            : 0,
    };

    return (
        <>
            {/* ── Header ── */}
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1.5" style={{ color: t.textPrimary }}>
                    Mening guruhlarim
                </h1>
                <p className="text-sm" style={{ color: t.textMuted }}>
                    Siz a'zo bo'lgan barcha guruhlarni boshqaring
                </p>
            </div>

            {/* ── Stats Cards ── */}
            {/*<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">*/}
            {/*    <Card>*/}
            {/*        <div className="flex items-center gap-3">*/}
            {/*            <div*/}
            {/*                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"*/}
            {/*                style={{ background: t.stat.indigo.iconBg, border: `1px solid ${t.stat.indigo.iconColor}30` }}*/}
            {/*            >*/}
            {/*                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: t.stat.indigo.iconColor }} strokeWidth={1.75} />*/}
            {/*            </div>*/}
            {/*            <div>*/}
            {/*                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>Jami guruhlar</p>*/}
            {/*                <p className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>{stats.total}</p>*/}
            {/*            </div>*/}
            {/*        </div>*/}
            {/*    </Card>*/}

            {/*    <Card>*/}
            {/*        <div className="flex items-center gap-3">*/}
            {/*            <div*/}
            {/*                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"*/}
            {/*                style={{ background: t.stat.green.iconBg, border: `1px solid ${t.stat.green.iconColor}30` }}*/}
            {/*            >*/}
            {/*                <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: t.stat.green.iconColor }} strokeWidth={1.75} />*/}
            {/*            </div>*/}
            {/*            <div>*/}
            {/*                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>Faol guruhlar</p>*/}
            {/*                <p className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>{stats.active}</p>*/}
            {/*            </div>*/}
            {/*        </div>*/}
            {/*    </Card>*/}

            {/*    <Card>*/}
            {/*        <div className="flex items-center gap-3">*/}
            {/*            <div*/}
            {/*                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"*/}
            {/*                style={{ background: t.stat.blue.iconBg, border: `1px solid ${t.stat.blue.iconColor}30` }}*/}
            {/*            >*/}
            {/*                <Users className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: t.stat.blue.iconColor }} strokeWidth={1.75} />*/}
            {/*            </div>*/}
            {/*            <div>*/}
            {/*                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>O'quvchilar</p>*/}
            {/*                <p className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>{stats.totalStudents}</p>*/}
            {/*            </div>*/}
            {/*        </div>*/}
            {/*    </Card>*/}

            {/*    <Card>*/}
            {/*        <div className="flex items-center gap-3">*/}
            {/*            <div*/}
            {/*                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"*/}
            {/*                style={{ background: t.stat.amber.iconBg, border: `1px solid ${t.stat.amber.iconColor}30` }}*/}
            {/*            >*/}
            {/*                <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: t.stat.amber.iconColor }} strokeWidth={1.75} />*/}
            {/*            </div>*/}
            {/*            <div>*/}
            {/*                <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>O'rtacha ball</p>*/}
            {/*                <p className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>{stats.avgScore}%</p>*/}
            {/*            </div>*/}
            {/*        </div>*/}
            {/*    </Card>*/}
            {/*</div>*/}

            {/* ── Toolbar ── */}
            <Card className="mb-5">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                            style={{ color: t.textMuted }}
                        />
                        <input
                            type="text"
                            placeholder="Guruhlar bo'yicha qidirish..."
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

                    {/* Sort dropdown */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'name' | 'subject' | 'activity')}
                            className="appearance-none pl-3 pr-9 py-2.5 rounded-xl text-sm font-medium outline-none transition-all cursor-pointer"
                            style={{
                                background: t.bgInner,
                                border: `1px solid ${t.border}`,
                                color: t.textPrimary,
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = t.accentBorder; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = t.border; }}
                        >
                            <option value="name">Nom bo'yicha</option>
                            <option value="subject">Fan bo'yicha</option>
                            <option value="activity">Faollik bo'yicha</option>
                        </select>
                        <ChevronDown
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                            style={{ color: t.textMuted }}
                        />
                    </div>

                    {/* View toggle */}
                    <div className="flex gap-1 p-1 rounded-xl" style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                            style={
                                viewMode === 'grid'
                                    ? { background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }
                                    : { background: 'transparent', color: t.textMuted, border: '1px solid transparent' }
                            }
                        >
                            <Palette className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                            style={
                                viewMode === 'list'
                                    ? { background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }
                                    : { background: 'transparent', color: t.textMuted, border: '1px solid transparent' }
                            }
                        >
                            <AlignLeft className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </Card>

            {/* ── Empty State ── */}
            {filteredGroups.length === 0 && (
                <Card>
                    <div className="py-16 text-center">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                            style={{ background: t.bgInner }}
                        >
                            <GraduationCap className="w-8 h-8" style={{ color: t.textMuted }} strokeWidth={1.5} />
                        </div>
                        <p className="text-base font-medium mb-1" style={{ color: t.textPrimary }}>
                            Hech qanday guruh topilmadi
                        </p>
                        <p className="text-sm" style={{ color: t.textMuted }}>
                            Qidiruv shartingizni o'zgartiring
                        </p>
                    </div>
                </Card>
            )}

            {/* ── Grid View ── */}
            {filteredGroups.length > 0 && viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {filteredGroups.map((group) => (
                        <Card
                            key={group.id}
                            className="group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => navigate(`/student/group/${group.id}`)}
                        >
                            {/* Top section */}
                            <div className="flex items-start gap-3 mb-4">
                                {/* Icon */}
                                <div
                                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                                    style={{
                                        background: t.isDark ? `${group.color}22` : `${group.color}12`,
                                        border: `2px solid ${group.color}44`,
                                    }}
                                >
                                    <SubjectIcon type={group.subjectIcon} color={group.color} size={24} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold mb-1 truncate" style={{ color: t.textPrimary }}>
                                        {group.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <BookOpen className="w-3 h-3 shrink-0" style={{ color: group.color }} />
                                        <span className="text-xs font-semibold truncate" style={{ color: group.color }}>
                      {group.subject}
                    </span>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs mb-4 line-clamp-2" style={{ color: t.textMuted }}>
                                {group.description}
                            </p>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="text-center p-2 rounded-lg" style={{ background: t.bgInner }}>
                                    <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>O'quvchilar</p>
                                    <p className="text-sm font-bold" style={{ color: t.textPrimary }}>{group.students}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg" style={{ background: t.bgInner }}>
                                    <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>Testlar</p>
                                    <p className="text-sm font-bold" style={{ color: t.textPrimary }}>{group.quizzes}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg" style={{ background: t.bgInner }}>
                                    <p className="text-xs mb-0.5" style={{ color: t.textMuted }}>O'rtacha</p>
                                    <p className="text-sm font-bold" style={{ color: t.textPrimary }}>{group.avgScore}%</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${t.border}` }}>
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
                                    <Clock className="w-3 h-3" />
                                    {group.lastActivity}
                                </div>
                                <div className="flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all" style={{ color: t.accent }}>
                                    <span>Batafsil</span>
                                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* ── List View ── */}
            {filteredGroups.length > 0 && viewMode === 'list' && (
                <div className="space-y-3">
                    {filteredGroups.map((group) => (
                        <Card
                            key={group.id}
                            className="group cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                            onClick={() => navigate(`/student/group/${group.id}`)}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* Icon + Info */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div
                                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0"
                                        style={{
                                            background: t.isDark ? `${group.color}22` : `${group.color}12`,
                                            border: `2px solid ${group.color}44`,
                                        }}
                                    >
                                        <SubjectIcon type={group.subjectIcon} color={group.color} size={20} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold mb-1 truncate" style={{ color: t.textPrimary }}>
                                            {group.name}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2">
                      <span
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md"
                          style={{ background: `${group.color}18`, color: group.color }}
                      >
                        <BookOpen className="w-3 h-3" />
                          {group.subject}
                      </span>
                                            <span className="text-xs truncate" style={{ color: t.textMuted }}>
                        {group.description}
                      </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 sm:gap-6">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
                                        <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>{group.students}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <ClipboardCheck className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
                                        <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>{group.quizzes}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
                                        <span className="text-xs" style={{ color: t.textMuted }}>{group.lastActivity}</span>
                                    </div>
                                    <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{ color: t.accent }} strokeWidth={2} />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </>
    );
}

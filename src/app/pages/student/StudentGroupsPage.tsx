import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
    Search, ChevronDown, Users, ClipboardCheck,
    Clock, ArrowRight, BookOpen, Zap, FlaskConical,
    Leaf, Calculator, GraduationCap,
    Palette, AlignLeft, UserCheck,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';

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

// ── Mock data ──────────────────────────────────────────────────────────────────
const INITIAL_GROUPS: GroupItem[] = [
    { id: 1, name: '9-A', subject: 'Matematika', subjectIcon: 'calculator', color: '#6366F1', students: 28, quizzes: 8,  lastActivity: '2 soat oldin',  activityLevel: 'active',   avgScore: 76, description: "Algebra va geometriya bo'yicha asosiy grupalar kursi" },
    { id: 2, name: '10-B', subject: 'Matematika', subjectIcon: 'calculator', color: '#3B82F6', students: 24, quizzes: 6,  lastActivity: 'Kecha',         activityLevel: 'moderate', avgScore: 68, description: "Yuqori daraja algebra va trigonometriya" },
    { id: 3, name: 'Fizika tayyorlov', subject: 'Fizika', subjectIcon: 'zap', color: '#8B5CF6', students: 18, quizzes: 12, lastActivity: '3 soat oldin',  activityLevel: 'active',   avgScore: 72, description: "Olimpiada va imtixonlarga tayyorlov kursi" },
    { id: 4, name: '9-sinf kimyo', subject: 'Kimyo', subjectIcon: 'flask', color: '#10B981', students: 22, quizzes: 5,  lastActivity: '1 kun oldin',   activityLevel: 'moderate', avgScore: 65, description: "Umumiy kimyo va organik birikmalar" },
    { id: 5, name: 'Biologiya', subject: 'Biologiya', subjectIcon: 'leaf', color: '#22C55E', students: 20, quizzes: 7,  lastActivity: '5 soat oldin',  activityLevel: 'active',   avgScore: 70, description: "Tirik organizmlar va ularning hayoti" },
];

export const ALL_GROUPS = INITIAL_GROUPS;

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

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'subject' | 'activity'>('name');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Filter and sort
    const filteredGroups = useMemo(() => {
        let result = ALL_GROUPS.filter((g) =>
            g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

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
    }, [searchQuery, sortBy]);

    // Stats
    const stats = {
        total: ALL_GROUPS.length,
        active: ALL_GROUPS.filter((g) => g.activityLevel === 'active').length,
        totalStudents: ALL_GROUPS.reduce((sum, g) => sum + g.students, 0),
        avgScore: Math.round(ALL_GROUPS.reduce((sum, g) => sum + g.avgScore, 0) / ALL_GROUPS.length),
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

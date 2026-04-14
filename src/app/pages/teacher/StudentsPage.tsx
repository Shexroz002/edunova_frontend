import {useState, useMemo, useEffect, useRef} from 'react';
import {
    Search, Plus, Eye, ChevronDown, Users,
    X, Check, UserPlus, Mail, BookOpen,
} from 'lucide-react';
import {useTheme} from '../../components/ThemeContext.tsx';
import {useNavigate} from 'react-router';
import {getValidAccessToken, refreshStoredAuthToken} from '../../lib/auth.ts';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu.tsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const PAGE_SIZE = 50;

// ── Types ──────────────────────────────────────────────────────────────────────
interface Student {
    id: number;
    name: string;
    initials: string;
    email: string;
    profileImage: string | null;
    classGroup: string;
    groupNames: string[];
    avgScore: number;
    testsCompleted: number;
    lastActivity: string;
    status: 'active' | 'inactive';
}

interface StudentsApiItem {
    student_id: number;
    username: string;
    profile_image: string | null;
    full_name: string;
    group_names?: string[] | null;
    average_score: number;
    tests_count: number;
    last_activity: string | null;
    status: 'active' | 'inactive';
}

interface StudentsApiResponse {
    items: StudentsApiItem[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

interface AvailableUser {
    id: number;
    name: string;
    initials: string;
    email: string;
    role: string;
    color: string;
    profileImage: string | null;
    contactAvailable?: boolean;
}

interface StudentSuggestionApiItem {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role?: string;
    profile_image: string | null;
    contact_available?: boolean;
}

interface StudentSuggestionApiResponse {
    items: StudentSuggestionApiItem[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

const DEFAULT_CLASS_OPTIONS = [
    "Barchasi",
    "11-sinf",
    "10-sinf",
    "9-sinf",
    "8-sinf",
    "7-sinf",
    "6-sinf",
    "5-sinf",
    "4-sinf",
    "3-sinf",
    "2-sinf",
    "1-sinf"
];
const PERF_OPTIONS = ["Barchasi", "A'lo (>75%)", "O'rta (50–75%)", 'Past (<50%)'];
const STATUS_OPTIONS = ['Barchasi', 'Faol', 'Nofaol'];

const AVATAR_COLORS = [
    '#6366F1', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444',
    '#8B5CF6', '#0891B2', '#D97706', '#059669', '#EC4899',
    '#14B8A6', '#F97316',
];

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function formatLastActivity(value: string | null) {
    if (!value) return "Noma'lum";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    const weeks = Math.floor(days / 7);

    if (minutes < 60) return `${minutes} daqiqa oldin`;
    if (hours < 24) return `${hours} soat oldin`;
    if (days === 1) return 'Kecha';
    if (days < 7) return `${days} kun oldin`;
    if (weeks <= 1) return '1 hafta oldin';
    return `${weeks} hafta oldin`;
}

function mapApiStudent(item: StudentsApiItem): Student {
    const groupNames = Array.isArray(item.group_names)
        ? item.group_names.map((group) => group.trim()).filter(Boolean)
        : [];

    return {
        id: item.student_id,
        name: item.full_name,
        initials: getInitials(item.full_name),
        email: item.username,
        profileImage: item.profile_image,
        classGroup: groupNames[0] ?? "Guruh yo'q",
        groupNames,
        avgScore: Number(item.average_score.toFixed(2)),
        testsCompleted: item.tests_count,
        lastActivity: formatLastActivity(item.last_activity),
        status: item.status,
    };
}

function mapAvailableUser(item: StudentSuggestionApiItem): AvailableUser {
    const name = `${item.first_name} ${item.last_name}`.trim();
    return {
        id: item.id,
        name,
        initials: getInitials(name),
        email: item.username,
        role: item.role === 'teacher' ? "O'qituvchi" : "O'quvchi",
        color: AVATAR_COLORS[item.id % AVATAR_COLORS.length],
        profileImage: item.profile_image,
        contactAvailable: item.contact_available,
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

function scoreColor(score: number) {
    if (score >= 75) return {color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)'};
    if (score >= 50) return {color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)'};
    return {color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)'};
}

function ProfileAvatar({
                           name,
                           initials,
                           profileImage,
                           color,
                           sizeClass,
                           textClass,
                           ringColor,
                       }: {
    name: string;
    initials: string;
    profileImage: string | null;
    color: string;
    sizeClass: string;
    textClass: string;
    ringColor?: string;
}) {
    return (
        <div
            className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden ${textClass}`}
            style={{
                background: color,
                boxShadow: ringColor ? `0 0 0 3px ${ringColor}` : 'none',
            }}
        >
            {profileImage ? (
                <img
                    src={profileImage}
                    alt={name}
                    className="w-full h-full object-cover"
                />
            ) : initials}
        </div>
    );
}

function GroupNamesDropdown({
                                groups,
                                t,
                                compact = false,
                            }: {
    groups: string[];
    t: ReturnType<typeof useTheme>['theme'];
    compact?: boolean;
}) {
    const normalizedGroups = groups.map((group) => group.trim()).filter(Boolean);
    const primaryGroup = normalizedGroups[0] ?? "Guruh yo'q";
    const extraCount = Math.max(normalizedGroups.length - 1, 0);
    const isExpandable = normalizedGroups.length > 1;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    disabled={!isExpandable}
                    className={`inline-flex max-w-full items-center gap-2 rounded-lg border transition-all ${
                        compact ? 'px-2.5 py-1.5 text-xs' : 'px-2.5 py-1 text-sm'
                    }`}
                    style={{
                        background: t.bgInner,
                        color: t.textSecondary,
                        borderColor: t.border,
                        cursor: isExpandable ? 'pointer' : 'default',
                        opacity: isExpandable ? 1 : 0.95,
                    }}
                    onMouseEnter={(e) => {
                        if (!isExpandable) return;
                        (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder;
                        (e.currentTarget as HTMLElement).style.background = t.isDark
                            ? 'rgba(99,102,241,0.14)'
                            : 'rgba(99,102,241,0.08)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = t.border;
                        (e.currentTarget as HTMLElement).style.background = t.bgInner;
                    }}
                >
                    <span className="truncate">{primaryGroup}</span>
                    {extraCount > 0 && (
                        <span
                            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{
                                background: t.accentMuted,
                                color: t.accent,
                                border: `1px solid ${t.accentBorder}`,
                            }}
                        >
                            +{extraCount}
                        </span>
                    )}
                    {isExpandable && (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{color: t.textMuted}}/>
                    )}
                </button>
            </DropdownMenuTrigger>
            {isExpandable && (
                <DropdownMenuContent
                    align="start"
                    sideOffset={8}
                    className="w-64 rounded-xl p-1.5"
                    style={{
                        background: t.bgCard,
                        color: t.textPrimary,
                        border: `1px solid ${t.border}`,
                        boxShadow: t.isDark
                            ? '0 16px 40px rgba(0,0,0,0.45)'
                            : '0 16px 40px rgba(15,23,42,0.14)',
                    }}
                >
                    {normalizedGroups.map((group, index) => (
                        <DropdownMenuItem
                            key={`${group}-${index}`}
                            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm outline-none"
                            style={{
                                color: t.textPrimary,
                            }}
                        >
                            <span className="truncate">{group}</span>
                            {index === 0 && (
                                <span className="shrink-0 text-[11px] font-semibold" style={{color: t.textMuted}}>
                                    Asosiy
                                </span>
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            )}
        </DropdownMenu>
    );
}

// ── FilterSelect ───────────────────────────────────────────────────────────────
function FilterSelect({
                          value, options, onChange, t,
                      }: {
    value: string;
    options: string[];
    onChange: (v: string) => void;
    t: ReturnType<typeof useTheme>['theme'];
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none pr-8 pl-3 rounded-xl text-sm focus:outline-none transition-all cursor-pointer"
                style={{
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    color: value === 'Barchasi' ? t.textMuted : t.textPrimary,
                    height: '40px',
                    minWidth: '130px',
                    boxShadow: t.shadowCard,
                }}
                onFocus={(e) => {
                    (e.target as HTMLElement).style.borderColor = '#6366F1';
                    (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
                }}
                onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = t.border;
                    (e.target as HTMLElement).style.boxShadow = t.shadowCard;
                }}
            >
                {options.map((o) => (
                    <option key={o} value={o} style={{background: t.bgCard, color: t.textPrimary}}>
                        {o}
                    </option>
                ))}
            </select>
            <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{color: t.textMuted}}
            />
        </div>
    );
}

// ── Add Student Modal ──────────────────────────────────────────────────────────
function AddStudentModal({
                             open,
                             onClose,
                             onAdd,
                             alreadyAdded,
                         }: {
    open: boolean;
    onClose: () => void;
    onAdd: (user: AvailableUser) => Promise<void>;
    alreadyAdded: number[];
}) {
    const {theme: t} = useTheme();
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<AvailableUser | null>(null);
    const [adding, setAdding] = useState(false);
    const [users, setUsers] = useState<AvailableUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [usersError, setUsersError] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setQuery('');
            setSelected(null);
            setAdding(false);
            setUsers([]);
            setUsersError('');
            setTimeout(() => searchRef.current?.focus(), 80);
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (open) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;

        let isMounted = true;
        const timeoutId = window.setTimeout(async () => {
            setLoadingUsers(true);
            setUsersError('');

            const params = new URLSearchParams({
                page: '1',
                size: '50',
            });

            const trimmedQuery = query.trim();
            const endpoint = trimmedQuery
                ? `/api/v1/teacher/my/student/search?${new URLSearchParams({
                    ...Object.fromEntries(params),
                    search: trimmedQuery
                }).toString()}`
                : `/api/v1/teacher/my/student/suggestions/?${params.toString()}`;

            try {
                const response = await fetchWithAuthRetry(`${API_BASE_URL}${endpoint}`, {
                    method: 'GET',
                });

                if (!response.ok) {
                    throw new Error(`Foydalanuvchilar ro'yxatini olishda xatolik: ${response.status}`);
                }

                const data: StudentSuggestionApiResponse = await response.json();
                if (isMounted) {
                    setUsers(
                        data.items
                            .map(mapAvailableUser)
                            .filter((user) => !alreadyAdded.includes(user.id)),
                    );
                }
            } catch (error) {
                if (isMounted) {
                    setUsers([]);
                    setUsersError(
                        error instanceof Error ? error.message : "Foydalanuvchilarni yuklab bo'lmadi",
                    );
                }
            } finally {
                if (isMounted) {
                    setLoadingUsers(false);
                }
            }
        }, query.trim() ? 300 : 0);

        return () => {
            isMounted = false;
            window.clearTimeout(timeoutId);
        };
    }, [open, query, alreadyAdded]);

    async function handleAdd() {
        if (!selected) return;
        setAdding(true);
        setUsersError('');
        try {
            await onAdd(selected);
            setAdding(false);
            onClose();
        } catch (error) {
            setAdding(false);
            setUsersError(
                error instanceof Error ? error.message : "O'quvchini qo'shib bo'lmadi",
            );
        }
    }

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)'}}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden"
                style={{
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    boxShadow: t.isDark
                        ? '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)'
                        : '0 24px 64px rgba(15,23,42,0.18)',
                    maxHeight: '90vh',
                }}
            >
                {/* ── Header ── */}
                <div
                    className="flex items-center justify-between px-5 py-4 shrink-0"
                    style={{borderBottom: `1px solid ${t.border}`}}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                                background: 'rgba(99,102,241,0.12)',
                                border: '1.5px solid rgba(99,102,241,0.25)',
                            }}
                        >
                            <UserPlus className="w-4 h-4" style={{color: '#6366F1'}} strokeWidth={1.75}/>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold" style={{color: t.textPrimary}}>
                                O'quvchi qo'shish
                            </h2>
                            <p className="text-xs" style={{color: t.textMuted}}>
                                Foydalanuvchini qidiring va tanlang
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                        style={{background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted}}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
                            (e.currentTarget as HTMLElement).style.color = '#EF4444';
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = t.bgInner;
                            (e.currentTarget as HTMLElement).style.color = t.textMuted;
                            (e.currentTarget as HTMLElement).style.borderColor = t.border;
                        }}
                    >
                        <X className="w-4 h-4" strokeWidth={2}/>
                    </button>
                </div>

                {/* ── Search ── */}
                <div className="px-5 pt-4 pb-3 shrink-0">
                    <div
                        className="flex items-center gap-2.5 px-3.5 rounded-xl transition-all"
                        style={{
                            background: t.bgInner,
                            border: `1px solid ${t.border}`,
                            height: '42px',
                        }}
                        onFocusCapture={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = '#6366F1';
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                        }}
                        onBlurCapture={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = t.border;
                            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                        }}
                    >
                        <Search className="w-4 h-4 shrink-0" style={{color: t.textMuted}} strokeWidth={1.75}/>
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelected(null);
                            }}
                            placeholder="Ism, email yoki rol bo'yicha qidirish..."
                            className="flex-1 bg-transparent outline-none text-sm"
                            style={{color: t.textPrimary}}
                        />
                        {query && (
                            <button
                                onClick={() => {
                                    setQuery('');
                                    setSelected(null);
                                    searchRef.current?.focus();
                                }}
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{background: t.border, color: t.textMuted}}
                            >
                                <X className="w-3 h-3" strokeWidth={2.5}/>
                            </button>
                        )}
                    </div>

                    {/* Result count badge */}
                    <div className="flex items-center gap-2 mt-2.5">
            <span className="text-xs" style={{color: t.textMuted}}>
              {loadingUsers ? 'Yuklanmoqda...' : `${users.length} ta foydalanuvchi topildi`}
            </span>
                        {query && (
                            <span
                                className="text-xs px-2 py-0.5 rounded-lg"
                                style={{
                                    background: t.accentMuted,
                                    color: t.accent,
                                    border: `1px solid ${t.accentBorder}`
                                }}
                            >
                "{query}"
              </span>
                        )}
                    </div>
                </div>

                {/* ── User list ── */}
                <div className="flex-1 overflow-y-auto px-5 pb-2 min-h-0">
                    {loadingUsers ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                                style={{background: t.bgInner, border: `1px solid ${t.border}`}}
                            >
                                <div
                                    className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin"
                                    style={{color: '#6366F1'}}/>
                            </div>
                            <p className="text-sm font-semibold" style={{color: t.textPrimary}}>Yuklanmoqda</p>
                            <p className="text-xs mt-1 text-center" style={{color: t.textMuted}}>
                                Foydalanuvchilar backenddan olinmoqda
                            </p>
                        </div>
                    ) : usersError ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                                style={{background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)'}}
                            >
                                <X className="w-6 h-6" style={{color: '#EF4444'}} strokeWidth={1.5}/>
                            </div>
                            <p className="text-sm font-semibold" style={{color: t.textPrimary}}>Xatolik</p>
                            <p className="text-xs mt-1 text-center" style={{color: t.textMuted}}>
                                {usersError}
                            </p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                                style={{background: t.bgInner, border: `1px solid ${t.border}`}}
                            >
                                <Search className="w-6 h-6" style={{color: t.textMuted}} strokeWidth={1.5}/>
                            </div>
                            <p className="text-sm font-semibold" style={{color: t.textPrimary}}>Topilmadi</p>
                            <p className="text-xs mt-1 text-center" style={{color: t.textMuted}}>
                                "{query}" bo'yicha hech kim topilmadi
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1.5 py-1">
                            {users.map((user) => {
                                const isSelected = selected?.id === user.id;
                                const isDisabled = user.contactAvailable === true;
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => {
                                            if (isDisabled) return;
                                            setSelected(isSelected ? null : user);
                                        }}
                                        disabled={isDisabled}
                                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all"
                                        style={{
                                            opacity: isDisabled ? 0.55 : 1,
                                            background: isSelected
                                                ? (t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)')
                                                : 'transparent',
                                            border: `1.5px solid ${isDisabled ? t.border : isSelected ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                                            outline: 'none',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected && !isDisabled) {
                                                (e.currentTarget as HTMLElement).style.background = t.bgInner;
                                                (e.currentTarget as HTMLElement).style.borderColor = t.border;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected && !isDisabled) {
                                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                                                (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                                            }
                                        }}
                                    >
                                        {/* Avatar */}
                                        <ProfileAvatar
                                            name={user.name}
                                            initials={user.initials}
                                            profileImage={user.profileImage}
                                            color={user.color}
                                            sizeClass="w-10 h-10"
                                            textClass="text-sm"
                                            ringColor={isSelected ? `${user.color}40` : undefined}
                                        />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate"
                                               style={{color: t.textPrimary}}>
                                                {user.name}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Mail className="w-3 h-3 shrink-0" style={{color: t.textMuted}}
                                                      strokeWidth={1.75}/>
                                                <p className="text-xs truncate" style={{color: t.textMuted}}>
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Role badge + check */}
                                        <div className="flex items-center gap-2 shrink-0">
                      <span
                          className="text-xs px-2 py-0.5 rounded-lg hidden sm:inline-block"
                          style={{
                              background: t.bgInner,
                              color: t.textSecondary,
                              border: `1px solid ${t.border}`,
                          }}
                      >
                        {isDisabled ? "Band" : user.role}
                      </span>

                                            {/* Selection indicator */}
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                                                style={{
                                                    background: isDisabled
                                                        ? 'transparent'
                                                        : isSelected
                                                        ? '#6366F1'
                                                        : (t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                                                    border: `1.5px solid ${isDisabled ? t.border : isSelected ? '#6366F1' : t.border}`,
                                                }}
                                            >
                                                {isSelected && !isDisabled && (
                                                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5}/>
                                                )}
                                                {isDisabled && (
                                                    <X className="w-3.5 h-3.5" style={{color: t.textMuted}} strokeWidth={2.5}/>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Selected preview + action ── */}
                <div
                    className="px-5 py-4 shrink-0"
                    style={{
                        borderTop: `1px solid ${t.border}`,
                        background: t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                    }}
                >
                    {selected ? (
                        <div
                            className="flex items-center gap-3 p-3 rounded-xl mb-3"
                            style={{
                                background: t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)',
                                border: '1px solid rgba(99,102,241,0.25)',
                            }}
                        >
                            <ProfileAvatar
                                name={selected.name}
                                initials={selected.initials}
                                profileImage={selected.profileImage}
                                color={selected.color}
                                sizeClass="w-8 h-8"
                                textClass="text-xs"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate" style={{color: t.textPrimary}}>
                                    {selected.name}
                                </p>
                                <p className="text-xs truncate" style={{color: t.textMuted}}>
                                    {selected.email}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelected(null)}
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{background: t.border, color: t.textMuted}}
                            >
                                <X className="w-3 h-3" strokeWidth={2.5}/>
                            </button>
                        </div>
                    ) : (
                        <div
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
                            style={{
                                background: t.bgInner,
                                border: `1px dashed ${t.border}`,
                            }}
                        >
                            <BookOpen className="w-4 h-4 shrink-0" style={{color: t.textMuted}} strokeWidth={1.5}/>
                            <p className="text-xs" style={{color: t.textMuted}}>
                                Ro'yxatdan o'quvchi tanlang
                            </p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all"
                            style={{
                                background: t.bgInner,
                                border: `1px solid ${t.border}`,
                                color: t.textSecondary,
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = t.bgCardHover;
                                (e.currentTarget as HTMLElement).style.borderColor = t.textMuted;
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = t.bgInner;
                                (e.currentTarget as HTMLElement).style.borderColor = t.border;
                            }}
                        >
                            Bekor qilish
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={!selected || adding}
                            className="flex-1 h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
                            style={{
                                background: selected
                                    ? 'linear-gradient(135deg, #6366F1, #4F46E5)'
                                    : (t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)'),
                                color: selected ? '#fff' : (t.isDark ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.4)'),
                                cursor: selected ? 'pointer' : 'not-allowed',
                                boxShadow: selected
                                    ? (t.isDark ? '0 4px 16px rgba(99,102,241,0.35)' : '0 3px 12px rgba(99,102,241,0.25)')
                                    : 'none',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                if (selected) {
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = t.isDark
                                        ? '0 6px 22px rgba(99,102,241,0.5)'
                                        : '0 5px 18px rgba(99,102,241,0.38)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                (e.currentTarget as HTMLElement).style.boxShadow = selected
                                    ? (t.isDark ? '0 4px 16px rgba(99,102,241,0.35)' : '0 3px 12px rgba(99,102,241,0.25)')
                                    : 'none';
                            }}
                        >
                            {adding ? (
                                <>
                                    <div
                                        className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                                    />
                                    Qo'shilmoqda...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" strokeWidth={2}/>
                                    Qo'shish
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function StudentsPage() {
    const {theme: t} = useTheme();
    const navigate = useNavigate();
    const scrollTrack = t.isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.18)';
    const scrollThumb = t.isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.38)';
    const scrollThumbHover = t.isDark ? 'rgba(148,163,184,0.58)' : 'rgba(100,116,139,0.54)';

    const [students, setStudents] = useState<Student[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [classF, setClassF] = useState('Barchasi');
    const [perfF, setPerfF] = useState('Barchasi');
    const [statusF, setStatusF] = useState('Barchasi');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);

    const addedUserIds = useMemo(
        () => students.filter((s) => s.id >= 100).map((s) => s.id),
        [students]
    );

    const classOptions = useMemo(() => {
        const dynamicClasses = students
            .flatMap((student) => student.groupNames)
            .filter(Boolean);

        return Array.from(new Set([...DEFAULT_CLASS_OPTIONS, ...dynamicClasses]));
    }, [students]);

    async function handleAddStudent(user: AvailableUser) {
        const response = await fetchWithAuthRetry(
            `${API_BASE_URL}/api/v1/teacher/my/student/create/${user.id}`,
            {
                method: 'POST',
            },
        );

        if (response.status !== 201) {
            let message = "O'quvchini qo'shishda xatolik yuz berdi";

            try {
                const data = await response.json();
                if (typeof data?.message === 'string') {
                    message = data.message;
                } else if (typeof data?.detail === 'string') {
                    message = data.detail;
                }
            } catch {
                message = `O'quvchini qo'shishda xatolik: ${response.status}`;
            }

            throw new Error(message);
        }

        setReloadKey((prev) => prev + 1);
    }

    useEffect(() => {
        setPage(1);
    }, [search, classF, perfF, statusF]);

    useEffect(() => {
        let isMounted = true;

        async function loadStudents() {
            setLoading(true);
            setError('');

            const params = new URLSearchParams({
                ordering: 'created_at',
                order_direction: 'desc',
                page: String(page),
                size: String(PAGE_SIZE),
            });

            if (search.trim()) params.set('search', search.trim());
            if (classF !== 'Barchasi') params.set('class_name', classF);
            if (statusF === 'Faol') params.set('status', 'active');
            if (statusF === 'Nofaol') params.set('status', 'inactive');
            if (perfF === "A'lo (>75%)") {
                params.set('min_score', '75');
            } else if (perfF === "O'rta (50–75%)") {
                params.set('min_score', '50');
                params.set('max_score', '75');
            } else if (perfF === 'Past (<50%)') {
                params.set('max_score', '50');
            }

            try {
                const response = await fetchWithAuthRetry(
                    `${API_BASE_URL}/api/v1/teacher/my/student/?${params.toString()}`,
                    {
                        method: 'GET',
                    },
                );

                if (!response.ok) {
                    throw new Error(`O'quvchilar ro'yxatini olishda xatolik: ${response.status}`);
                }

                const data: StudentsApiResponse = await response.json();
                if (isMounted) {
                    setStudents(data.items.map(mapApiStudent));
                    setTotal(data.total);
                    setPage(data.page);
                    setPages(Math.max(data.pages, 1));
                }
            } catch (err) {
                if (isMounted) {
                    setStudents([]);
                    setTotal(0);
                    setPages(1);
                    setError(err instanceof Error ? err.message : "O'quvchilarni yuklab bo'lmadi");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadStudents();

        return () => {
            isMounted = false;
        };
    }, [search, classF, perfF, statusF, page, reloadKey]);

    const TABLE_HEADERS = ["O'quvchi", "Sinf", "O'rtacha ball", "Testlar", "So'nggi faoliyat", "Holat", ""];

    return (
        <>
            <style>{`
                .students-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: ${scrollThumb} ${scrollTrack};
                }

                .students-scroll::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }

                .students-scroll::-webkit-scrollbar-track {
                    background: ${scrollTrack};
                    border-radius: 999px;
                }

                .students-scroll::-webkit-scrollbar-thumb {
                    background: ${scrollThumb};
                    border-radius: 999px;
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }

                .students-scroll::-webkit-scrollbar-thumb:hover {
                    background: ${scrollThumbHover};
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }

                .students-scroll::-webkit-scrollbar-corner {
                    background: transparent;
                }
            `}</style>
            {/* ── Modal ── */}
            <AddStudentModal
                open={showModal}
                onClose={() => setShowModal(false)}
                onAdd={handleAddStudent}
                alreadyAdded={addedUserIds}
            />

            {/* ── Page header ── */}
            <div className="mb-5 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold" style={{color: t.textPrimary}}>
                    O'quvchilar
                </h1>
                <p className="text-xs sm:text-sm mt-1" style={{color: t.textMuted}}>
                    Barcha o'quvchilarni ko'ring va kuzating
                </p>
            </div>

            {/* ── Toolbar ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5 sm:mb-6">
                {/* Search */}
                <div className="relative flex-1">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{color: t.textMuted}}
                    />
                    <input
                        type="text"
                        placeholder="O'quvchilarni qidiring..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 rounded-xl text-sm focus:outline-none transition-all"
                        style={{
                            background: t.bgCard,
                            border: `1px solid ${t.border}`,
                            color: t.textPrimary,
                            height: '40px',
                            boxShadow: t.shadowCard,
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
                    <FilterSelect value={classF} options={classOptions} onChange={setClassF} t={t}/>
                    <FilterSelect value={perfF} options={PERF_OPTIONS} onChange={setPerfF} t={t}/>
                    <FilterSelect value={statusF} options={STATUS_OPTIONS} onChange={setStatusF} t={t}/>
                </div>

                {/* Add Student */}
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-semibold text-white transition-all shrink-0"
                    style={{
                        background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                        height: '40px',
                        boxShadow: t.isDark
                            ? '0 4px 16px rgba(99,102,241,0.3)'
                            : '0 3px 12px rgba(99,102,241,0.22)',
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                        (e.currentTarget as HTMLElement).style.boxShadow = t.isDark
                            ? '0 6px 24px rgba(99,102,241,0.5)'
                            : '0 5px 18px rgba(99,102,241,0.35)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        (e.currentTarget as HTMLElement).style.boxShadow = t.isDark
                            ? '0 4px 16px rgba(99,102,241,0.3)'
                            : '0 3px 12px rgba(99,102,241,0.22)';
                    }}
                >
                    <Plus className="w-4 h-4"/>
                    <span>O'quvchi qo'shish</span>
                </button>
            </div>

            {/* ── Summary stat ── */}
            <div className="flex items-center gap-2 mb-4">
                <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                        background: t.accentMuted,
                        border: `1px solid ${t.accentBorder}`,
                        color: t.accent,
                    }}
                >
                    <Users className="w-3.5 h-3.5"/>
                    {total} o'quvchi topildi
                </div>
                {(search || classF !== 'Barchasi' || perfF !== 'Barchasi' || statusF !== 'Barchasi') && (
                    <button
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                            background: t.bgCard,
                            border: `1px solid ${t.border}`,
                            color: t.textMuted,
                        }}
                        onClick={() => {
                            setSearch('');
                            setClassF('Barchasi');
                            setPerfF('Barchasi');
                            setStatusF('Barchasi');
                            setPage(1);
                        }}
                    >
                        Filtrni tozalash ✕
                    </button>
                )}
            </div>

            {/* ── Main Card ── */}
            <div
                className="rounded-2xl overflow-hidden"
                style={{
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    boxShadow: t.shadowCard,
                }}
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                            style={{background: t.bgInner, border: `1px solid ${t.border}`}}
                        >
                            <div
                                className="w-7 h-7 rounded-full border-2 border-current border-t-transparent animate-spin"
                                style={{color: '#6366F1'}}/>
                        </div>
                        <p className="text-sm font-semibold mb-1" style={{color: t.textPrimary}}>
                            O'quvchilar yuklanmoqda
                        </p>
                        <p className="text-xs" style={{color: t.textMuted}}>
                            Ro'yxat backenddan olinmoqda
                        </p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                            style={{background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)'}}
                        >
                            <X className="w-8 h-8" style={{color: '#EF4444'}}/>
                        </div>
                        <p className="text-sm font-semibold mb-1" style={{color: t.textPrimary}}>
                            O'quvchilar topilmadi
                        </p>
                        <p className="text-xs mb-4" style={{color: t.textMuted}}>
                            {error}
                        </p>
                        <button
                            onClick={() => setReloadKey((prev) => prev + 1)}
                            className="px-4 h-10 rounded-xl text-sm font-semibold"
                            style={{
                                background: t.accentMuted,
                                border: `1px solid ${t.accentBorder}`,
                                color: t.accent,
                            }}
                        >
                            Qayta urinish
                        </button>
                    </div>
                ) : students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                            style={{background: t.bgInner, border: `1px solid ${t.border}`}}
                        >
                            <Users className="w-8 h-8" style={{color: t.textMuted}}/>
                        </div>
                        <p className="text-sm font-semibold mb-1" style={{color: t.textPrimary}}>
                            O'quvchilar topilmadi
                        </p>
                        <p className="text-xs" style={{color: t.textMuted}}>
                            Qidiruv yoki filtr shartlarini o'zgartiring
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── Desktop / Tablet Table ── */}
                        <div className="students-scroll hidden sm:block overflow-x-auto overflow-y-auto" style={{maxHeight: 560}}>
                            <table className="w-full">
                                <thead>
                                <tr style={{
                                    borderBottom: `1px solid ${t.border}`,
                                    background: t.bgInner,
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 1
                                }}>
                                    {TABLE_HEADERS.map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                                            style={{color: t.textMuted}}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {students.map((student, idx) => {
                                    const sc = scoreColor(student.avgScore);
                                    return (
                                        <tr
                                            key={student.id}
                                            className="transition-colors cursor-default"
                                            style={{
                                                borderBottom: idx < students.length - 1
                                                    ? `1px solid ${t.border}`
                                                    : 'none',
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = t.bgCardHover;
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                                            }}
                                        >
                                            {/* Student */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <ProfileAvatar
                                                        name={student.name}
                                                        initials={student.initials}
                                                        profileImage={student.profileImage}
                                                        color={AVATAR_COLORS[idx % AVATAR_COLORS.length]}
                                                        sizeClass="w-9 h-9"
                                                        textClass="text-xs"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold truncate"
                                                           style={{color: t.textPrimary}}>
                                                            {student.name}
                                                        </p>
                                                        <p className="text-xs truncate" style={{color: t.textMuted}}>
                                                            {student.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Class */}
                                            <td className="px-5 py-3.5">
                                                <GroupNamesDropdown groups={student.groupNames} t={t}/>
                                            </td>

                                            {/* Average Score */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                            <span
                                className="text-xs font-bold px-2.5 py-1 rounded-lg"
                                style={{
                                    background: sc.bg,
                                    color: sc.color,
                                    border: `1px solid ${sc.border}`,
                                    minWidth: '3.5rem',
                                    display: 'inline-flex',
                                    justifyContent: 'center',
                                }}
                            >
                              {student.avgScore}
                            </span>
                                                    <div
                                                        className="w-20 h-1.5 rounded-full overflow-hidden hidden lg:block"
                                                        style={{background: t.bgInner}}
                                                    >
                                                        <div
                                                            className="h-1.5 rounded-full transition-all"
                                                            style={{
                                                                width: `${Math.min(student.avgScore, 100)}%`,
                                                                background: sc.color,
                                                                opacity: 0.7
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tests */}
                                            <td className="px-5 py-3.5">
                          <span className="text-sm" style={{color: t.textSecondary}}>
                            {student.testsCompleted} test
                          </span>
                                            </td>

                                            {/* Last Activity */}
                                            <td className="px-5 py-3.5">
                          <span className="text-xs font-medium tracking-wide" style={{color: t.textMuted}}>
                            {student.lastActivity}
                          </span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-3.5">
                                                {student.status === 'active' ? (
                                                    <span
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                                                        style={{
                                                            background: 'rgba(34,197,94,0.1)',
                                                            color: '#22C55E',
                                                            border: '1px solid rgba(34,197,94,0.25)',
                                                        }}
                                                    >
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/>
                              Faol
                            </span>
                                                ) : (
                                                    <span
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                                                        style={{
                                                            background: t.bgInner,
                                                            color: t.textMuted,
                                                            border: `1px solid ${t.border}`,
                                                        }}
                                                    >
                              <span
                                  className="w-1.5 h-1.5 rounded-full inline-block"
                                  style={{background: t.textMuted}}
                              />
                              Nofaol
                            </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-3.5">
                                                <button
                                                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                                                    style={{
                                                        background: t.accentMuted,
                                                        color: t.accent,
                                                        border: `1px solid ${t.accentBorder}`,
                                                    }}
                                                    onClick={() => navigate(`/students/${student.id}`)}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLElement).style.background = t.isDark
                                                            ? 'rgba(99,102,241,0.2)'
                                                            : 'rgba(99,102,241,0.14)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).style.background = t.accentMuted;
                                                    }}
                                                >
                                                    <Eye className="w-3.5 h-3.5"/>
                                                    Ko'rish
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Mobile cards ── */}
                        <div className="block sm:hidden divide-y" style={{borderColor: t.border}}>
                            {students.map((student, idx) => {
                                const sc = scoreColor(student.avgScore);
                                return (
                                    <div
                                        key={student.id}
                                        className="p-4 transition-colors"
                                        style={{borderBottom: idx < students.length - 1 ? `1px solid ${t.border}` : 'none'}}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <ProfileAvatar
                                                name={student.name}
                                                initials={student.initials}
                                                profileImage={student.profileImage}
                                                color={AVATAR_COLORS[idx % AVATAR_COLORS.length]}
                                                sizeClass="w-10 h-10"
                                                textClass="text-sm"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate"
                                                   style={{color: t.textPrimary}}>
                                                    {student.name}
                                                </p>
                                                <p className="text-xs truncate" style={{color: t.textMuted}}>
                                                    {student.email}
                                                </p>
                                            </div>
                                            {student.status === 'active' ? (
                                                <span
                                                    className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0"
                                                    style={{
                                                        background: 'rgba(34,197,94,0.1)',
                                                        color: '#22C55E',
                                                        border: '1px solid rgba(34,197,94,0.25)'
                                                    }}
                                                >
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/>
                          Faol
                        </span>
                                            ) : (
                                                <span
                                                    className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0"
                                                    style={{
                                                        background: t.bgInner,
                                                        color: t.textMuted,
                                                        border: `1px solid ${t.border}`
                                                    }}
                                                >
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{background: t.textMuted}}/>
                          Nofaol
                        </span>
                                            )}
                                        </div>

                                        <div
                                            className="grid grid-cols-3 gap-2 p-3 rounded-xl mb-3"
                                            style={{background: t.bgInner, border: `1px solid ${t.border}`}}
                                        >
                                            <div className="text-center">
                                                <p className="text-xs mb-0.5" style={{color: t.textMuted}}>Sinf</p>
                                                <div className="flex justify-center">
                                                    <GroupNamesDropdown groups={student.groupNames} t={t} compact/>
                                                </div>
                                            </div>
                                            <div className="text-center" style={{
                                                borderLeft: `1px solid ${t.border}`,
                                                borderRight: `1px solid ${t.border}`
                                            }}>
                                                <p className="text-xs mb-0.5" style={{color: t.textMuted}}>O'rtacha
                                                    ball</p>
                                                <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                                                      style={{background: sc.bg, color: sc.color}}>
                          {student.avgScore}
                        </span>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs mb-0.5" style={{color: t.textMuted}}>Testlar</p>
                                                <p className="text-xs font-semibold" style={{color: t.textPrimary}}>
                                                    {student.testsCompleted}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium tracking-wide"
                                               style={{color: t.textMuted}}>
                                                So'nggi: {student.lastActivity}
                                            </p>
                                            <button
                                                className="flex items-center gap-1.5 text-xs font-semibold px-3 rounded-lg transition-all"
                                                style={{
                                                    background: t.accentMuted,
                                                    color: t.accent,
                                                    border: `1px solid ${t.accentBorder}`,
                                                    height: '32px',
                                                }}
                                                onClick={() => navigate(`/students/${student.id}`)}
                                            >
                                                <Eye className="w-3.5 h-3.5"/>
                                                Ko'rish
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Table footer */}
                {students.length > 0 && (
                    <div
                        className="flex items-center justify-between px-5 py-3.5 text-xs"
                        style={{
                            borderTop: `1px solid ${t.border}`,
                            background: t.bgInner,
                            color: t.textMuted,
                        }}
                    >
                        <span>Jami {total} ta o'quvchi</span>
                        <div className="flex items-center gap-3">
              <span style={{color: t.textSecondary}}>
                Ko'rsatilmoqda: {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
              </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={page <= 1 || loading}
                                    className="px-3 h-8 rounded-lg text-xs font-semibold transition-all"
                                    style={{
                                        background: t.bgCard,
                                        border: `1px solid ${t.border}`,
                                        color: page <= 1 || loading ? t.textMuted : t.textPrimary,
                                        opacity: page <= 1 || loading ? 0.6 : 1,
                                    }}
                                >
                                    Oldingi
                                </button>
                                <span style={{color: t.textSecondary}}>
                  {page} / {pages}
                </span>
                                <button
                                    onClick={() => setPage((prev) => Math.min(prev + 1, pages))}
                                    disabled={page >= pages || loading}
                                    className="px-3 h-8 rounded-lg text-xs font-semibold transition-all"
                                    style={{
                                        background: t.bgCard,
                                        border: `1px solid ${t.border}`,
                                        color: page >= pages || loading ? t.textMuted : t.textPrimary,
                                        opacity: page >= pages || loading ? 0.6 : 1,
                                    }}
                                >
                                    Keyingi
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

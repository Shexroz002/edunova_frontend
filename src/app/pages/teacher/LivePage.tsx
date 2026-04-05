import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Radio, Plus, Users, Clock, Copy, Check,
  ExternalLink, Zap, BookOpen,
  CalendarDays, BarChart2, ChevronRight, Wifi,
  StopCircle, History, Search, X, ChevronDown,
  PlayCircle, CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

type SessionType = 'public' | 'group';

interface QuizListItem {
  id: number;
  title: string;
  created_at: string;
  question_count: number;
  description: string;
  subject: string;
  is_new: boolean;
}

interface GroupApiItem {
  id: number;
  name: string;
  students_count: number;
}

interface GroupOption {
  id: number;
  name: string;
  count: number;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface TeacherGroupsResponse {
  items: GroupApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface LiveSessionResponse {
  session_id: number;
  quiz_id: number;
  quiz_name: string | null;
  subject_name: string | null;
  host_id: number;
  join_code: string;
  status: string;
  duration_minutes: number;
  questions_count: number;
  started_at: string | null;
  finished_at: string | null;
}

interface LiveSessionListItem {
  session_id: number;
  title: string;
  subject: string | null;
  class_name: string | null;
  participants_count: number;
  duration_minutes: number;
  started_at: string | null;
  join_code: string;
}

interface ActiveSessionItem {
  id: number;
  quizName: string;
  subject: string;
  className: string;
  joinCode: string;
  participants: number;
  startedAt: string;
  duration: string;
}

const PAST_SESSIONS = [
  { id: 1, quizName: 'Mathematics Test',        date: '4 aprel',  participants: 32, avgScore: 71, subject: 'Matematika' },
  { id: 2, quizName: 'Physics — Mechanics',     date: '2 aprel',  participants: 20, avgScore: 64, subject: 'Fizika'     },
  { id: 3, quizName: 'Chemistry Bonds Quiz',    date: '31 mart',  participants: 18, avgScore: 78, subject: 'Kimyo'      },
  { id: 4, quizName: 'Biology Cell Structures', date: '28 mart',  participants: 25, avgScore: 55, subject: 'Biologiya'  },
  { id: 5, quizName: 'Algebra — Equations',     date: '26 mart',  participants: 30, avgScore: 83, subject: 'Matematika' },
  { id: 6, quizName: 'Optics & Light',          date: '22 mart',  participants: 16, avgScore: 60, subject: 'Fizika'     },
];

const DURATIONS = ['10 daqiqa', '20 daqiqa', '30 daqiqa', '60 daqiqa'];

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  };
  if (s >= 55) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return               { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)'  };
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
      throw new Error('Sessiya tugagan. Qayta kiring');
    }
    response = await makeRequest(token);
  }

  return response;
}

function mapGroup(item: GroupApiItem): GroupOption {
  return {
    id: item.id,
    name: item.name,
    count: item.students_count,
  };
}

async function fetchQuizPage(search: string, page: number, size = 10) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (search.trim()) {
    params.set('search', search.trim());
  }

  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/teacher/quizzes/list?${params.toString()}`,
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(`Quizlarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<PaginatedResponse<QuizListItem>>;
}

async function fetchTeacherGroups() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/group/`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Guruhlarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<TeacherGroupsResponse>;
}

async function createLiveSession(payload: {
  quiz_id: number;
  duration_minutes: number;
  session_type: SessionType;
  max_participants?: number;
  group_ids?: number[];
}) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/quiz-sessions/live/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = `Session yaratishda xatolik: ${response.status}`;

    try {
      const errorData = await response.json();
      if (typeof errorData?.detail === 'string') {
        message = errorData.detail;
      }
    } catch {
      // Keep fallback error message when backend response is not JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<LiveSessionResponse>;
}

async function fetchLiveSessions() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/quiz-sessions/live/`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Faol sessionlarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<LiveSessionListItem[]>;
}

function durationToMinutes(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function mapLiveSession(item: LiveSessionListItem): ActiveSessionItem {
  return {
    id: item.session_id,
    quizName: item.title,
    subject: item.subject ?? 'Fan ko‘rsatilmagan',
    className: item.class_name ?? 'Sinf ko‘rsatilmagan',
    joinCode: item.join_code,
    participants: item.participants_count,
    startedAt: item.started_at ?? '--:--',
    duration: `${item.duration_minutes} daqiqa`,
  };
}

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────
function Card({ children, className = '', glow = false }: {
  children: React.ReactNode; className?: string; glow?: boolean;
}) {
  const { theme: t } = useTheme();
  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{
        background:  t.bgCard,
        border:     `1px solid ${glow ? 'rgba(239,68,68,0.35)' : t.border}`,
        boxShadow:   glow
          ? (t.isDark ? '0 0 28px rgba(239,68,68,0.14)' : '0 4px 22px rgba(239,68,68,0.1)')
          : t.shadowCard,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme: t } = useTheme();
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold" style={{ color: t.textPrimary }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{subtitle}</p>}
    </div>
  );
}

// ─── Step indicator ─────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  const { theme: t } = useTheme();
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width:      i === current ? 18 : 6,
            height:     6,
            background: i <= current ? '#6366F1' : t.border,
            opacity:    i < current ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  );
}

// ─── Searchable Quiz Dropdown ────────────────
function QuizDropdown({
  value, onChange,
}: {
  value: QuizListItem | null;
  onChange: (q: QuizListItem) => void;
}) {
  const { theme: t } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [items, setItems] = useState<QuizListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchQuizPage(debouncedQuery, 1);
        if (cancelled) return;
        setItems(data.items);
        setPage(data.page);
        setPages(data.pages);
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setError(err instanceof Error ? err.message : 'Quizlarni yuklab bo‘lmadi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery]);

  const handleLoadMore = async () => {
    if (loading || loadingMore || page >= pages) return;

    setLoadingMore(true);
    setError('');

    try {
      const nextPage = page + 1;
      const data = await fetchQuizPage(debouncedQuery, nextPage);
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...data.items.filter((item) => !seen.has(item.id))];
      });
      setPage(data.page);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Keyingi quizlarni yuklab bo‘lmadi');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all text-left"
        style={{
          background:  t.bgInner,
          border:     `1px solid ${open ? '#6366F1' : t.border}`,
          color:       value ? t.textPrimary : t.textMuted,
          boxShadow:   open ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
        }}
      >
        <span className="truncate">
          {value ? value.title : 'Quiz tanlang...'}
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 ml-2 transition-transform duration-200"
          style={{ color: t.textMuted, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          strokeWidth={1.75}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl overflow-hidden"
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowHover }}
        >
          {/* Search */}
          <div className="p-2" style={{ borderBottom: `1px solid ${t.border}` }}>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: t.bgInner }}>
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Qidirish..."
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: t.textPrimary }}
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div
            className="max-h-52 overflow-y-auto"
            onScroll={(e) => {
              const element = e.currentTarget;
              const threshold = 32;
              if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
                handleLoadMore().catch(() => {});
              }
            }}
          >
            {loading ? (
              <div className="px-4 py-6 text-center text-xs" style={{ color: t.textMuted }}>
                Quizlar yuklanmoqda...
              </div>
            ) : error ? (
              <div className="px-4 py-6 text-center text-xs" style={{ color: '#EF4444' }}>
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs" style={{ color: t.textMuted }}>
                Hech narsa topilmadi
              </div>
            ) : items.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => { onChange(q); setOpen(false); setQuery(''); }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                style={{
                  background: value?.id === q.id ? t.accentMuted : 'transparent',
                  borderBottom: `1px solid ${t.borderSubtle}`,
                }}
                onMouseEnter={(e) => { if (value?.id !== q.id) (e.currentTarget as HTMLElement).style.background = t.bgInner; }}
                onMouseLeave={(e) => { if (value?.id !== q.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: value?.id === q.id ? t.accent : t.textPrimary }}>
                    {q.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                    {q.subject} · {q.question_count} ta savol
                  </p>
                </div>
                {value?.id === q.id && (
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: t.accent }} strokeWidth={2} />
                )}
              </button>
            ))}
            {!loading && !error && loadingMore && (
              <div className="px-4 py-3 text-center text-xs" style={{ color: t.textMuted }}>
                Yana quizlar yuklanmoqda...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected quiz metadata */}
      {value && (
        <div className="flex items-center gap-3 mt-2 px-3.5 py-2.5 rounded-xl"
          style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}>
          <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: t.accent }} strokeWidth={1.75} />
          <span className="text-xs" style={{ color: t.accent }}>{value.subject}</span>
          <span className="text-xs" style={{ color: t.textMuted }}>·</span>
          <span className="text-xs" style={{ color: t.accent }}>{value.question_count} ta savol</span>
        </div>
      )}
    </div>
  );
}

// ─── Multi-select Class Dropdown ─────────────
function ClassMultiSelect({
  selected, options, onChange, loading, error,
}: {
  selected: GroupOption[];
  options: GroupOption[];
  onChange: (classes: GroupOption[]) => void;
  loading?: boolean;
  error?: string;
}) {
  const { theme: t } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (cls: GroupOption) => {
    const exists = selected.find((c) => c.id === cls.id);
    onChange(exists ? selected.filter((c) => c.id !== cls.id) : [...selected, cls]);
  };

  const remove = (id: number) => onChange(selected.filter((c) => c.id !== id));

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all text-left"
        style={{
          background:  t.bgInner,
          border:     `1px solid ${open ? '#6366F1' : t.border}`,
          color:       selected.length > 0 ? t.textPrimary : t.textMuted,
          boxShadow:   open ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
        }}
      >
        <span className="text-sm" style={{ color: selected.length > 0 ? t.textPrimary : t.textMuted }}>
          {selected.length > 0
            ? `${selected.length} ta sinf tanlangan`
            : 'Sinf yoki guruh tanlang...'}
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 ml-2 transition-transform duration-200"
          style={{ color: t.textMuted, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          strokeWidth={1.75}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl overflow-hidden"
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowHover }}
        >
          {loading ? (
            <div className="px-4 py-6 text-center text-xs" style={{ color: t.textMuted }}>
              Guruhlar yuklanmoqda...
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center text-xs" style={{ color: '#EF4444' }}>
              {error}
            </div>
          ) : options.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs" style={{ color: t.textMuted }}>
              Guruhlar topilmadi
            </div>
          ) : options.map((cls) => {
            const isSelected = !!selected.find((c) => c.id === cls.id);
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => toggle(cls)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                style={{
                  background:   isSelected ? t.accentMuted : 'transparent',
                  borderBottom: `1px solid ${t.borderSubtle}`,
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = t.bgInner; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: isSelected ? t.accent : t.textPrimary }}>
                    {cls.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{cls.count} o'quvchi</p>
                </div>
                <div
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                  style={{
                    background: isSelected ? '#6366F1' : 'transparent',
                    border:    `1.5px solid ${isSelected ? '#6366F1' : t.border}`,
                  }}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((cls) => (
            <span
              key={cls.id}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }}
            >
              {cls.name}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(cls.id); }}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Duration Dropdown ───────────────────────
function DurationDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { theme: t } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all"
        style={{
          background:  t.bgInner,
          border:     `1px solid ${open ? '#6366F1' : t.border}`,
          color:       value ? t.textPrimary : t.textMuted,
          boxShadow:   open ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
        }}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" style={{ color: t.textMuted }} strokeWidth={1.75} />
          <span>{value || 'Davomiylik...'}</span>
        </div>
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform duration-200"
          style={{ color: t.textMuted, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          strokeWidth={1.75}
        />
      </button>
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl overflow-hidden"
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowHover }}
        >
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { onChange(d); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors"
              style={{
                background:   value === d ? t.accentMuted : 'transparent',
                color:        value === d ? t.accent : t.textPrimary,
                borderBottom: `1px solid ${t.borderSubtle}`,
              }}
              onMouseEnter={(e) => { if (value !== d) (e.currentTarget as HTMLElement).style.background = t.bgInner; }}
              onMouseLeave={(e) => { if (value !== d) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {d}
              {value === d && <Check className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Active Session Selector Dropdown ───────────────────────
function ActiveSessionDropdown({
  sessions,
  value,
  onChange,
}: {
  sessions: ActiveSessionItem[];
  value: ActiveSessionItem | null;
  onChange: (session: ActiveSessionItem) => void;
}) {
  const { theme: t } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = sessions.filter((s) =>
    s.quizName.toLowerCase().includes(query.toLowerCase()) ||
    s.subject.toLowerCase().includes(query.toLowerCase()) ||
    s.className.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (sessions.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all text-left"
        style={{
          background: t.bgInner,
          border: `1px solid ${open ? '#6366F1' : t.border}`,
          color: value ? t.textPrimary : t.textMuted,
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
        }}
      >
        <span className="truncate">
          {value ? value.quizName : 'Session tanlang...'}
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 ml-2 transition-transform duration-200"
          style={{ color: t.textMuted, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          strokeWidth={1.75}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl overflow-hidden"
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowHover }}
        >
          {/* Search */}
          <div className="p-2" style={{ borderBottom: `1px solid ${t.border}` }}>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: t.bgInner }}>
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Qidirish..."
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: t.textPrimary }}
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs" style={{ color: t.textMuted }}>
                Hech narsa topilmadi
              </div>
            ) : (
              filtered.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => {
                    onChange(session);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                  style={{
                    background: value?.id === session.id ? t.accentMuted : 'transparent',
                    borderBottom: `1px solid ${t.borderSubtle}`,
                  }}
                  onMouseEnter={(e) => {
                    if (value?.id !== session.id)
                      (e.currentTarget as HTMLElement).style.background = t.bgInner;
                  }}
                  onMouseLeave={(e) => {
                    if (value?.id !== session.id)
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: value?.id === session.id ? t.accent : t.textPrimary }}
                    >
                      {session.quizName}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: t.textMuted }}>
                      {session.subject} · {session.className}
                    </p>
                  </div>
                  {value?.id === session.id && (
                    <CheckCircle2
                      className="w-4 h-4 shrink-0 ml-2"
                      style={{ color: t.accent }}
                      strokeWidth={2}
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selected session metadata */}
      {value && (
        <div
          className="flex flex-wrap items-center gap-2 mt-2 px-3.5 py-2.5 rounded-xl"
          style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}
        >
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: t.accent }} strokeWidth={1.75} />
            <span className="text-xs" style={{ color: t.accent }}>
              {value.subject}
            </span>
          </div>
          <span className="text-xs" style={{ color: t.textMuted }}>
            ·
          </span>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 shrink-0" style={{ color: t.accent }} strokeWidth={1.75} />
            <span className="text-xs" style={{ color: t.accent }}>
              {value.className}
            </span>
          </div>
          <span className="text-xs" style={{ color: t.textMuted }}>
            ·
          </span>
          <span className="text-xs font-mono font-bold" style={{ color: t.accent }}>
            {value.joinCode}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Create New Session Card (Multi-step wizard) ──
function CreateSessionCard() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0, 1, 2
  const [quiz, setQuiz] = useState<QuizListItem | null>(null);
  const [sessionType, setSessionType] = useState<SessionType | ''>('');
  const [classes, setClasses] = useState<GroupOption[]>([]);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState('');
  const [duration, setDuration] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const STEP_LABELS = ['Quiz tanlash', 'Session turi', 'Sozlamalar'];

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      setGroupsLoading(true);
      setGroupsError('');

      try {
        const data = await fetchTeacherGroups();
        if (cancelled) return;
        setGroupOptions(data.items.map(mapGroup));
      } catch (err) {
        if (cancelled) return;
        setGroupsError(err instanceof Error ? err.message : 'Guruhlarni yuklab bo‘lmadi');
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    };

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sessionType === 'public') {
      setClasses([]);
    } else if (sessionType === 'group') {
      setMaxParticipants('');
    }
  }, [sessionType]);

  const canNext = () => {
    if (step === 0) return !!quiz;
    if (step === 1) {
      return !!sessionType && (sessionType === 'public' || classes.length > 0);
    }

    if (!duration) return false;
    if (sessionType === 'public') {
      const participants = Number(maxParticipants);
      return Number.isInteger(participants) && participants > 0;
    }

    return sessionType === 'group';
  };

  const handleCreate = async () => {
    if (!quiz || !sessionType) return;

    setSubmitError('');
    setCreating(true);

    try {
      const payload = {
        quiz_id: quiz.id,
        duration_minutes: durationToMinutes(duration),
        session_type: sessionType,
        ...(sessionType === 'public'
          ? { max_participants: Number(maxParticipants) }
          : { group_ids: classes.map((group) => group.id) }),
      };

      const createdSession = await createLiveSession(payload);
      navigate('/live/waiting-room', {
        state: {
          session: createdSession,
          quiz: {
            id: quiz.id,
            title: createdSession.quiz_name ?? quiz.title,
            subject: createdSession.subject_name ?? quiz.subject,
            questionCount: createdSession.questions_count ?? quiz.question_count,
          },
          sessionType,
          maxParticipants: sessionType === 'public' ? Number(maxParticipants) : null,
          groupNames: sessionType === 'group' ? classes.map((group) => group.name) : [],
        },
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Session yaratilmadi');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold" style={{ color: t.textPrimary }}>Yangi Session</h2>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            {STEP_LABELS[step]} — {step + 1}/{STEP_LABELS.length}
          </p>
        </div>
        <StepDots current={step} total={STEP_LABELS.length} />
      </div>

      {/* ── Step 0: Select Quiz ── */}
      {step === 0 && (
        <div className="space-y-3 mb-5">
          <label className="block text-xs font-semibold mb-1" style={{ color: t.textSecondary }}>
            Quiz tanlang
          </label>
          <QuizDropdown value={quiz} onChange={setQuiz} />
        </div>
      )}

      {/* ── Step 1: Select Classes ── */}
      {step === 1 && (
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>
              Session turi
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'public', title: 'Public', text: 'Hamma uchun ochiq session' },
                { id: 'group', title: 'Group', text: 'Faqat tanlangan guruhlar uchun' },
              ] as const).map((option) => {
                const active = sessionType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSessionType(option.id)}
                    className="text-left p-3 rounded-xl transition-all"
                    style={{
                      background: active ? t.accentMuted : t.bgInner,
                      border: `1px solid ${active ? t.accentBorder : t.border}`,
                      boxShadow: active ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: active ? t.accent : t.textPrimary }}>
                      {option.title}
                    </p>
                    <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                      {option.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {quiz && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: t.accent }} strokeWidth={1.75} />
              <span className="text-xs font-medium truncate" style={{ color: t.textSecondary }}>
                {quiz.title}
              </span>
            </div>
          )}

          {sessionType === 'group' && (
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: t.textSecondary }}>
                Sinf yoki guruh tanlang
              </label>
              <ClassMultiSelect
                selected={classes}
                options={groupOptions}
                onChange={setClasses}
                loading={groupsLoading}
                error={groupsError}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Session Settings ── */}
      {step === 2 && (
        <div className="space-y-4 mb-5">
          {/* Summary */}
          <div className="p-3.5 rounded-xl space-y-1.5"
              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: t.accent }} strokeWidth={1.75} />
              <span className="text-xs font-medium truncate" style={{ color: t.textSecondary }}>{quiz?.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs px-2 py-0.5 rounded-md"
                style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }}
              >
                {sessionType || 'Tanlanmagan'}
              </span>
              {sessionType === 'group' && classes.map((c) => (
                <span
                  key={c.id}
                  className="text-xs px-2 py-0.5 rounded-md"
                  style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }}
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>
              Sessiya davomiyligi
            </label>
            <DurationDropdown value={duration} onChange={setDuration} />
          </div>

          {sessionType === 'public' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>
                Maksimal ishtirokchilar
              </label>
              <div className="relative">
                <Users
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                  style={{ color: t.textMuted }}
                  strokeWidth={1.75}
                />
                <input
                  type="number"
                  min={1}
                  max={200}
                  placeholder="Masalan: 30"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: t.bgInner,
                    border: `1px solid ${t.border}`,
                    color: t.textPrimary,
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLElement).style.border = '1px solid #6366F1';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLElement).style.border = `1px solid ${t.border}`;
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {submitError && (
            <div
              className="px-3.5 py-3 rounded-xl text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {submitError}
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-2.5">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; }}
          >
            Orqaga
          </button>
        )}

        {step < 2 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: canNext()
                ? 'linear-gradient(135deg,#6366F1,#4F46E5)'
                : (t.isDark ? '#1E293B' : '#E2E8F0'),
              boxShadow:  canNext() ? '0 4px 16px rgba(99,102,241,0.3)' : 'none',
              color:      canNext() ? '#fff' : t.textMuted,
              cursor:     canNext() ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => { if (canNext()) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            Keyingisi
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={!canNext() || creating}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: canNext() ? 'linear-gradient(135deg,#6366F1,#4F46E5)' : (t.isDark ? '#1E293B' : '#E2E8F0'),
              boxShadow:  canNext() ? '0 4px 16px rgba(99,102,241,0.3)' : 'none',
              color:      canNext() ? '#fff' : t.textMuted,
              cursor:     canNext() ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => { if (canNext()) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            {creating
              ? <><Zap className="w-4 h-4 animate-pulse" strokeWidth={2} />Yaratilmoqda...</>
              : <><Plus className="w-4 h-4" strokeWidth={2} />Session yaratish</>}
          </button>
        )}
      </div>
    </Card>
  );
}

// ─── Active Session Card ───────────────────────
function ActiveSessionCard() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [ended,  setEnded]  = useState(false);
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState<ActiveSessionItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchLiveSessions();
        if (cancelled) return;

        const nextSessions = data.map(mapLiveSession);
        setSessions(nextSessions);
        setSelectedSession((prev) => {
          if (!nextSessions.length) return null;
          if (!prev) return nextSessions[0];
          return nextSessions.find((session) => session.id === prev.id) ?? nextSessions[0];
        });
      } catch (err) {
        if (cancelled) return;
        setSessions([]);
        setSelectedSession(null);
        setError(err instanceof Error ? err.message : 'Faol sessionlarni yuklab bo‘lmadi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = () => {
    if (!selectedSession) return;
    navigator.clipboard.writeText(selectedSession.joinCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnd = () => setEnded(true);

  if (loading) {
    return (
      <Card>
        <SectionTitle title="Faol Session" subtitle="Faol sessionlar yuklanmoqda..." />
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
            <Radio className="w-6 h-6 animate-pulse" style={{ color: t.textMuted }} strokeWidth={1.5} />
          </div>
          <p className="text-sm" style={{ color: t.textMuted }}>Yuklanmoqda...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <SectionTitle title="Faol Session" subtitle="Sessionlarni yuklab bo‘lmadi." />
        <div
          className="px-3.5 py-3 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {error}
        </div>
      </Card>
    );
  }

  if (ended || sessions.length === 0) {
    return (
      <Card>
        <SectionTitle title="Faol Session" subtitle="Hozirda faol session yo'q." />
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
            <Wifi className="w-6 h-6" style={{ color: t.textMuted }} strokeWidth={1.5} />
          </div>
          <p className="text-sm" style={{ color: t.textMuted }}>Faol session mavjud emas</p>
        </div>
      </Card>
    );
  }

  if (!selectedSession) return null;

  return (
    <Card glow>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.3)' }}>
            <Radio className="w-5 h-5" style={{ color: '#EF4444' }} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold" style={{ color: t.textPrimary }}>Faol Session</h2>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
              {sessions.length} ta session faol
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
          Faol
        </span>
      </div>

      {/* Session Selector - Only show if multiple sessions */}
      {sessions.length > 1 && (
        <div className="mb-4">
          <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
            Session tanlang
          </label>
          <ActiveSessionDropdown sessions={sessions} value={selectedSession} onChange={setSelectedSession} />
        </div>
      )}

      {/* Quiz info */}
      <div className="p-4 rounded-xl mb-4" style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
        <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>{selectedSession.quizName}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={1.75} />
            <span className="text-xs" style={{ color: t.textMuted }}>{selectedSession.subject}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={1.75} />
            <span className="text-xs" style={{ color: t.textMuted }}>{selectedSession.className}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { Icon: Users,       val: `${selectedSession.participants}`, label: "Qo'shilgan" },
          { Icon: Clock,       val: selectedSession.duration,           label: 'Davomiyligi' },
          { Icon: CalendarDays,val: selectedSession.startedAt,          label: 'Boshlangan'  },
        ].map(({ Icon, val, label }) => (
          <div key={label} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl"
            style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: t.textMuted }} strokeWidth={1.75} />
            <span className="text-sm font-bold" style={{ color: t.textPrimary }}>{val}</span>
            <span className="text-xs" style={{ color: t.textMuted }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Join code */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
        style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
        <div>
          <p className="text-xs font-semibold mb-0.5" style={{ color: t.textMuted }}>Kirish kodi</p>
          <p className="text-xl font-bold tracking-widest" style={{ color: t.textPrimary }}>
            {selectedSession.joinCode}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: copied ? 'rgba(34,197,94,0.1)' : t.accentMuted,
            color:      copied ? '#22C55E' : t.accent,
            border:    `1px solid ${copied ? 'rgba(34,197,94,0.25)' : t.accentBorder}`,
          }}
        >
          {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />}
          {copied ? 'Nusxalandi!' : 'Nusxa'}
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5">
        <button
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
          onClick={() => navigate('/live/session', {
            state: {
              session: {
                session_id: selectedSession.id,
                quiz_name: selectedSession.quizName,
                subject_name: selectedSession.subject,
                join_code: selectedSession.joinCode,
                duration_minutes: Number.parseInt(selectedSession.duration, 10) || 0,
                started_at: selectedSession.startedAt,
              },
            },
          })}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
        >
          <ExternalLink className="w-4 h-4" strokeWidth={1.75} />
          Sessionni ochish
        </button>
        <button
          onClick={handleEnd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
        >
          <StopCircle className="w-4 h-4" strokeWidth={1.75} />
          Tugatish
        </button>
      </div>
    </Card>
  );
}

// ─── Past Sessions Table ───────────────────────
function PastSessionsCard() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold" style={{ color: t.textPrimary }}>O'tgan Sessionlar</h2>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{PAST_SESSIONS.length} ta session yakunlangan</p>
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
          <History className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
              {['Quiz nomi', 'Sana', 'Ishtirokchilar', "O'rtacha ball", ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: t.textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAST_SESSIONS.map((s, idx) => {
              const sc = scoreColor(s.avgScore);
              return (
                <tr
                  key={s.id}
                  className="transition-colors"
                  style={{ borderBottom: idx < PAST_SESSIONS.length - 1 ? `1px solid ${t.border}` : 'none' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: t.textPrimary }}>{s.quizName}</p>
                    <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{s.subject}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                      <span className="text-sm" style={{ color: t.textSecondary }}>{s.date}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                      <span className="text-sm" style={{ color: t.textSecondary }}>{s.participants} o'quvchi</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      <BarChart2 className="w-3 h-3" strokeWidth={2} />
                      {s.avgScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                      style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.accentMuted; (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder; (e.currentTarget as HTMLElement).style.color = t.accent; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}
                      onClick={() => navigate(`/live/results/${s.id}`)}
                    >
                      Natijalar
                      <ChevronRight className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-2.5">
        {PAST_SESSIONS.map((s) => {
          const sc = scoreColor(s.avgScore);
          return (
            <div key={s.id} className="p-3.5 rounded-xl" style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: t.textPrimary }}>{s.quizName}</p>
                  <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{s.subject}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg shrink-0"
                  style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                  {s.avgScore}%
                </span>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" style={{ color: t.textMuted }} />
                  <span className="text-xs" style={{ color: t.textMuted }}>{s.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" style={{ color: t.textMuted }} />
                  <span className="text-xs" style={{ color: t.textMuted }}>{s.participants} o'quvchi</span>
                </div>
              </div>
              <button
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textSecondary }}
                onClick={() => navigate(`/live/results/${s.id}`)}
              >
                Natijalar <ChevronRight className="w-3 h-3" strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export function LivePage() {
  const { theme: t } = useTheme();

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-6 sm:mb-7">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.25)' }}>
            <Radio className="w-4 h-4" style={{ color: '#EF4444' }} strokeWidth={1.75} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
            Jonli Sessionlar
          </h1>
        </div>
        <p className="text-xs sm:text-sm mt-1 ml-12" style={{ color: t.textMuted }}>
          Jonli quiz sessionlarini boshqaring, faol sessionlarni kuzating va o'tgan natijalarni ko'ring.
        </p>
      </div>

      {/* ── Top row: Active Session + Create New Session ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
        <ActiveSessionCard />
        <CreateSessionCard />
      </div>

      {/* ── Past Sessions ── */}
      <PastSessionsCard />
    </>
  );
}

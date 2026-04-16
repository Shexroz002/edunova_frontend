import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft, Users, Clock, Trophy, Zap, ChevronDown,
  Search, CheckCircle, X, Play,
  Sparkles, Shield, Target, BookOpen, Info,
  Calculator, FlaskConical, Leaf, Languages, Globe,
  Hash, AlertCircle, Check, Edit2,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

interface Quiz {
  id: number;
  quiz_id: string;
  title: string;
  subject: string;
  subjectIcon: string;
  subjectColor: string;
  description: string;
  questions: number;
  durationMin: number;
  isNew: boolean;
  difficulty: 'Oson' | "O'rta" | 'Qiyin';
  participants: number;
  tags: string[];
  createdDate: string;
  status: string;
}

interface StudentQuizListItem {
  created_at: string | null;
  question_count: number | null;
  description: string | null;
  subject: string | null;
  is_new: boolean | null;
  quiz_id: number;
  title: string | null;
  quiz_generate_type: string | null;
}

interface StudentQuizListResponse {
  items: StudentQuizListItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface MultiplayerCreateResponse {
  session_id: number;
  quiz_id: number;
  host_id: number;
  join_code: string;
  status: string;
  duration_minutes: number;
  questions_count: number;
  started_at: string | null;
  finished_at: string | null;
}

interface StudentCompetitionLocationState {
  preselectedQuizId?: number;
}

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function mapSubjectMeta(subject: string | null | undefined) {
  const normalized = normalizeText(subject).toLowerCase();
  switch (normalized) {
    case 'mathematics':
    case 'matematika':
      return { label: 'Matematika', icon: 'calculator', color: '#818CF8' };
    case 'physics':
    case 'fizika':
      return { label: 'Fizika', icon: 'flask', color: '#38BDF8' };
    case 'chemistry':
    case 'kimyo':
      return { label: 'Kimyo', icon: 'leaf', color: '#34D399' };
    case 'english':
    case 'ingliz tili':
      return { label: 'Ingliz tili', icon: 'languages', color: '#FBBF24' };
    case 'geography':
    case 'geografiya':
      return { label: 'Geografiya', icon: 'globe', color: '#06B6D4' };
    case 'biology':
    case 'biologiya':
      return { label: 'Biologiya', icon: 'book', color: '#A78BFA' };
    default:
      return { label: normalizeText(subject, "Noma'lum fan"), icon: 'calculator', color: '#94A3B8' };
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
}

function mapQuiz(item: StudentQuizListItem): Quiz {
  const meta = mapSubjectMeta(item.subject);
  const questions = item.question_count ?? 0;
  return {
    id: item.quiz_id,
    quiz_id: `#Q-${item.quiz_id}`,
    title: normalizeText(item.title, 'Nomsiz test'),
    subject: meta.label,
    subjectIcon: meta.icon,
    subjectColor: meta.color,
    description: normalizeText(item.description, "Tavsif mavjud emas"),
    questions,
    durationMin: Math.max(10, Math.round(questions || 10)),
    isNew: Boolean(item.is_new),
    difficulty: questions >= 30 ? 'Qiyin' : questions >= 20 ? "O'rta" : 'Oson',
    participants: 0,
    tags: [],
    createdDate: formatDate(item.created_at),
    status: normalizeText(item.quiz_generate_type, "Qo'lda"),
  };
}

async function fetchWithAuthRetry(url: string, init: RequestInit = {}) {
  let token = await getValidAccessToken();
  if (!token) throw new Error('Sessiya topilmadi. Qayta kiring');

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
    if (!token) throw new Error('Sessiya tugagan. Qayta kiring');
    response = await makeRequest(token);
  }
  return response;
}

async function fetchQuizList() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/quizzes/list?page=1&size=50`, { method: 'GET' });
  if (!response.ok) throw new Error(`Testlar olinmadi: ${response.status}`);
  return response.json() as Promise<StudentQuizListResponse>;
}

async function createCompetition(quizId: number, durationMinutes: number, maxParticipants: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/multiplayer/create/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quiz_id: quizId,
      duration_minutes: durationMinutes,
      max_participants: maxParticipants,
    }),
  });

  if (response.status !== 201) {
    throw new Error(`Musobaqa yaratilmadi: ${response.status}`);
  }

  return response.json() as Promise<MultiplayerCreateResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject Icon Helper
// ─────────────────────────────────────────────────────────────────────────────
function SubjectIcon({ icon, color, size = 16 }: { icon: string; color: string; size?: number }) {
  const p = { style: { color }, strokeWidth: 1.75, width: size, height: size };
  switch (icon) {
    case 'flask': return <FlaskConical {...p} />;
    case 'leaf': return <Leaf {...p} />;
    case 'book': return <BookOpen {...p} />;
    case 'languages': return <Languages {...p} />;
    case 'globe': return <Globe {...p} />;
    default: return <Calculator {...p} />;
  }
}

// Random invite code
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step Progress Indicator
// ─────────────────────────────────────────────────────────────────────────────
function StepProgress({
  step1Done, step2Done, step3Done, onEditStep,
}: {
  step1Done: boolean;
  step2Done: boolean;
  step3Done: boolean;
  onEditStep: (step: number) => void;
}) {
  const { theme: t } = useTheme();
  const steps = [
    { label: 'Test tanlash', done: step1Done, color: '#6366F1' },
    { label: 'Ishtirokchilar', done: step2Done, color: '#22C55E' },
    { label: 'Vaqt', done: step3Done, color: '#FBBF24' },
  ];
  const completedCount = [step1Done, step2Done, step3Done].filter(Boolean).length;

  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full mb-4 overflow-hidden"
        style={{ background: t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{
            width: `${(completedCount / 3) * 100}%`,
            background: 'linear-gradient(90deg, #6366F1, #22C55E, #FBBF24)',
          }}
        />
      </div>

      {/* Step labels */}
      <div className="flex items-center justify-between">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => step.done && onEditStep(i + 1)}
            disabled={!step.done}
            className="flex items-center gap-2 transition-all focus:outline-none"
            style={{
              cursor: step.done ? 'pointer' : 'default',
              opacity: step.done ? 1 : 0.7,
            }}
            onMouseEnter={(e) => {
              if (step.done) {
                const indicator = e.currentTarget.querySelector('.step-indicator') as HTMLElement;
                if (indicator) {
                  indicator.style.transform = 'scale(1.1)';
                  indicator.style.borderColor = step.color;
                }
              }
            }}
            onMouseLeave={(e) => {
              if (step.done) {
                const indicator = e.currentTarget.querySelector('.step-indicator') as HTMLElement;
                if (indicator) {
                  indicator.style.transform = 'scale(1)';
                  indicator.style.borderColor = step.color + '60';
                }
              }
            }}
          >
            <div
              className="step-indicator w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
              style={{
                background: step.done
                  ? `${step.color}20`
                  : (t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                border: `1.5px solid ${step.done ? step.color + '60' : t.border}`,
              }}
            >
              {step.done
                ? <Check style={{ color: step.color, width: 12, height: 12, strokeWidth: 3 }} />
                : <span style={{ color: t.textMuted, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
              }
            </div>
            <span
              className="text-xs font-semibold hidden sm:block transition-all"
              style={{ color: step.done ? step.color : t.textMuted }}
            >
              {step.label}
            </span>
          </button>
        ))}
        <span className="text-xs font-semibold" style={{ color: t.textMuted }}>
          {completedCount}/3 bajarildi
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Searchable Quiz Dropdown — Fixed z-index + no overflow clip issue
// ─────────────────────────────────────────────────────────────────────────────
function QuizDropdown({
  selected, onSelect, quizzes,
}: { selected: Quiz | null; onSelect: (q: Quiz | null) => void; quizzes: Quiz[] }) {
  const { theme: t } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = quizzes.filter((q) => {
    const s = search.toLowerCase();
    return q.title.toLowerCase().includes(s) || q.subject.toLowerCase().includes(s);
  });

  return (
    <div ref={ref} className="relative" style={{ isolation: 'isolate' }}>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 rounded-xl transition-all focus:outline-none"
        style={{
          height: 52,
          background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          border: `2px solid ${open ? '#6366F1' : t.border}`,
          boxShadow: open ? '0 0 0 4px rgba(99,102,241,0.12)' : 'none',
          color: t.textPrimary,
        }}
      >
        {selected ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${selected.subjectColor}18`, border: `1px solid ${selected.subjectColor}30` }}
            >
              <SubjectIcon icon={selected.subjectIcon} color={selected.subjectColor} size={15} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                {selected.title}
              </p>
              <p className="text-xs truncate" style={{ color: selected.subjectColor }}>
                {selected.subject} · {selected.questions} ta savol
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 flex-1 text-left">
            <Search className="w-4 h-4 shrink-0" style={{ color: t.textMuted }} strokeWidth={2} />
            <span className="text-sm" style={{ color: t.textMuted }}>Testni tanlang...</span>
          </div>
        )}

        {/* Right: clear + chevron */}
        <div className="flex items-center gap-1.5 shrink-0">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onSelect(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onSelect(null); } }}
              className="w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer"
              style={{ color: t.textMuted }}
              aria-label="Testni tozalash"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </span>
          )}
          <ChevronDown
            className="w-4 h-4 transition-transform duration-200"
            style={{ color: t.textMuted, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            strokeWidth={2}
          />
        </div>
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden"
          style={{
            zIndex: 9999,
            background: t.bgCard,
            border: `2px solid ${t.isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.2)'}`,
            boxShadow: t.isDark
              ? '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)'
              : '0 20px 60px rgba(15,23,42,0.18)',
          }}
        >
          {/* Search Input */}
          <div className="p-3" style={{ borderBottom: `1px solid ${t.border}` }}>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: t.textMuted }} strokeWidth={2}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Test nomi yoki fan bo'yicha qidirish..."
                autoFocus
                className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366F1';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = t.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded flex items-center justify-center"
                  style={{ color: t.textMuted }}
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          {/* Results Count */}
          {filtered.length > 0 && (
            <div className="px-4 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
              <span className="text-xs" style={{ color: t.textMuted }}>
                {filtered.length} ta test topildi
              </span>
            </div>
          )}

          {/* Options List */}
          <div
            ref={listRef}
            className="overflow-y-auto"
            style={{ maxHeight: 280, scrollbarWidth: 'thin', scrollbarColor: `${t.border} transparent` }}
          >
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
                >
                  <Search className="w-6 h-6" style={{ color: t.textMuted }} strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: t.textSecondary }}>Test topilmadi</p>
                  <p className="text-xs mt-1" style={{ color: t.textMuted }}>Boshqa kalit so'z bilan qidiring</p>
                </div>
              </div>
            ) : (
              filtered.map((quiz) => {
                const isSel = selected?.id === quiz.id;
                return (
                  <button
                    key={quiz.id}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => { onSelect(quiz); setOpen(false); setSearch(''); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all focus:outline-none"
                    style={{
                      background: isSel
                        ? (t.isDark ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.08)')
                        : 'transparent',
                      borderBottom: `1px solid ${t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSel)
                        (e.currentTarget as HTMLElement).style.background =
                          t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    {/* Subject Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${quiz.subjectColor}18`, border: `1px solid ${quiz.subjectColor}30` }}
                    >
                      <SubjectIcon icon={quiz.subjectIcon} color={quiz.subjectColor} size={17} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                          {quiz.title}
                        </p>
                        {quiz.isNew && (
                          <span
                            className="px-1.5 py-0 rounded-md shrink-0"
                            style={{
                              fontSize: 9, fontWeight: 800,
                              background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                              color: '#fff',
                            }}
                          >
                            YANGI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs font-semibold" style={{ color: quiz.subjectColor }}>
                          {quiz.subject}
                        </span>
                        <span style={{ color: t.textMuted, fontSize: 10 }}>·</span>
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: t.textMuted }}>
                          <Hash className="w-2.5 h-2.5" strokeWidth={2} />
                          {quiz.questions} ta savol
                        </span>
                        <span style={{ color: t.textMuted, fontSize: 10 }}>·</span>
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: t.textMuted }}>
                          <Clock className="w-2.5 h-2.5" strokeWidth={2} />
                          {quiz.durationMin} daq
                        </span>
                      </div>
                    </div>

                    {/* Check */}
                    {isSel && (
                      <CheckCircle
                        className="w-4.5 h-4.5 shrink-0"
                        style={{ color: t.isDark ? '#818CF8' : '#6366F1', width: 18, height: 18 }}
                        strokeWidth={2.5}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Number Input: Quick-select chips + Manual Input
// ─────────────────────────────────────────────────────────────────────────────
interface CombinedNumberInputProps {
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  presets: number[];
  unit: string;
  color: string;
  helperText: string;
  error?: string | null;
}
function CombinedNumberInput({
  value, onChange, min, max, presets, unit, color, helperText, error,
}: CombinedNumberInputProps) {
  const { theme: t } = useTheme();
  const [inputVal, setInputVal] = useState(value !== null ? String(value) : '');

  // Sync external value → local string
  useEffect(() => { setInputVal(value !== null ? String(value) : ''); }, [value]);

  function commitInput(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(null);
      return;
    }
    const n = parseInt(trimmed, 10);
    if (!isNaN(n)) {
      const clamped = Math.max(min, Math.min(max, n));
      onChange(clamped);
      setInputVal(String(clamped));
    } else {
      setInputVal(value !== null ? String(value) : '');
    }
  }

  const isValid = value !== null && value >= min && value <= max;

  return (
    <div className="space-y-3">
      {/* Quick-select chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs shrink-0" style={{ color: t.textMuted }}>Tez tanlov:</span>
        {presets.map((v) => {
          const isActive = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all focus:outline-none"
              style={{
                background: isActive
                  ? `${color}18`
                  : (t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                color: isActive ? color : t.textSecondary,
                border: `1.5px solid ${isActive ? color + '45' : t.border}`,
                boxShadow: isActive ? `0 0 0 3px ${color}12` : 'none',
              }}
            >
              {v} {unit}
            </button>
          );
        })}
      </div>

      {/* Manual input row */}
      <div className="flex items-center gap-3">
        <div
          className="relative flex-1"
          style={{ maxWidth: 180 }}
        >
          <input
            type="number"
            min={min}
            max={max}
            value={inputVal}
            placeholder={`${min} – ${max}`}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={(e) => commitInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitInput(inputVal); }}
            className="w-full px-4 pr-16 rounded-xl text-sm font-semibold focus:outline-none transition-all"
            style={{
              height: 48,
              background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `2px solid ${error ? '#EF4444' : isValid ? color + '55' : t.border}`,
              color: t.textPrimary,
              boxShadow: isValid && !error ? `0 0 0 3px ${color}10` : 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = error ? '#EF4444' : color;
              e.target.style.boxShadow = `0 0 0 4px ${error ? 'rgba(239,68,68,0.1)' : color + '18'}`;
            }}
            onBlurCapture={(e) => {
              e.target.style.borderColor = error ? '#EF4444' : isValid ? color + '55' : t.border;
              e.target.style.boxShadow = isValid && !error ? `0 0 0 3px ${color}10` : 'none';
            }}
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold pointer-events-none"
            style={{ color: t.textMuted }}
          >
            {unit}
          </span>
        </div>

        {/* Status pill — only shown when valid */}
        {isValid && !error && (
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl flex-1"
            style={{ background: `${color}10`, border: `1px solid ${color}25` }}
          >
            <CheckCircle className="w-4 h-4 shrink-0" style={{ color }} strokeWidth={2.5} />
            <span className="text-xs font-semibold" style={{ color }}>
              {value} {unit}
            </span>
          </div>
        )}

        {/* Empty nudge */}
        {value === null && !error && (
          <p className="text-xs flex-1" style={{ color: t.textMuted }}>
            Yuqoridan tanlang yoki kiriting
          </p>
        )}
      </div>

      {/* Helper & Error */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs" style={{ color: t.textMuted }}>
          {helperText}
        </p>
        {error ? (
          <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>{error}</p>
        ) : (
          <p className="text-xs" style={{ color: t.textMuted }}>
            ({min} – {max})
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step Card — no overflow:hidden so dropdown isn't clipped
// ─────────────────────────────────────────────────────────────────────────────
interface StepCardProps {
  step: number;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  complete: boolean;
  active?: boolean;
}
function StepCard({ step, title, subtitle, icon: Icon, color, children, complete, active }: StepCardProps) {
  const { theme: t } = useTheme();

  return (
    <div
      className="rounded-2xl transition-all duration-300"
      style={{
        background: t.bgCard,
        border: `2px solid ${complete ? color + '45' : active ? color + '30' : t.border
          }`,
        boxShadow: complete
          ? (t.isDark ? `0 0 0 1px ${color}12, ${t.shadowCard}` : t.shadowCard)
          : t.shadowCard,
      }}
    >
      {/* Colored top bar */}
      <div
        className="h-1 rounded-t-2xl transition-all duration-300"
        style={{
          background: complete
            ? `linear-gradient(90deg, ${color}, ${color}50)`
            : active
              ? `linear-gradient(90deg, ${color}50, transparent)`
              : 'transparent',
        }}
      />

      <div className="p-5 sm:p-6">
        {/* Step Header */}
        <div className="flex items-center gap-3 mb-5">
          {/* Step number / check circle */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
            style={{
              background: complete
                ? `${color}18`
                : active
                  ? `${color}10`
                  : (t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
              border: `2px solid ${complete ? color + '45' : active ? color + '30' : t.border}`,
            }}
          >
            {complete ? (
              <Check style={{ color, width: 18, height: 18, strokeWidth: 2.5 }} />
            ) : (
              <span style={{
                color: active ? color : t.textMuted,
                fontSize: 14, fontWeight: 800,
              }}>
                {step}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: complete ? color : active ? color : t.textMuted }}>
              {step}-qadam
            </p>
            <h3 className="font-bold text-sm" style={{ color: t.textPrimary }}>{title}</h3>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{subtitle}</p>
            )}
          </div>

          {/* Completion chip — subtle */}
          {complete && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
              style={{
                background: `${color}12`,
                border: `1px solid ${color}25`,
              }}
            >
              <Check style={{ color, width: 11, height: 11, strokeWidth: 3 }} />
              <span className="text-xs font-semibold" style={{ color, fontSize: 11 }}>Tayyor</span>
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Success Modal
// ─────────────────────────────────────────────────────────────────────────────
function SuccessModal({
  code, quiz, participants, duration, onClose,
}: {
  code: string; quiz: Quiz; participants: number; duration: number;
  onClose: () => void;
}) {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id); }, []);
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  function close() { setVisible(false); setTimeout(onClose, 230); }

  function handleCopy() {
    navigator.clipboard.writeText(code).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: visible ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(10px)' : 'none',
        transition: 'background 0.25s ease, backdrop-filter 0.25s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full max-w-sm flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: t.bgCard,
          border: `1.5px solid ${t.isDark ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.22)'}`,
          boxShadow: t.isDark
            ? '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(139,92,246,0.12)'
            : '0 32px 80px rgba(15,23,42,0.2)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(16px)',
          transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Header */}
        <div className="relative px-6 pt-8 pb-6 text-center overflow-hidden">
          <div className="absolute inset-0"
            style={{
              background: t.isDark
                ? 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.25), transparent 70%)'
                : 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12), transparent 70%)'
            }}
          />
          <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))', border: '1.5px solid rgba(139,92,246,0.35)' }}>
            <Trophy className="w-8 h-8" style={{ color: '#A78BFA' }} strokeWidth={1.75} />
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 2px 8px rgba(99,102,241,0.5)' }}>
              <Sparkles className="w-3 h-3 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h2 className="font-bold relative" style={{ color: t.textPrimary }}>Musobaqa yaratildi! 🎉</h2>
          <p className="text-sm mt-1 relative" style={{ color: t.textMuted }}>
            Do'stlaringizni taklif qiling
          </p>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-4">
          {/* Invite Code */}
          <div className="rounded-2xl overflow-hidden"
            style={{ border: `1.5px solid ${t.isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)'}` }}>
            <div className="px-4 py-2.5 flex items-center gap-2"
              style={{ background: t.isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)', borderBottom: `1px solid ${t.isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)'}` }}>
              <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: '#A78BFA' }} strokeWidth={1.75} />
              <span className="text-xs font-semibold" style={{ color: '#A78BFA' }}>Taklif kodi</span>
            </div>
            <div className="px-4 py-4 flex items-center justify-between gap-3">
              <span className="font-bold tracking-[0.25em]"
                style={{ fontSize: 28, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                {code}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: copied ? 'rgba(34,197,94,0.12)' : (t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)'),
                  color: copied ? '#22C55E' : (t.isDark ? '#818CF8' : '#6366F1'),
                  border: `1px solid ${copied ? 'rgba(34,197,94,0.25)' : (t.isDark ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.2)')}`,
                }}>
                {copied
                  ? <><CheckCircle className="w-3.5 h-3.5" strokeWidth={2.5} /> Nusxalandi</>
                  : <>Nusxalash</>}
              </button>
            </div>
          </div>

          {/* Summary chips */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: BookOpen, label: 'Test', value: quiz.questions + ' ta savol', color: quiz.subjectColor },
              { icon: Users, label: 'Ishtirokchi', value: participants + ' kishi', color: '#22C55E' },
              { icon: Clock, label: 'Vaqt', value: duration + ' daqiqa', color: '#FBBF24' },
            ].map(({ icon: Ic, label, value, color }) => (
              <div key={label} className="flex flex-col items-center py-3 px-2 rounded-xl text-center"
                style={{ background: `${color}10`, border: `1px solid ${color}22` }}>
                <Ic className="w-4 h-4 mb-1.5" style={{ color }} strokeWidth={1.75} />
                <span className="text-xs font-bold leading-tight" style={{ color }}>{value}</span>
                <span className="mt-0.5 leading-tight" style={{ fontSize: 10, color: t.textMuted }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
            style={{ background: t.isDark ? 'rgba(251,191,36,0.07)' : 'rgba(251,191,36,0.05)', border: `1px solid ${t.isDark ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.15)'}` }}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#FBBF24' }} strokeWidth={1.75} />
            <p className="text-xs" style={{ color: t.textSecondary }}>
              Do'stlaringizga ushbu kodni yuboring. Ular ulanishi bilan musobaqa avtomatik boshlanadi.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              onClick={close}
              className="flex-1 rounded-xl text-sm font-semibold transition-all"
              style={{ height: 44, background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${t.border}`, color: t.textSecondary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.textMuted; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
            >
              Yopish
            </button>
            <button
              onClick={() => { close(); setTimeout(() => navigate('/student/waiting-room'), 300); }}
              className="flex-[2] rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white transition-all"
              style={{ height: 44, background: 'linear-gradient(135deg, #A78BFA, #6366F1)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(99,102,241,0.55)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <Play className="w-4 h-4" strokeWidth={2.5} fill="currentColor" />
              Boshlash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export function StudentCompetitionPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as StudentCompetitionLocationState | null) ?? null;
  const preselectedQuizId = typeof locationState?.preselectedQuizId === 'number'
    ? locationState.preselectedQuizId
    : null;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  const step1Done = selectedQuiz !== null;
  const step2Done = participants !== null && participants >= 2 && participants <= 100;
  const step3Done = duration !== null && duration >= 1 && duration <= 180;
  const canCreate = step1Done && step2Done && step3Done;

  // Handle editing a step - resets subsequent steps
  function handleEditStep(step: number) {
    if (step === 1) {
      // Edit step 1: reset all
      setSelectedQuiz(null);
      setParticipants(null);
      setDuration(null);
    } else if (step === 2) {
      // Edit step 2: reset step 3
      setParticipants(null);
      setDuration(null);
    } else if (step === 3) {
      // Edit step 3: just reset step 3
      setDuration(null);
    }
  }

  // Cascade reset: deselecting quiz resets later steps
  function handleSelectQuiz(q: Quiz | null) {
    setSelectedQuiz(q);
    if (!q) {
      setParticipants(null);
      setDuration(null);
    }
  }

  // Cascade reset: changing participants resets duration
  function handleSetParticipants(v: number | null) {
    setParticipants(v);
    if (v === null) setDuration(null);
  }

  // Validation errors — only shown when user has entered something
  const p2Error = participants !== null && participants < 2
    ? "Kamida 2 kishi kerak"
    : participants !== null && participants > 100
      ? "Ko'pi bilan 100 kishi bo'lishi mumkin"
      : null;

  const p3Error = duration !== null && duration < 1
    ? "Vaqt 1 daqiqadan kam bo'lmasin"
    : duration !== null && duration > 180
      ? "Vaqt 180 daqiqadan oshmasin"
      : null;

  useEffect(() => {
    let cancelled = false;

    fetchQuizList()
      .then((data) => {
        if (cancelled) return;
        setQuizzes((Array.isArray(data.items) ? data.items : []).map(mapQuiz));
      })
      .catch(() => {
        if (cancelled) return;
        setQuizzes([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingQuizzes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (preselectedQuizId === null || selectedQuiz !== null || quizzes.length === 0) return;

    const matchedQuiz = quizzes.find((quiz) => quiz.id === preselectedQuizId) ?? null;
    if (matchedQuiz) {
      setSelectedQuiz(matchedQuiz);
    }
  }, [preselectedQuizId, quizzes, selectedQuiz]);

  function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    createCompetition(selectedQuiz!.id, duration!, participants!)
      .then((data) => {
        navigate(`/student/waiting-room?session_id=${data.session_id}&quiz_id=${data.quiz_id}&join_code=${data.join_code}`);
      })
      .finally(() => {
        setCreating(false);
      });
  }

  const participantPresets = [2, 4, 6, 10, 20];
  const durationPresets = [10, 20, 30, 45, 60];

  return (
    <div className="max-w-2xl mx-auto pb-8">

      {/* ══════════════════════════════════════════════════════
          HEADER
      ═════════════════════════════════════════════��════════ */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 focus:outline-none"
          style={{
            background: t.bgCard,
            border: `1.5px solid ${t.border}`,
            color: t.textSecondary,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#A78BFA';
            (e.currentTarget as HTMLElement).style.color = '#A78BFA';
            (e.currentTarget as HTMLElement).style.background =
              t.isDark ? 'rgba(167,139,250,0.1)' : 'rgba(167,139,250,0.07)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = t.border;
            (e.currentTarget as HTMLElement).style.color = t.textSecondary;
            (e.currentTarget as HTMLElement).style.background = t.bgCard;
          }}
          aria-label="Orqaga"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate" style={{ color: t.textPrimary }}>
            Musobaqa yaratish
          </h1>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            3 qadamda do'stlaringiz bilan musobaqa boshlang
          </p>
        </div>

        <span
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0"
          style={{
            background: t.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.09)',
            color: '#A78BFA',
            border: `1px solid ${t.isDark ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.22)'}`,
          }}
        >
          <Sparkles className="w-3 h-3" strokeWidth={2.5} />
          Yangi
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════
          STEP PROGRESS
      ══════════════════════════════════════════════════════ */}
      <StepProgress
        step1Done={step1Done}
        step2Done={step2Done}
        step3Done={step3Done}
        onEditStep={handleEditStep}
      />

      {/* ══════════════════════════════════════════════════════
          INTRO BANNER
      ══════════════════════════════════════════════════════ */}
      <div
        className="relative rounded-2xl overflow-hidden mb-5"
        style={{
          background: t.isDark
            ? 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.1) 60%, rgba(56,189,248,0.07) 100%)'
            : 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.05) 60%, rgba(56,189,248,0.04) 100%)',
          border: `1.5px solid ${t.isDark ? 'rgba(139,92,246,0.28)' : 'rgba(139,92,246,0.18)'}`,
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none opacity-25"
          style={{ background: 'radial-gradient(circle, #A78BFA, transparent)' }} />
        <div className="absolute -bottom-5 -left-5 w-24 h-24 rounded-full pointer-events-none opacity-15"
          style={{ background: 'radial-gradient(circle, #38BDF8, transparent)' }} />

        <div className="relative flex items-center gap-4 p-4 sm:p-5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: t.isDark ? 'rgba(167,139,250,0.18)' : 'rgba(167,139,250,0.12)', border: '1.5px solid rgba(167,139,250,0.3)' }}
          >
            <Trophy className="w-5 h-5" style={{ color: '#A78BFA' }} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm" style={{ color: t.textPrimary }}>
              Do'stlar bilan musobaqa!
            </h2>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: t.textSecondary }}>
              Real vaqt rejimida do'stlaringiz bilan bellashing. Test tanlang, ishtirokchilar va vaqtni belgilang.
            </p>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
          {[
            { icon: Zap, label: 'Real-vaqt', color: '#FBBF24' },
            { icon: Trophy, label: 'Reyting', color: '#A78BFA' },
            { icon: Users, label: "Ko'p o'yinchi", color: '#38BDF8' },
            { icon: Target, label: 'Raqobat', color: '#22C55E' },
          ].map(({ icon: Ic, label, color }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ background: `${color}12`, color, border: `1px solid ${color}22` }}
            >
              <Ic className="w-3 h-3" strokeWidth={2} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          STEP CARDS
      ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-4">

        {/* ── STEP 1: Test Selection — shown only when step 1 is not done ── */}
        {!step1Done && (
          <div
            style={{
              animation: 'slideDown 0.28s cubic-bezier(0.34,1.3,0.64,1)',
            }}
          >
            <style>{`
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <StepCard
              step={1}
              title="Testni tanlang"
              subtitle="Musobaqa uchun fan va mavzu bo'yicha test tanlang"
              icon={BookOpen}
              color="#6366F1"
              complete={step1Done}
              active={!step1Done}
            >
              {/* Searchable Dropdown */}
              <QuizDropdown
                selected={selectedQuiz}
                onSelect={handleSelectQuiz}
                quizzes={quizzes}
              />

              {/* Selected quiz detail card */}
              {selectedQuiz && (
                <div
                  className="mt-3 flex items-center gap-3 px-4 py-3.5 rounded-xl"
                  style={{
                    background: `${selectedQuiz.subjectColor}0d`,
                    border: `1.5px solid ${selectedQuiz.subjectColor}30`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${selectedQuiz.subjectColor}18`, border: `1px solid ${selectedQuiz.subjectColor}30` }}
                  >
                    <SubjectIcon icon={selectedQuiz.subjectIcon} color={selectedQuiz.subjectColor} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: t.textPrimary }}>
                      {selectedQuiz.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs font-semibold" style={{ color: selectedQuiz.subjectColor }}>
                        {selectedQuiz.subject}
                      </span>
                      <span style={{ color: t.textMuted, fontSize: 10 }}>·</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: t.textMuted }}>
                        <Hash className="w-2.5 h-2.5" strokeWidth={2} />
                        {selectedQuiz.questions} ta savol
                      </span>
                      <span style={{ color: t.textMuted, fontSize: 10 }}>·</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: t.textMuted }}>
                        <Clock className="w-2.5 h-2.5" strokeWidth={2} />
                        {selectedQuiz.durationMin} daq
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectQuiz(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all focus:outline-none"
                    style={{
                      background: t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                      border: `1px solid ${t.border}`,
                      color: t.textMuted,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)';
                      (e.currentTarget as HTMLElement).style.color = '#EF4444';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.25)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
                      (e.currentTarget as HTMLElement).style.color = t.textMuted;
                      (e.currentTarget as HTMLElement).style.borderColor = t.border;
                    }}
                    aria-label="Testni olib tashlash"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              )}

              {/* Hint when not selected */}
              {!selectedQuiz && (
                <div
                  className="mt-3 flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
                  style={{
                    background: t.isDark ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.04)',
                    border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)'}`,
                  }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.75} />
                  <p className="text-xs" style={{ color: t.textSecondary }}>
                    {loadingQuizzes
                      ? "Testlar yuklanmoqda..."
                      : "Ro'yxatdan test tanlang yoki qidirish maydoniga nom yozing."}
                  </p>
                </div>
              )}
            </StepCard>
          </div>
        )}

        {/* ── STEP 2: Participants — shown only when step 1 is done and step 2 is not done ── */}
        {step1Done && !step2Done && (
          <div
            style={{
              animation: 'slideDown 0.28s cubic-bezier(0.34,1.3,0.64,1)',
            }}
          >
            <style>{`
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <StepCard
              step={2}
              title="Ishtirokchilar soni"
              subtitle="Nechta foydalanuvchi qatnashadi"
              icon={Users}
              color="#22C55E"
              complete={step2Done}
              active={!step2Done}
            >
              <CombinedNumberInput
                value={participants}
                onChange={handleSetParticipants}
                min={2}
                max={100}
                presets={participantPresets}
                unit="kishi"
                color="#22C55E"
                helperText="Musobaqa yaratilgach taklif kodi generatsiya qilinadi"
                error={p2Error}
              />
            </StepCard>
          </div>
        )}

        {/* ── STEP 3: Duration — shown only when step 1 & 2 are done and step 3 is not done ── */}
        {step1Done && step2Done && !step3Done && (
          <div
            style={{
              animation: 'slideDown 0.28s cubic-bezier(0.34,1.3,0.64,1)',
            }}
          >
            <StepCard
              step={3}
              title="Musobaqa vaqti"
              subtitle="Musobaqa davomiyligi"
              icon={Clock}
              color="#FBBF24"
              complete={step3Done}
              active={!step3Done}
            >
              <CombinedNumberInput
                value={duration}
                onChange={setDuration}
                min={1}
                max={180}
                presets={durationPresets}
                unit="daqiqa"
                color="#FBBF24"
                helperText="Vaqt tugagach musobaqa avtomatik yakunlanadi"
                error={p3Error}
              />
            </StepCard>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SUMMARY CARD — shown only when all 3 steps are done
        ══════════════════════════════════════════════════════ */}
        {step1Done && step2Done && step3Done && <div
          className="rounded-2xl overflow-hidden transition-all duration-300"
          style={{
            background: t.bgCard,
            border: `2px solid ${canCreate
              ? (t.isDark ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.22)')
              : t.border
              }`,
            boxShadow: t.shadowCard,
            opacity: canCreate ? 1 : 0.6,
          }}
        >
          {/* Rainbow bar */}
          <div
            className="h-1"
            style={{
              background: canCreate
                ? 'linear-gradient(90deg, #6366F1, #22C55E, #FBBF24, #A78BFA)'
                : 'transparent',
              transition: 'background 0.5s ease',
            }}
          />

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 shrink-0" style={{ color: canCreate ? '#A78BFA' : t.textMuted }} strokeWidth={1.75} />
              <h3 className="font-bold text-sm" style={{ color: canCreate ? t.textPrimary : t.textMuted }}>
                Musobaqa xulosasi
              </h3>
            </div>

            {/* Summary grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                {
                  icon: BookOpen,
                  label: 'Tanlangan test',
                  value: step1Done ? selectedQuiz!.title : '—',
                  sub: step1Done ? (selectedQuiz!.subject + ' · ' + selectedQuiz!.questions + ' ta savol') : 'Test tanlanmagan',
                  color: step1Done ? (selectedQuiz!.subjectColor) : t.textMuted,
                  step: 1,
                  done: step1Done,
                },
                {
                  icon: Users,
                  label: 'Ishtirokchilar',
                  value: step2Done ? participants + ' kishi' : '—',
                  sub: step2Done
                    ? (participants! <= 5 ? "Kichik guruh" : participants! <= 20 ? "O'rta guruh" : "Katta guruh")
                    : 'Belgilanmagan',
                  color: step2Done ? '#22C55E' : t.textMuted,
                  step: 2,
                  done: step2Done,
                },
                {
                  icon: Clock,
                  label: 'Davomiyligi',
                  value: step3Done ? duration + ' daqiqa' : '—',
                  sub: step3Done
                    ? (duration! < 15 ? "Qisqa musobaqa" : duration! < 40 ? "O'rtacha musobaqa" : "Uzoq musobaqa")
                    : 'Belgilanmagan',
                  color: step3Done ? '#FBBF24' : t.textMuted,
                  step: 3,
                  done: step3Done,
                },
              ].map(({ icon: Ic, label, value, sub, color, step, done }) => (
                <div
                  key={label}
                  className="relative flex items-start gap-3 p-3.5 rounded-xl transition-all"
                  style={{
                    background: canCreate ? `${color}0a` : (t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)'),
                    border: `1px solid ${canCreate ? color + '20' : t.border}`,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: canCreate ? `${color}16` : (t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      border: `1px solid ${canCreate ? color + '28' : t.border}`,
                    }}
                  >
                    <Ic className="w-4 h-4" style={{ color }} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs" style={{ color: t.textMuted }}>{label}</p>
                    <p className="text-sm font-bold truncate" style={{ color: t.textPrimary }}>{value}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color }}>{sub}</p>
                  </div>
                  {/* Edit button - shown only when step is done */}
                  {done && (
                    <button
                      onClick={() => handleEditStep(step)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center transition-all focus:outline-none"
                      style={{
                        background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${t.border}`,
                        color: t.textMuted,
                        opacity: 0.7,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = `${color}18`;
                        (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
                        (e.currentTarget as HTMLElement).style.color = color;
                        (e.currentTarget as HTMLElement).style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                        (e.currentTarget as HTMLElement).style.borderColor = t.border;
                        (e.currentTarget as HTMLElement).style.color = t.textMuted;
                        (e.currentTarget as HTMLElement).style.opacity = '0.7';
                      }}
                      aria-label={`${label}ni o'zgartirish`}
                      title="O'zgartirish"
                    >
                      <Edit2 className="w-3 h-3" strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Missing steps hint */}
            {!canCreate && (
              <div
                className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl mb-4"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
                  border: `1px solid ${t.border}`,
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: t.textMuted }} strokeWidth={1.75} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                    Musobaqa yaratish uchun quyidagilar kerak:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {!step2Done && (
                      <span className="text-xs px-2 py-0.5 rounded-lg"
                        style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
                        Ishtirokchilar belgilanmagan
                      </span>
                    )}
                    {!step3Done && (
                      <span className="text-xs px-2 py-0.5 rounded-lg"
                        style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}>
                        Vaqt belgilanmagan
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Primary CTA ── */}
            <button
              onClick={handleCreate}
              disabled={!canCreate || creating}
              className="w-full rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all focus:outline-none"
              style={{
                height: 52,
                background: !canCreate
                  ? (t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                  : creating
                    ? (t.isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)')
                    : 'linear-gradient(135deg, #A78BFA 0%, #6366F1 50%, #4F46E5 100%)',
                color: !canCreate
                  ? t.textMuted
                  : creating
                    ? '#A78BFA'
                    : '#fff',
                boxShadow: canCreate && !creating
                  ? '0 6px 24px rgba(99,102,241,0.45)'
                  : 'none',
                border: !canCreate
                  ? `2px solid ${t.border}`
                  : creating
                    ? `2px solid ${t.isDark ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.3)'}`
                    : 'none',
                cursor: !canCreate || creating ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (canCreate && !creating) {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(99,102,241,0.6)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  canCreate && !creating ? '0 6px 24px rgba(99,102,241,0.45)' : 'none';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
              aria-label="Musobaqani boshlash"
            >
              {creating ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-violet-400/40 border-t-violet-400 animate-spin" />
                  Musobaqa yaratilmoqda...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" strokeWidth={2.5} fill={canCreate ? "currentColor" : "none"} />
                  Musobaqani boshlash
                </>
              )}
            </button>
          </div>
        </div>}

        <div className="h-2" />
      </div>
    </div>
  );
}

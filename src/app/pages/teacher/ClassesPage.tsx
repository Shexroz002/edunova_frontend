import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Search, Plus, ChevronDown, Users, ClipboardCheck,
  Clock, ArrowRight, BookOpen, Zap, FlaskConical,
  Leaf, Calculator, GraduationCap, X, Check,
  Upload, ImagePlus, Trash2, Edit2,
  ArrowLeft, ChevronRight, AlertCircle,
  Palette, AlignLeft, UserCheck,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ClassItem {
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

interface SubjectOption {
  id: number | null;
  label: string;
  icon: string;
}

interface ClassApiItem {
  id: number;
  name: string;
  subject_name: string;
  description: string;
  students_count: number;
  tests_count: number;
  average_score: number;
  status: 'ACTIVE' | 'INACTIVE';
  last_activity: string | null;
  color: string | null;
  cover_image: string | null;
}

interface ClassesApiResponse {
  items: ClassApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface SubjectApiItem {
  id: number;
  name: string;
}

interface StudentSuggestionApiItem {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role?: string;
  profile_image: string | null;
}

export const ALL_CLASSES: ClassItem[] = [];

const SUBJECTS: SubjectOption[] = [
  { id: null, label: 'Matematika', icon: 'calculator' },
  { id: null, label: 'Fizika',     icon: 'zap'        },
  { id: null, label: 'Kimyo',      icon: 'flask'      },
  { id: null, label: 'Biologiya',  icon: 'leaf'       },
  { id: null, label: 'Boshqa',     icon: 'graduate'   },
];

const COLOR_PALETTE = [
  '#6366F1','#3B82F6','#8B5CF6','#22C55E',
  '#F59E0B','#EF4444','#EC4899','#14B8A6',
  '#F97316','#0891B2',
];

const SUBJECT_OPTIONS  = ['Barchasi', 'Matematika', 'Fizika', 'Kimyo', 'Biologiya'];
const COUNT_OPTIONS    = ['Barchasi', 'Kichik (<20)', "O'rta (20–30)", 'Katta (>30)'];
const ACTIVITY_OPTIONS = ['Barchasi', 'Faol', "O'rtacha faol", 'Kam faol'];
const ACTIVITY_LEVEL_MAP: Record<string, string> = { active: 'Faol', moderate: "O'rtacha faol", low: 'Kam faol' };

// ── Edit step config ───────────────────────────────────────────────────────────
const EDIT_STEPS = [
  { label: "Asosiy ma'lumot", Icon: Palette },
  { label: 'Tavsif & Rasm',   Icon: AlignLeft },
];

const CREATE_STEPS = [
  { label: "Asosiy ma'lumot", Icon: Palette },
  { label: 'Tavsif & Rasm',   Icon: AlignLeft },
  { label: "A'zolar",         Icon: UserCheck },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function SubjectIcon({ type, color, size = 20 }: { type: string; color: string; size?: number }) {
  const props = { style: { color }, strokeWidth: 1.75, width: size, height: size };
  switch (type) {
    case 'zap':      return <Zap {...props} />;
    case 'flask':    return <FlaskConical {...props} />;
    case 'leaf':     return <Leaf {...props} />;
    case 'graduate': return <GraduationCap {...props} />;
    default:         return <Calculator {...props} />;
  }
}

function formatRelativeActivity(value: string | null) {
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

function subjectIconFromName(subject: string) {
  const normalized = subject.trim().toLowerCase();
  if (normalized.includes('fiz')) return 'zap';
  if (normalized.includes('kim')) return 'flask';
  if (normalized.includes('bio')) return 'leaf';
  if (normalized.includes('mat')) return 'calculator';
  return 'graduate';
}

function mapApiSubject(item: SubjectApiItem): SubjectOption {
  return {
    id: item.id,
    label: item.name,
    icon: subjectIconFromName(item.name),
  };
}

function apiColorFromHex(hex: string) {
  const map: Record<string, string> = {
    '#6366F1': 'blue',
    '#3B82F6': 'blue',
    '#8B5CF6': 'purple',
    '#22C55E': 'green',
    '#4F7FDF': 'yellow',
    '#F59E0B': 'yellow',
    '#EF4444': 'red',
    '#EC4899': 'pink',
    '#14B8A6': 'teal',
    '#F97316': 'orange',
    '#0891B2': 'cyan',
  };
  return map[hex] ?? 'blue';
}

function mapSuggestedStudent(item: StudentSuggestionApiItem) {
  const name = `${item.first_name} ${item.last_name}`.trim();
  return {
    id: item.id,
    name,
    initials: `${item.first_name[0] ?? ''}${item.last_name[0] ?? ''}`.toUpperCase(),
    email: item.username,
    color: COLOR_PALETTE[item.id % COLOR_PALETTE.length],
    profileImage: item.profile_image,
    role: item.role ?? 'schoolboy',
  };
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

function activityLevelFromApi(item: ClassApiItem): ClassItem['activityLevel'] {
  if (item.status === 'ACTIVE') return 'active';
  if (item.tests_count > 0 || item.students_count >= 20) return 'moderate';
  return 'low';
}

function mapApiClass(item: ClassApiItem): ClassItem {
  return {
    id: item.id,
    name: item.name,
    subject: item.subject_name,
    subjectIcon: subjectIconFromName(item.subject_name),
    color: colorFromApi(item.color),
    students: item.students_count,
    quizzes: item.tests_count,
    lastActivity: formatRelativeActivity(item.last_activity),
    activityLevel: activityLevelFromApi(item),
    avgScore: item.average_score,
    description: item.description,
    coverImage: item.cover_image ?? undefined,
  };
}

export async function fetchTeacherGroups() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/group/`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Grupalarni olishda xatolik: ${response.status}`);
  }

  const data: ClassesApiResponse = await response.json();
  return {
    items: data.items.map(mapApiClass),
    total: data.total,
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

function ActivityBadge({ level, t }: { level: ClassItem['activityLevel']; t: ReturnType<typeof useTheme>['theme'] }) {
  const cfg = {
    active:   { label: 'Faol',     color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
    moderate: { label: "O'rtacha", color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
    low:      { label: 'Kam faol', color: '#64748B', bg: t.bgInner,              border: t.border                },
  }[level];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function FilterSelect({ value, options, onChange, t }: {
  value: string; options: string[]; onChange: (v: string) => void; t: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <div className="relative">
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none pr-8 pl-3 rounded-xl text-sm focus:outline-none transition-all cursor-pointer"
        style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: value === 'Barchasi' ? t.textMuted : t.textPrimary, height: '40px', minWidth: '130px', boxShadow: t.shadowCard }}
        onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
        onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = t.border;  (e.target as HTMLElement).style.boxShadow = t.shadowCard; }}
      >
        {options.map((o) => <option key={o} value={o} style={{ background: t.bgCard, color: t.textPrimary }}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: t.textMuted }} />
    </div>
  );
}

// ── Shared Step Indicator ──────────────────────────────────────────────────────
function StepIndicator({ current, color, steps }: { current: number; color: string; steps: typeof EDIT_STEPS }) {
  const { theme: t } = useTheme();
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((step, i) => {
        const idx    = i + 1;
        const done   = idx < current;
        const active = idx === current;
        const Icon   = step.Icon;
        return (
          <div key={idx} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
                style={{
                  background: done
                    ? 'linear-gradient(135deg,#22C55E,#16A34A)'
                    : active
                    ? `linear-gradient(135deg,${color},${color}cc)`
                    : t.bgInner,
                  border: done
                    ? '1.5px solid rgba(34,197,94,0.4)'
                    : active
                    ? `1.5px solid ${color}60`
                    : `1.5px solid ${t.border}`,
                  boxShadow: active
                    ? `0 4px 14px ${color}40`
                    : done
                    ? '0 4px 14px rgba(34,197,94,0.25)'
                    : 'none',
                }}
              >
                {done
                  ? <Check style={{ width: 15, height: 15, color: '#fff' }} strokeWidth={2.5} />
                  : <Icon  style={{ width: 15, height: 15, color: active ? '#fff' : t.textMuted }} strokeWidth={1.75} />
                }
              </div>
              <span className="text-xs font-medium hidden sm:block whitespace-nowrap"
                style={{ color: active ? color : done ? '#22C55E' : t.textMuted }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-2 mb-5 sm:mb-5 transition-all duration-500"
                style={{
                  width: 36, height: 2, borderRadius: 9999,
                  background: done
                    ? `linear-gradient(90deg,#22C55E,${color})`
                    : t.border,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1 — Asosiy ma'lumotlar ────────────────────────────────────────────────
function EditStep1({
  name, setName, subject, setSubject, color, setColor, nameError, subjects,
}: {
  name: string; setName: (v: string) => void;
  subject: SubjectOption; setSubject: (v: SubjectOption) => void;
  color: string; setColor: (v: string) => void;
  nameError: string;
  subjects: SubjectOption[];
}) {
  const { theme: t } = useTheme();
  const nameRef = useRef<HTMLInputElement>(null);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 80); }, []);

  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return subjects;
    const query = subjectSearch.toLowerCase();
    return subjects.filter((item) => item.label.toLowerCase().includes(query));
  }, [subjectSearch, subjects]);

  return (
    <div className="space-y-5">
      {/* Grupa nomi */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>
          Grupa nomi <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Masalan: 9-A, Fizika tayyorlov..."
          className="w-full px-3.5 rounded-xl text-sm focus:outline-none transition-all"
          style={{
            background: t.bgInner,
            border: `1.5px solid ${nameError ? 'rgba(239,68,68,0.6)' : name.trim() ? color + '80' : t.border}`,
            color: t.textPrimary, height: '44px',
          }}
          onFocus={(e) => { (e.target as HTMLElement).style.borderColor = nameError ? '#EF4444' : color; (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${nameError ? 'rgba(239,68,68,0.1)' : color + '20'}`; }}
          onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = nameError ? 'rgba(239,68,68,0.6)' : name.trim() ? color + '80' : t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
        />
        {nameError && (
          <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#EF4444' }}>
            <AlertCircle style={{ width: 11, height: 11 }} strokeWidth={2} /> {nameError}
          </p>
        )}
      </div>

      {/* Fan */}
      <div className="relative">
        <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>Fan</label>
        <button
          type="button"
          onClick={() => setSubjectDropdownOpen((current) => !current)}
          className="w-full rounded-2xl px-4 py-3 text-left transition-all"
          style={{
            background: t.bgInner,
            border: `1.5px solid ${subjectDropdownOpen ? color : t.border}`,
            boxShadow: subjectDropdownOpen ? `0 0 0 3px ${color}18` : 'none',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}18`, border: `1px solid ${color}33` }}
            >
              <SubjectIcon type={subject.icon} color={color} size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                {subject.label}
              </div>
              <div className="text-xs truncate" style={{ color: t.textMuted }}>
                Bu guruh shu fan asosida yaratiladi
              </div>
            </div>
            <ChevronDown
              className={`shrink-0 transition-transform ${subjectDropdownOpen ? 'rotate-180' : ''}`}
              style={{ width: 16, height: 16, color: t.textMuted }}
            />
          </div>
        </button>

        {subjectDropdownOpen && (
          <div
            className="mt-3 overflow-hidden rounded-2xl"
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              boxShadow: t.isDark
                ? '0 20px 48px rgba(15,23,42,0.42)'
                : '0 18px 40px rgba(15,23,42,0.12)',
            }}
          >
            <div className="p-3 border-b" style={{ borderColor: t.border }}>
              <div
                className="flex items-center gap-2 rounded-xl px-3"
                style={{ background: t.bgInner, border: `1px solid ${t.border}`, height: '42px' }}
              >
                <Search style={{ width: 15, height: 15, color: t.textMuted }} strokeWidth={1.75} />
                <input
                  type="text"
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  placeholder="Qidirish..."
                  className="w-full bg-transparent text-sm focus:outline-none"
                  style={{ color: t.textPrimary }}
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto py-1">
              {filteredSubjects.map((s) => {
                const active = subject.label === s.label;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setSubject(s);
                      setSubjectDropdownOpen(false);
                      setSubjectSearch('');
                    }}
                    className="w-full px-4 py-3 text-left transition-colors"
                    style={{
                      background: active ? `${color}14` : 'transparent',
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: active ? `${color}18` : t.bgInner, border: `1px solid ${active ? color + '33' : t.border}` }}
                      >
                        <SubjectIcon type={s.icon} color={active ? color : t.textMuted} size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate" style={{ color: active ? color : t.textPrimary }}>
                          {s.label}
                        </div>
                        <div className="text-xs truncate" style={{ color: t.textMuted }}>
                          Fan
                        </div>
                      </div>
                      {active && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ border: `1px solid ${color}55`, background: `${color}15` }}
                        >
                          <Check style={{ width: 12, height: 12, color }} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredSubjects.length === 0 && (
                <div className="px-4 py-6 text-sm text-center" style={{ color: t.textMuted }}>
                  Hech qanday fan topilmadi
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rang */}
      <div>
        <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>Asosiy rang</label>
        <div className="grid grid-cols-10 gap-2">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="aspect-square rounded-xl transition-all flex items-center justify-center"
              style={{
                background: c,
                boxShadow: color === c ? `0 0 0 2px ${t.bgCard}, 0 0 0 4px ${c}` : 'none',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {color === c && <Check style={{ width: 12, height: 12, color: '#fff' }} strokeWidth={3} />}
            </button>
          ))}
        </div>
        {/* Preview */}
        <div
          className="mt-3 flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
          style={{ background: color + '12', border: `1px solid ${color}33` }}
        >
          <div className="w-6 h-6 rounded-lg shrink-0" style={{ background: color }} />
          <span className="text-xs font-semibold" style={{ color }}>Tanlangan rang: {color}</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 2 — Tavsif & Muqova ───────────────────────────────────────────────────
function EditStep2({
  description, setDescription, coverImage, setCoverImage, color, setCoverFile, showCoverImage = true,
}: {
  description: string; setDescription: (v: string) => void;
  coverImage: string | null; setCoverImage: (v: string | null) => void;
  color: string;
  setCoverFile?: (file: File | null) => void;
  showCoverImage?: boolean;
}) {
  const { theme: t } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setCoverFile?.(file);
    const reader = new FileReader();
    reader.onload = (e) => setCoverImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [setCoverFile, setCoverImage]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="space-y-5">
      {showCoverImage && (
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>Muqova rasm</label>
          <div
            className="relative rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{ height: 120, border: `2px dashed ${isDragging ? color : t.border}`, background: isDragging ? color + '08' : t.bgInner }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {coverImage ? (
              <>
                <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4))' }} />
                <button
                  onClick={(e) => { e.stopPropagation(); setCoverImage(null); setCoverFile?.(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}
                >
                  <Trash2 style={{ width: 13, height: 13 }} strokeWidth={2} />
                </button>
                <div className="absolute bottom-2 left-3">
                  <span className="text-xs font-semibold text-white opacity-80">Muqova yuklandi</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: isDragging ? color + '20' : t.bgCard, border: `1px solid ${isDragging ? color + '44' : t.border}` }}
                >
                  <ImagePlus style={{ width: 18, height: 18, color: isDragging ? color : t.textMuted }} strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold" style={{ color: isDragging ? color : t.textSecondary }}>
                    {isDragging ? 'Tashlang!' : 'Rasm yuklash'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>yoki bu yerga tashlang</p>
                </div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {/* Tavsif */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold" style={{ color: t.textSecondary }}>
            Tavsif <span style={{ color: t.textMuted }}>(ixtiyoriy)</span>
          </label>
          <span className="text-xs" style={{ color: description.length > 150 ? '#EF4444' : t.textMuted }}>
            {description.length}/200
          </span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 200))}
          placeholder="Grupa haqida qisqacha ma'lumot..."
          rows={4}
          className="w-full px-3.5 py-3 rounded-xl text-sm focus:outline-none transition-all resize-none"
          style={{ background: t.bgInner, border: `1.5px solid ${t.border}`, color: t.textPrimary, lineHeight: 1.6 }}
          onFocus={(e) => { (e.target as HTMLElement).style.borderColor = color; (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${color}18`; }}
          onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
        />
      </div>

      {showCoverImage && (
        <div
          className="flex items-start gap-3 px-3.5 py-3 rounded-xl"
          style={{ background: color + '0c', border: `1px solid ${color}25` }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: color + '20', border: `1px solid ${color}35` }}>
            <Upload style={{ width: 13, height: 13, color }} strokeWidth={1.75} />
          </div>
          <p className="text-xs" style={{ color: t.textSecondary }}>
            Muqova rasm grupaning kartasida ko'rinadi. PNG, JPG yoki WEBP formati qabul qilinadi.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Step 3 — A'zolar ───────────────────────────────────────────────────────────
function EditStep3({
  selected, setSelected, color,
}: {
  selected: number[]; setSelected: (ids: number[]) => void; color: string;
}) {
  const { theme: t } = useTheme();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<Array<{
    id: number;
    name: string;
    initials: string;
    email: string;
    color: string;
    profileImage: string | null;
    role: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: '1',
        size: '50',
      });

      if (query.trim()) {
        params.set('search', query.trim());
      }

      try {
        const response = await fetchWithAuthRetry(
          `${API_BASE_URL}/api/v1/teacher/my/student/suggestions/?${params.toString()}`,
          { method: 'GET' },
        );

        if (!response.ok) {
          throw new Error(`O'quvchilarni olishda xatolik: ${response.status}`);
        }

        const data: { items: StudentSuggestionApiItem[] } = await response.json();
        if (isMounted) {
          setStudents(data.items.map(mapSuggestedStudent));
        }
      } catch (err) {
        if (isMounted) {
          setStudents([]);
          setError(err instanceof Error ? err.message : "O'quvchilarni yuklab bo'lmadi");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, query.trim() ? 300 : 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const filtered = useMemo(() => students, [students]);
  const studentMap = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  function toggle(id: number) {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="space-y-4">
      {/* Counter header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold" style={{ color: t.textSecondary }}>
            Grupaga a'zolarni qo'shing
          </p>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            {loading ? "Yuklanmoqda..." : `${students.length} ta o'quvchi mavjud`}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{
            background: selected.length > 0 ? color + '14' : t.bgInner,
            color: selected.length > 0 ? color : t.textMuted,
            border: `1px solid ${selected.length > 0 ? color + '35' : t.border}`,
          }}
        >
          <Users style={{ width: 12, height: 12 }} strokeWidth={2} />
          {selected.length} ta tanlandi
        </div>
      </div>

      {/* Search bar */}
      <div
        className="flex items-center gap-2 px-3 rounded-xl transition-all"
        style={{ background: t.bgInner, border: `1.5px solid ${t.border}`, height: '40px' }}
        onFocusCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${color}15`; }}
        onBlurCapture={(e)  => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
      >
        <Search style={{ width: 14, height: 14, color: t.textMuted, flexShrink: 0 }} strokeWidth={1.75} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="O'quvchi qidirish..."
          className="flex-1 bg-transparent outline-none text-xs"
          style={{ color: t.textPrimary }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ color: t.textMuted }}>
            <X style={{ width: 12, height: 12 }} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const s = studentMap.get(id) ?? {
              id,
              name: `O'quvchi #${id}`,
              initials: 'U',
              email: `ID: ${id}`,
              color: color,
              profileImage: null,
              role: 'schoolboy',
            };
            return (
              <div key={id}
                className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg text-xs font-medium"
                style={{ background: s.color + '15', border: `1px solid ${s.color}35`, color: s.color }}
              >
                <div className="w-4 h-4 rounded-full text-white flex items-center justify-center shrink-0"
                  style={{ background: s.color, fontSize: 8, fontWeight: 700 }}>
                  {s.initials.charAt(0)}
                </div>
                {s.name.split(' ')[0]}
                <button onClick={() => toggle(id)} style={{ color: s.color, opacity: 0.7 }}>
                  <X style={{ width: 10, height: 10 }} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Student list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${t.border}`, maxHeight: 200, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${t.border} transparent` } as React.CSSProperties}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color }} />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 px-4">
            <p className="text-xs text-center" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs" style={{ color: t.textMuted }}>O'quvchi topilmadi</p>
          </div>
        ) : (
          filtered.map((s, idx) => {
            const isSel = selected.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-all"
                style={{
                  background: isSel ? color + '10' : 'transparent',
                  borderBottom: idx < filtered.length - 1 ? `1px solid ${t.border}` : 'none',
                  outline: 'none',
                }}
                onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = t.bgInner; }}
                onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                  style={{ background: s.color, boxShadow: isSel ? `0 0 0 2px ${s.color}45` : 'none' }}
                >
                  {s.profileImage ? (
                    <img src={s.profileImage} alt={s.name} className="w-full h-full object-cover" />
                  ) : s.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: t.textPrimary }}>{s.name}</p>
                  <p className="text-xs truncate" style={{ color: t.textMuted }}>{s.email}</p>
                </div>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all"
                  style={{ background: isSel ? color : 'transparent', border: `1.5px solid ${isSel ? color : t.border}` }}
                >
                  {isSel && <Check style={{ width: 10, height: 10, color: '#fff' }} strokeWidth={3} />}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Quick actions */}
      <div className="flex items-center justify-between px-0.5">
        <button
          onClick={() => setSelected(filtered.map((s) => s.id))}
          className="text-xs font-semibold transition-colors"
          style={{ color }}
        >
          Barchasini tanlash
        </button>
        {selected.length > 0 && (
          <button
            onClick={() => setSelected([])}
            className="text-xs transition-colors"
            style={{ color: t.textMuted }}
          >
            Tozalash
          </button>
        )}
      </div>
    </div>
  );
}

// ── Edit Grupa Modal ───────────────────────────────────────────────────────────
interface EditClassModalProps {
  open: boolean;
  cls: ClassItem;
  onClose: () => void;
  onSave: (updated: ClassItem) => void;
}

function EditClassModal({ open, cls, onClose, onSave }: EditClassModalProps) {
  const { theme: t } = useTheme();

  const [step,        setStep]        = useState(1);
  const [saving,      setSaving]      = useState(false);

  // Step 1
  const [name,        setName]        = useState(cls.name);
  const [subject,     setSubject]     = useState(SUBJECTS.find((s) => s.label === cls.subject) ?? SUBJECTS[0]);
  const [color,       setColor]       = useState(cls.color);
  const [nameError,   setNameError]   = useState('');

  // Step 2
  const [description, setDescription] = useState(cls.description);
  const [coverImage,  setCoverImage]  = useState<string | null>(cls.coverImage ?? null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1); setSaving(false);
      setName(cls.name);
      setSubject(SUBJECTS.find((s) => s.label === cls.subject) ?? SUBJECTS[0]);
      setColor(cls.color);
      setDescription(cls.description);
      setCoverImage(cls.coverImage ?? null);
      setNameError('');
    }
  }, [open, cls]);

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  function handleNext() {
    if (step === 1) {
      if (!name.trim()) { setNameError('Grupa nomi kiritilmadi'); return; }
      setNameError('');
      setStep(2);
    } else {
      // Save (step === 2)
      setSaving(true);
      setTimeout(() => {
        onSave({
          ...cls,
          name:        name.trim(),
          subject:     subject.label,
          subjectIcon: subject.icon,
          color,
          description: description.trim() || cls.description,
          coverImage:  coverImage ?? undefined,
        });
        setSaving(false);
        onClose();
      }, 700);
    }
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  if (!open) return null;

  const stepTitles = [
    { title: "Asosiy ma'lumotlarni tahrirlash", sub: 'Grupa nomi, fan va rangini o\'zgartiring' },
    { title: 'Tavsif va muqova rasm',            sub: 'Grupaning tavsifi va qopqog\'ini tahrirlang'  },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(7px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.isDark ? color + '30' : t.border}`,
          boxShadow: t.isDark
            ? `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${color}15`
            : '0 32px 80px rgba(15,23,42,0.2)',
          maxHeight: '94vh',
        }}
      >
        {/* Gradient top bar */}
        <div className="h-1 w-full shrink-0"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}80, #8B5CF6)` }} />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: color + '18', border: `1.5px solid ${color}40` }}
            >
              <SubjectIcon type={subject.icon} color={color} size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: t.textPrimary }}>
                Grupani tahrirlash
              </h2>
              <p className="text-xs" style={{ color: t.textMuted }}>
                {name || cls.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
          >
            <X style={{ width: 15, height: 15 }} strokeWidth={2} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-5 pb-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${t.border} transparent` } as React.CSSProperties}>

          {/* Step indicator */}
          <StepIndicator current={step} color={color} steps={EDIT_STEPS} />

          {/* Step title */}
          <div className="mb-5">
            <h3 className="text-base font-bold" style={{ color: t.textPrimary }}>
              {stepTitles[step - 1].title}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
              {stepTitles[step - 1].sub}
            </p>
          </div>

          {/* Step content */}
          {step === 1 && (
            <EditStep1
              name={name} setName={(v) => { setName(v); setNameError(''); }}
              subject={subject} setSubject={setSubject}
              color={color} setColor={setColor}
              nameError={nameError}
              subjects={SUBJECTS}
            />
          )}
          {step === 2 && (
            <EditStep2
              description={description} setDescription={setDescription}
              coverImage={coverImage} setCoverImage={setCoverImage}
              color={color}
            />
          )}

          <div className="h-5" />
        </div>

        {/* ── Footer ── */}
        <div
          className="px-6 py-4 shrink-0 flex gap-2.5"
          style={{ borderTop: `1px solid ${t.border}`, background: t.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}
        >
          {step > 1 ? (
            <button
              onClick={handleBack}
              disabled={saving}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.color = color; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}
            >
              <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all"
              style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.textMuted; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
            >
              Bekor qilish
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-[2] h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all text-white"
            style={{
              background: saving ? color + '55' : `linear-gradient(135deg, ${color}, ${color}cc)`,
              boxShadow: saving ? 'none' : `0 5px 18px ${color}40`,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => { if (!saving) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${color}55`; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = saving ? 'none' : `0 5px 18px ${color}40`; }}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Saqlanmoqda...
              </>
            ) : step < 2 ? (
              <>
                Davom etish
                <ChevronRight style={{ width: 16, height: 16 }} strokeWidth={2.5} />
              </>
            ) : (
              <>
                <Check style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                O'zgarishlarni saqlash
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Grupa Modal ─────────────────────────────────────────────────────────
interface CreateClassModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    subjectId: number;
    color: string;
    description: string;
    studentIds: number[];
    coverFile: File | null;
  }) => Promise<void>;
}

function CreateClassModal({ open, onClose, onCreate }: CreateClassModalProps) {
  const { theme: t } = useTheme();

  const [step,        setStep]        = useState(1);
  const [creating,    setCreating]    = useState(false);

  // Step 1
  const [name,        setName]        = useState('');
  const [subject,     setSubject]     = useState(SUBJECTS[0]);
  const [color,       setColor]       = useState(COLOR_PALETTE[0]);
  const [nameError,   setNameError]   = useState('');
  const [subjects,    setSubjects]    = useState<SubjectOption[]>(SUBJECTS);
  const [subjectsError, setSubjectsError] = useState('');

  // Step 2
  const [description, setDescription] = useState('');
  const [coverImage,  setCoverImage]  = useState<string | null>(null);
  const [coverFile,   setCoverFile]   = useState<File | null>(null);

  // Step 3
  const [selected,    setSelected]    = useState<number[]>([]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1); setCreating(false);
      setName(''); setSubject(SUBJECTS[0]); setColor(COLOR_PALETTE[0]); setNameError('');
      setDescription(''); setCoverImage(null); setCoverFile(null); setSelected([]);
      setSubjectsError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    async function loadSubjects() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/subject/list/`, {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Fanlarni olishda xatolik: ${response.status}`);
        }

        const data: SubjectApiItem[] = await response.json();
        const mapped = data.map(mapApiSubject);

        if (isMounted && mapped.length > 0) {
          setSubjects(mapped);
          setSubject(mapped[0]);
        }
      } catch (err) {
        if (isMounted) {
          setSubjects(SUBJECTS);
          setSubjectsError(err instanceof Error ? err.message : "Fanlarni yuklab bo'lmadi");
        }
      }
    }

    loadSubjects();

    return () => {
      isMounted = false;
    };
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  async function handleNext() {
    if (step === 1) {
      if (!name.trim()) { setNameError("Iltimos, guruh nomini kiriting"); return; }
      if (!subject.id) { setNameError("Fanlar hali yuklanmagan"); return; }
      setNameError(''); setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      setCreating(true);
      try {
        await onCreate({
          name: name.trim(),
          subjectId: subject.id ?? 0,
          color: apiColorFromHex(color),
          description: description.trim(),
          studentIds: selected,
          coverFile,
        });
        setCreating(false);
        onClose();
      } catch (err) {
        setCreating(false);
        setNameError(err instanceof Error ? err.message : "Guruh yaratilmadi");
      }
    }
  }

  function handleBack() { if (step > 1) setStep((s) => s - 1); }

  if (!open) return null;

  const STEP_META = [
    {
      title:    "Asosiy ma'lumotlar",
      sub:      "Guruh nomini, fanini va rangini tanlang",
      hint:     "1-qadam: Asosiy ma'lumotlar",
      hintDesc: "Guruh nomi majburiy. Fan va rang keyinchalik ham o'zgartirilishi mumkin.",
    },
    {
      title:    'Rasm va tavsif',
      sub:      "Guruh uchun qisqacha tavsif qo'shing",
      hint:     "2-qadam: Ko'rinish va tavsif",
      hintDesc: "Tavsif ixtiyoriy, lekin guruhni tezroq tanib olishga yordam beradi.",
    },
    {
      title:    "O'quvchilarni qo'shish",
      sub:      "Guruhga qo'shmoqchi bo'lgan o'quvchilarni tanlang",
      hint:     "3-qadam: Guruh a'zolari",
      hintDesc: "O'quvchilarni hozir qo'shmasangiz ham bo'ladi — keyinchalik tahrirlash orqali qo'sha olasiz.",
    },
  ];

  const meta = STEP_META[step - 1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(7px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.isDark ? color + '30' : t.border}`,
          boxShadow: t.isDark
            ? `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${color}15`
            : '0 32px 80px rgba(15,23,42,0.2)',
          maxHeight: '94vh',
        }}
      >
        {/* Gradient top bar */}
        <div className="h-1 w-full shrink-0"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}80, #8B5CF6)` }} />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: color + '18', border: `1.5px solid ${color}40` }}
            >
              <SubjectIcon type={subject.icon} color={color} size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: t.textPrimary }}>
                Yangi guruh yaratish
              </h2>
              <p className="text-xs" style={{ color: t.textMuted }}>
                {name.trim() ? name : "Guruh nomi kiritilmagan"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
          >
            <X style={{ width: 15, height: 15 }} strokeWidth={2} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div
          className="flex-1 overflow-y-auto min-h-0 px-6 pt-5 pb-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${t.border} transparent` } as React.CSSProperties}
        >
          {/* Step indicator */}
          <StepIndicator current={step} color={color} steps={CREATE_STEPS} />

          {/* Step title + teacher hint box */}
          <div className="mb-5">
            <h3 className="text-base font-bold" style={{ color: t.textPrimary }}>{meta.title}</h3>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{meta.sub}</p>
            {subjectsError && step === 1 && (
              <p className="text-xs mt-2" style={{ color: '#EF4444' }}>{subjectsError}</p>
            )}
            <div
              className="flex items-start gap-2.5 mt-3 px-3.5 py-2.5 rounded-xl"
              style={{ background: color + '0d', border: `1px solid ${color}28` }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: color + '20', border: `1px solid ${color}35` }}
              >
                <AlertCircle style={{ width: 12, height: 12, color }} strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color }}>{meta.hint}</p>
                <p className="text-xs" style={{ color: t.textSecondary }}>{meta.hintDesc}</p>
              </div>
            </div>
          </div>

          {/* Step content */}
          {step === 1 && (
            <EditStep1
              name={name} setName={(v) => { setName(v); setNameError(''); }}
              subject={subject} setSubject={setSubject}
              color={color} setColor={setColor}
              nameError={nameError}
              subjects={subjects}
            />
          )}
            {step === 2 && (
              <EditStep2
                description={description} setDescription={setDescription}
                coverImage={coverImage} setCoverImage={setCoverImage}
                color={color}
                setCoverFile={setCoverFile}
                showCoverImage={false}
              />
            )}
          {step === 3 && (
            <EditStep3 selected={selected} setSelected={setSelected} color={color} />
          )}
          <div className="h-5" />
        </div>

        {/* ── Footer ── */}
        <div
          className="px-6 pb-5 pt-4 shrink-0 flex flex-col gap-3"
          style={{ borderTop: `1px solid ${t.border}`, background: t.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}
        >
          {/* Progress bar */}
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="h-1 rounded-full flex-1 transition-all duration-500"
                style={{ background: s <= step ? color : t.border }}
              />
            ))}
          </div>

          <div className="flex gap-2.5">
            {step > 1 ? (
              <button
                onClick={handleBack}
                disabled={creating}
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
                style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.color = color; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}
              >
                <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all"
                style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.textMuted; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
              >
                Bekor qilish
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={creating}
              className="flex-[2] h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all text-white"
              style={{
                background: creating ? color + '55' : `linear-gradient(135deg, ${color}, ${color}cc)`,
                boxShadow: creating ? 'none' : `0 5px 18px ${color}40`,
                cursor: creating ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!creating) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${color}55`; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = creating ? 'none' : `0 5px 18px ${color}40`; }}
            >
              {creating ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Yaratilmoqda...</>
              ) : step < 3 ? (
                <>Davom etish<ChevronRight style={{ width: 16, height: 16 }} strokeWidth={2.5} /></>
              ) : (
                <>
                  <Check style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                  Guruhni yaratish{selected.length > 0 && ` · ${selected.length} o'quvchi`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Class Card ─────────────────────────────────────────────────────────────────
function ClassCard({
  cls, t, onView, onEdit, onMembers,
}: {
  cls: ClassItem; t: ReturnType<typeof useTheme>['theme']; onView: () => void; onEdit: () => void; onMembers: () => void;
}) {
  return (
    <div
      className="rounded-2xl flex flex-col gap-4 transition-all duration-200 group overflow-hidden"
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = t.shadowHover; (e.currentTarget as HTMLElement).style.borderColor = `${cls.color}44`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = t.shadowCard;  (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
    >
      {/* Cover image strip */}
      {cls.coverImage ? (
        <div className="h-24 w-full overflow-hidden relative">
          <img src={cls.coverImage} alt={cls.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 40%, ${t.bgCard}ee)` }} />
        </div>
      ) : (
        <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${cls.color}, ${cls.color}80)` }} />
      )}

      <div className="px-5 pb-5 flex flex-col gap-4 flex-1">
        {/* Card header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
              style={{ background: t.isDark ? `${cls.color}22` : `${cls.color}14`, border: `1.5px solid ${cls.color}44`, boxShadow: t.isDark ? `0 0 20px ${cls.color}22` : 'none' }}
            >
              <SubjectIcon type={cls.subjectIcon} color={cls.color} size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold truncate" style={{ color: t.textPrimary }}>{cls.name}</h3>
              <p className="text-xs font-medium" style={{ color: cls.color }}>{cls.subject}</p>
            </div>
          </div>
          <ActivityBadge level={cls.activityLevel} t={t} />
        </div>

        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: t.textMuted }}>{cls.description}</p>

        <div className="grid grid-cols-3 gap-0 rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}`, background: t.bgInner }}>
          {[
            { Icon: Users,          val: `${cls.students}`,  label: "O'quvchi" },
            { Icon: ClipboardCheck, val: `${cls.quizzes}`,   label: 'Test'     },
            { Icon: BookOpen,       val: `${cls.avgScore}%`, label: "O'rtacha" },
          ].map(({ Icon, val, label }, i) => (
            <div key={label} className="flex flex-col items-center gap-0.5 py-3" style={{ borderLeft: i > 0 ? `1px solid ${t.border}` : 'none' }}>
              <p className="text-sm font-bold" style={{ color: t.textPrimary }}>{val}</p>
              <p className="text-xs" style={{ color: t.textMuted }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
            <span className="text-xs" style={{ color: t.textMuted }}>{cls.lastActivity}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Members button */}
            <button
              onClick={(e) => { e.stopPropagation(); onMembers(); }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
              style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = `${cls.color}14`;
                (e.currentTarget as HTMLElement).style.borderColor = `${cls.color}44`;
                (e.currentTarget as HTMLElement).style.color = cls.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.bgInner;
                (e.currentTarget as HTMLElement).style.borderColor = t.border;
                (e.currentTarget as HTMLElement).style.color = t.textMuted;
              }}
            >
              <Users style={{ width: 13, height: 13 }} strokeWidth={2} />
              A'zolar
            </button>

            {/* Edit button */}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
              style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = `${cls.color}14`;
                (e.currentTarget as HTMLElement).style.borderColor = `${cls.color}44`;
                (e.currentTarget as HTMLElement).style.color = cls.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.bgInner;
                (e.currentTarget as HTMLElement).style.borderColor = t.border;
                (e.currentTarget as HTMLElement).style.color = t.textMuted;
              }}
            >
              <Edit2 style={{ width: 13, height: 13 }} strokeWidth={2} />
              Tahrir
            </button>

            {/* View button */}
            <button
              onClick={onView}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
              style={{ background: t.isDark ? `${cls.color}22` : `${cls.color}12`, color: cls.color, border: `1px solid ${cls.color}44` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${cls.color}33`; (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.isDark ? `${cls.color}22` : `${cls.color}12`; (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; }}
            >
              Ko'rish <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function ClassesPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();

  const [classes,       setClasses]       = useState<ClassItem[]>([]);
  const [showCreate,    setShowCreate]    = useState(false);
  const [editTarget,    setEditTarget]    = useState<ClassItem | null>(null);
  const [search,        setSearch]        = useState('');
  const [subjectF,      setSubjectF]      = useState('Barchasi');
  const [countF,        setCountF]        = useState('Barchasi');
  const [activityF,     setActivityF]     = useState('Barchasi');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [total,         setTotal]         = useState(0);

  async function handleCreate(payload: {
    name: string;
    subjectId: number;
    color: string;
    description: string;
    studentIds: number[];
    coverFile: File | null;
  }) {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('subject_id', String(payload.subjectId));
    formData.append('color', payload.color);
    formData.append('description', payload.description);
    formData.append('student_ids', payload.studentIds.join(','));
    if (payload.coverFile) {
      formData.append('cover_image', payload.coverFile);
    }

    const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/group/`, {
      method: 'POST',
      body: formData,
    });

    if (response.status !== 200 && response.status !== 201) {
      let message = 'Guruh yaratishda xatolik yuz berdi';
      try {
        const data = await response.json();
        if (typeof data?.message === 'string') {
          message = data.message;
        } else if (typeof data?.detail === 'string') {
          message = data.detail;
        }
      } catch {
        message = `Guruh yaratishda xatolik: ${response.status}`;
      }
      throw new Error(message);
    }

    const refreshed = await fetchTeacherGroups();
    ALL_CLASSES.splice(0, ALL_CLASSES.length, ...refreshed.items);
    setClasses(refreshed.items);
    setTotal(refreshed.total);

    navigate('/classes');
  }

  function handleEdit(updated: ClassItem) {
    setClasses((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  }

  useEffect(() => {
    let isMounted = true;

    async function loadClasses() {
      setLoading(true);
      setError('');

      try {
        const data = await fetchTeacherGroups();
        if (isMounted) {
          ALL_CLASSES.splice(0, ALL_CLASSES.length, ...data.items);
          setClasses(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        if (isMounted) {
          setClasses([]);
          setTotal(0);
          setError(err instanceof Error ? err.message : "Grupalarni yuklab bo'lmadi");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadClasses();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return classes.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
          !c.subject.toLowerCase().includes(search.toLowerCase())) return false;
      if (subjectF !== 'Barchasi' && c.subject !== subjectF) return false;
      if (countF === 'Kichik (<20)'   && c.students >= 20) return false;
      if (countF === "O'rta (20–30)"  && (c.students < 20 || c.students > 30)) return false;
      if (countF === 'Katta (>30)'    && c.students <= 30) return false;
      if (activityF !== 'Barchasi' && ACTIVITY_LEVEL_MAP[c.activityLevel] !== activityF) return false;
      return true;
    });
  }, [classes, search, subjectF, countF, activityF]);

  const hasFilter = search || subjectF !== 'Barchasi' || countF !== 'Barchasi' || activityF !== 'Barchasi';
  const subjectOptions = useMemo(
    () => ['Barchasi', ...Array.from(new Set(classes.map((c) => c.subject).filter(Boolean)))],
    [classes],
  );

  return (
    <>
      {/* ── Modals ── */}
      <CreateClassModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
      {editTarget && (
        <EditClassModal
          open={Boolean(editTarget)}
          cls={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}

      {/* ── Page header ── */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>Grupalar</h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMuted }}>Barcha grupalarni boshqaring va kuzating</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: t.textMuted }} />
          <input
            type="text" placeholder="Grupalarni qidiring..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 rounded-xl text-sm focus:outline-none transition-all"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textPrimary, height: '40px', boxShadow: t.shadowCard }}
            onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
            onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = t.border;  (e.target as HTMLElement).style.boxShadow = t.shadowCard; }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterSelect value={subjectF}  options={subjectOptions.length > 1 ? subjectOptions : SUBJECT_OPTIONS}  onChange={setSubjectF}  t={t} />
          <FilterSelect value={countF}    options={COUNT_OPTIONS}    onChange={setCountF}    t={t} />
          <FilterSelect value={activityF} options={ACTIVITY_OPTIONS} onChange={setActivityF} t={t} />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-semibold text-white transition-all shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', height: '40px', boxShadow: t.isDark ? '0 4px 16px rgba(99,102,241,0.3)' : '0 3px 12px rgba(99,102,241,0.22)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = t.isDark ? '0 6px 24px rgba(99,102,241,0.5)' : '0 5px 18px rgba(99,102,241,0.35)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = t.isDark ? '0 4px 16px rgba(99,102,241,0.3)' : '0 3px 12px rgba(99,102,241,0.22)'; }}
        >
          <Plus className="w-4 h-4" />
          <span>Grupa yaratish</span>
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}`, color: t.accent }}
        >
          <BookOpen className="w-3.5 h-3.5" />
          {loading ? 'Yuklanmoqda...' : `${total} grupa topildi`}
        </div>
        {hasFilter && (
          <button
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textMuted }}
            onClick={() => { setSearch(''); setSubjectF('Barchasi'); setCountF('Barchasi'); setActivityF('Barchasi'); }}
          >
            Filtrni tozalash ✕
          </button>
        )}
      </div>

      {/* ── Cards grid ── */}
      {loading ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
            <div className="w-7 h-7 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: '#6366F1' }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>Grupalar yuklanmoqda</p>
          <p className="text-xs" style={{ color: t.textMuted }}>Ro'yxat backenddan olinmoqda</p>
        </div>
      ) : error ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle className="w-8 h-8" style={{ color: '#EF4444' }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>Grupalarni yuklab bo'lmadi</p>
          <p className="text-xs" style={{ color: t.textMuted }}>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
            <BookOpen className="w-8 h-8" style={{ color: t.textMuted }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>Grupalar topilmadi</p>
          <p className="text-xs" style={{ color: t.textMuted }}>Qidiruv yoki filtr shartlarini o'zgartiring</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              t={t}
              onView={() => navigate(`/classes/${cls.id}`)}
              onEdit={() => setEditTarget(cls)}
              onMembers={() => navigate(`/classes/${cls.id}/members`)}
            />
          ))}
        </div>
      )}
    </>
  );
}

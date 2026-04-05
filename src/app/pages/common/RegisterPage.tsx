import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Eye, EyeOff, Sun, Moon, BookOpen, ArrowRight, ArrowLeft,
  Lock, User, AtSign, Check, ChevronRight, GraduationCap,
  Briefcase, Calculator, Atom, FlaskConical, Leaf, Globe,
  Languages, Landmark, MapPin, Monitor, BookMarked, Feather,
  Music, Palette, Dumbbell, AlertCircle,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
type Role = 'schoolboy' | 'teacher' | null;

interface Subject {
  id: number;
  label: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>;
  color: string;
  bg: string;
  border: string;
}

interface SubjectApiItem {
  id: number;
  name: string;
  type?: string;
  icon?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const SUBJECT_VISUALS = [
  { icon: Calculator, color: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)' },
  { icon: Atom, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  { icon: FlaskConical, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
  { icon: Leaf, color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
  { icon: MapPin, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  { icon: Landmark, color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  { icon: Languages, color: '#14B8A6', bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.3)' },
  { icon: Globe, color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.3)' },
  { icon: Monitor, color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
  { icon: BookMarked, color: '#EC4899', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.3)' },
  { icon: Music, color: '#A855F7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)' },
  { icon: Palette, color: '#F43F5E', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.3)' },
  { icon: Dumbbell, color: '#84CC16', bg: 'rgba(132,204,22,0.1)', border: 'rgba(132,204,22,0.3)' },
  { icon: Feather, color: '#64748B', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
];

function getSubjectVisual(name: string) {
  const normalized = name.trim().toLowerCase();

  if (normalized.includes('mat')) return SUBJECT_VISUALS[0];
  if (normalized.includes('fiz')) return SUBJECT_VISUALS[1];
  if (normalized.includes('kim')) return SUBJECT_VISUALS[2];
  if (normalized.includes('bio')) return SUBJECT_VISUALS[3];
  if (normalized.includes('geo')) return SUBJECT_VISUALS[4];
  if (normalized.includes('tarix')) return SUBJECT_VISUALS[5];
  if (normalized.includes('til')) return SUBJECT_VISUALS[6];
  if (normalized.includes('ingliz')) return SUBJECT_VISUALS[7];
  if (normalized.includes('informat')) return SUBJECT_VISUALS[8];
  if (normalized.includes('adab')) return SUBJECT_VISUALS[9];
  if (normalized.includes('musiq')) return SUBJECT_VISUALS[10];
  if (normalized.includes('tasvir') || normalized.includes('san')) return SUBJECT_VISUALS[11];
  if (normalized.includes('jism')) return SUBJECT_VISUALS[12];
  if (normalized.includes('insho')) return SUBJECT_VISUALS[13];

  return SUBJECT_VISUALS[name.length % SUBJECT_VISUALS.length];
}

function mapApiSubject(item: SubjectApiItem): Subject {
  return {
    id: item.id,
    label: item.name,
    ...getSubjectVisual(item.name),
  };
}

// ─────────────────────────────────────────────
//  Reusable helpers
// ─────────────────────────────────────────────
function BackgroundOrbs({ isDark }: { isDark: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute rounded-full" style={{
        width: 560, height: 560, top: -180, right: -160,
        background: isDark
          ? 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 68%)'
          : 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 68%)',
      }} />
      <div className="absolute rounded-full" style={{
        width: 440, height: 440, bottom: -130, left: -130,
        background: isDark
          ? 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 68%)'
          : 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 68%)',
      }} />
      <div className="absolute rounded-full" style={{
        width: 280, height: 280, top: '55%', left: '55%', transform: 'translate(-50%,-50%)',
        background: isDark
          ? 'radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(56,189,248,0.03) 0%, transparent 70%)',
      }} />
      <div className="absolute inset-0" style={{
        backgroundImage: isDark
          ? `linear-gradient(rgba(99,102,241,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.035) 1px,transparent 1px)`
          : `linear-gradient(rgba(99,102,241,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.025) 1px,transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────
//  Step progress indicator
// ─────────────────────────────────────────────
const STEP_LABELS = ['Shaxsiy ma\'lumot', 'Rol tanlash', 'Fanlar'];

function StepIndicator({ current }: { current: number }) {
  const { theme: t } = useTheme();
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const done   = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{
                  background: done
                    ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                    : active
                    ? 'linear-gradient(135deg, #6366F1, #4F46E5)'
                    : t.bgInner,
                  border: done
                    ? '1.5px solid rgba(34,197,94,0.4)'
                    : active
                    ? '1.5px solid rgba(99,102,241,0.5)'
                    : `1.5px solid ${t.border}`,
                  color: done || active ? '#fff' : t.textMuted,
                  boxShadow: active
                    ? '0 4px 14px rgba(99,102,241,0.35)'
                    : done
                    ? '0 4px 14px rgba(34,197,94,0.25)'
                    : 'none',
                }}
              >
                {done
                  ? <Check style={{ width: 15, height: 15 }} strokeWidth={2.5} />
                  : step
                }
              </div>
              <span
                className="text-xs font-medium whitespace-nowrap hidden sm:block"
                style={{ color: active ? '#6366F1' : done ? '#22C55E' : t.textMuted }}
              >
                {label}
              </span>
            </div>

            {/* Connector */}
            {i < STEP_LABELS.length - 1 && (
              <div
                className="transition-all duration-500 mx-2 mb-5 sm:mb-5"
                style={{
                  width: 48,
                  height: 2,
                  borderRadius: 9999,
                  background: done
                    ? 'linear-gradient(90deg, #22C55E, #6366F1)'
                    : `linear-gradient(90deg, ${t.border}, ${t.border})`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Shared input wrapper
// ─────────────────────────────────────────────
function FormInput({
  label, icon: Icon, type = 'text', value, onChange, placeholder,
  autoComplete, error, rightSlot,
}: {
  label: string;
  icon: React.FC<any>;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  error?: string;
  rightSlot?: React.ReactNode;
}) {
  const { theme: t } = useTheme();
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>
        {label}
      </label>
      <div className="relative">
        <Icon
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
          style={{
            width: 15, height: 15,
            color: hasError ? '#EF4444' : focused ? '#6366F1' : t.textMuted,
          }}
          strokeWidth={1.75}
        />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full pl-10 pr-4 rounded-xl text-sm focus:outline-none transition-all"
          style={{
            background: t.bgInner,
            border: `1.5px solid ${hasError ? 'rgba(239,68,68,0.6)' : focused ? '#6366F1' : t.border}`,
            color: t.textPrimary,
            height: 46,
            boxShadow: focused
              ? hasError
                ? '0 0 0 3px rgba(239,68,68,0.1)'
                : '0 0 0 3px rgba(99,102,241,0.12)'
              : 'none',
            paddingRight: rightSlot ? 44 : undefined,
          }}
        />
        {rightSlot && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {error && (
        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#EF4444' }}>
          <AlertCircle style={{ width: 11, height: 11 }} strokeWidth={2} />
          {error}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Step 1 — Personal info
// ─────────────────────────────────────────────
interface Step1Data {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  confirmPassword: string;
}

function Step1({
  data, onChange, errors,
}: {
  data: Step1Data;
  onChange: (d: Partial<Step1Data>) => void;
  errors: Partial<Record<keyof Step1Data, string>>;
}) {
  const { theme: t } = useTheme();
  const [showPass, setShowPass]    = useState(false);
  const [showConf, setShowConf]    = useState(false);

  const showBtn = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
      style={{ color: t.textMuted }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
    >
      {show
        ? <EyeOff style={{ width: 14, height: 14 }} strokeWidth={1.75} />
        : <Eye    style={{ width: 14, height: 14 }} strokeWidth={1.75} />
      }
    </button>
  );

  // Password strength
  const strength = (() => {
    const p = data.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)           s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[0-9]/.test(p))         s++;
    if (/[^A-Za-z0-9]/.test(p))  s++;
    return s;
  })();

  const strengthLabel = ['', 'Zaif', "O'rta", 'Yaxshi', 'Kuchli'][strength];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#22C55E', '#6366F1'][strength];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormInput
          label="Ism"
          icon={User}
          value={data.firstName}
          onChange={(v) => onChange({ firstName: v })}
          placeholder="Isming"
          autoComplete="given-name"
          error={errors.firstName}
        />
        <FormInput
          label="Familiya"
          icon={User}
          value={data.lastName}
          onChange={(v) => onChange({ lastName: v })}
          placeholder="Familiyangiz"
          autoComplete="family-name"
          error={errors.lastName}
        />
      </div>

      <FormInput
        label="Foydalanuvchi nomi"
        icon={AtSign}
        value={data.username}
        onChange={(v) => onChange({ username: v })}
        placeholder="username"
        autoComplete="username"
        error={errors.username}
      />

      <FormInput
        label="Parol"
        icon={Lock}
        type={showPass ? 'text' : 'password'}
        value={data.password}
        onChange={(v) => onChange({ password: v })}
        placeholder="Kamida 8 belgi"
        autoComplete="new-password"
        error={errors.password}
        rightSlot={showBtn(showPass, () => setShowPass((s) => !s))}
      />

      {/* Strength bar */}
      {data.password.length > 0 && (
        <div className="space-y-1.5 -mt-2">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full transition-all duration-300"
                style={{
                  background: i <= strength ? strengthColor : '#334155',
                  opacity: i <= strength ? 1 : 0.3,
                }}
              />
            ))}
          </div>
          {strength > 0 && (
            <p className="text-xs font-semibold" style={{ color: strengthColor }}>
              Parol kuchi: {strengthLabel}
            </p>
          )}
        </div>
      )}

      <FormInput
        label="Parolni tasdiqlang"
        icon={Lock}
        type={showConf ? 'text' : 'password'}
        value={data.confirmPassword}
        onChange={(v) => onChange({ confirmPassword: v })}
        placeholder="Parolni qayta kiriting"
        autoComplete="new-password"
        error={errors.confirmPassword}
        rightSlot={showBtn(showConf, () => setShowConf((s) => !s))}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
//  Step 2 — Role selection
// ─────────────────────────────────────────────
function Step2({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  const { theme: t } = useTheme();

  const roles = [
    {
      value: 'schoolboy' as Role,
      label: "O'quvchi",
      sub: "Testlar va darslarni ko'rish, topshiriqlarni bajarish",
      Icon: GraduationCap,
      color: '#22C55E',
      glow: 'rgba(34,197,94,0.3)',
      bg: 'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.35)',
      features: ['Testlarni yechish', 'Natijalarni ko\'rish', 'Reyting tahlili', 'Fanlar bo\'yicha statistika'],
    },
    {
      value: 'teacher' as Role,
      label: "O'qituvchi",
      sub: "Testlar yaratish, o'quvchilarni boshqarish, tahlil qilish",
      Icon: Briefcase,
      color: '#6366F1',
      glow: 'rgba(99,102,241,0.3)',
      bg: 'rgba(99,102,241,0.08)',
      border: 'rgba(99,102,241,0.35)',
      features: ['Test yaratish', "O'quvchilarni boshqarish", 'Klass ochish', 'Chuqur tahlil'],
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-center mb-6" style={{ color: t.textMuted }}>
        Tizimga qanday rol bilan kirmoqchisiz?
      </p>
      {roles.map((r) => {
        const active = role === r.value;
        const Icon = r.Icon;
        return (
          <button
            key={r.value as string}
            type="button"
            onClick={() => onChange(r.value)}
            className="w-full text-left rounded-2xl transition-all duration-200 p-5 group relative overflow-hidden"
            style={{
              background: active ? r.bg : t.bgInner,
              border: `2px solid ${active ? r.border : t.border}`,
              boxShadow: active ? `0 8px 28px ${r.glow}` : 'none',
              transform: active ? 'scale(1.01)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.borderColor = r.border;
                (e.currentTarget as HTMLElement).style.background = r.bg.replace('0.08', '0.04');
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.borderColor = t.border;
                (e.currentTarget as HTMLElement).style.background = t.bgInner;
              }
            }}
          >
            {/* Glow orb behind active */}
            {active && (
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${r.glow} 0%, transparent 70%)` }} />
            )}

            <div className="flex items-start gap-4 relative">
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: active ? r.bg : t.bgCard,
                  border: `1.5px solid ${active ? r.border : t.border}`,
                  boxShadow: active ? `0 4px 14px ${r.glow}` : 'none',
                }}
              >
                <Icon
                  style={{ width: 22, height: 22, color: active ? r.color : t.textMuted }}
                  strokeWidth={1.75}
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold" style={{ color: active ? r.color : t.textPrimary }}>
                    {r.label}
                  </h3>
                  {/* Radio */}
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all shrink-0"
                    style={{
                      borderColor: active ? r.color : t.border,
                      background: active ? r.color : 'transparent',
                    }}
                  >
                    {active && <Check style={{ width: 10, height: 10, color: '#fff' }} strokeWidth={3} />}
                  </div>
                </div>
                <p className="text-xs mb-3" style={{ color: t.textMuted }}>{r.sub}</p>
                <div className="flex flex-wrap gap-2">
                  {r.features.map((f) => (
                    <span
                      key={f}
                      className="text-xs px-2 py-0.5 rounded-lg font-medium"
                      style={{
                        background: active ? r.bg : t.bgCard,
                        color: active ? r.color : t.textMuted,
                        border: `1px solid ${active ? r.border : t.border}`,
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Step 3 — Subject selection
// ─────────────────────────────────────────────
function Step3({
  role, subjects, selected, onChange, isLoading,
}: {
  role: Role;
  subjects: Subject[];
  selected: number[];
  onChange: (ids: number[]) => void;
  isLoading: boolean;
}) {
  const { theme: t } = useTheme();
  const required = role === 'teacher' ? 1 : 2;
  const roleLabel = role === 'teacher' ? "O'qituvchi" : "O'quvchi";
  const accentColor = role === 'teacher' ? '#6366F1' : '#22C55E';
  const accentBg    = role === 'teacher' ? 'rgba(99,102,241,0.1)'  : 'rgba(34,197,94,0.1)';
  const accentBorder= role === 'teacher' ? 'rgba(99,102,241,0.3)'  : 'rgba(34,197,94,0.3)';

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      if (role === 'teacher') {
        // only 1 for teacher
        onChange([id]);
      } else {
        onChange([...selected, id]);
      }
    }
  }

  return (
    <div>
      {/* Hint */}
      <div
        className="flex items-center gap-3 p-3.5 rounded-xl mb-5"
        style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
        >
          <BookOpen style={{ width: 15, height: 15, color: accentColor }} strokeWidth={1.75} />
        </div>
        <p className="text-xs" style={{ color: accentColor }}>
          <span className="font-bold">{roleLabel}</span> sifatida{' '}
          <span className="font-bold">kamida {required} ta fan</span> tanlashingiz shart.
          {role === 'schoolboy' && ' Bir nechta fan tanlashingiz mumkin.'}
        </p>
      </div>

      {/* Counter badge */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>
          Fanlar ro'yxati
        </h3>
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
          style={{
            background: selected.length >= required ? 'rgba(34,197,94,0.12)' : t.bgInner,
            color: selected.length >= required ? '#22C55E' : t.textMuted,
            border: `1px solid ${selected.length >= required ? 'rgba(34,197,94,0.3)' : t.border}`,
          }}
        >
          {selected.length >= required
            ? <Check style={{ width: 11, height: 11 }} strokeWidth={3} />
            : null
          }
          {selected.length} / {role === 'teacher' ? '1' : `${required}+`} tanlandi
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${t.border} transparent` }}>
        {isLoading ? (
          <div className="col-span-2 text-sm py-10 text-center" style={{ color: t.textMuted }}>
            Fanlar yuklanmoqda...
          </div>
        ) : subjects.map((subj) => {
          const active = selected.includes(subj.id);
          const Icon = subj.icon;
          return (
            <button
              key={subj.id}
              type="button"
              onClick={() => toggle(subj.id)}
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 relative overflow-hidden"
              style={{
                background: active ? subj.bg : t.bgInner,
                border: `1.5px solid ${active ? subj.border : t.border}`,
                boxShadow: active ? `0 4px 14px ${subj.bg}` : 'none',
                transform: active ? 'scale(1.02)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.borderColor = subj.border;
                  (e.currentTarget as HTMLElement).style.background = subj.bg.replace('0.1', '0.05');
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.borderColor = t.border;
                  (e.currentTarget as HTMLElement).style.background = t.bgInner;
                }
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: active ? subj.bg : t.bgCard,
                  border: `1px solid ${active ? subj.border : t.border}`,
                }}
              >
                <Icon style={{ width: 14, height: 14, color: active ? subj.color : t.textMuted }} strokeWidth={1.75} />
              </div>
              <span className="text-xs font-semibold flex-1 truncate" style={{ color: active ? subj.color : t.textSecondary }}>
                {subj.label}
              </span>
              {active && (
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: subj.color }}
                >
                  <Check style={{ width: 9, height: 9, color: '#fff' }} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export function RegisterPage() {
  const { theme: t, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Step 1 state
  const [s1, setS1] = useState<Step1Data>({
    firstName: '', lastName: '', username: '', password: '', confirmPassword: '',
  });
  const [s1Errors, setS1Errors] = useState<Partial<Record<keyof Step1Data, string>>>({});

  // Step 2 state
  const [role, setRole] = useState<Role>(null);
  const [roleError, setRoleError] = useState('');

  // Step 3 state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsLoadError, setSubjectsLoadError] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [subjError, setSubjError] = useState('');

  // Clear subject error when selection changes
  useEffect(() => {
    if (subjError && selectedSubjects.length > 0) setSubjError('');
  }, [selectedSubjects, subjError]);

  useEffect(() => {
    let isMounted = true;

    async function loadSubjects() {
      setSubjectsLoading(true);
      setSubjectsLoadError('');

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/subject/list/`, {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Fanlar ro'yxatini olishda xatolik: ${response.status}`);
        }

        const data: SubjectApiItem[] = await response.json();
        if (isMounted) {
          setSubjects(data.map(mapApiSubject));
        }
      } catch (error) {
        if (isMounted) {
          setSubjectsLoadError(
            error instanceof Error ? error.message : "Fanlar ro'yxatini yuklab bo'lmadi",
          );
        }
      } finally {
        if (isMounted) {
          setSubjectsLoading(false);
        }
      }
    }

    loadSubjects();

    return () => {
      isMounted = false;
    };
  }, []);

  // Validate step 1
  function validateStep1(): boolean {
    const errs: Partial<Record<keyof Step1Data, string>> = {};
    if (!s1.firstName.trim())  errs.firstName        = 'Ism kiritilmadi';
    if (!s1.lastName.trim())   errs.lastName         = 'Familiya kiritilmadi';
    if (!s1.username.trim())   errs.username         = 'Foydalanuvchi nomi kiritilmadi';
    else if (s1.username.includes(' '))
      errs.username = "Bo'sh joy bo'lmasin";
    if (!s1.password)          errs.password         = 'Parol kiritilmadi';
    else if (s1.password.length < 8) errs.password   = "Kamida 8 ta belgi bo'lsin";
    if (!s1.confirmPassword)   errs.confirmPassword  = 'Parolni tasdiqlang';
    else if (s1.password !== s1.confirmPassword)
      errs.confirmPassword = "Parollar mos kelmadi";
    setS1Errors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleNext() {
    if (step === 1) {
      if (!validateStep1()) return;
      setSubmitError('');
      setStep(2);
    } else if (step === 2) {
      if (!role) { setRoleError('Iltimos, rol tanlang'); return; }
      setRoleError('');
      setSubmitError('');
      setStep(3);
    } else {
      // step 3 — submit
      if (subjectsLoading) {
        setSubjError('Fanlar hali yuklanmoqda');
        return;
      }
      if (subjectsLoadError) {
        setSubjError("Fanlar ro'yxati olinmagan. Qayta urinib ko'ring");
        return;
      }
      const required = role === 'teacher' ? 1 : 2;
      if (selectedSubjects.length < required) {
        setSubjError(`Kamida ${required} ta fan tanlang`);
        return;
      }

      if (!role) {
        setRoleError('Iltimos, rol tanlang');
        return;
      }

      setSubjError('');
      setSubmitError('');
      setLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/register/`, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: s1.username.trim(),
            password: s1.password,
            first_name: s1.firstName.trim(),
            last_name: s1.lastName.trim(),
            subjects: selectedSubjects.map((id) => ({ id })),
            role,
          }),
        });

        if (response.status !== 201) {
          let message = "Ro'yxatdan o'tishda xatolik yuz berdi";

          try {
            const errorData = await response.json();
            if (typeof errorData?.detail === 'string') {
              message = errorData.detail;
            } else if (typeof errorData?.message === 'string') {
              message = errorData.message;
            } else if (typeof errorData === 'object' && errorData !== null) {
              const firstValue = Object.values(errorData)[0];
              if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') {
                message = firstValue[0];
              }
            }
          } catch {
            message = `Ro'yxatdan o'tishda xatolik: ${response.status}`;
          }

          throw new Error(message);
        }

        setSubmitted(true);
        setTimeout(() => navigate('/login'), 1600);
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Ro'yxatdan o'tishni yakunlab bo'lmadi",
        );
      } finally {
        setLoading(false);
      }
    }
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" style={{ background: t.bgBase }}>
        <BackgroundOrbs isDark={t.isDark} />
        <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              boxShadow: '0 12px 36px rgba(34,197,94,0.4)',
            }}
          >
            <Check style={{ width: 36, height: 36, color: '#fff' }} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: t.textPrimary }}>Muvaffaqiyatli!</h2>
          <p className="text-sm max-w-xs" style={{ color: t.textMuted }}>
            Ro'yxatdan o'tdingiz. Tizimga yo'naltirilmoqda...
          </p>
          <div className="w-12 h-12 rounded-full border-4 animate-spin"
            style={{ borderColor: 'rgba(99,102,241,0.2)', borderTopColor: '#6366F1' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative py-8 px-4" style={{ background: t.bgBase }}>
      <BackgroundOrbs isDark={t.isDark} />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-5 right-5 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textMuted, boxShadow: t.shadowCard }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6366F1'; (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
      >
        {t.isDark
          ? <Sun  style={{ width: 17, height: 17 }} strokeWidth={1.75} />
          : <Moon style={{ width: 17, height: 17 }} strokeWidth={1.75} />
        }
      </button>

      <div className="relative z-10 w-full" style={{ maxWidth: 480 }}>
        {/* ── Card ── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: t.bgCard,
            border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.2)' : t.border}`,
            boxShadow: t.isDark
              ? '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.08)'
              : '0 24px 64px rgba(15,23,42,0.12), 0 1px 3px rgba(15,23,42,0.06)',
          }}
        >
          {/* Top accent bar */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#6366F1 0%,#8B5CF6 50%,#3B82F6 100%)' }} />

          <div className="px-7 pt-7 pb-7">

            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="w-13 h-13 rounded-2xl flex items-center justify-center mb-3"
                style={{
                  width: 52, height: 52,
                  background: t.isDark
                    ? 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.15))'
                    : 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))',
                  border: `1.5px solid ${t.isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.2)'}`,
                  boxShadow: t.isDark ? '0 8px 28px rgba(99,102,241,0.22)' : '0 4px 14px rgba(99,102,241,0.1)',
                }}
              >
                <BookOpen style={{ width: 24, height: 24, color: '#6366F1' }} strokeWidth={1.75} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: t.textPrimary }}>Ro'yxatdan o'tish</h1>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>EduPanel — O'qituvchi boshqaruv tizimi</p>
            </div>

            {/* Step indicator */}
            <StepIndicator current={step} />

            {/* Step title */}
            <div className="mb-5">
              <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
                {step === 1 && 'Shaxsiy ma\'lumotlar'}
                {step === 2 && 'Rolni tanlang'}
                {step === 3 && 'Fanlarni tanlang'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                {step === 1 && 'Asosiy ma\'lumotlaringizni kiriting'}
                {step === 2 && 'Tizimga qanday foydalanuvchi sifatida kirishni belgilang'}
                {step === 3 && (role === 'teacher'
                  ? "O'qitadigan faningizni tanlang (1 ta)"
                  : "O'qiydigan fanlaringizni tanlang (kamida 2 ta)")}
              </p>
            </div>

            {/* ── Step content ── */}
            <div>
              {step === 1 && (
                <Step1
                  data={s1}
                  onChange={(d) => setS1((prev) => ({ ...prev, ...d }))}
                  errors={s1Errors}
                />
              )}
              {step === 2 && (
                <>
                  <Step2 role={role} onChange={(r) => { setRole(r); setRoleError(''); }} />
                  {roleError && (
                    <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#EF4444' }}>
                      <AlertCircle style={{ width: 12, height: 12 }} strokeWidth={2} />
                      {roleError}
                    </p>
                  )}
                </>
              )}
              {step === 3 && (
                <>
                  <Step3
                    role={role}
                    subjects={subjects}
                    selected={selectedSubjects}
                    onChange={setSelectedSubjects}
                    isLoading={subjectsLoading}
                  />
                  {subjectsLoadError && (
                    <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#EF4444' }}>
                      <AlertCircle style={{ width: 12, height: 12 }} strokeWidth={2} />
                      {subjectsLoadError}
                    </p>
                  )}
                  {subjError && (
                    <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#EF4444' }}>
                      <AlertCircle style={{ width: 12, height: 12 }} strokeWidth={2} />
                      {subjError}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* ── Navigation buttons ── */}
            <div className={`flex gap-3 mt-6 ${step === 1 ? '' : ''}`}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    height: 48,
                    width: 48,
                    flexShrink: 0,
                    background: t.bgInner,
                    border: `1.5px solid ${t.border}`,
                    color: t.textSecondary,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6366F1'; (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}
                >
                  <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{
                  height: 48,
                  background: loading
                    ? (t.isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)')
                    : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  boxShadow: loading ? 'none' : (t.isDark ? '0 6px 24px rgba(99,102,241,0.4)' : '0 4px 16px rgba(99,102,241,0.3)'),
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = t.isDark
                      ? '0 8px 32px rgba(99,102,241,0.55)'
                      : '0 6px 22px rgba(99,102,241,0.42)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = loading
                    ? 'none'
                    : (t.isDark ? '0 6px 24px rgba(99,102,241,0.4)' : '0 4px 16px rgba(99,102,241,0.3)');
                }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saqlanmoqda...
                  </>
                ) : step < 3 ? (
                  <>
                    Davom etish
                    <ChevronRight style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                  </>
                ) : (
                  <>
                    Ro'yxatdan o'tish
                    <ArrowRight style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>

            {submitError && (
              <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#EF4444' }}>
                <AlertCircle style={{ width: 12, height: 12 }} strokeWidth={2} />
                {submitError}
              </p>
            )}

            {/* Login link */}
            <p className="text-center text-xs mt-5" style={{ color: t.textMuted }}>
              Hisobingiz bormi?{' '}
              <Link
                to="/login"
                className="font-semibold transition-colors"
                style={{ color: '#6366F1' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#4F46E5'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
              >
                Kirish
              </Link>
            </p>
          </div>
        </div>

        {/* Decorative dots */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step - 1 ? 24 : 6,
                height: 6,
                background: i === step - 1 ? '#6366F1' : t.border,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

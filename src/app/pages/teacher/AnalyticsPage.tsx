import { useState } from 'react';
import {
  TrendingUp, TrendingDown, Users, FileText,
  Target, AlertTriangle, BarChart2, BookOpen,
  Zap, ChevronRight,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';

// ─────────────────────────────────────────────
//  Data
// ─────────────────────────────────────────────
const SUBJECT_PERF = [
  { subject: 'Matematika', short: 'Mat',  avgScore: 78, tests: 24, color: '#6366F1' },
  { subject: 'Fizika',     short: 'Fiz',  avgScore: 65, tests: 18, color: '#3B82F6' },
  { subject: 'Kimyo',      short: 'Kim',  avgScore: 72, tests: 14, color: '#8B5CF6' },
  { subject: 'Biologiya',  short: 'Bio',  avgScore: 82, tests: 12, color: '#22C55E' },
  { subject: 'Algebra',    short: 'Alg',  avgScore: 70, tests: 16, color: '#14B8A6' },
];

const WEAK_TOPICS = [
  { topic: 'Elektr toki',           subject: 'Fizika',     mistakes: 34, pct: 100 },
  { topic: 'Kvadrat tenglamalar',   subject: 'Matematika', mistakes: 27, pct: 79  },
  { topic: 'Kimyoviy bog\'lanish',  subject: 'Kimyo',      mistakes: 21, pct: 62  },
  { topic: 'Nyuton qonunlari',      subject: 'Fizika',     mistakes: 18, pct: 53  },
  { topic: 'Organik kimyo',         subject: 'Kimyo',      mistakes: 15, pct: 44  },
  { topic: 'Hujayra tuzilishi',     subject: 'Biologiya',  mistakes: 11, pct: 32  },
];

const WEEKLY_PROGRESS = [
  { week: '1-hafta',  score: 62 },
  { week: '2-hafta',  score: 68 },
  { week: '3-hafta',  score: 71 },
  { week: '4-hafta',  score: 69 },
  { week: '5-hafta',  score: 75 },
  { week: '6-hafta',  score: 78 },
];

const SUBJECT_BREAKDOWN = [
  { subject: 'Matematika', avgScore: 78, tests: 24, students: 68, trend: +5  },
  { subject: 'Fizika',     avgScore: 65, tests: 18, students: 34, trend: -2  },
  { subject: 'Kimyo',      avgScore: 59, tests: 14, students: 38, trend: +8  },
  { subject: 'Biologiya',  avgScore: 82, tests: 12, students: 31, trend: +3  },
];

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return               { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  };
}

// ─────────────────────────────────────────────
//  Card
// ─────────────────────────────────────────────
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

function CardHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ElementType }) {
  const { theme: t } = useTheme();
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{subtitle}</p>}
      </div>
      {Icon && (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
          <Icon className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Summary KPI cards
// ─────────────────────────────────────────────
function SummaryCards() {
  const { theme: t } = useTheme();
  const items = [
    {
      Icon: Target,       label: "O'rtacha ball",       value: '74%',  sub: "+3% o'tgan oyga",
      color: '#6366F1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)',  up: true,
    },
    {
      Icon: FileText,     label: "Yakunlangan testlar", value: '68',   sub: '+12 bu oy',
      color: '#3B82F6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  up: true,
    },
    {
      Icon: Users,        label: "Faol o'quvchilar",    value: '89',   sub: '72% faollik',
      color: '#22C55E', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   up: true,
    },
    {
      Icon: AlertTriangle,label: 'Zaif mavzular',       value: '8',    sub: 'Diqqat talab etadi',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', up: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
      {items.map(({ Icon, label, value, sub, color, bg, border, up }) => (
        <Card key={label}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.75} />
            </div>
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg"
              style={{
                background: up ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
                color:      up ? '#22C55E' : '#F59E0B',
                border:    `1px solid ${up ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
              }}
            >
              {up ? <TrendingUp className="w-3 h-3" strokeWidth={2} /> : <AlertTriangle className="w-3 h-3" strokeWidth={2} />}
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: t.textPrimary }}>{value}</p>
          <p className="text-xs mt-0.5 leading-snug" style={{ color: t.textMuted }}>{label}</p>
          <p className="text-xs mt-1.5 font-semibold" style={{ color: up ? '#22C55E' : '#F59E0B' }}>{sub}</p>
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Subject Performance — vertical bar chart
// ─────────────────────────────────────────────
function SubjectPerformanceCard() {
  const { theme: t } = useTheme();
  const [hovered, setHovered] = useState<string | null>(null);
  const CHART_H = 160;

  return (
    <Card>
      <CardHeader title="Fan bo'yicha natijalar" subtitle="Har bir fan bo'yicha o'rtacha ball" icon={BarChart2} />

      {/* Chart */}
      <div className="flex items-end justify-between gap-2 sm:gap-3 mb-3" style={{ height: CHART_H }}>
        {SUBJECT_PERF.map((s) => {
          const isHov = hovered === s.subject;
          const sc = scoreColor(s.avgScore);
          const barH = (s.avgScore / 100) * CHART_H;

          return (
            <div
              key={s.subject}
              className="flex-1 flex flex-col items-center justify-end gap-1 h-full cursor-default"
              onMouseEnter={() => setHovered(s.subject)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Score label on hover */}
              <div
                className="text-xs font-bold transition-all duration-200"
                style={{
                  color:   isHov ? s.color : 'transparent',
                  opacity: isHov ? 1 : 0,
                  transform: isHov ? 'translateY(0)' : 'translateY(4px)',
                }}
              >
                {s.avgScore}%
              </div>

              {/* Bar */}
              <div
                className="w-full rounded-t-lg transition-all duration-300 relative overflow-hidden"
                style={{
                  height:  barH,
                  background: isHov ? s.color : (t.isDark ? `${s.color}90` : `${s.color}70`),
                  minHeight: 6,
                  boxShadow: isHov ? `0 -4px 14px ${s.color}50` : 'none',
                }}
              >
                {/* shimmer */}
                {isHov && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(180deg,rgba(255,255,255,0.2) 0%,transparent 100%)',
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <span className="text-xs mt-1 text-center" style={{ color: isHov ? t.textPrimary : t.textMuted }}>
                {s.short}
              </span>
            </div>
          );
        })}
      </div>

      {/* Horizontal score line reference */}
      <div className="space-y-2 mt-4">
        {SUBJECT_PERF.map((s) => {
          const sc = scoreColor(s.avgScore);
          return (
            <div key={s.subject} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-xs w-24 shrink-0" style={{ color: t.textSecondary }}>{s.subject}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: t.bgInner }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${s.avgScore}%`, background: sc.color, opacity: t.isDark ? 0.85 : 0.7 }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums w-9 text-right shrink-0" style={{ color: sc.color }}>
                {s.avgScore}%
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Topic Weakness — horizontal bar list
// ─────────────────────────────────────────────
function TopicWeaknessCard() {
  const { theme: t } = useTheme();

  return (
    <Card>
      <CardHeader
        title="Zaif mavzular"
        subtitle="O'quvchilar ko'p xato qilgan mavzular"
        icon={AlertTriangle}
      />

      <div className="space-y-3">
        {WEAK_TOPICS.map((item, idx) => {
          const isTop = idx === 0;
          const isHigh = item.pct >= 70;
          const isMed  = item.pct >= 40 && item.pct < 70;
          const color  = isHigh ? '#EF4444' : isMed ? '#F59E0B' : '#6366F1';
          const bg     = isHigh ? 'rgba(239,68,68,0.08)'   : isMed ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.06)';
          const border = isHigh ? 'rgba(239,68,68,0.2)'    : isMed ? 'rgba(245,158,11,0.2)'  : 'rgba(99,102,241,0.15)';

          return (
            <div
              key={item.topic}
              className="p-3 rounded-xl transition-all duration-200 group"
              style={{ background: bg, border: `1px solid ${border}` }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {isTop && (
                      <span
                        className="text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
                      >
                        #1
                      </span>
                    )}
                    <span className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                      {item.topic}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: t.textMuted }}>{item.subject}</span>
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0"
                  style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
                >
                  {item.mistakes} xato
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${item.pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Class Progress — SVG line chart
// ─────────────────────────────────────────────
function ClassProgressCard() {
  const { theme: t } = useTheme();
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  const W = 420;
  const H = 140;
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minVal = 55;
  const maxVal = 85;

  const pts = WEEKLY_PROGRESS.map((d, i) => ({
    x: PAD.left + (i / (WEEKLY_PROGRESS.length - 1)) * chartW,
    y: PAD.top + chartH - ((d.score - minVal) / (maxVal - minVal)) * chartH,
    ...d,
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M ${pts[0].x} ${PAD.top + chartH}`,
    ...pts.map((p) => `L ${p.x} ${p.y}`),
    `L ${pts[pts.length - 1].x} ${PAD.top + chartH}`,
    'Z',
  ].join(' ');

  const gridLines = [60, 70, 80];

  return (
    <Card>
      <CardHeader
        title="Sinf natijalar grafigi"
        subtitle="Haftalar bo'yicha o'rtacha ball tendensiyasi"
        icon={TrendingUp}
      />

      {/* Stats strip */}
      <div className="flex gap-4 mb-5">
        {[
          { label: 'Boshlang\'ich', val: `${WEEKLY_PROGRESS[0].score}%`, color: '#6366F1' },
          { label: 'Hozirgi',      val: `${WEEKLY_PROGRESS[WEEKLY_PROGRESS.length - 1].score}%`, color: '#22C55E' },
          { label: "O'sish",       val: `+${WEEKLY_PROGRESS[WEEKLY_PROGRESS.length - 1].score - WEEKLY_PROGRESS[0].score}%`, color: '#22C55E' },
        ].map(({ label, val, color }) => (
          <div key={label}>
            <p className="text-xs" style={{ color: t.textMuted }}>{label}</p>
            <p className="text-lg font-bold" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* SVG chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 280 }}
          onMouseLeave={() => setHovIdx(null)}
        >
          <defs>
            <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#6366F1" stopOpacity={t.isDark ? 0.3 : 0.2} />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map((val) => {
            const y = PAD.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
            return (
              <g key={val}>
                <line
                  x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
                  stroke={t.border} strokeWidth={1} strokeDasharray="4 3"
                />
                <text
                  x={PAD.left - 6} y={y + 4}
                  textAnchor="end" fontSize={9}
                  fill={t.textMuted}
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#progressGrad)" />

          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="#6366F1"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points + hover targets */}
          {pts.map((p, i) => (
            <g key={p.week}>
              {/* hover target */}
              <rect
                x={i === 0 ? PAD.left : (pts[i - 1].x + p.x) / 2}
                y={PAD.top}
                width={
                  i === 0
                    ? (pts[1].x - pts[0].x) / 2
                    : i === pts.length - 1
                    ? (p.x - pts[i - 1].x) / 2
                    : (pts[i + 1].x - pts[i - 1].x) / 2
                }
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setHovIdx(i)}
              />

              {/* Vertical hover line */}
              {hovIdx === i && (
                <line
                  x1={p.x} y1={PAD.top} x2={p.x} y2={PAD.top + chartH}
                  stroke="#6366F1" strokeWidth={1} strokeDasharray="3 3" opacity={0.5}
                />
              )}

              {/* Circle */}
              <circle
                cx={p.x} cy={p.y}
                r={hovIdx === i ? 5 : 3.5}
                fill={hovIdx === i ? '#6366F1' : t.bgCard}
                stroke="#6366F1"
                strokeWidth={2}
                style={{ transition: 'r 0.15s' }}
              />

              {/* Tooltip */}
              {hovIdx === i && (
                <g>
                  <rect
                    x={p.x - 28} y={p.y - 28}
                    width={56} height={20}
                    rx={5} ry={5}
                    fill={t.isDark ? '#1E293B' : '#fff'}
                    stroke="#6366F1"
                    strokeWidth={1}
                    filter="drop-shadow(0 2px 6px rgba(0,0,0,0.15))"
                  />
                  <text
                    x={p.x} y={p.y - 14}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill="#6366F1"
                  >
                    {p.score}%
                  </text>
                </g>
              )}

              {/* X-axis label */}
              <text
                x={p.x} y={H - 4}
                textAnchor="middle"
                fontSize={9}
                fill={t.textMuted}
              >
                {p.week.replace('-hafta', 'H')}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Subject Detail table
// ─────────────────────────────────────────────
function SubjectDetailCard() {
  const { theme: t } = useTheme();

  return (
    <Card>
      <CardHeader
        title="Fanlar tahlili"
        subtitle="Har bir fan bo'yicha batafsil ko'rsatkichlar"
        icon={BookOpen}
      />

      {/* Desktop */}
      <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
              {['Fan', "O'rtacha ball", 'Testlar', "O'quvchilar", "O'zgarish"].map((h, i) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: t.textMuted }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUBJECT_BREAKDOWN.map((s, idx) => {
              const sc = scoreColor(s.avgScore);
              const up = s.trend > 0;
              return (
                <tr
                  key={s.subject}
                  className="transition-colors cursor-default"
                  style={{ borderBottom: idx < SUBJECT_BREAKDOWN.length - 1 ? `1px solid ${t.border}` : 'none' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{s.subject}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-lg"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                      >
                        {s.avgScore}%
                      </span>
                      <div className="w-16 h-1.5 rounded-full overflow-hidden hidden md:block" style={{ background: t.bgInner }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${s.avgScore}%`, background: sc.color, opacity: 0.65 }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm" style={{ color: t.textSecondary }}>{s.tests} ta</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm" style={{ color: t.textSecondary }}>{s.students} ta</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                      style={{
                        background: up ? 'rgba(34,197,94,0.08)'  : 'rgba(239,68,68,0.08)',
                        color:      up ? '#22C55E'                : '#EF4444',
                        border:    `1px solid ${up ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      }}
                    >
                      {up
                        ? <TrendingUp className="w-3 h-3" strokeWidth={2} />
                        : <TrendingDown className="w-3 h-3" strokeWidth={2} />}
                      {up ? '+' : ''}{s.trend}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="block sm:hidden space-y-3">
        {SUBJECT_BREAKDOWN.map((s) => {
          const sc = scoreColor(s.avgScore);
          const up = s.trend > 0;
          return (
            <div key={s.subject} className="p-3.5 rounded-xl" style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>{s.subject}</span>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-lg"
                  style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                >
                  {s.avgScore}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden mb-2" style={{ background: t.border }}>
                <div className="h-1.5 rounded-full" style={{ width: `${s.avgScore}%`, background: sc.color, opacity: 0.65 }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: t.textMuted }}>
                  {s.tests} test · {s.students} o'quvchi
                </span>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: up ? '#22C55E' : '#EF4444' }}
                >
                  {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {up ? '+' : ''}{s.trend}%
                </span>
              </div>
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
export function AnalyticsPage() {
  const { theme: t } = useTheme();

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.25)' }}
          >
            <BarChart2 className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
            Tahlil
          </h1>
        </div>
        <p className="text-xs sm:text-sm mt-1 ml-12" style={{ color: t.textMuted }}>
          Sinf natijalarini kuzating va o'quv zaifliklarini aniqlang.
        </p>
      </div>

      {/* ── Summary KPI cards ── */}
      <SummaryCards />

      {/* ── Charts row: Subject Performance + Topic Weakness ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
        <SubjectPerformanceCard />
        <TopicWeaknessCard />
      </div>

      {/* ── Progress chart (full width) ── */}
      <div className="mb-4 sm:mb-5">
        <ClassProgressCard />
      </div>

      {/* ── Subject detail table ── */}
      <SubjectDetailCard />
    </>
  );
}

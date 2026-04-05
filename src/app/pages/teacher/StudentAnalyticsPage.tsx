import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, TrendingUp, FileText, Zap,
  ChevronRight, Search, Target, Activity,
  CalendarDays, Award, Clock, ArrowUpRight,
  BarChart2,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';

// ─────────────────────────────────────────────
//  Data
// ─────────────────────────────────────────────
const PERFORMANCE_TREND = [
  { label: 'Yan',  score: 60 },
  { label: 'Fev',  score: 68 },
  { label: 'Mar',  score: 74 },
  { label: 'Apr',  score: 71 },
  { label: 'May',  score: 76 },
  { label: 'Iyn',  score: 80 },
  { label: 'Iyl',  score: 78 },
  { label: 'Avg',  score: 83 },
];

const WEEKLY_ACTIVITY = [
  { week: '1-H', tests: 12 },
  { week: '2-H', tests: 18 },
  { week: '3-H', tests: 22 },
  { week: '4-H', tests: 15 },
  { week: '5-H', tests: 25 },
  { week: '6-H', tests: 28 },
  { week: '7-H', tests: 20 },
  { week: '8-H', tests: 32 },
];

const AVATAR_COLORS = [
  '#6366F1','#3B82F6','#22C55E','#F59E0B','#EF4444',
  '#8B5CF6','#0891B2','#D97706','#059669','#EC4899',
  '#14B8A6','#F97316',
];

const STUDENTS = [
  { id: 1,  name: 'Ali Karimov',        initials: 'AK', classGroup: '9-A',           avgScore: 88, testsCompleted: 34, lastActivity: '2 soat oldin',   trend: +4  },
  { id: 2,  name: 'Malika Yusupova',    initials: 'MY', classGroup: '10-B',          avgScore: 62, testsCompleted: 27, lastActivity: 'Kecha',           trend: -3  },
  { id: 3,  name: 'Jasur Toshmatov',    initials: 'JT', classGroup: 'Fizika guruhi', avgScore: 45, testsCompleted: 19, lastActivity: '3 kun oldin',     trend: +2  },
  { id: 4,  name: 'Nilufar Rahimova',   initials: 'NR', classGroup: '9-A',           avgScore: 91, testsCompleted: 41, lastActivity: '1 soat oldin',    trend: +7  },
  { id: 5,  name: 'Bobur Saidov',       initials: 'BS', classGroup: '10-B',          avgScore: 73, testsCompleted: 30, lastActivity: 'Kecha',           trend: +1  },
  { id: 6,  name: 'Zulfiya Norova',     initials: 'ZN', classGroup: 'Fizika guruhi', avgScore: 38, testsCompleted: 14, lastActivity: '1 hafta oldin',   trend: -5  },
  { id: 7,  name: 'Sardor Mirzayev',    initials: 'SM', classGroup: '9-A',           avgScore: 79, testsCompleted: 36, lastActivity: '3 soat oldin',    trend: +3  },
  { id: 8,  name: 'Dildora Hasanova',   initials: 'DH', classGroup: '10-B',          avgScore: 55, testsCompleted: 22, lastActivity: '2 kun oldin',     trend: -1  },
  { id: 9,  name: 'Ulugbek Qodirov',    initials: 'UQ', classGroup: 'Fizika guruhi', avgScore: 82, testsCompleted: 38, lastActivity: '30 daqiqa oldin', trend: +6  },
  { id: 10, name: 'Mohira Sultanova',   initials: 'MS', classGroup: '9-A',           avgScore: 67, testsCompleted: 25, lastActivity: 'Kecha',           trend: -2  },
  { id: 11, name: 'Firdavs Nazarov',    initials: 'FN', classGroup: '10-B',          avgScore: 94, testsCompleted: 45, lastActivity: '1 soat oldin',    trend: +9  },
  { id: 12, name: 'Shahnoza Ergasheva', initials: 'SE', classGroup: 'Fizika guruhi', avgScore: 42, testsCompleted: 16, lastActivity: '5 kun oldin',     trend: -4  },
];

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return               { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  };
}

const avgScore   = Math.round(STUDENTS.reduce((s, x) => s + x.avgScore, 0) / STUDENTS.length);
const totalTests = STUDENTS.reduce((s, x) => s + x.testsCompleted, 0);
const activeNow  = STUDENTS.filter((s) => s.lastActivity.includes('soat') || s.lastActivity.includes('daqiqa')).length;

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

// ─────────────────────────────────────────────
//  KPI cards
// ─────────────────────────────────────────────
function KpiCards() {
  const { theme: t } = useTheme();
  const sc = scoreColor(avgScore);

  const items = [
    {
      Icon: Target,   label: "O'rtacha ball",        value: `${avgScore}%`,
      color: '#6366F1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)',
      sub: '+5% o\'tgan oyga', subUp: true,
    },
    {
      Icon: Users,    label: "Jami o'quvchilar",     value: `${STUDENTS.length}`,
      color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)',
      sub: '3 ta sinf', subUp: true,
    },
    {
      Icon: FileText, label: 'Yakunlangan testlar',  value: `${totalTests}`,
      color: '#22C55E', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)',
      sub: '+28 bu hafta', subUp: true,
    },
    {
      Icon: Zap,      label: 'Faol (bugun)',          value: `${activeNow}`,
      color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',
      sub: `${Math.round((activeNow / STUDENTS.length) * 100)}% faollik`, subUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
      {items.map(({ Icon, label, value, color, bg, border, sub, subUp }) => (
        <Card key={label}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: bg, border: `1px solid ${border}` }}
            >
              <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.75} />
            </div>
            <span
              className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-lg shrink-0"
              style={{
                background: subUp ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                color:      subUp ? '#22C55E' : '#EF4444',
              }}
            >
              <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: t.textPrimary }}>{value}</p>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{label}</p>
          <p className="text-xs mt-1.5 font-semibold" style={{ color: subUp ? '#22C55E' : '#EF4444' }}>{sub}</p>
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Performance Trend — SVG line chart
// ─────────────────────────────────────────────
function PerformanceTrendCard() {
  const { theme: t } = useTheme();
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  const W = 500, H = 180;
  const PAD = { top: 20, right: 20, bottom: 36, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const minV = 50, maxV = 90;

  const pts = PERFORMANCE_TREND.map((d, i) => ({
    x: PAD.left + (i / (PERFORMANCE_TREND.length - 1)) * chartW,
    y: PAD.top + chartH - ((d.score - minV) / (maxV - minV)) * chartH,
    ...d,
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M ${pts[0].x} ${PAD.top + chartH}`,
    ...pts.map((p) => `L ${p.x} ${p.y}`),
    `L ${pts[pts.length - 1].x} ${PAD.top + chartH}`,
    'Z',
  ].join(' ');

  const gridVals = [60, 70, 80];
  const firstScore = PERFORMANCE_TREND[0].score;
  const lastScore  = PERFORMANCE_TREND[PERFORMANCE_TREND.length - 1].score;
  const delta      = lastScore - firstScore;

  return (
    <Card className="lg:col-span-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>Natijalar tendensiyasi</h3>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Oylar bo'yicha o'rtacha ball o'zgarishi</p>
        </div>
        {/* Mini stats */}
        <div className="flex items-center gap-4 shrink-0">
          {[
            { label: 'Boshlang\'ich', val: `${firstScore}%`, color: t.textMuted },
            { label: 'Hozirgi',      val: `${lastScore}%`,  color: '#22C55E'   },
            { label: "O'sish",       val: `+${delta}%`,     color: '#22C55E'   },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center">
              <p className="text-xs" style={{ color: t.textMuted }}>{label}</p>
              <p className="text-sm font-bold" style={{ color }}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SVG */}
      <div className="w-full overflow-x-auto" onMouseLeave={() => setHovIdx(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#6366F1" stopOpacity={t.isDark ? 0.35 : 0.18} />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {gridVals.map((v) => {
            const y = PAD.top + chartH - ((v - minV) / (maxV - minV)) * chartH;
            return (
              <g key={v}>
                <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
                  stroke={t.border} strokeWidth={1} strokeDasharray="4 3" />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={9} fill={t.textMuted}>{v}%</text>
              </g>
            );
          })}

          {/* Area */}
          <path d={areaPath} fill="url(#trendGrad)" />

          {/* Line */}
          <polyline points={polyline} fill="none" stroke="#6366F1"
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          {/* Points + hover */}
          {pts.map((p, i) => (
            <g key={p.label}>
              <rect
                x={i === 0 ? PAD.left : (pts[i - 1].x + p.x) / 2}
                y={PAD.top} height={chartH}
                width={
                  i === 0
                    ? (pts[1].x - pts[0].x) / 2
                    : i === pts.length - 1
                    ? (p.x - pts[i - 1].x) / 2
                    : (pts[i + 1].x - pts[i - 1].x) / 2
                }
                fill="transparent"
                onMouseEnter={() => setHovIdx(i)}
              />
              {hovIdx === i && (
                <line x1={p.x} y1={PAD.top} x2={p.x} y2={PAD.top + chartH}
                  stroke="#6366F1" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
              )}
              <circle cx={p.x} cy={p.y} r={hovIdx === i ? 5.5 : 3.5}
                fill={hovIdx === i ? '#6366F1' : t.bgCard}
                stroke="#6366F1" strokeWidth={2}
                style={{ transition: 'r 0.15s, fill 0.15s' }} />
              {hovIdx === i && (
                <g>
                  <rect x={p.x - 30} y={p.y - 30} width={60} height={22} rx={6}
                    fill={t.isDark ? '#1E293B' : '#fff'}
                    stroke="#6366F1" strokeWidth={1}
                    filter="drop-shadow(0 2px 8px rgba(0,0,0,0.15))" />
                  <text x={p.x} y={p.y - 15} textAnchor="middle"
                    fontSize={11} fontWeight={700} fill="#6366F1">
                    {p.score}%
                  </text>
                </g>
              )}
              <text x={p.x} y={H - 4} textAnchor="middle" fontSize={9} fill={t.textMuted}>{p.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Average Score — radial / big metric card
// ─────────────────────────────────────────────
function AverageScoreCard() {
  const { theme: t } = useTheme();
  const sc = scoreColor(avgScore);

  // SVG donut
  const R = 52, stroke = 10;
  const circ = 2 * Math.PI * R;
  const dashArr = (avgScore / 100) * circ;

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>O'rtacha ball</h3>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Barcha o'quvchilar bo'yicha</p>
        </div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
          <Award className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
        </div>
      </div>

      {/* Donut chart */}
      <div className="flex flex-col items-center justify-center flex-1 py-2">
        <div className="relative">
          <svg width={130} height={130} viewBox="0 0 130 130">
            {/* Track */}
            <circle
              cx={65} cy={65} r={R}
              fill="none"
              stroke={t.bgInner}
              strokeWidth={stroke}
            />
            {/* Progress */}
            <circle
              cx={65} cy={65} r={R}
              fill="none"
              stroke={sc.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dashArr} ${circ}`}
              strokeDashoffset={circ / 4}
              style={{ filter: `drop-shadow(0 0 6px ${sc.color}60)` }}
            />
            {/* Center text */}
            <text x={65} y={60} textAnchor="middle" fontSize={22} fontWeight={800} fill={t.textPrimary}>
              {avgScore}%
            </text>
            <text x={65} y={76} textAnchor="middle" fontSize={10} fill={t.textMuted}>
              o'rtacha
            </text>
          </svg>
        </div>

        {/* Breakdown pills */}
        <div className="w-full grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "A'lo",   pct: Math.round((STUDENTS.filter(s => s.avgScore >= 75).length / STUDENTS.length) * 100), color: '#22C55E' },
            { label: "O'rta",  pct: Math.round((STUDENTS.filter(s => s.avgScore >= 50 && s.avgScore < 75).length / STUDENTS.length) * 100), color: '#F59E0B' },
            { label: 'Past',   pct: Math.round((STUDENTS.filter(s => s.avgScore < 50).length / STUDENTS.length) * 100), color: '#EF4444' },
          ].map(({ label, pct, color }) => (
            <div
              key={label}
              className="flex flex-col items-center py-2 rounded-xl"
              style={{ background: `${color}10`, border: `1px solid ${color}25` }}
            >
              <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
              <span className="text-xs mt-0.5" style={{ color: t.textMuted }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Student Activity — bar chart
// ─────────────────────────────────────────────
function StudentActivityCard() {
  const { theme: t } = useTheme();
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const maxTests = Math.max(...WEEKLY_ACTIVITY.map((d) => d.tests));
  const CHART_H = 120;

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>O'quvchi faolligi</h3>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Hafta bo'yicha yakunlangan testlar soni</p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }}
        >
          <Activity className="w-3.5 h-3.5" strokeWidth={2} />
          Bu oy
        </div>
      </div>

      {/* Bars */}
      <div
        className="flex items-end gap-2 sm:gap-3"
        style={{ height: CHART_H }}
        onMouseLeave={() => setHovIdx(null)}
      >
        {WEEKLY_ACTIVITY.map((d, i) => {
          const isHov = hovIdx === i;
          const barH  = (d.tests / maxTests) * CHART_H;

          return (
            <div
              key={d.week}
              className="flex-1 flex flex-col items-center gap-1 h-full cursor-default justify-end"
              onMouseEnter={() => setHovIdx(i)}
            >
              {/* Tooltip val */}
              <span
                className="text-xs font-bold transition-all duration-150"
                style={{ color: isHov ? t.accent : 'transparent', opacity: isHov ? 1 : 0 }}
              >
                {d.tests}
              </span>

              {/* Bar */}
              <div
                className="w-full rounded-t-lg transition-all duration-200 relative overflow-hidden"
                style={{
                  height:     barH,
                  minHeight:  4,
                  background: isHov
                    ? 'linear-gradient(180deg,#818CF8,#6366F1)'
                    : (t.isDark ? 'rgba(99,102,241,0.45)' : 'rgba(99,102,241,0.35)'),
                  boxShadow: isHov ? '0 -4px 14px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                {isHov && (
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.15) 0%,transparent 100%)' }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* X labels */}
      <div className="flex justify-between mt-2">
        {WEEKLY_ACTIVITY.map((d) => (
          <span key={d.week} className="flex-1 text-center text-xs" style={{ color: t.textMuted }}>
            {d.week}
          </span>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { label: 'Jami',      val: WEEKLY_ACTIVITY.reduce((a, b) => a + b.tests, 0) },
          { label: "O'rtacha",  val: Math.round(WEEKLY_ACTIVITY.reduce((a, b) => a + b.tests, 0) / WEEKLY_ACTIVITY.length) },
          { label: 'Maksimal',  val: maxTests },
        ].map(({ label, val }) => (
          <div
            key={label}
            className="flex flex-col items-center py-2 rounded-xl"
            style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
          >
            <span className="text-base font-bold" style={{ color: t.textPrimary }}>{val}</span>
            <span className="text-xs mt-0.5" style={{ color: t.textMuted }}>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Student List
// ─────────────────────────────────────────────
function StudentListCard() {
  const { theme: t } = useTheme();
  const navigate     = useNavigate();
  const [query, setQuery] = useState('');

  const filtered = STUDENTS.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.classGroup.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Card>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>O'quvchilar ro'yxati</h3>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{STUDENTS.length} ta o'quvchi</p>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: t.bgInner, border: `1px solid ${t.border}`, minWidth: 200 }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Qidirish..."
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: t.textPrimary }}
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
              {["O'quvchi ismi", "O'rtacha ball", 'Yakunlangan testlar', 'Oxirgi faollik', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: t.textMuted }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, idx) => {
              const sc = scoreColor(s.avgScore);
              const up = s.trend > 0;
              return (
                <tr
                  key={s.id}
                  className="transition-colors cursor-pointer"
                  style={{ borderBottom: idx < filtered.length - 1 ? `1px solid ${t.border}` : 'none' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  onClick={() => navigate(`/students/${s.id}`)}
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: AVATAR_COLORS[s.id % AVATAR_COLORS.length] }}
                      >
                        {s.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: t.textPrimary }}>{s.name}</p>
                        <p className="text-xs" style={{ color: t.textMuted }}>{s.classGroup}</p>
                      </div>
                    </div>
                  </td>

                  {/* Avg Score */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-lg"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                      >
                        {s.avgScore}%
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: up ? '#22C55E' : '#EF4444' }}
                      >
                        {up ? '+' : ''}{s.trend}%
                      </span>
                    </div>
                  </td>

                  {/* Tests */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                      <span className="text-sm" style={{ color: t.textSecondary }}>{s.testsCompleted} ta</span>
                    </div>
                  </td>

                  {/* Last activity */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                      <span className="text-sm" style={{ color: t.textSecondary }}>{s.lastActivity}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
                      onMouseEnter={(e) => { e.stopPropagation(); (e.currentTarget as HTMLElement).style.background = t.accentMuted; (e.currentTarget as HTMLElement).style.color = t.accent; (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; (e.currentTarget as HTMLElement).style.color = t.textSecondary; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/students/${s.id}`); }}
                    >
                      Ko'rish
                      <ChevronRight className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center" style={{ color: t.textMuted }}>
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
            <p className="text-sm">Hech narsa topilmadi</p>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-2.5">
        {filtered.map((s) => {
          const sc = scoreColor(s.avgScore);
          const up = s.trend > 0;
          return (
            <div
              key={s.id}
              className="p-3.5 rounded-xl cursor-pointer"
              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
              onClick={() => navigate(`/students/${s.id}`)}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: AVATAR_COLORS[s.id % AVATAR_COLORS.length] }}
                  >
                    {s.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{s.name}</p>
                    <p className="text-xs" style={{ color: t.textMuted }}>{s.classGroup}</p>
                  </div>
                </div>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0"
                  style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                >
                  {s.avgScore}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={1.75} />
                    <span className="text-xs" style={{ color: t.textMuted }}>{s.testsCompleted} test</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={1.75} />
                    <span className="text-xs" style={{ color: t.textMuted }}>{s.lastActivity}</span>
                  </div>
                </div>
                <span className="text-xs font-semibold" style={{ color: up ? '#22C55E' : '#EF4444' }}>
                  {up ? '+' : ''}{s.trend}%
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-8 text-center" style={{ color: t.textMuted }}>
            <p className="text-sm">Hech narsa topilmadi</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────
export function StudentAnalyticsPage() {
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
            <Users className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
            O'quvchi Tahlili
          </h1>
        </div>
        <p className="text-xs sm:text-sm mt-1 ml-12" style={{ color: t.textMuted }}>
          Har bir o'quvchining individual ko'rsatkichlarini tahlil qiling.
        </p>
      </div>

      {/* ── KPI row ── */}
      <KpiCards />

      {/* ── Performance Trend + Average Score ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-4 sm:mb-5">
        <PerformanceTrendCard />
        <AverageScoreCard />
      </div>

      {/* ── Student Activity ── */}
      <div className="mb-4 sm:mb-5">
        <StudentActivityCard />
      </div>

      {/* ── Student List ── */}
      <StudentListCard />
    </>
  );
}

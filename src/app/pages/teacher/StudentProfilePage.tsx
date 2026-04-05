import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Mail, BookOpen, ClipboardCheck, Clock,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Video, FileText, Zap, Award, BarChart3, Target,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';

// ── Shared student data (mirrors StudentsPage) ────────────────────────────────
const ALL_STUDENTS = [
  { id: 1,  name: 'Ali Karimov',        initials: 'AK', email: 'ali.karimov@edu.uz',    classGroup: '9-A',           avgScore: 88, testsCompleted: 34, lastActivity: '2 soat oldin',   status: 'active'   },
  { id: 2,  name: 'Malika Yusupova',    initials: 'MY', email: 'malika.y@edu.uz',        classGroup: '10-B',          avgScore: 62, testsCompleted: 27, lastActivity: 'Kecha',           status: 'active'   },
  { id: 3,  name: 'Jasur Toshmatov',    initials: 'JT', email: 'jasur.t@edu.uz',         classGroup: 'Fizika guruhi', avgScore: 45, testsCompleted: 19, lastActivity: '3 kun oldin',     status: 'inactive' },
  { id: 4,  name: 'Nilufar Rahimova',   initials: 'NR', email: 'nilufar.r@edu.uz',       classGroup: '9-A',           avgScore: 91, testsCompleted: 41, lastActivity: '1 soat oldin',    status: 'active'   },
  { id: 5,  name: 'Bobur Saidov',       initials: 'BS', email: 'bobur.s@edu.uz',         classGroup: '10-B',          avgScore: 73, testsCompleted: 30, lastActivity: 'Kecha',           status: 'active'   },
  { id: 6,  name: 'Zulfiya Norova',     initials: 'ZN', email: 'zulfiya.n@edu.uz',       classGroup: 'Fizika guruhi', avgScore: 38, testsCompleted: 14, lastActivity: '1 hafta oldin',   status: 'inactive' },
  { id: 7,  name: 'Sardor Mirzayev',    initials: 'SM', email: 'sardor.m@edu.uz',        classGroup: '9-A',           avgScore: 79, testsCompleted: 36, lastActivity: '3 soat oldin',    status: 'active'   },
  { id: 8,  name: 'Dildora Hasanova',   initials: 'DH', email: 'dildora.h@edu.uz',       classGroup: '10-B',          avgScore: 55, testsCompleted: 22, lastActivity: '2 kun oldin',     status: 'active'   },
  { id: 9,  name: 'Ulugbek Qodirov',    initials: 'UQ', email: 'ulugbek.q@edu.uz',       classGroup: 'Fizika guruhi', avgScore: 82, testsCompleted: 38, lastActivity: '30 daqiqa oldin', status: 'active'   },
  { id: 10, name: 'Mohira Sultanova',   initials: 'MS', email: 'mohira.s@edu.uz',        classGroup: '9-A',           avgScore: 67, testsCompleted: 25, lastActivity: 'Kecha',           status: 'inactive' },
  { id: 11, name: 'Firdavs Nazarov',    initials: 'FN', email: 'firdavs.n@edu.uz',       classGroup: '10-B',          avgScore: 94, testsCompleted: 45, lastActivity: '1 soat oldin',    status: 'active'   },
  { id: 12, name: 'Shahnoza Ergasheva', initials: 'SE', email: 'shahnoza.e@edu.uz',      classGroup: 'Fizika guruhi', avgScore: 42, testsCompleted: 16, lastActivity: '5 kun oldin',     status: 'inactive' },
];

const AVATAR_COLORS = [
  '#6366F1','#3B82F6','#22C55E','#F59E0B','#EF4444',
  '#8B5CF6','#0891B2','#D97706','#059669','#EC4899',
  '#14B8A6','#F97316',
];

// ── Per-student mock details ──────────────────────────────────────────────────
function getStudentDetails(id: number) {
  const base = (id * 7) % 30; // deterministic variation
  return {
    testHistory: [
      { quiz: 'Matematika amaliyot testi',  score: Math.min(99, 65 + base),       total: 30, date: '14 mart' },
      { quiz: 'Fizika 3-bob testi',          score: Math.min(99, 70 + base - 5),  total: 25, date: '11 mart' },
      { quiz: 'Kimyo asoslari',              score: Math.min(99, 58 + base),       total: 20, date: '9 mart'  },
      { quiz: 'Biologiya testi',             score: Math.min(99, 80 + base - 10), total: 35, date: '6 mart'  },
      { quiz: 'Matematika — Algebra',        score: Math.min(99, 72 + base - 8),  total: 40, date: '3 mart'  },
    ],
    subjectPerformance: [
      { subject: 'Matematika', score: Math.min(99, 75 + base)      },
      { subject: 'Fizika',     score: Math.min(99, 65 + base - 5)  },
      { subject: 'Kimyo',      score: Math.min(99, 58 + base - 12) },
      { subject: 'Biologiya',  score: Math.min(99, 80 + base - 3)  },
    ],
    weakTopics: [
      { topic: 'Elektr toki',           accuracy: Math.max(10, 34 - base % 15) },
      { topic: 'Kvadrat tenglamalar',   accuracy: Math.max(15, 42 - base % 12) },
      { topic: "Kimyoviy bog'lar",      accuracy: Math.max(20, 51 - base % 10) },
    ],
    activityLog: [
      { icon: 'check',  text: 'Fizika testini yakunladi',           time: '2 soat oldin'    },
      { icon: 'video',  text: 'Jonli darsga qo\'shildi',            time: 'Bugun, 10:00'    },
      { icon: 'file',   text: 'Matematika topshirig\'ini yubordi',   time: 'Kecha, 18:30'    },
      { icon: 'zap',    text: 'Kimyo testini boshladi',              time: 'Kecha, 15:00'    },
      { icon: 'award',  text: "10 testlik ko'rsatkich oldi",         time: '2 kun oldin'     },
      { icon: 'check',  text: 'Biologiya testini yakunladi',         time: '3 kun oldin'     },
    ],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'   };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return              { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'   };
}

function ActivityIcon({ type, t }: { type: string; t: ReturnType<typeof useTheme>['theme'] }) {
  const map: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
    check: { Icon: CheckCircle, color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
    video: { Icon: Video,       color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
    file:  { Icon: FileText,    color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    zap:   { Icon: Zap,         color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    award: { Icon: Award,       color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  };
  const cfg = map[type] || map['check'];
  const Icon = cfg.Icon;
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: cfg.bg, border: `1.5px solid ${cfg.color}30` }}
    >
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

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme: t } = useTheme();
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold" style={{ color: t.textPrimary, letterSpacing: '0.01em' }}>
        {title}
      </h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{subtitle}</p>}
    </div>
  );
}

// ── Subject Performance Bar Chart ─────────────────────────────────────────────
function SubjectChart({ data }: { data: { subject: string; score: number }[] }) {
  const { theme: t } = useTheme();
  const max = 100;
  const CHART_H = 160;

  return (
    <div className="relative" style={{ height: CHART_H + 40 }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((pct) => (
        <div
          key={pct}
          className="absolute w-full flex items-center"
          style={{ bottom: 36 + (pct / max) * CHART_H }}
        >
          <span className="text-xs w-7 text-right mr-3 shrink-0 tabular-nums" style={{ color: t.textMuted }}>
            {pct}
          </span>
          <div
            className="flex-1 border-t"
            style={{
              borderColor: t.chartGrid,
              borderTopStyle: t.chartGridStyle,
              opacity: t.chartGridOpacity,
              borderTopWidth: pct === 0 ? 2 : 1,
            }}
          />
        </div>
      ))}

      {/* Bars */}
      <div className="absolute flex items-end justify-around" style={{ bottom: 36, top: 0, left: 40, right: 0 }}>
        {data.map((item) => {
          const sc = scoreColor(item.score);
          const barH = (item.score / max) * CHART_H;
          return (
            <div key={item.subject} className="flex flex-col items-center flex-1 h-full justify-end gap-1">
              {/* Score label above bar */}
              <span className="text-xs font-bold" style={{ color: sc.color }}>{item.score}%</span>
              <div
                className="rounded-t-lg transition-all duration-500 w-10 sm:w-12"
                style={{
                  height: barH,
                  background: sc.color,
                  opacity: t.isDark ? 0.8 : 0.75,
                  minHeight: 4,
                  boxShadow: t.isDark ? `0 0 12px ${sc.color}44` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="absolute flex justify-around" style={{ bottom: 8, left: 40, right: 0 }}>
        {data.map((item) => (
          <span
            key={item.subject}
            className="flex-1 text-center text-xs font-medium truncate px-1"
            style={{ color: t.textMuted }}
          >
            {item.subject}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme: t } = useTheme();

  const studentIndex = (parseInt(id || '1', 10) - 1);
  const student = ALL_STUDENTS[studentIndex] ?? ALL_STUDENTS[0];
  const details = getStudentDetails(student.id);
  const avatarColor = AVATAR_COLORS[(student.id - 1) % AVATAR_COLORS.length];
  const overallSc = scoreColor(student.avgScore);

  return (
    <>
      {/* ── Back nav ── */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/students')}
          className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl transition-all"
          style={{
            color: t.textSecondary,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowCard,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = t.accent;
            (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = t.textSecondary;
            (e.currentTarget as HTMLElement).style.borderColor = t.border;
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          O'quvchilar ro'yxati
        </button>
      </div>

      {/* ── Profile Header Card ── */}
      <Card className="mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${avatarColor}cc, ${avatarColor})`,
                boxShadow: t.isDark ? `0 0 32px ${avatarColor}44` : `0 4px 20px ${avatarColor}33`,
                border: `3px solid ${avatarColor}55`,
              }}
            >
              {student.initials}
            </div>
            {/* Online indicator */}
            {student.status === 'active' && (
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{ background: '#22C55E', borderColor: t.bgCard }}
              />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
                  {student.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }}
                  >
                    <BookOpen className="w-3 h-3" />
                    {student.classGroup}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: t.textSecondary }}
                  >
                    <Mail className="w-3 h-3" />
                    {student.email}
                  </span>
                </div>
              </div>

              {/* Status badge */}
              {student.status === 'active' ? (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Faol
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: t.bgInner, color: t.textMuted, border: `1px solid ${t.border}` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: t.textMuted }} />
                  Nofaol
                </span>
              )}
            </div>

            {/* Stat badges */}
            <div className="flex flex-wrap gap-3 mt-4">
              {/* Average score */}
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: overallSc.bg, border: `1px solid ${overallSc.border}` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${overallSc.color}22` }}
                >
                  <Target className="w-4 h-4" style={{ color: overallSc.color }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>O'rtacha ball</p>
                  <p className="text-base font-bold" style={{ color: overallSc.color }}>{student.avgScore}%</p>
                </div>
              </div>

              {/* Tests completed */}
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <ClipboardCheck className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>Testlar</p>
                  <p className="text-base font-bold" style={{ color: t.textPrimary }}>{student.testsCompleted}</p>
                </div>
              </div>

              {/* Last active */}
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
                style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.bgButton }}>
                  <Clock className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>So'nggi faollik</p>
                  <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>{student.lastActivity}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-4 sm:mb-5">

        {/* Test History — spans 2 cols on lg */}
        <div className="lg:col-span-2">
          <Card>
            <CardTitle title="Test tarixi" subtitle="So'nggi yakunlangan testlar" />

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}`, background: t.bgInner }}>
                    {['Test nomi', 'Ball', 'Savollar', 'Sana'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider first:rounded-l-lg last:rounded-r-lg"
                        style={{ color: t.textMuted }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {details.testHistory.map((row, idx) => {
                    const sc = scoreColor(row.score);
                    return (
                      <tr
                        key={idx}
                        style={{ borderBottom: idx < details.testHistory.length - 1 ? `1px solid ${t.border}` : 'none' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        className="transition-colors cursor-default"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}
                            >
                              <BarChart3 className="w-3.5 h-3.5" style={{ color: t.accent }} strokeWidth={1.75} />
                            </div>
                            <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{row.quiz}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs font-bold px-2.5 py-1 rounded-lg"
                              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, minWidth: '3.5rem', display: 'inline-flex', justifyContent: 'center' }}
                            >
                              {row.score}%
                            </span>
                            <div className="w-14 h-1.5 rounded-full overflow-hidden hidden md:block" style={{ background: t.bgInner }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${row.score}%`, background: sc.color, opacity: 0.65 }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm" style={{ color: t.textSecondary }}>{row.total} ta</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm" style={{ color: t.textMuted }}>{row.date}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="block sm:hidden space-y-2.5">
              {details.testHistory.map((row, idx) => {
                const sc = scoreColor(row.score);
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}>
                      <BarChart3 className="w-4 h-4" style={{ color: t.accent }} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: t.textPrimary }}>{row.quiz}</p>
                      <p className="text-xs" style={{ color: t.textMuted }}>{row.total} savol · {row.date}</p>
                    </div>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                    >
                      {row.score}%
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Weak Topics */}
        <div>
          <Card className="h-full">
            <CardTitle title="Zaif mavzular" subtitle="Yaxshilash talab etiladi" />
            <div className="space-y-3">
              {details.weakTopics.map((topic, idx) => {
                const label = topic.accuracy < 40 ? 'Juda past' : topic.accuracy < 55 ? 'Past' : "O'rta";
                const color = topic.accuracy < 40 ? '#EF4444' : topic.accuracy < 55 ? '#F59E0B' : '#F97316';
                const bg    = topic.accuracy < 40 ? 'rgba(239,68,68,0.08)'  : topic.accuracy < 55 ? 'rgba(245,158,11,0.08)' : 'rgba(249,115,22,0.08)';
                const border= topic.accuracy < 40 ? 'rgba(239,68,68,0.2)'   : topic.accuracy < 55 ? 'rgba(245,158,11,0.2)'  : 'rgba(249,115,22,0.2)';
                return (
                  <div key={idx} className="p-3.5 rounded-xl" style={{ background: bg, border: `1px solid ${border}` }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" style={{ color }} strokeWidth={1.75} />
                        <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>{topic.topic}</span>
                      </div>
                      <span className="text-xs font-bold shrink-0" style={{ color }}>{topic.accuracy}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${color}22` }}>
                      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${topic.accuracy}%`, background: color }} />
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: `${color}cc` }}>{label} daraja</p>
                  </div>
                );
              })}

              {/* Tip box */}
              <div
                className="p-3 rounded-xl mt-1"
                style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
              >
                <p className="text-xs" style={{ color: t.textMuted }}>
                  💡 Ushbu mavzularga qo'shimcha topshiriqlar bering.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Bottom Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

        {/* Subject Performance Chart — 2 cols */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold" style={{ color: t.textPrimary, letterSpacing: '0.01em' }}>
                  Fanlar bo'yicha ko'rsatkich
                </h3>
                <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>O'rtacha ball, %</p>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{ background: overallSc.bg, border: `1px solid ${overallSc.border}` }}
              >
                {student.avgScore >= 75
                  ? <TrendingUp className="w-3.5 h-3.5" style={{ color: overallSc.color }} />
                  : <TrendingDown className="w-3.5 h-3.5" style={{ color: overallSc.color }} />}
                <span className="text-xs font-semibold" style={{ color: overallSc.color }}>
                  Umumiy: {student.avgScore}%
                </span>
              </div>
            </div>
            <SubjectChart data={details.subjectPerformance} />
          </Card>
        </div>

        {/* Activity Log */}
        <div>
          <Card className="h-full">
            <CardTitle title="So'nggi faoliyat" subtitle="Oxirgi harakatlar" />
            <div className="relative">
              {/* Vertical line */}
              <div
                className="absolute left-4 top-0 bottom-0 w-px"
                style={{ background: `linear-gradient(180deg, ${t.accent}55, transparent)` }}
              />

              <div className="space-y-4 pl-11">
                {details.activityLog.map((event, idx) => (
                  <div key={idx} className="relative">
                    {/* Icon — positioned on the timeline */}
                    <div className="absolute -left-11">
                      <ActivityIcon type={event.icon} t={t} />
                    </div>

                    {/* Content */}
                    <div>
                      <p className="text-sm font-medium" style={{ color: t.textPrimary }}>{event.text}</p>
                      <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

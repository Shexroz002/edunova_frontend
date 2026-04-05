import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Trophy, Users, CalendarDays, Target,
  CheckCircle2, XCircle, Clock, Award, TrendingUp,
  BarChart3, Medal, Star, Download,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';

// ─────────────────────────────────────────────
//  Mock data (keyed by session id)
// ─────────────────────────────────────────────
const SESSION_META: Record<string, {
  quizName: string; subject: string; date: string;
  participants: number; duration: string; avgScore: number; totalQ: number;
}> = {
  '1': { quizName: 'Mathematics Test',        subject: 'Matematika', date: '4 aprel, 2025',  participants: 32, duration: '24 daq', avgScore: 71, totalQ: 10 },
  '2': { quizName: 'Physics — Mechanics',     subject: 'Fizika',     date: '2 aprel, 2025',  participants: 20, duration: '19 daq', avgScore: 64, totalQ: 10 },
  '3': { quizName: 'Chemistry Bonds Quiz',    subject: 'Kimyo',      date: '31 mart, 2025',  participants: 18, duration: '21 daq', avgScore: 78, totalQ: 10 },
  '4': { quizName: 'Biology Cell Structures', subject: 'Biologiya',  date: '28 mart, 2025',  participants: 25, duration: '28 daq', avgScore: 55, totalQ: 10 },
  '5': { quizName: 'Algebra — Equations',     subject: 'Matematika', date: '26 mart, 2025',  participants: 30, duration: '22 daq', avgScore: 83, totalQ: 10 },
  '6': { quizName: 'Optics & Light',          subject: 'Fizika',     date: '22 mart, 2025',  participants: 16, duration: '18 daq', avgScore: 60, totalQ: 10 },
};

const DEFAULT_META = {
  quizName: 'Mathematics Test', subject: 'Matematika', date: '4 aprel, 2025',
  participants: 32, duration: '24 daq', avgScore: 71, totalQ: 10,
};

const QUESTION_ACCURACY = [
  { q: 1,  accuracy: 94 },
  { q: 2,  accuracy: 88 },
  { q: 3,  accuracy: 75 },
  { q: 4,  accuracy: 63 },
  { q: 5,  accuracy: 81 },
  { q: 6,  accuracy: 42 },
  { q: 7,  accuracy: 57 },
  { q: 8,  accuracy: 70 },
  { q: 9,  accuracy: 38 },
  { q: 10, accuracy: 85 },
];

interface StudentResult {
  id: number;
  name: string;
  initials: string;
  color: string;
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  time: string;
}

const COLORS = [
  '#6366F1','#8B5CF6','#3B82F6','#22C55E',
  '#F59E0B','#14B8A6','#EC4899','#0EA5E9',
  '#A855F7','#10B981','#F97316','#EF4444',
];

const STUDENT_RESULTS: StudentResult[] = [
  { id:  1, name: 'Alibek Yusupov',     initials: 'AY', color: COLORS[0],  score: 92, correct: 9, wrong: 1, skipped: 0, time: '18:23' },
  { id:  2, name: 'Malika Toshmatova',  initials: 'MT', color: COLORS[1],  score: 89, correct: 9, wrong: 1, skipped: 0, time: '19:44' },
  { id:  3, name: 'Bobur Xasanov',      initials: 'BX', color: COLORS[2],  score: 85, correct: 8, wrong: 1, skipped: 1, time: '21:05' },
  { id:  4, name: 'Zulfiya Ergasheva',  initials: 'ZE', color: COLORS[3],  score: 84, correct: 8, wrong: 2, skipped: 0, time: '20:30' },
  { id:  5, name: 'Otabek Qodirov',     initials: 'OQ', color: COLORS[4],  score: 80, correct: 8, wrong: 2, skipped: 0, time: '22:10' },
  { id:  6, name: 'Kamol Tursunov',     initials: 'KT', color: COLORS[5],  score: 78, correct: 8, wrong: 2, skipped: 0, time: '23:15' },
  { id:  7, name: 'Sardor Mirzaev',     initials: 'SM', color: COLORS[6],  score: 75, correct: 7, wrong: 2, skipped: 1, time: '22:50' },
  { id:  8, name: 'Shahlo Normatova',   initials: 'SN', color: COLORS[7],  score: 73, correct: 7, wrong: 3, skipped: 0, time: '24:00' },
  { id:  9, name: 'Mohira Yuldasheva',  initials: 'MY', color: COLORS[8],  score: 70, correct: 7, wrong: 3, skipped: 0, time: '23:40' },
  { id: 10, name: 'Feruza Nazarova',    initials: 'FN', color: COLORS[9],  score: 68, correct: 7, wrong: 3, skipped: 0, time: '24:00' },
  { id: 11, name: 'Jasur Rahimov',      initials: 'JR', color: COLORS[10], score: 65, correct: 6, wrong: 3, skipped: 1, time: '24:00' },
  { id: 12, name: 'Firdavs Razzaqov',   initials: 'FR', color: COLORS[11], score: 63, correct: 6, wrong: 4, skipped: 0, time: '24:00' },
  { id: 13, name: 'Hulkar Yusupova',    initials: 'HY', color: COLORS[0],  score: 60, correct: 6, wrong: 4, skipped: 0, time: '24:00' },
  { id: 14, name: 'Mirzo Fattoyev',     initials: 'MF', color: COLORS[1],  score: 58, correct: 6, wrong: 4, skipped: 0, time: '24:00' },
  { id: 15, name: 'Lobar Xolmatova',    initials: 'LX', color: COLORS[2],  score: 55, correct: 5, wrong: 4, skipped: 1, time: '24:00' },
  { id: 16, name: "Sanjar Norqo'lev",   initials: 'SN', color: COLORS[3],  score: 52, correct: 5, wrong: 5, skipped: 0, time: '24:00' },
  { id: 17, name: 'Barno Tursunova',    initials: 'BT', color: COLORS[4],  score: 50, correct: 5, wrong: 5, skipped: 0, time: '24:00' },
  { id: 18, name: 'Dildora Sultonova',  initials: 'DS', color: COLORS[5],  score: 48, correct: 5, wrong: 5, skipped: 0, time: '24:00' },
  { id: 19, name: 'Davron Usmonov',     initials: 'DU', color: COLORS[6],  score: 45, correct: 4, wrong: 5, skipped: 1, time: '24:00' },
  { id: 20, name: 'Nasiba Qoraboyeva',  initials: 'NQ', color: COLORS[7],  score: 42, correct: 4, wrong: 6, skipped: 0, time: '24:00' },
  { id: 21, name: 'Behruz Xoliqov',     initials: 'BX', color: COLORS[8],  score: 40, correct: 4, wrong: 6, skipped: 0, time: '24:00' },
  { id: 22, name: 'Gulnora Saidova',    initials: 'GS', color: COLORS[9],  score: 38, correct: 4, wrong: 6, skipped: 0, time: '24:00' },
  { id: 23, name: 'Rustam Abdullayev',  initials: 'RA', color: COLORS[10], score: 35, correct: 3, wrong: 6, skipped: 1, time: '24:00' },
  { id: 24, name: 'Madina Kalandarova', initials: 'MK', color: COLORS[11], score: 33, correct: 3, wrong: 7, skipped: 0, time: '24:00' },
  { id: 25, name: 'Shahnoza Ergasheva', initials: 'SE', color: COLORS[0],  score: 30, correct: 3, wrong: 7, skipped: 0, time: '24:00' },
  { id: 26, name: 'Oybek Yusupov',      initials: 'OY', color: COLORS[1],  score: 28, correct: 3, wrong: 7, skipped: 0, time: '24:00' },
  { id: 27, name: 'Iroda Xolmatova',    initials: 'IX', color: COLORS[2],  score: 25, correct: 2, wrong: 7, skipped: 1, time: '24:00' },
  { id: 28, name: 'Nurbek Sobirov',     initials: 'NS', color: COLORS[3],  score: 23, correct: 2, wrong: 8, skipped: 0, time: '24:00' },
  { id: 29, name: 'Ziyoda Nazarova',    initials: 'ZN', color: COLORS[4],  score: 20, correct: 2, wrong: 8, skipped: 0, time: '24:00' },
  { id: 30, name: 'Nilufar Karimova',   initials: 'NK', color: COLORS[5],  score: 18, correct: 2, wrong: 8, skipped: 0, time: '24:00' },
  { id: 31, name: 'Ulugbek Hamidov',    initials: 'UH', color: COLORS[6],  score: 15, correct: 1, wrong: 8, skipped: 1, time: '24:00' },
  { id: 32, name: "Akbar Toshpo'latov", initials: 'AT', color: COLORS[7],  score: 10, correct: 1, wrong: 9, skipped: 0, time: '24:00' },
];

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function scoreColor(score: number): { color: string; bg: string; border: string } {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return               { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  };
}

function accuracyColor(a: number): string {
  if (a >= 75) return '#22C55E';
  if (a >= 50) return '#F59E0B';
  return '#EF4444';
}

function rankMedal(rank: number) {
  if (rank === 1) return { Icon: Trophy, color: '#F59E0B' };
  if (rank === 2) return { Icon: Medal,  color: '#94A3B8' };
  if (rank === 3) return { Icon: Award,  color: '#CD7C2F' };
  return null;
}

// ─────────────────────────────────────────────
//  Shared Card
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
//  Main Page
// ─────────────────────────────────────────────
export function SessionResultPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const meta = id && SESSION_META[id] ? SESSION_META[id] : DEFAULT_META;

  const [sortBy, setSortBy] = useState<'score' | 'time' | 'correct'>('score');
  const [showAll, setShowAll] = useState(false);

  const sorted = [...STUDENT_RESULTS].sort((a, b) => {
    if (sortBy === 'score')   return b.score   - a.score;
    if (sortBy === 'correct') return b.correct - a.correct;
    const toSecs = (ts: string) => {
      const [m, s] = ts.split(':').map(Number);
      return m * 60 + s;
    };
    return toSecs(a.time) - toSecs(b.time);
  });

  const displayed     = showAll ? sorted : sorted.slice(0, 10);
  const top3          = sorted.slice(0, 3);
  const passCount     = STUDENT_RESULTS.filter((s) => s.score >= 60).length;
  const passRate      = Math.round((passCount / meta.participants) * 100);
  const highestScore  = sorted[0]?.score ?? 0;
  const hardestQ      = QUESTION_ACCURACY.reduce((a, b) => (b.accuracy < a.accuracy ? b : a));

  // Scrollbar colors
  const scrollThumb  = t.isDark ? '#334155' : '#CBD5E1';
  const scrollThumbH = t.isDark ? '#475569' : '#94A3B8';
  const scrollTrack  = t.isDark ? '#0F172A' : '#F1F5F9';

  return (
    <>
      {/* Theme-aware scrollbar */}
      <style>{`
        .lb-scroll::-webkit-scrollbar        { width: 5px; }
        .lb-scroll::-webkit-scrollbar-track  { background: ${scrollTrack}; border-radius: 6px; }
        .lb-scroll::-webkit-scrollbar-thumb  { background: ${scrollThumb}; border-radius: 6px; }
        .lb-scroll::-webkit-scrollbar-thumb:hover { background: ${scrollThumbH}; }
        .lb-scroll { scrollbar-width: thin; scrollbar-color: ${scrollThumb} ${scrollTrack}; }
      `}</style>

      {/* ══════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════ */}
      <div className="mb-6">
        {/* Back */}
        <button
          onClick={() => navigate('/live')}
          className="flex items-center gap-1.5 mb-4 text-sm transition-colors group"
          style={{ color: t.textMuted }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.accent; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
          Sessionlar
        </button>

        {/* Hero header card */}
        <div
          className="rounded-2xl p-5 sm:p-6"
          style={{
            background: t.isDark
              ? 'linear-gradient(135deg,rgba(99,102,241,0.12) 0%,rgba(139,92,246,0.07) 100%)'
              : 'linear-gradient(135deg,rgba(99,102,241,0.06) 0%,rgba(139,92,246,0.03) 100%)',
            border: `1.5px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.18)'}`,
            boxShadow: t.isDark ? '0 0 32px rgba(99,102,241,0.1)' : t.shadowCard,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(99,102,241,0.3)' }}
            >
              <Trophy className="w-6 h-6" style={{ color: '#6366F1' }} strokeWidth={1.75} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
                  Session Natijalari
                </h1>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                  Yakunlangan
                </span>
              </div>
              <p className="text-sm font-semibold mb-3" style={{ color: t.textSecondary }}>
                {meta.quizName}
              </p>
              <div className="flex flex-wrap gap-5">
                {[
                  { Icon: CalendarDays, label: meta.date,                              id: 'date'     },
                  { Icon: Users,        label: `${meta.participants} ta o'quvchi`,     id: 'students' },
                  { Icon: Clock,        label: `${meta.duration} davomiylik`,          id: 'duration' },
                  { Icon: TrendingUp,   label: `${meta.avgScore}% o'rtacha ball`,      id: 'avg'      },
                ].map(({ Icon, label, id: metaId }) => (
                  <div key={metaId} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                    <span className="text-xs" style={{ color: t.textSecondary }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Export button */}
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0"
              style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textSecondary }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.accentMuted;
                (e.currentTarget as HTMLElement).style.color = t.accent;
                (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.bgCard;
                (e.currentTarget as HTMLElement).style.color = t.textSecondary;
                (e.currentTarget as HTMLElement).style.borderColor = t.border;
              }}
            >
              <Download className="w-4 h-4" strokeWidth={1.75} />
              Yuklab olish
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          SUMMARY STAT CHIPS
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "O'rtacha Ball",    val: `${meta.avgScore}%`,                          color: '#6366F1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)',  Icon: Target     },
          { label: 'Eng Yuqori Ball',  val: `${highestScore}%`,                           color: '#22C55E', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   Icon: Star       },
          { label: "O'tish Darajasi",  val: `${passRate}%`,                               color: '#3B82F6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  Icon: TrendingUp },
          { label: 'Qiyin Savol',      val: `Q${hardestQ.q} (${hardestQ.accuracy}%)`,    color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', Icon: BarChart3  },
        ].map(({ label, val, color, bg, border, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}25` }}
            >
              <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tabular-nums truncate" style={{ color: t.textPrimary }}>{val}</p>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════
          ROW — Leaderboard | Question Accuracy
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">

        {/* ─── LEADERBOARD ─── */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>Reyting Jadvali</h3>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>Shu sessiyaning eng yaxshi natijalari</p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <Trophy className="w-4 h-4" style={{ color: '#F59E0B' }} strokeWidth={1.75} />
            </div>
          </div>

          {/* Top 3 podium strip — order: 2nd | 1st | 3rd */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {([top3[1], top3[0], top3[2]] as (StudentResult | undefined)[]).map((s, visualIdx) => {
              if (!s) return <div key={visualIdx} />;
              const actualRank = sorted.indexOf(s) + 1;
              const heights = ['h-20', 'h-28', 'h-16'];
              const medal = rankMedal(actualRank);
              const sc = scoreColor(s.score);
              return (
                <div
                  key={s.id}
                  className={`flex flex-col items-center justify-end ${heights[visualIdx]} rounded-2xl px-2 pb-3 pt-2`}
                  style={{
                    background: visualIdx === 1
                      ? (t.isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.07)')
                      : t.bgInner,
                    border: `1px solid ${visualIdx === 1 ? 'rgba(245,158,11,0.3)' : t.border}`,
                  }}
                >
                  {medal && (
                    <medal.Icon className="w-4 h-4 mb-1 shrink-0" style={{ color: medal.color }} strokeWidth={1.75} />
                  )}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1"
                    style={{ background: s.color }}
                  >
                    {s.initials}
                  </div>
                  <p className="text-xs font-semibold text-center truncate w-full" style={{ color: t.textPrimary }}>
                    {s.name.split(' ')[0]}
                  </p>
                  <span className="text-xs font-bold mt-0.5" style={{ color: sc.color }}>{s.score}%</span>
                </div>
              );
            })}
          </div>

          {/* Full rank list */}
          <div className="lb-scroll space-y-1.5 max-h-72 overflow-y-auto">
            {sorted.map((s, idx) => {
              const rank = idx + 1;
              const medal = rankMedal(rank);
              const sc = scoreColor(s.score);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                  style={{ background: rank <= 3 ? (t.isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)') : 'transparent' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      rank <= 3 ? (t.isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)') : 'transparent';
                  }}
                >
                  <div className="w-6 text-center shrink-0">
                    {medal
                      ? <medal.Icon className="w-4 h-4 mx-auto" style={{ color: medal.color }} strokeWidth={1.75} />
                      : <span className="text-xs tabular-nums" style={{ color: t.textMuted }}>{rank}</span>}
                  </div>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: s.color }}
                  >
                    {s.initials}
                  </div>
                  <span className="flex-1 text-sm truncate" style={{ color: t.textPrimary }}>{s.name}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                  >
                    {s.score}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ─── QUESTION ACCURACY CHART ─── */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>Savol Aniqligi</h3>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>To'g'ri javob bergan o'quvchilar foizi</p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}
            >
              <BarChart3 className="w-4 h-4" style={{ color: t.accent }} strokeWidth={1.75} />
            </div>
          </div>

          {/* Horizontal bar chart */}
          <div className="space-y-3">
            {QUESTION_ACCURACY.map(({ q, accuracy }) => {
              const barColor = accuracyColor(accuracy);
              return (
                <div key={q} className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-6 shrink-0 tabular-nums" style={{ color: t.textMuted }}>
                    Q{q}
                  </span>
                  <div className="flex-1 h-5 rounded-lg overflow-hidden relative" style={{ background: t.bgInner }}>
                    <div
                      className="h-full rounded-lg"
                      style={{ width: `${accuracy}%`, background: `${barColor}22`, border: `1px solid ${barColor}44` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg"
                      style={{
                        width: `${accuracy}%`,
                        background: `linear-gradient(90deg,${barColor}55,${barColor}22)`,
                        transition: 'width 0.7s ease',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-9 text-right shrink-0" style={{ color: barColor }}>
                    {accuracy}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4" style={{ borderTop: `1px solid ${t.border}` }}>
            {[
              { label: '≥75% Oson',     color: '#22C55E' },
              { label: '50–74% O\'rta', color: '#F59E0B' },
              { label: '<50% Qiyin',    color: '#EF4444' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <span className="text-xs" style={{ color: t.textMuted }}>{label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════
          STUDENT RESULTS TABLE (full width)
      ══════════════════════════════════════ */}
      <Card>
        {/* Header + sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>O'quvchi Natijalari</h3>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
              {meta.participants} ta o'quvchi · tartib: {sortBy === 'score' ? 'ball' : sortBy === 'correct' ? "to'g'ri javoblar" : 'vaqt'}
            </p>
          </div>
          {/* Sort pills */}
          <div className="flex gap-1.5">
            {(['score', 'correct', 'time'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  background: sortBy === s ? t.accentMuted : t.bgInner,
                  color:      sortBy === s ? t.accent      : t.textMuted,
                  border:    `1px solid ${sortBy === s ? t.accentBorder : t.border}`,
                }}
              >
                {s === 'correct' ? "To'g'ri" : s === 'time' ? 'Vaqt' : 'Ball'}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
                {['#', "O'quvchi", 'Ball', "To'g'ri", "Noto'g'ri", "O'tkazilgan", 'Vaqt'].map((h) => (
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
              {displayed.map((s, idx) => {
                const rank = idx + 1;
                const medal = rankMedal(rank);
                const sc = scoreColor(s.score);
                return (
                  <tr
                    key={s.id}
                    className="transition-colors"
                    style={{ borderBottom: idx < displayed.length - 1 ? `1px solid ${t.border}` : 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-3 w-10">
                      {medal
                        ? <medal.Icon className="w-4 h-4" style={{ color: medal.color }} strokeWidth={1.75} />
                        : <span className="text-xs tabular-nums" style={{ color: t.textMuted }}>{rank}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: s.color }}
                        >
                          {s.initials}
                        </div>
                        <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                      >
                        {s.score}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#22C55E' }} strokeWidth={2} />
                        <span className="text-sm tabular-nums font-medium" style={{ color: '#22C55E' }}>{s.correct}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#EF4444' }} strokeWidth={2} />
                        <span className="text-sm tabular-nums font-medium" style={{ color: '#EF4444' }}>{s.wrong}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm tabular-nums" style={{ color: s.skipped > 0 ? '#F59E0B' : t.textMuted }}>
                        {s.skipped}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                        <span className="text-sm tabular-nums" style={{ color: t.textSecondary }}>{s.time}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="block sm:hidden space-y-2.5">
          {displayed.map((s, idx) => {
            const rank = idx + 1;
            const medal = rankMedal(rank);
            const sc = scoreColor(s.score);
            return (
              <div
                key={s.id}
                className="p-3.5 rounded-xl"
                style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-6 shrink-0 text-center">
                    {medal
                      ? <medal.Icon className="w-4 h-4 mx-auto" style={{ color: medal.color }} strokeWidth={1.75} />
                      : <span className="text-xs" style={{ color: t.textMuted }}>{rank}</span>}
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: s.color }}
                  >
                    {s.initials}
                  </div>
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: t.textPrimary }}>{s.name}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                  >
                    {s.score}%
                  </span>
                </div>
                <div className="flex items-center gap-4 pl-9">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" style={{ color: '#22C55E' }} strokeWidth={2} />
                    <span className="text-xs font-medium" style={{ color: '#22C55E' }}>{s.correct}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="w-3 h-3" style={{ color: '#EF4444' }} strokeWidth={2} />
                    <span className="text-xs font-medium" style={{ color: '#EF4444' }}>{s.wrong}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={1.75} />
                    <span className="text-xs" style={{ color: t.textSecondary }}>{s.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show more / less */}
        {sorted.length > 10 && (
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.accentMuted;
              (e.currentTarget as HTMLElement).style.color = t.accent;
              (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.bgInner;
              (e.currentTarget as HTMLElement).style.color = t.textMuted;
              (e.currentTarget as HTMLElement).style.borderColor = t.border;
            }}
          >
            {showAll ? "Faqat top 10 ni ko'rsatish" : `Barcha ${sorted.length} ta o'quvchini ko'rsatish`}
          </button>
        )}
      </Card>
    </>
  );
}
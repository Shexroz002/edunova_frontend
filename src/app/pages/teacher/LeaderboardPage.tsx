import { useNavigate } from 'react-router';
import { Trophy, Medal, Star, Target, ClipboardCheck, TrendingUp, Crown } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';

const LEADERBOARD = [
  { id: 11, name: 'Firdavs Nazarov',    initials: 'FN', class: '10-B',          avgScore: 94, testsCompleted: 45, streak: 12 },
  { id: 4,  name: 'Nilufar Rahimova',   initials: 'NR', class: '9-A',           avgScore: 91, testsCompleted: 41, streak: 9  },
  { id: 1,  name: 'Ali Karimov',        initials: 'AK', class: '9-A',           avgScore: 88, testsCompleted: 34, streak: 7  },
  { id: 9,  name: 'Ulugbek Qodirov',    initials: 'UQ', class: 'Fizika guruhi', avgScore: 82, testsCompleted: 38, streak: 5  },
  { id: 7,  name: 'Sardor Mirzayev',    initials: 'SM', class: '9-A',           avgScore: 79, testsCompleted: 36, streak: 6  },
  { id: 2,  name: 'Malika Yusupova',    initials: 'MY', class: '10-B',          avgScore: 62, testsCompleted: 27, streak: 2  },
  { id: 10, name: 'Mohira Sultanova',   initials: 'MS', class: '9-A',           avgScore: 67, testsCompleted: 25, streak: 3  },
  { id: 8,  name: 'Dildora Hasanova',   initials: 'DH', class: '10-B',          avgScore: 55, testsCompleted: 22, streak: 1  },
  { id: 5,  name: 'Bobur Saidov',       initials: 'BS', class: '10-B',          avgScore: 73, testsCompleted: 30, streak: 4  },
  { id: 3,  name: 'Jasur Toshmatov',    initials: 'JT', class: 'Fizika guruhi', avgScore: 45, testsCompleted: 19, streak: 0  },
  { id: 12, name: 'Shahnoza Ergasheva', initials: 'SE', class: 'Fizika guruhi', avgScore: 42, testsCompleted: 16, streak: 0  },
  { id: 6,  name: 'Zulfiya Norova',     initials: 'ZN', class: 'Fizika guruhi', avgScore: 38, testsCompleted: 14, streak: 0  },
];

const AVATAR_COLORS = [
  '#6366F1','#3B82F6','#22C55E','#F59E0B','#EF4444',
  '#8B5CF6','#0891B2','#D97706','#059669','#EC4899',
  '#14B8A6','#F97316',
];

function scoreColor(score: number) {
  if (score >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'   };
  if (score >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return              { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'   };
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
      <Crown className="w-5 h-5 text-white" strokeWidth={1.75} />
    </div>
  );
  if (rank === 2) return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      style={{ background: 'linear-gradient(135deg, #94A3B8, #64748B)', boxShadow: '0 4px 12px rgba(100,116,139,0.3)' }}>
      <Medal className="w-5 h-5 text-white" strokeWidth={1.75} />
    </div>
  );
  if (rank === 3) return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      style={{ background: 'linear-gradient(135deg, #B45309, #92400E)', boxShadow: '0 4px 12px rgba(180,83,9,0.3)' }}>
      <Medal className="w-5 h-5 text-white" strokeWidth={1.75} />
    </div>
  );
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
      style={{ background: 'transparent', color: '#64748B' }}>
      {rank}
    </div>
  );
}

export function LeaderboardPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const top3 = LEADERBOARD.slice(0, 3);
  const rest  = LEADERBOARD.slice(3);

  return (
    <>
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>Reyting</h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMuted }}>
          Ball va faollik bo'yicha eng yaxshi o'quvchilar
        </p>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-5 sm:mb-6">
        {[top3[1], top3[0], top3[2]].map((s, podiumIdx) => {
          const displayRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
          const sc = scoreColor(s.avgScore);
          const avatarColor = AVATAR_COLORS[(s.id - 1) % AVATAR_COLORS.length];
          const heights = ['h-28 sm:h-36', 'h-36 sm:h-44', 'h-24 sm:h-32'];
          const podiumColors = [
            { bg: t.isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.2)' },
            { bg: t.isDark ? 'rgba(245,158,11,0.1)'   : 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.3)'  },
            { bg: t.isDark ? 'rgba(180,83,9,0.1)'     : 'rgba(180,83,9,0.06)',   border: 'rgba(180,83,9,0.25)'   },
          ];
          const pc = podiumColors[podiumIdx];
          return (
            <div
              key={s.id}
              className={`${heights[podiumIdx]} flex flex-col items-center justify-end rounded-2xl px-2 pb-4 pt-3 cursor-pointer transition-all`}
              style={{ background: pc.bg, border: `1px solid ${pc.border}`, boxShadow: t.shadowCard }}
              onClick={() => navigate(`/students/${s.id}`)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-sm sm:text-base font-bold text-white mb-2 shrink-0"
                style={{ background: avatarColor, border: `3px solid ${avatarColor}55`, boxShadow: `0 4px 12px ${avatarColor}44` }}>
                {s.initials}
              </div>
              <p className="text-xs font-semibold text-center truncate w-full" style={{ color: t.textPrimary }}>{s.name.split(' ')[0]}</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg mt-1.5"
                style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                {s.avgScore}%
              </span>
              <div className="mt-2 flex items-center justify-center">
                {displayRank === 1 && <Crown className="w-4 h-4" style={{ color: '#F59E0B' }} />}
                {displayRank === 2 && <Medal className="w-4 h-4" style={{ color: '#94A3B8' }} />}
                {displayRank === 3 && <Medal className="w-4 h-4" style={{ color: '#B45309' }} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}>
        {/* Desktop header */}
        <div className="hidden sm:grid grid-cols-12 items-center px-5 py-3"
          style={{ borderBottom: `1px solid ${t.border}`, background: t.bgInner }}>
          {['#', "O'quvchi", "O'rtacha ball", 'Testlar', 'Daraja', ''].map((h, i) => (
            <div key={i}
              className={`text-xs font-semibold uppercase tracking-wider ${i === 0 ? 'col-span-1' : i === 1 ? 'col-span-4' : i === 5 ? 'col-span-1' : 'col-span-2'}`}
              style={{ color: t.textMuted }}>
              {h}
            </div>
          ))}
        </div>

        {/* All rows */}
        {LEADERBOARD.map((s, idx) => {
          const rank = idx + 1;
          const sc = scoreColor(s.avgScore);
          const avatarColor = AVATAR_COLORS[(s.id - 1) % AVATAR_COLORS.length];
          const isTop3 = rank <= 3;
          return (
            <div key={s.id}>
              {/* Desktop row */}
              <div
                className="hidden sm:grid grid-cols-12 items-center px-5 py-3.5 transition-colors cursor-pointer"
                style={{
                  borderBottom: idx < LEADERBOARD.length - 1 ? `1px solid ${t.border}` : 'none',
                  background: isTop3 ? (t.isDark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.02)') : 'transparent',
                }}
                onClick={() => navigate(`/students/${s.id}`)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isTop3 ? (t.isDark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.02)') : 'transparent'; }}
              >
                <div className="col-span-1"><RankBadge rank={rank} /></div>
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: avatarColor }}>
                    {s.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: t.textPrimary }}>{s.name}</p>
                    <p className="text-xs" style={{ color: t.textMuted }}>{s.class}</p>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                    {s.avgScore}%
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-sm" style={{ color: t.textSecondary }}>{s.testsCompleted} ta</span>
                </div>
                <div className="col-span-2">
                  {s.streak > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
                      🔥 {s.streak} kun
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: t.textMuted }}>—</span>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Star className="w-4 h-4" style={{ color: isTop3 ? '#F59E0B' : t.border }} strokeWidth={isTop3 ? 2 : 1.5} fill={isTop3 ? '#F59E0B' : 'none'} />
                </div>
              </div>

              {/* Mobile row */}
              <div
                className="flex sm:hidden items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors"
                style={{ borderBottom: idx < LEADERBOARD.length - 1 ? `1px solid ${t.border}` : 'none' }}
                onClick={() => navigate(`/students/${s.id}`)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div className="w-8 shrink-0 flex items-center justify-center">
                  {rank <= 3
                    ? <RankBadge rank={rank} />
                    : <span className="text-sm font-bold" style={{ color: t.textMuted }}>{rank}</span>}
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: avatarColor }}>
                  {s.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: t.textPrimary }}>{s.name}</p>
                  <p className="text-xs" style={{ color: t.textMuted }}>{s.class}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg shrink-0"
                  style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                  {s.avgScore}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

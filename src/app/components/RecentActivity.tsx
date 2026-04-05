import { Clock, ArrowUpRight } from 'lucide-react';
import { useTheme } from './ThemeContext';

const activities = [
  { student: 'Emma Wilson',   avatar: 'EW', quiz: 'Fizika 3-bob',       score: 92, time: '10 daqiqa oldin', scoreKey: 'high' },
  { student: 'James Chen',    avatar: 'JC', quiz: 'Matematika testi 12', score: 78, time: '25 daqiqa oldin', scoreKey: 'mid'  },
  { student: 'Sarah Johnson', avatar: 'SJ', quiz: 'Kimyo asoslari',      score: 85, time: '1 soat oldin',    scoreKey: 'high' },
  { student: 'Michael Brown', avatar: 'MB', quiz: 'Biologiya testi',     score: 64, time: '2 soat oldin',    scoreKey: 'low'  },
  { student: 'Lisa Anderson', avatar: 'LA', quiz: 'Fizika 2-bob',        score: 95, time: '3 soat oldin',    scoreKey: 'high' },
];

const darkScoreMap: Record<string, { bg: string; color: string; barColor: string }> = {
  high: { bg: 'rgba(34,197,94,0.12)',   color: '#22C55E', barColor: '#22C55E' },
  mid:  { bg: 'rgba(99,102,241,0.12)',  color: '#818CF8', barColor: '#6366F1' },
  low:  { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B', barColor: '#D97706' },
};

const lightScoreMap: Record<string, { bg: string; color: string; barColor: string }> = {
  high: { bg: 'rgba(34,197,94,0.1)',   color: '#22C55E', barColor: '#22C55E' },
  mid:  { bg: 'rgba(99,102,241,0.1)',  color: '#6366F1', barColor: '#6366F1' },
  low:  { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B', barColor: '#F59E0B' },
};

const darkAvatarColors  = ['#7C3AED','#2563EB','#0891B2','#D97706','#059669'];
const lightAvatarColors = ['#6366F1','#3B82F6','#22C55E','#F59E0B','#EF4444'];

export function RecentActivity() {
  const { theme: t } = useTheme();
  const scoreMap = t.isDark ? darkScoreMap : lightScoreMap;
  const avatarColors = t.isDark ? darkAvatarColors : lightAvatarColors;

  return (
    <div
      className="p-4 sm:p-6 rounded-2xl"
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        boxShadow: t.shadowCard,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div>
          <h3
            className="text-base font-semibold"
            style={{ color: t.textPrimary, letterSpacing: t.isDark ? 'normal' : '0.01em' }}
          >
            So'nggi faoliyat
          </h3>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            {t.isDark ? "O'quvchilarning jonli topshiriqlari" : "So'nggi test topshiriqlari"}
          </p>
        </div>
        <button
          className="flex items-center gap-1 text-xs font-semibold px-3 rounded-lg transition-colors"
          style={{
            background: t.accentMuted,
            color: t.accent,
            border: `1px solid ${t.accentBorder}`,
            height: '36px',
          }}
        >
          Barchasi <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      {/* Score legend — desktop only */}
      {!t.isDark && (
        <div
          className="hidden sm:flex items-center gap-4 mb-4 px-3 py-2 rounded-xl text-xs flex-wrap"
          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
        >
          <span style={{ color: t.textMuted }}>Ball kaliti:</span>
          {[
            { label: "≥ 85 · A'lo",           key: 'high' },
            { label: '70–84 · Yaxshi',         key: 'mid'  },
            { label: '< 70 · Yaxshilash kerak',key: 'low'  },
          ].map(({ label, key }) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: lightScoreMap[key].color }}
              />
              <span style={{ color: t.textSecondary }}>{label}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Mobile: stacked activity cards ── */}
      <div className="block sm:hidden space-y-3">
        {activities.map((activity, index) => {
          const sp = scoreMap[activity.scoreKey];
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: avatarColors[index % avatarColors.length] }}
              >
                {activity.avatar}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                  {activity.student}
                </p>
                <p className="text-xs truncate" style={{ color: t.textSecondary }}>
                  {activity.quiz}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3 h-3" style={{ color: t.textMuted }} />
                  <span className="text-xs" style={{ color: t.textMuted }}>{activity.time}</span>
                </div>
              </div>

              {/* Score badge */}
              <div className="shrink-0 flex flex-col items-center gap-1">
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold"
                  style={{
                    background: sp.bg,
                    color: sp.color,
                    border: `1px solid ${sp.color}30`,
                    minWidth: '3.5rem',
                    justifyContent: 'center',
                  }}
                >
                  {activity.score}%
                </span>
                <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: t.border }}>
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${activity.score}%`, background: sp.barColor, opacity: 0.7 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop: original table ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.border}` }}>
              {["O'quvchi", 'Test', 'Ball', 'Vaqt'].map((col) => (
                <th
                  key={col}
                  className="text-left pb-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: t.textMuted }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activities.map((activity, index) => {
              const sp = scoreMap[activity.scoreKey];
              return (
                <tr
                  key={index}
                  className="transition-colors cursor-pointer"
                  style={{
                    borderBottom: index < activities.length - 1
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
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: avatarColors[index % avatarColors.length] }}
                      >
                        {activity.avatar}
                      </div>
                      <span className="text-sm font-medium" style={{ color: t.textPrimary }}>
                        {activity.student}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className="text-sm" style={{ color: t.textSecondary }}>
                      {activity.quiz}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{
                          background: sp.bg,
                          color: sp.color,
                          border: `1px solid ${sp.color}30`,
                          minWidth: '3.5rem',
                          justifyContent: 'center',
                        }}
                      >
                        {activity.score}%
                      </span>
                      <div
                        className="hidden sm:block w-16 h-1.5 rounded-full overflow-hidden"
                        style={{ background: t.bgInner }}
                      >
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${activity.score}%`, background: sp.barColor, opacity: 0.65 }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} />
                      <span className="text-xs" style={{ color: t.textMuted }}>{activity.time}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
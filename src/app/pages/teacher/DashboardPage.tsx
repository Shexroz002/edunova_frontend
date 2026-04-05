import { StatsCard } from '../../components/StatsCard.tsx';
import { StudentActivityChart } from '../../components/StudentActivityChart.tsx';
import { WeakTopics } from '../../components/WeakTopics.tsx';
import { RecentActivity } from '../../components/RecentActivity.tsx';
import { useTheme } from '../../components/ThemeContext.tsx';
import { Users, ClipboardCheck, BarChart3, Activity, Flame, BookOpen } from 'lucide-react';

export function DashboardPage() {
  const { theme: t } = useTheme();

  return (
    <>
      {/* Welcome Banner */}
      {t.isDark ? (
        <div
          className="relative overflow-hidden rounded-2xl p-4 sm:p-7 mb-5 sm:mb-7"
          style={{
            background: 'linear-gradient(135deg, #4C1D95 0%, #6366F1 55%, #3B82F6 100%)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
          }}
        >
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #A5B4FC, transparent)' }} />
          <div className="absolute -bottom-8 right-32 w-32 h-32 rounded-full opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #60A5FA, transparent)' }} />

          <div className="relative">
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white">Xush kelibsiz, Anna! 👋</h2>
                <p className="text-white/80 text-sm mt-1">
                  O'quvchilaringizning o'rtacha rivojlanishi{' '}
                  <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded-lg">73%</span>
                </p>
                <p className="text-white/60 text-xs mt-1.5 hidden sm:block">
                  O'quvchilaringizni rivojlantiring va o'qituvchi reytingingizni oshiring!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 mt-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Flame className="w-4 h-4 text-orange-300" />
                <div>
                  <p className="text-xs text-white/60">Ketma-ketlik</p>
                  <p className="text-sm font-bold text-white">12 kun</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Users className="w-4 h-4 text-blue-300" />
                <div>
                  <p className="text-xs text-white/60">Onlayn o'quvchilar</p>
                  <p className="text-sm font-bold text-white">8 faol</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="relative overflow-hidden rounded-2xl p-4 sm:p-7 mb-5 sm:mb-7"
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowCard,
          }}
        >
          <div
            className="absolute left-0 top-4 bottom-4 sm:top-6 sm:bottom-6 w-1 rounded-r-full"
            style={{ background: 'linear-gradient(180deg, #6366F1, #4F46E5)' }}
          />
          <div className="pl-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.2)' }}
              >
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#6366F1' }} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold" style={{ color: t.textPrimary }}>
                  Xayrli tong, Anna
                </h2>
                <p className="text-sm mt-0.5" style={{ color: t.textSecondary }}>
                  O'quvchilaringizning o'rtacha rivojlanishi{' '}
                  <span className="font-bold px-1.5 py-0.5 rounded-md"
                    style={{ color: '#6366F1', background: 'rgba(99,102,241,0.08)' }}>
                    73%
                  </span>{' '}
                  bu hafta.
                </p>
                <p className="text-xs mt-1.5" style={{ color: t.textMuted }}>
                  Dushanba, 16 mart, 2026 · Matematika o'qituvchisi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Flame className="w-4 h-4" style={{ color: '#F59E0B' }} strokeWidth={1.75} />
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>Dars ketma-ketligi</p>
                  <p className="text-sm font-bold" style={{ color: t.textPrimary }}>12 kun</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <Users className="w-4 h-4" style={{ color: '#22C55E' }} strokeWidth={1.75} />
                <div>
                  <p className="text-xs" style={{ color: t.textMuted }}>Onlayn o'quvchilar</p>
                  <p className="text-sm font-bold" style={{ color: t.textPrimary }}>8 faol</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-4 sm:mb-5">
        <StatsCard title="Jami o'quvchilar"         value={42}   icon={Users}          trend="8%"  trendUp={true}  statKey="indigo" />
        <StatsCard title="Bugun yakunlangan testlar" value={67}   icon={ClipboardCheck} trend="12%" trendUp={true}  statKey="green"  />
        <StatsCard title="O'rtacha ball"             value="71%"  icon={BarChart3}      trend="3%"  trendUp={false} statKey="amber"  />
        <StatsCard title="Faol o'quvchilar"          value={19}   icon={Activity}       trend="5%"  trendUp={true}  statKey="blue"   />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-4 sm:mb-5">
        <div className="lg:col-span-2">
          <StudentActivityChart />
        </div>
        <div>
          <WeakTopics />
        </div>
      </div>

      {/* Activity + Actions Row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5">
        <RecentActivity />
      </div>
    </>
  );
}
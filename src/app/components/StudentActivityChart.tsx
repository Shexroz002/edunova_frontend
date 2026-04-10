import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useTheme } from './ThemeContext';

export interface StudentActivityChartItem {
  day: string;
  tests: number;
  avg: number;
  participants: number;
}

interface StudentActivityChartProps {
  data?: StudentActivityChartItem[];
  trendPercent?: number;
  trendLabel?: string;
}

const defaultData = [
  { day: 'Du', tests: 45, avg: 68, participants: 21 },
  { day: 'Se', tests: 52, avg: 72, participants: 24 },
  { day: 'Ch', tests: 38, avg: 65, participants: 17 },
  { day: 'Pa', tests: 67, avg: 78, participants: 28 },
  { day: 'Ju', tests: 58, avg: 74, participants: 25 },
  { day: 'Sh', tests: 42, avg: 70, participants: 18 },
  { day: 'Ya', tests: 35, avg: 61, participants: 15 },
];

const DAY_LABELS: Record<string, string> = {
  Du: 'Dushanba',
  Se: 'Seshanba',
  Ch: 'Chorshanba',
  Pa: 'Payshanba',
  Ju: 'Juma',
  Sh: 'Shanba',
  Ya: 'Yakshanba',
};

const CHART_HEIGHT = 280;
const gridLevels = [0, 25, 50, 75, 100]; // percentages

export function StudentActivityChart({
  data = defaultData,
  trendPercent = 12,
  trendLabel = 'bu hafta',
}: StudentActivityChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0);
  const { theme: t } = useTheme();
  const chartData = data.length > 0 ? data : defaultData;
  const maxVal = Math.max(...chartData.flatMap((d) => [d.tests, d.participants]), 1);
  const peakItem = chartData.reduce((best, current) => (current.tests > best.tests ? current : best), chartData[0]);
  const avgWeeklyScore = chartData.reduce((sum, item) => sum + item.avg, 0) / chartData.length;
  const trendPrefix = trendPercent > 0 ? '+' : '';

  const barPrimaryActive = t.isDark
    ? 'linear-gradient(180deg, #A5B4FC 0%, #6366F1 100%)'
    : 'linear-gradient(180deg, #818CF8 0%, #6366F1 100%)';

  const barSecondaryActive = t.isDark ? 'rgba(34,197,94,0.7)' : 'rgba(34,197,94,0.75)';
  const barTertiaryActive = t.isDark ? 'rgba(251,191,36,0.75)' : 'rgba(245,158,11,0.78)';
  const activeIdx = hoveredIdx ?? selectedIdx;
  const activeItem = chartData[activeIdx ?? 0] ?? chartData[0];
  const activeDayLabel = DAY_LABELS[activeItem.day] ?? activeItem.day;
  const peakDayLabel = DAY_LABELS[peakItem.day] ?? peakItem.day;

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
      <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2">
        <div className="min-w-0">
          <h3
            className="text-base font-semibold truncate"
            style={{ color: t.textPrimary, letterSpacing: t.isDark ? 'normal' : '0.01em' }}
          >
            O'quvchilar faolligi
          </h3>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: t.textMuted }}>
            So'nggi 7 kun — topshirilgan testlar, qatnashgan o'quvchilar va o'rtacha ball
          </p>
          <p className="text-xs mt-0.5 sm:hidden" style={{ color: t.textMuted }}>
            So'nggi 7 kun
          </p>
        </div>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0"
          style={{
            background: t.isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${t.isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.25)'}`,
          }}
        >
          <TrendingUp className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
          <span className="text-xs font-semibold" style={{ color: '#22C55E' }}>
            {trendPrefix}{trendPercent}% {trendLabel}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 sm:gap-5 mb-4 sm:mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: 'linear-gradient(180deg, #818CF8, #6366F1)' }}
          />
          <span className="text-xs font-medium" style={{ color: t.textSecondary }}>Topshirilgan testlar</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: t.isDark ? 'rgba(34,197,94,0.5)' : 'rgba(34,197,94,0.6)' }}
          />
          <span className="text-xs font-medium" style={{ color: t.textSecondary }}>O'rtacha ball</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: t.isDark ? 'rgba(251,191,36,0.55)' : 'rgba(245,158,11,0.7)' }}
          />
          <span className="text-xs font-medium" style={{ color: t.textSecondary }}>Qatnashgan o'quvchilar</span>
        </div>
        {!t.isDark && (
          <div className="ml-auto text-xs px-2.5 py-1 rounded-md font-medium hidden sm:block"
            style={{ background: t.bgInner, color: t.textMuted, border: `1px solid ${t.border}` }}>
            Tafsilotlar uchun ustunchaga bosing
          </div>
        )}
      </div>

      <div
        className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-2xl"
        style={{
          background: t.bgInner,
          border: `1px solid ${t.border}`,
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: t.textMuted }}>
              Tanlangan kun
            </p>
            <p className="text-sm sm:text-base font-bold" style={{ color: t.textPrimary }}>
              {activeDayLabel}
            </p>
          </div>
          <div
            className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full"
            style={{ background: t.bgCard, color: t.textMuted, border: `1px solid ${t.border}` }}
          >
            Ustunga bosing
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl px-3 py-2.5" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
            <p className="text-[11px] sm:text-xs mb-1" style={{ color: t.textMuted }}>Topshirilgan testlar</p>
            <p className="text-sm sm:text-base font-bold" style={{ color: '#6366F1' }}>{activeItem.tests}</p>
          </div>
          <div className="rounded-xl px-3 py-2.5" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
            <p className="text-[11px] sm:text-xs mb-1" style={{ color: t.textMuted }}>Qatnashgan o'quvchilar</p>
            <p className="text-sm sm:text-base font-bold" style={{ color: '#F59E0B' }}>{activeItem.participants}</p>
          </div>
          <div className="rounded-xl px-3 py-2.5" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
            <p className="text-[11px] sm:text-xs mb-1" style={{ color: t.textMuted }}>O'rtacha ball</p>
            <p className="text-sm sm:text-base font-bold" style={{ color: '#22C55E' }}>{activeItem.avg}%</p>
          </div>
        </div>
      </div>

      {/* Chart — horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div style={{ minWidth: 280 }}>
          <div className="relative" style={{ height: CHART_HEIGHT + 32 }}>
            {/* Horizontal grid lines */}
            {gridLevels.map((pct) => (
              <div
                key={pct}
                className="absolute border-t"
                style={{
                  bottom: 32 + (pct / 100) * CHART_HEIGHT,
                  left: 40,
                  right: 0,
                  borderColor: t.chartGrid,
                  borderTopStyle: t.chartGridStyle,
                  opacity: t.chartGridOpacity,
                  borderTopWidth: pct === 0 ? 2 : 1,
                }}
              />
            ))}

            {/* Bars */}
            <div
              className="absolute flex items-end justify-between"
              style={{ bottom: 32, top: 0, left: 40, right: 0 }}
            >
              {chartData.map((item, idx) => {
                const barH = (item.tests / maxVal) * CHART_HEIGHT;
                const avgBarH = (item.avg / 100) * CHART_HEIGHT;
                const participantsBarH = (item.participants / maxVal) * CHART_HEIGHT;
                const isActive = activeIdx === idx;

                return (
                  <div
                    key={item.day}
                    className="flex flex-col items-center justify-end flex-1 h-full cursor-pointer relative"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    {/* Side-by-side bars */}
                    <div
                      className="flex items-end gap-1 w-full justify-center"
                      style={{ height: CHART_HEIGHT }}
                    >
                      {/* Tests bar */}
                      <div
                        className="rounded-t transition-all duration-300"
                        style={{
                          width: t.isDark ? 14 : 16,
                          height: barH,
                          background: isActive ? barPrimaryActive : t.chartBarPrimary,
                          boxShadow: isActive && t.isDark ? `0 0 16px ${t.chartBarPrimaryGlow}` : 'none',
                          minHeight: 4,
                          borderTop: !t.isDark ? `2px solid ${isActive ? '#4F46E5' : '#6366F1'}` : 'none',
                        }}
                      />
                      {/* Participants bar */}
                      <div
                        className="rounded-t transition-all duration-300"
                        style={{
                          width: t.isDark ? 10 : 12,
                          height: participantsBarH,
                          background: isActive ? barTertiaryActive : (t.isDark ? 'rgba(251,191,36,0.55)' : 'rgba(245,158,11,0.7)'),
                          minHeight: 4,
                          borderTop: !t.isDark ? `2px solid ${isActive ? '#D97706' : '#F59E0B'}` : 'none',
                        }}
                      />
                      {/* Avg score bar */}
                      <div
                        className="rounded-t transition-all duration-300"
                        style={{
                          width: t.isDark ? 10 : 12,
                          height: avgBarH,
                          background: isActive ? barSecondaryActive : t.chartBarSecondary,
                          minHeight: 4,
                          borderTop: !t.isDark ? `2px solid ${isActive ? '#16A34A' : '#22C55E'}` : 'none',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day labels */}
            <div
              className="absolute flex justify-between"
              style={{ bottom: 8, left: 40, right: 0 }}
            >
              {chartData.map((item, idx) => (
                <div key={item.day} className="flex-1 flex justify-center">
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: activeIdx === idx ? t.textPrimary : t.textMuted,
                      transition: 'color 0.2s',
                    }}
                  >
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary row */}
      {!t.isDark && (
        <div
          className="mt-4 pt-3 flex items-center justify-between text-xs flex-wrap gap-2"
          style={{ borderTop: `1px solid ${t.border}`, color: t.textMuted }}
        >
          <span>Cho'qqi: <strong style={{ color: t.textPrimary }}>{peakDayLabel} — {peakItem.tests} test</strong></span>
          <span>Haftalik o'rtacha ball: <strong style={{ color: '#22C55E' }}>{avgWeeklyScore.toFixed(1)}%</strong></span>
        </div>
      )}
    </div>
  );
}

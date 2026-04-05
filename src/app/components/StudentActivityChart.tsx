import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useTheme } from './ThemeContext';

const data = [
  { day: 'Du', tests: 45, avg: 68 },
  { day: 'Se', tests: 52, avg: 72 },
  { day: 'Ch', tests: 38, avg: 65 },
  { day: 'Pa', tests: 67, avg: 78 },
  { day: 'Ju', tests: 58, avg: 74 },
  { day: 'Sh', tests: 42, avg: 70 },
  { day: 'Ya', tests: 35, avg: 61 },
];

const CHART_HEIGHT = 280;
const maxVal = Math.max(...data.map((d) => d.tests));
const gridLevels = [0, 25, 50, 75, 100]; // percentages

export function StudentActivityChart() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { theme: t } = useTheme();

  const barPrimaryActive = t.isDark
    ? 'linear-gradient(180deg, #A5B4FC 0%, #6366F1 100%)'
    : 'linear-gradient(180deg, #818CF8 0%, #6366F1 100%)';

  const barSecondaryActive = t.isDark ? 'rgba(34,197,94,0.7)' : 'rgba(34,197,94,0.75)';

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
            So'nggi 7 kun — topshirilgan testlar va o'rtacha ball
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
            +12% bu hafta
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
        {!t.isDark && (
          <div className="ml-auto text-xs px-2.5 py-1 rounded-md font-medium hidden sm:block"
            style={{ background: t.bgInner, color: t.textMuted, border: `1px solid ${t.border}` }}>
            Tafsilotlar uchun ustunchaga bosing
          </div>
        )}
      </div>

      {/* Chart — horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div style={{ minWidth: 280 }}>
          <div className="relative" style={{ height: CHART_HEIGHT + 32 }}>
            {/* Horizontal grid lines */}
            {gridLevels.map((pct) => {
              const yVal = Math.round((pct / 100) * maxVal);
              return (
                <div
                  key={pct}
                  className="absolute w-full flex items-center"
                  style={{ bottom: 32 + (pct / 100) * CHART_HEIGHT, left: 0 }}
                >
                  {/* Y-axis label */}
                  <span
                    className="text-xs w-7 text-right mr-3 shrink-0 tabular-nums"
                    style={{ color: t.textMuted, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {yVal}
                  </span>
                  {/* Grid line */}
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
              );
            })}

            {/* Bars */}
            <div
              className="absolute flex items-end justify-between"
              style={{ bottom: 32, top: 0, left: 40, right: 0 }}
            >
              {data.map((item, idx) => {
                const barH = (item.tests / maxVal) * CHART_HEIGHT;
                const avgBarH = (item.avg / 100) * CHART_HEIGHT;
                const isHovered = hoveredIdx === idx;

                return (
                  <div
                    key={item.day}
                    className="flex flex-col items-center justify-end flex-1 h-full cursor-pointer relative"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div
                        className="absolute z-10 rounded-xl px-3.5 py-3 text-xs pointer-events-none"
                        style={{
                          background: t.chartTooltipBg,
                          border: `1px solid ${t.border}`,
                          boxShadow: t.shadowHover,
                          bottom: CHART_HEIGHT + 18,
                          color: t.textPrimary,
                          minWidth: 110,
                          transform: 'translateX(-50%)',
                          left: '50%',
                        }}
                      >
                        <p
                          className="font-bold mb-1.5 pb-1.5"
                          style={{
                            color: t.textPrimary,
                            borderBottom: `1px solid ${t.border}`,
                          }}
                        >
                          {item.day}
                        </p>
                        <p className="flex items-center justify-between gap-3">
                          <span style={{ color: t.textSecondary }}>Testlar</span>
                          <span className="font-semibold" style={{ color: '#6366F1' }}>
                            {item.tests}
                          </span>
                        </p>
                        <p className="flex items-center justify-between gap-3 mt-1">
                          <span style={{ color: t.textSecondary }}>Ball</span>
                          <span className="font-semibold" style={{ color: '#22C55E' }}>
                            {item.avg}%
                          </span>
                        </p>
                      </div>
                    )}

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
                          background: isHovered ? barPrimaryActive : t.chartBarPrimary,
                          boxShadow: isHovered && t.isDark ? `0 0 16px ${t.chartBarPrimaryGlow}` : 'none',
                          minHeight: 4,
                          borderTop: !t.isDark ? `2px solid ${isHovered ? '#4F46E5' : '#6366F1'}` : 'none',
                        }}
                      />
                      {/* Avg score bar */}
                      <div
                        className="rounded-t transition-all duration-300"
                        style={{
                          width: t.isDark ? 10 : 12,
                          height: avgBarH,
                          background: isHovered ? barSecondaryActive : t.chartBarSecondary,
                          minHeight: 4,
                          borderTop: !t.isDark ? `2px solid ${isHovered ? '#16A34A' : '#22C55E'}` : 'none',
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
              {data.map((item, idx) => (
                <div key={item.day} className="flex-1 flex justify-center">
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: hoveredIdx === idx ? t.textPrimary : t.textMuted,
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
          <span>Cho'qqi: <strong style={{ color: t.textPrimary }}>Pa — 67 test</strong></span>
          <span>Haftalik o'rtacha ball: <strong style={{ color: '#22C55E' }}>69.7%</strong></span>
        </div>
      )}
    </div>
  );
}
import { LucideIcon } from 'lucide-react';
import { useTheme } from './ThemeContext';

type StatKey = 'indigo' | 'green' | 'amber' | 'blue';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  statKey?: StatKey;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp = true,
  statKey = 'indigo',
}: StatsCardProps) {
  const { theme: t } = useTheme();
  const palette = t.stat[statKey];

  return (
    <div
      className="p-6 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 cursor-default"
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        boxShadow: t.shadowCard,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = t.isDark
          ? `0 0 20px ${palette.glowColor}, ${t.shadowCard}`
          : t.shadowHover;
        (e.currentTarget as HTMLElement).style.borderColor = t.isDark
          ? palette.iconColor + '55'
          : palette.iconColor + '44';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = t.shadowCard;
        (e.currentTarget as HTMLElement).style.borderColor = t.border;
      }}
    >
      {/* Icon badge */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
        style={{
          background: palette.iconBg,
          border: `1.5px solid ${palette.iconColor}${t.isDark ? '33' : '28'}`,
        }}
      >
        <Icon
          className="w-5 h-5"
          style={{ color: palette.iconColor }}
          strokeWidth={t.isDark ? 2 : 1.75}
        />
      </div>

      {/* Value */}
      <div
        className="text-3xl font-bold mb-1 tracking-tight"
        style={{ color: t.textPrimary }}
      >
        {value}
      </div>

      {/* Label */}
      <div
        className="text-sm font-medium"
        style={{ color: t.textSecondary, letterSpacing: t.isDark ? 'normal' : '0.01em' }}
      >
        {title}
      </div>

      {/* Trend badge */}
      {trend && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg"
            style={{
              background: trendUp ? t.trendUpBg : t.trendDownBg,
              color: trendUp ? t.trendUpText : t.trendDownText,
            }}
          >
            {trendUp ? '↑' : '↓'} {trend}
          </span>
          <span className="text-xs" style={{ color: t.textMuted }}>o'tgan haftaga nisbatan</span>
        </div>
      )}

      {/* Reader-mode: subtle bottom accent rule */}
      {!t.isDark && (
        <div
          className="mt-4 h-0.5 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${palette.iconColor}55 0%, transparent 100%)`,
          }}
        />
      )}
    </div>
  );
}
import { Plus, Upload, Video, UserPlus, Sparkles, Pencil } from 'lucide-react';
import { useTheme } from './ThemeContext';

const darkActions = [
  { name: 'Test yaratish',       icon: Plus,     desc: 'Yangi baholash yaratish',       color: '#818CF8', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)' },
  { name: 'PDF test yuklash',    icon: Upload,   desc: 'PDF fayldan import qilish',     color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
  { name: 'Jonli dars yaratish', icon: Video,    desc: 'Jonli dars boshlash',           color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
  { name: 'O\'quvchi qo\'shish', icon: UserPlus, desc: 'Yangi o\'quvchini ro\'yxatga olish', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.25)' },
];

// SaaS palette
const lightActions = [
  { name: 'Test yaratish',       icon: Plus,     desc: 'Yangi baholash yaratish',       color: '#6366F1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)' },
  { name: 'PDF test yuklash',    icon: Upload,   desc: 'PDF fayldan import qilish',     color: '#22C55E', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)'  },
  { name: 'Jonli dars yaratish', icon: Video,    desc: 'Jonli dars boshlash',           color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
  { name: 'O\'quvchi qo\'shish', icon: UserPlus, desc: 'Yangi o\'quvchini ro\'yxatga olish', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)' },
];

export function QuickActions() {
  const { theme: t } = useTheme();
  const actions = t.isDark ? darkActions : lightActions;

  return (
    <div
      className="p-4 sm:p-6 rounded-2xl h-full flex flex-col"
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        boxShadow: t.shadowCard,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div
          className="p-2 rounded-lg"
          style={{
            background: t.accentMuted,
            border: `1.5px solid ${t.accentBorder}`,
          }}
        >
          <Sparkles
            className="w-4 h-4"
            style={{ color: t.accent }}
            strokeWidth={t.isDark ? 2 : 1.75}
          />
        </div>
        <div>
          <h3
            className="text-base font-semibold"
            style={{ color: t.textPrimary, letterSpacing: t.isDark ? 'normal' : '0.01em' }}
          >
            Tezkor amallar
          </h3>
          <p className="text-xs" style={{ color: t.textMuted }}>Yorliqlar</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2.5 flex-1">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.name}
              className="w-full flex items-center gap-3 px-3.5 rounded-xl transition-all text-left group"
              style={{
                background: action.bg,
                border: `1px solid ${action.border}`,
                minHeight: '52px',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
                (e.currentTarget as HTMLElement).style.boxShadow = t.isDark
                  ? `0 0 16px ${action.color}33`
                  : `0 2px 10px ${action.color}22`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${action.color}${t.isDark ? '22' : '18'}`,
                  border: `1.5px solid ${action.color}${t.isDark ? '44' : '35'}`,
                }}
              >
                <Icon
                  className="w-4 h-4"
                  style={{ color: action.color }}
                  strokeWidth={t.isDark ? 2 : 1.75}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                  {action.name}
                </p>
                <p className="text-xs truncate" style={{ color: t.textMuted }}>
                  {action.desc}
                </p>
              </div>
              <div
                className="ml-auto text-base opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: action.color }}
              >
                →
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA button */}
      <button
        className="w-full mt-4 px-4 rounded-xl text-sm font-bold transition-all"
        style={{
          background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
          color: '#FFFFFF',
          minHeight: '48px',
          boxShadow: t.isDark
            ? '0 4px 16px rgba(99,102,241,0.3)'
            : '0 3px 12px rgba(99,102,241,0.22)',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = t.isDark
            ? '0 6px 24px rgba(99,102,241,0.5)'
            : '0 5px 18px rgba(99,102,241,0.35)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = t.isDark
            ? '0 4px 16px rgba(99,102,241,0.3)'
            : '0 3px 12px rgba(99,102,241,0.22)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        + Yangi sinf yaratish
      </button>
    </div>
  );
}
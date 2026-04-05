import { AlertTriangle, Zap } from 'lucide-react';
import { useTheme } from './ThemeContext';

const darkTopics = [
  { name: 'Elektr toki',        mistakes: 34, subject: 'Fizika',      color: '#EF4444', bgColor: 'rgba(239,68,68,0.1)',   trackColor: '' },
  { name: 'Kvadrat tenglamalar',mistakes: 27, subject: 'Matematika',  color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)', trackColor: '' },
  { name: 'Kimyoviy bog\'lar',   mistakes: 21, subject: 'Kimyo',       color: '#A855F7', bgColor: 'rgba(168,85,247,0.1)', trackColor: '' },
  { name: 'Fotosintez',         mistakes: 17, subject: 'Biologiya',   color: '#22C55E', bgColor: 'rgba(34,197,94,0.1)',  trackColor: '' },
];

// SaaS palette — matches the design system exactly
const lightTopics = [
  { name: 'Elektr toki',        mistakes: 34, subject: 'Fizika',      color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)',  trackColor: '#FEE2E2' },
  { name: 'Kvadrat tenglamalar',mistakes: 27, subject: 'Matematika',  color: '#F59E0B', bgColor: 'rgba(245,158,11,0.08)', trackColor: '#FEF3C7' },
  { name: 'Kimyoviy bog\'lar',   mistakes: 21, subject: 'Kimyo',       color: '#6366F1', bgColor: 'rgba(99,102,241,0.08)', trackColor: '#E0E7FF' },
  { name: 'Fotosintez',         mistakes: 17, subject: 'Biologiya',   color: '#22C55E', bgColor: 'rgba(34,197,94,0.08)',  trackColor: '#DCFCE7' },
];

const maxMistakes = Math.max(...darkTopics.map((t) => t.mistakes));

export function WeakTopics() {
  const { theme: t } = useTheme();
  const topics = t.isDark ? darkTopics : lightTopics;

  return (
    <div
      className="p-6 rounded-2xl h-full flex flex-col"
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
            background: t.isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.1)',
            border: `1.5px solid ${t.isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.25)'}`,
          }}
        >
          <AlertTriangle
            className="w-4 h-4"
            style={{ color: '#F59E0B' }}
            strokeWidth={t.isDark ? 2 : 1.75}
          />
        </div>
        <div>
          <h3
            className="text-base font-semibold"
            style={{ color: t.textPrimary }}
          >
            Zaif mavzular
          </h3>
          <p className="text-xs" style={{ color: t.textMuted }}>
            {t.isDark ? 'E\'tibor talab qiladi' : 'Bu haftadagi eng ko\'p xatolar'}
          </p>
        </div>
      </div>

      {/* Topic list */}
      <div className="space-y-5 flex-1">
        {topics.map((topic, idx) => {
          const pct = Math.round((topic.mistakes / maxMistakes) * 100);
          const lightTopic = lightTopics[idx];
          return (
            <div key={topic.name}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                      {topic.name}
                    </span>
                    {idx === 0 && t.isDark && (
                      <Zap className="w-3 h-3 shrink-0" style={{ color: '#F59E0B' }} />
                    )}
                  </div>
                  {/* Subject tag */}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                    style={{
                      background: topic.bgColor,
                      color: topic.color,
                      border: `1px solid ${topic.color}22`,
                    }}
                  >
                    {topic.subject}
                  </span>
                </div>

                {/* Error count */}
                <span
                  className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg"
                  style={{
                    background: topic.bgColor,
                    color: topic.color,
                    border: `1.5px solid ${topic.color}33`,
                    minWidth: '4.5rem',
                    textAlign: 'center',
                  }}
                >
                  {topic.mistakes} xato
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="relative w-full h-2 rounded-full overflow-hidden"
                style={{
                  background: t.isDark ? t.bgInner : lightTopic.trackColor,
                }}
              >
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: t.isDark
                      ? `linear-gradient(90deg, ${topic.color}99, ${topic.color})`
                      : topic.color,
                    boxShadow: t.isDark ? `0 0 8px ${topic.color}55` : 'none',
                    opacity: t.isDark ? 1 : 0.8,
                  }}
                />
              </div>

              {/* Light: percentage label */}
              {!t.isDark && (
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs" style={{ color: t.textMuted }}>0</span>
                  <span className="text-xs font-medium" style={{ color: topic.color }}>{pct}%</span>
                  <span className="text-xs" style={{ color: t.textMuted }}>{maxMistakes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="mt-5 pt-4 flex items-center justify-between"
        style={{ borderTop: `1px solid ${t.border}` }}
      >
        <span className="text-xs" style={{ color: t.textMuted }}>
          {t.isDark ? '4 ta mavzu belgilandi' : 'Bu haftadagi jami xatolar: 99'}
        </span>
        <button className="text-xs font-semibold transition-colors" style={{ color: t.accent }}>
          Barchasini ko'rish →
        </button>
      </div>
    </div>
  );
}
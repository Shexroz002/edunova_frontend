import { useTheme } from './ThemeContext';
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  Target,
  Trophy,
  BookOpen,
  Clock,
  ArrowRight,
  Brain,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type InsightType = 'strength' | 'weakness' | 'goal';
type Priority = 'low' | 'medium' | 'high';

interface Insight {
  insight_id: string;
  type: InsightType;
  title: string;
  description: string;
  related_subject?: string;
  priority: Priority;
  created_at: Date;
  metadata?: {
    // Strength
    subjects?: string[];
    average_score?: number;
    test_count?: number;

    // Weakness
    subject?: string;
    current_score?: number;
    recommendation?: string;
    recommended_daily_practice_time?: number;

    // Goal
    target_score?: number;
    required_tests?: number;
    completion_percentage?: number;
  };
}

interface AIRecommendationsProps {
  insights?: Insight[];
  isNew?: boolean;
  title?: string;
  badge?: string;
  subtitle?: string;
  onActionClick?: (insightId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data - Replace with real AI-generated insights
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_INSIGHTS: Insight[] = [
  {
    insight_id: '1',
    type: 'strength',
    title: 'Kuchli tomonlaringiz',
    description: 'Siz Ingliz tili fanidan ajoyib natijalar ko\'rsatyapsiz. Grammatika va lug\'at bo\'yicha to\'g\'ri javoblar foizi juda yuqori.',
    related_subject: 'Ingliz tili',
    priority: 'high',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    metadata: {
      subjects: ['Ingliz tili', 'Matematika'],
      average_score: 88,
      test_count: 15,
    },
  },
  {
    insight_id: '2',
    type: 'weakness',
    title: 'Yaxshilash kerak',
    description: 'Ona tili fanidan natijalaringiz o\'rtachadan pastroq. Ayniqsa, adabiy tahlil va matn tuzilishiga e\'tibor bering.',
    related_subject: 'Ona tili',
    priority: 'high',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    metadata: {
      subject: 'Ona tili',
      current_score: 42,
      recommendation: 'Har kuni 30 daqiqa mashq qiling',
      recommended_daily_practice_time: 30,
    },
  },
  {
    insight_id: '3',
    type: 'goal',
    title: 'Keyingi maqsad',
    description: 'Fizika fanidan 70% belgiga erishish uchun yana 5 ta test yechishingiz kerak. Siz to\'g\'ri yo\'ldasiz!',
    related_subject: 'Fizika',
    priority: 'medium',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    metadata: {
      subject: 'Fizika',
      target_score: 70,
      required_tests: 5,
      completion_percentage: 60,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'high':
      return '#EF4444';
    case 'medium':
      return '#F59E0B';
    case 'low':
      return '#22C55E';
    default:
      return '#94A3B8';
  }
}

function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'high':
      return 'Muhim';
    case 'medium':
      return 'O\'rtacha';
    case 'low':
      return 'Past';
    default:
      return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function AIRecommendations({
  insights = MOCK_INSIGHTS,
  isNew = true,
  title = 'AI Tavsiyasi',
  badge = 'Yangi',
  subtitle = "Sun'iy intellekt tahlili",
  onActionClick,
}: AIRecommendationsProps) {
  const { theme: t } = useTheme();

  // Sort by priority: high -> medium -> low
  const sortedInsights = [...insights].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        boxShadow: t.shadowCard,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER SECTION */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          {/* AI Icon */}
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: t.isDark
                ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))'
                : 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.12))',
              border: `1.5px solid ${t.isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.25)'}`,
            }}
          >
            <Brain className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#A855F7' }} strokeWidth={2} />
          </div>

          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base sm:text-lg" style={{ color: t.textPrimary }}>
                {title}
              </h3>
              {isNew && (
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-bold"
                  style={{
                    background: t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
                    color: '#22C55E',
                    border: '1px solid rgba(34,197,94,0.25)',
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm" style={{ color: t.textMuted }}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Sparkles decoration */}
        <Sparkles
          className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse"
          style={{ color: t.isDark ? '#A855F7' : '#8B5CF6' }}
          strokeWidth={2}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* INSIGHTS LIST */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        {sortedInsights.map((insight) => (
          <InsightCard
            key={insight.insight_id}
            insight={insight}
            onActionClick={onActionClick}
            theme={t}
          />
        ))}
      </div>

      {/* Empty state (if no insights) */}
      {insights.length === 0 && (
        <div className="text-center py-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{
              background: t.isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.07)',
              border: `1px solid ${t.isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)'}`,
            }}
          >
            <Brain
              style={{ width: 28, height: 28, color: t.isDark ? '#A855F7' : '#8B5CF6' }}
              strokeWidth={1.5}
            />
          </div>
          <p className="font-bold text-sm mb-1" style={{ color: t.textPrimary }}>
            Tavsiyalar yo'q
          </p>
          <p className="text-xs" style={{ color: t.textMuted }}>
            Testlarni yeching va AI tavsiyalari oling
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insight Card Component
// ─────────────────────────────────────────────────────────────────────────────
interface InsightCardProps {
  insight: Insight;
  onActionClick?: (insightId: string) => void;
  theme: any;
}

function InsightCard({ insight, onActionClick, theme: t }: InsightCardProps) {
  const getInsightIcon = () => {
    switch (insight.type) {
      case 'strength':
        return <Trophy className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#22C55E' }} strokeWidth={2} />;
      case 'weakness':
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#F59E0B' }} strokeWidth={2} />;
      case 'goal':
        return <Target className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#6366F1' }} strokeWidth={2} />;
      default:
        return null;
    }
  };

  const getInsightBg = () => {
    switch (insight.type) {
      case 'strength':
        return t.isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)';
      case 'weakness':
        return t.isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)';
      case 'goal':
        return t.isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)';
      default:
        return t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
    }
  };

  const getInsightBorder = () => {
    switch (insight.type) {
      case 'strength':
        return 'rgba(34,197,94,0.2)';
      case 'weakness':
        return 'rgba(245,158,11,0.2)';
      case 'goal':
        return 'rgba(99,102,241,0.2)';
      default:
        return t.border;
    }
  };

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        background: getInsightBg(),
        border: `1px solid ${getInsightBorder()}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${t.border}`,
            }}
          >
            {getInsightIcon()}
          </div>

          {/* Title */}
          <h4 className="font-bold text-sm" style={{ color: t.textPrimary }}>
            {insight.title}
          </h4>
        </div>

        {/* Priority badge */}
        {insight.priority === 'high' && (
          <span
            className="px-2 py-0.5 rounded-md text-xs font-semibold shrink-0"
            style={{
              background: t.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
              color: getPriorityColor(insight.priority),
              border: `1px solid ${getPriorityColor(insight.priority)}33`,
            }}
          >
            {getPriorityLabel(insight.priority)}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm mb-3 leading-relaxed" style={{ color: t.textSecondary }}>
        {insight.description}
      </p>

      {/* Metadata by Type */}
      {insight.type === 'strength' && insight.metadata?.average_score && (
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{
              background: t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
              color: '#22C55E',
              border: '1px solid rgba(34,197,94,0.25)',
            }}
          >
            {insight.metadata.average_score}% o'rtacha ball
          </div>
          {insight.metadata.test_count && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
              <BookOpen className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{insight.metadata.test_count} ta test</span>
            </div>
          )}
        </div>
      )}

      {insight.type === 'weakness' && insight.metadata?.current_score && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: t.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
                color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              {insight.metadata.current_score}% hozirgi natija
            </div>
            {insight.metadata.recommended_daily_practice_time && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
                <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Kunlik: {insight.metadata.recommended_daily_practice_time} daqiqa</span>
              </div>
            )}
          </div>
        </div>
      )}

      {insight.type === 'goal' && insight.metadata?.target_score && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                color: t.isDark ? '#818CF8' : '#6366F1',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
            >
              Maqsad: {insight.metadata.target_score}%
            </div>
            {insight.metadata.required_tests && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
                <BookOpen className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Yana {insight.metadata.required_tests} ta test</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {insight.metadata.completion_percentage !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
                  Jarayon
                </span>
                <span className="text-xs font-bold" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}>
                  {insight.metadata.completion_percentage}%
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${insight.metadata.completion_percentage}%`,
                    background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                    boxShadow: t.isDark ? '0 0 8px rgba(99,102,241,0.5)' : 'none',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      {onActionClick && (
        <button
          onClick={() => onActionClick(insight.insight_id)}
          className="flex items-center gap-1.5 text-xs font-semibold transition-all"
          style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
          }}
        >
          {insight.type === 'strength' && 'Davom etish'}
          {insight.type === 'weakness' && 'Mashq qilish'}
          {insight.type === 'goal' && 'Testni boshlash'}
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

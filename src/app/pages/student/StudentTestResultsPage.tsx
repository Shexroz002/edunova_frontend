import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  Trophy, Clock, Target, TrendingUp, AlertCircle, ChevronDown,
  ChevronUp, Award, Zap, Brain, ArrowLeft, CheckCircle2, XCircle,
  BarChart3, Sparkles, Home,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface TopicPerformance {
  topic: string;
  subject: string;
  correct: number;
  total: number;
  percentage: number;
}

interface TestResult {
  session_id: number;
  quiz_name: string;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered: number;
  percentage: number;
  total_score: number;
  max_score: number;
  time_spent: string; // format: "mm:ss"
  started_at: string;
  finished_at: string;
  topics: TopicPerformance[];
}

interface FinishSessionResponse {
  session_id: number;
  attempt_id: number;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  wrong_answers: number;
  spend_time: number;
  score: number;
  finished: boolean;
  topic_statistic: Array<{
    topic_name: string;
    total_questions: number;
    correct_answers: number;
  }>;
}

interface SessionQuestionMeta {
  subject: string;
}

interface SessionMetaState {
  questions: SessionQuestionMeta[];
}

function getStoredTestResultKey(sessionId: number) {
  return `student_test_result_${sessionId}`;
}

function loadStoredTestResult(sessionId: number) {
  try {
    const raw = localStorage.getItem(getStoredTestResultKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as TestResult;
  } catch {
    localStorage.removeItem(getStoredTestResultKey(sessionId));
    return null;
  }
}

function persistTestResult(result: TestResult) {
  localStorage.setItem(getStoredTestResultKey(result.session_id), JSON.stringify(result));
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_RESULT: TestResult = {
  session_id: 59,
  quiz_name: 'Fan olimpiadasi - 2026',
  total_questions: 30,
  correct_answers: 18,
  incorrect_answers: 10,
  unanswered: 2,
  percentage: 60,
  total_score: 18,
  max_score: 30,
  time_spent: '27:43',
  started_at: '2026-04-01T06:17:58.684239',
  finished_at: '2026-04-01T06:45:41.684239',
  topics: [
    { topic: 'Tengsizliklar', subject: 'mathematics', correct: 7, total: 10, percentage: 70 },
    { topic: 'Trigonometriya', subject: 'mathematics', correct: 2, total: 5, percentage: 40 },
    { topic: 'Geometriya', subject: 'mathematics', correct: 4, total: 5, percentage: 80 },
    { topic: 'Algebraik ifodalar', subject: 'mathematics', correct: 1, total: 3, percentage: 33 },
    { topic: 'Mexanika', subject: 'physics', correct: 2, total: 4, percentage: 50 },
    { topic: 'Elektr', subject: 'physics', correct: 0, total: 2, percentage: 0 },
    { topic: 'Organik kimyo', subject: 'chemistry', correct: 1, total: 1, percentage: 100 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
function getPerformanceColor(percentage: number): string {
  if (percentage >= 80) return '#22C55E'; // Green
  if (percentage >= 60) return '#FBBF24'; // Yellow
  if (percentage >= 40) return '#FB923C'; // Orange
  return '#EF4444'; // Red
}

function getPerformanceLabel(percentage: number): string {
  if (percentage >= 80) return 'A\'lo';
  if (percentage >= 60) return 'Yaxshi';
  if (percentage >= 40) return 'Qoniqarli';
  return 'Zaif';
}

function getSubjectColor(subject: string): string {
  switch (subject) {
    case 'mathematics': return '#6366F1';
    case 'physics': return '#22C55E';
    case 'chemistry': return '#F59E0B';
    case 'biology': return '#10B981';
    default: return '#8B5CF6';
  }
}

function getSubjectLabel(subject: string): string {
  switch (subject) {
    case 'mathematics': return 'Matematika';
    case 'physics': return 'Fizika';
    case 'chemistry': return 'Kimyo';
    case 'biology': return 'Biologiya';
    default: return subject;
  }
}

function formatSpendTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function mapFinishResponseToResult(data: FinishSessionResponse, session?: SessionMetaState | null): TestResult {
  const subject = session?.questions?.[0]?.subject ?? 'science';

  return {
    session_id: data.session_id,
    quiz_name: `Test #${data.attempt_id}`,
    total_questions: data.total_questions,
    correct_answers: data.correct_answers,
    incorrect_answers: data.wrong_answers,
    unanswered: Math.max(0, data.total_questions - data.answered_questions),
    percentage: data.total_questions > 0 ? Math.round((data.correct_answers / data.total_questions) * 100) : 0,
    total_score: data.score,
    max_score: data.total_questions,
    time_spent: formatSpendTime(data.spend_time),
    started_at: '',
    finished_at: '',
    topics: (Array.isArray(data.topic_statistic) ? data.topic_statistic : []).map((topic) => ({
      topic: topic.topic_name,
      subject,
      correct: topic.correct_answers,
      total: topic.total_questions,
      percentage: topic.total_questions > 0 ? Math.round((topic.correct_answers / topic.total_questions) * 100) : 0,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function StudentTestResultsPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const sessionId = Number.parseInt(id ?? '', 10);
  const locationState = location.state as { result?: FinishSessionResponse; session?: SessionMetaState } | null;
  const [result] = useState<TestResult>(() => (
    locationState?.result
      ? mapFinishResponseToResult(locationState.result, locationState.session)
      : Number.isFinite(sessionId) && sessionId > 0
      ? loadStoredTestResult(sessionId) ?? MOCK_RESULT
      : MOCK_RESULT
  ));
  const [topicFilter, setTopicFilter] = useState<'all' | 'weak'>('all');
  const [showAllTopics, setShowAllTopics] = useState(false);

  useEffect(() => {
    persistTestResult(result);
  }, [result]);

  const performanceColor = getPerformanceColor(result.percentage);
  const performanceLabel = getPerformanceLabel(result.percentage);

  // Filter topics
  const filteredTopics = topicFilter === 'weak'
    ? result.topics.filter(t => t.percentage < 60)
    : result.topics;

  // Sort by percentage (weakest first)
  const sortedTopics = [...filteredTopics].sort((a, b) => a.percentage - b.percentage);

  // Show/hide topics
  const visibleTopics = showAllTopics ? sortedTopics : sortedTopics.slice(0, 5);
  const remainingCount = sortedTopics.length - visibleTopics.length;

  return (
    <div className="min-h-screen pb-8" style={{ background: t.bgBase }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-3 sm:px-6 py-4"
        style={{
          background: t.bgCard,
          borderBottom: `1px solid ${t.border}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/student')}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${t.border}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
              }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: t.textSecondary }} strokeWidth={2} />
            </button>
            <div>
              <h1 className="font-bold text-base sm:text-lg" style={{ color: t.textPrimary }}>
                Test natijalari
              </h1>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: t.textMuted }}>
                {result.quiz_name}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/student')}
            className="px-3 sm:px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all"
            style={{
              background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
              border: `1.5px solid rgba(99,102,241,0.3)`,
              color: '#6366F1',
            }}
          >
            <Home className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">Bosh sahifa</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* 1. MAIN RESULT SUMMARY */}
        <div
          className="rounded-2xl p-6 sm:p-8 mb-4 sm:mb-6 text-center relative overflow-hidden"
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
          }}
        >
          {/* Background decoration */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${performanceColor}, transparent 70%)`,
            }}
          />

          {/* Trophy Icon */}
          <div className="relative mb-4">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mx-auto"
              style={{
                background: `linear-gradient(135deg, ${performanceColor}20, ${performanceColor}10)`,
                border: `2px solid ${performanceColor}40`,
              }}
            >
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: performanceColor }} strokeWidth={2} />
            </div>
          </div>

          {/* Percentage */}
          <div className="mb-3">
            <div className="text-5xl sm:text-6xl font-bold mb-2" style={{ color: performanceColor }}>
              {result.percentage}%
            </div>
            <div
              className="inline-block px-4 py-1.5 rounded-full text-sm font-bold"
              style={{
                background: `${performanceColor}20`,
                color: performanceColor,
                border: `1.5px solid ${performanceColor}40`,
              }}
            >
              {performanceLabel}
            </div>
          </div>

          {/* Score Details */}
          <div className="text-base sm:text-lg font-semibold mb-2" style={{ color: t.textPrimary }}>
            {result.correct_answers} / {result.total_questions} to'g'ri javob
          </div>

          {/* Status Message */}
          <p className="text-sm" style={{ color: t.textMuted }}>
            Yakunlandi: {result.correct_answers} ta to'g'ri, {result.incorrect_answers} ta xato
            {result.unanswered > 0 && `, ${result.unanswered} ta javobsiz`}
          </p>
        </div>

        {/* 2. QUICK STATS */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Time Spent */}
          <div
            className="rounded-2xl p-4 sm:p-5"
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                  border: `1.5px solid rgba(99,102,241,0.25)`,
                }}
              >
                <Clock className="w-5 h-5" style={{ color: '#6366F1' }} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-0.5" style={{ color: t.textMuted }}>
                  Sarflangan vaqt
                </p>
                <p className="text-xl sm:text-2xl font-bold truncate" style={{ color: t.textPrimary }}>
                  {result.time_spent}
                </p>
              </div>
            </div>
          </div>

          {/* Accuracy */}
          <div
            className="rounded-2xl p-4 sm:p-5"
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: t.isDark ? `${performanceColor}20` : `${performanceColor}15`,
                  border: `1.5px solid ${performanceColor}40`,
                }}
              >
                <Target className="w-5 h-5" style={{ color: performanceColor }} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-0.5" style={{ color: t.textMuted }}>
                  Aniqlik
                </p>
                <p className="text-xl sm:text-2xl font-bold truncate" style={{ color: performanceColor }}>
                  {result.percentage}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. TOTAL SCORE BLOCK */}
        <div
          className="rounded-2xl p-5 sm:p-6 mb-4 sm:mb-6"
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
              }}
            >
              <Award className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base sm:text-lg mb-1" style={{ color: t.textPrimary }}>
                Umumiy ball
              </h3>
              <p className="text-sm" style={{ color: t.textMuted }}>
                Siz <span className="font-bold" style={{ color: '#6366F1' }}>{result.total_score} ball</span> to'pladingiz
                {' '}({result.max_score} balldan)
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl sm:text-4xl font-bold" style={{ color: '#6366F1' }}>
                {result.total_score}
              </div>
              <div className="text-xs font-medium" style={{ color: t.textMuted }}>
                / {result.max_score}
              </div>
            </div>
          </div>
        </div>

        {/* 4. TOPIC ANALYSIS SECTION */}
        <div
          className="rounded-2xl p-5 sm:p-6 mb-4 sm:mb-6"
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
          }}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: t.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)',
                  border: `1.5px solid rgba(139,92,246,0.25)`,
                }}
              >
                <BarChart3 className="w-5 h-5" style={{ color: '#8B5CF6' }} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg" style={{ color: t.textPrimary }}>
                  Mavzular tahlili
                </h3>
                <p className="text-xs" style={{ color: t.textMuted }}>
                  {result.topics.length} ta mavzu
                </p>
              </div>
            </div>

            {/* Filters */}
            <div
              className="flex items-center gap-2 p-1 rounded-xl"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${t.border}`,
              }}
            >
              <button
                onClick={() => setTopicFilter('all')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: topicFilter === 'all'
                    ? (t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)')
                    : 'transparent',
                  color: topicFilter === 'all' ? '#6366F1' : t.textMuted,
                  border: topicFilter === 'all' ? '1.5px solid rgba(99,102,241,0.3)' : '1.5px solid transparent',
                }}
              >
                Barchasi
              </button>
              <button
                onClick={() => setTopicFilter('weak')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                style={{
                  background: topicFilter === 'weak'
                    ? (t.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)')
                    : 'transparent',
                  color: topicFilter === 'weak' ? '#EF4444' : t.textMuted,
                  border: topicFilter === 'weak' ? '1.5px solid rgba(239,68,68,0.25)' : '1.5px solid transparent',
                }}
              >
                <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />
                Zaif
              </button>
            </div>
          </div>

          {/* 5. TOPIC LIST */}
          <div className="space-y-3">
            {visibleTopics.map((topic, index) => {
              const topicColor = getPerformanceColor(topic.percentage);
              
              return (
                <div
                  key={index}
                  className="p-4 rounded-xl transition-all"
                  style={{
                    background: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1.5px solid ${t.border}`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                    (e.currentTarget as HTMLElement).style.borderColor = topicColor;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
                    (e.currentTarget as HTMLElement).style.borderColor = t.border;
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm sm:text-base truncate" style={{ color: t.textPrimary }}>
                          {topic.topic}
                        </h4>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-md shrink-0"
                          style={{
                            background: `${getSubjectColor(topic.subject)}20`,
                            color: getSubjectColor(topic.subject),
                          }}
                        >
                          {getSubjectLabel(topic.subject)}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: t.textMuted }}>
                        {topic.correct} / {topic.total} to'g'ri javob
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl sm:text-2xl font-bold" style={{ color: topicColor }}>
                        {topic.percentage}%
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{
                      background: t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${topic.percentage}%`,
                        background: `linear-gradient(90deg, ${topicColor}, ${topicColor}dd)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 6. EXPANDABLE LIST - Show More Button */}
          {remainingCount > 0 && (
            <button
              onClick={() => setShowAllTopics(!showAllTopics)}
              className="w-full mt-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${t.border}`,
                color: t.textSecondary,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = '#6366F1';
                (e.currentTarget as HTMLElement).style.color = '#6366F1';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                (e.currentTarget as HTMLElement).style.borderColor = t.border;
                (e.currentTarget as HTMLElement).style.color = t.textSecondary;
              }}
            >
              {showAllTopics ? (
                <>
                  Kamroq ko'rsatish
                  <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
                </>
              ) : (
                <>
                  Yana {remainingCount} ta ko'rsatish
                  <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                </>
              )}
            </button>
          )}
        </div>

        {/* AI Recommendations (Optional Feature) */}
        {filteredTopics.filter(t => t.percentage < 60).length > 0 && (
          <div
            className="rounded-2xl p-5 sm:p-6 mb-4 sm:mb-6 relative overflow-hidden"
            style={{
              background: t.bgCard,
              border: `1.5px solid rgba(139,92,246,0.3)`,
            }}
          >
            {/* Background decoration */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                background: 'radial-gradient(circle at 50% 0%, #8B5CF6, transparent 70%)',
              }}
            />

            <div className="relative flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                  boxShadow: '0 4px 14px rgba(139,92,246,0.3)',
                }}
              >
                <Sparkles className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base sm:text-lg mb-2 flex items-center gap-2" style={{ color: t.textPrimary }}>
                  AI Tavsiyalar
                </h3>
                <p className="text-sm mb-3" style={{ color: t.textMuted }}>
                  Sizda {filteredTopics.filter(t => t.percentage < 60).length} ta zaif mavzu aniqlandi.
                  Quyidagi mavzularni takrorlash tavsiya etiladi:
                </p>
                <div className="flex flex-wrap gap-2">
                  {filteredTopics
                    .filter(t => t.percentage < 60)
                    .slice(0, 3)
                    .map((topic, i) => (
                      <span
                        key={i}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{
                          background: t.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)',
                          color: '#8B5CF6',
                          border: '1.5px solid rgba(139,92,246,0.25)',
                        }}
                      >
                        {topic.topic}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. ERROR ANALYSIS ACTION */}
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => navigate(`/student/error-analysis/${id}`)}
            className="py-4 px-5 rounded-2xl font-bold text-sm sm:text-base text-white flex items-center justify-center gap-3 transition-all shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(239,68,68,0.5)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(239,68,68,0.4)';
            }}
          >
            <XCircle className="w-5 h-5" strokeWidth={2.5} />
            Xatolar tahlilini boshlash
          </button>

          <button
            onClick={() => navigate('/student/tests')}
            className="py-4 px-5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-all"
            style={{
              background: t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
              border: `1.5px solid rgba(34,197,94,0.3)`,
              color: '#22C55E',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
            Yangi test yechish
          </button>
        </div>
      </div>
    </div>
  );
}

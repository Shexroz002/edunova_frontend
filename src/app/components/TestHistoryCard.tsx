import { useTheme } from './ThemeContext';
import { ClipboardCheck, CheckCircle2, XCircle, MinusCircle, Award } from 'lucide-react';

interface TestHistoryCardProps {
    testName: string;
    subject: string;
    correctAnswers: number;
    incorrectAnswers: number;
    notAnswered: number;
    rank: number | null;
    totalQuestions: number;
    scorePercentage: number;
    date: string;
    time: string;
}

export function TestHistoryCard({
                                    testName,
                                    subject,
                                    correctAnswers,
                                    incorrectAnswers,
                                    notAnswered,
                                    rank,
                                    totalQuestions,
                                    scorePercentage,
                                    date,
                                    time,
                                }: TestHistoryCardProps) {
    const { theme: t } = useTheme();

    // Determine score color
    const getScoreColor = () => {
        if (scorePercentage >= 75) return { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' };
        if (scorePercentage >= 50) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
        return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
    };

    const scoreColor = getScoreColor();

    return (
        <div
            className="rounded-xl p-3 transition-all hover:shadow-lg"
            style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                boxShadow: t.shadowCard,
            }}
        >
            {/* Header Section */}
            <div className="flex items-start gap-2 mb-2">
                {/* Icon */}
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                        background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                        border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
                    }}
                >
                    <ClipboardCheck className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={2} />
                </div>

                {/* Test Name & Subject */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold truncate" style={{ color: t.textPrimary }}>
                        {testName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs" style={{ color: t.isDark ? '#A5B4FC' : '#6366F1' }}>
              {subject}
            </span>
                        <span className="text-xs" style={{ color: t.textMuted }}>
              • {totalQuestions} savol
            </span>
                    </div>
                </div>

                {/* Score Badge */}
                <div
                    className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center"
                    style={{
                        background: `conic-gradient(${scoreColor.color} ${scorePercentage * 3.6}deg, ${t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 0deg)`,
                        border: `1.5px solid ${t.border}`,
                    }}
                >
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: t.bgCard }}
                    >
            <span className="text-xs font-bold" style={{ color: scoreColor.color }}>
              {scorePercentage}%
            </span>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-1.5 mb-2">
                {/* Correct */}
                <div
                    className="flex items-center gap-1 px-2 py-1 rounded-md"
                    style={{
                        background: t.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)',
                        border: `1px solid rgba(34,197,94,0.25)`,
                    }}
                >
                    <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: '#22C55E' }} strokeWidth={2} />
                    <span className="text-xs font-bold" style={{ color: '#22C55E' }}>
            {correctAnswers}
          </span>
                </div>

                {/* Incorrect */}
                <div
                    className="flex items-center gap-1 px-2 py-1 rounded-md"
                    style={{
                        background: t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid rgba(239,68,68,0.25)`,
                    }}
                >
                    <XCircle className="w-3 h-3 shrink-0" style={{ color: '#EF4444' }} strokeWidth={2} />
                    <span className="text-xs font-bold" style={{ color: '#EF4444' }}>
            {incorrectAnswers}
          </span>
                </div>

                {/* Not Answered */}
                <div
                    className="flex items-center gap-1 px-2 py-1 rounded-md"
                    style={{
                        background: t.bgInner,
                        border: `1px solid ${t.border}`,
                    }}
                >
                    <MinusCircle className="w-3 h-3 shrink-0" style={{ color: t.textMuted }} strokeWidth={2} />
                    <span className="text-xs font-bold" style={{ color: t.textMuted }}>
            {notAnswered}
          </span>
                </div>

                {/* Rank Badge */}
                {rank && (
                    <div
                        className="flex items-center gap-1 px-2 py-1 rounded-md"
                        style={{
                            background: t.isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.1)',
                            border: `1px solid rgba(251,191,36,0.3)`,
                        }}
                    >
                        <Award className="w-3 h-3 shrink-0" style={{ color: '#FBBF24' }} strokeWidth={2} />
                        <span className="text-xs font-bold" style={{ color: '#FBBF24' }}>
              #{rank}
            </span>
                    </div>
                )}

                {/* Date/Time */}
                <div className="flex items-center gap-1 px-2 py-1">
          <span className="text-xs" style={{ color: t.textMuted }}>
            {date}, {time}
          </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div>
                <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${scorePercentage}%`,
                            background: `linear-gradient(90deg, ${scoreColor.color}, ${scoreColor.color}dd)`,
                            boxShadow: t.isDark ? `0 0 6px ${scoreColor.color}66` : 'none',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

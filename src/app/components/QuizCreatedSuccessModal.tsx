import { useNavigate } from 'react-router';
import { useTheme } from './ThemeContext';
import { CheckCircle2, FileText, Hash, X, ArrowRight } from 'lucide-react';

export interface QuizCreationResult {
    type: 'completed';
    job_id: string;
    status: 'completed';
    progress: number;
    message: string;
    quiz_id: number | null;
    question_count: number;
    error: null;
}

interface QuizCreatedSuccessModalProps {
    open: boolean;
    onClose: () => void;
    data: QuizCreationResult;
    getQuizPath?: (quizId: number) => string;
}

export function QuizCreatedSuccessModal({ open, onClose, data, getQuizPath }: QuizCreatedSuccessModalProps) {
    const { theme: t } = useTheme();
    const navigate = useNavigate();

    if (!open) return null;

    const handleNavigateToTest = () => {
        if (data.quiz_id !== null) {
            const targetPath = getQuizPath ? getQuizPath(data.quiz_id) : `/student/tests/${data.quiz_id}`;
            navigate(targetPath);
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md rounded-2xl p-6 sm:p-8 animate-in"
                style={{
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    boxShadow: t.isDark
                        ? '0 25px 50px rgba(0,0,0,0.5)'
                        : '0 25px 50px rgba(0,0,0,0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                        background: t.bgInner,
                        border: `1px solid ${t.border}`,
                        color: t.textMuted,
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)';
                        (e.currentTarget as HTMLElement).style.color = '#EF4444';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = t.bgInner;
                        (e.currentTarget as HTMLElement).style.borderColor = t.border;
                        (e.currentTarget as HTMLElement).style.color = t.textMuted;
                    }}
                >
                    <X className="w-4 h-4" strokeWidth={2} />
                </button>

                {/* Success Icon */}
                <div className="text-center mb-6">
                    <div className="relative inline-flex mb-4">
                        {/* Animated ring */}
                        <div
                            className="absolute inset-0 rounded-full animate-ping"
                            style={{
                                background: 'rgba(34,197,94,0.2)',
                                animationDuration: '2s',
                            }}
                        />
                        {/* Main icon container */}
                        <div
                            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center"
                            style={{
                                background: t.isDark
                                    ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.15))'
                                    : 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(22,163,74,0.08))',
                                border: `2px solid ${t.isDark ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.3)'}`,
                                boxShadow: t.isDark
                                    ? '0 0 30px rgba(34,197,94,0.3)'
                                    : '0 4px 20px rgba(34,197,94,0.15)',
                            }}
                        >
                            <CheckCircle2
                                className="w-10 h-10 sm:w-12 sm:h-12"
                                style={{ color: '#22C55E' }}
                                strokeWidth={2}
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: t.textPrimary }}>
                        {data.message}
                    </h2>
                    <p className="text-sm" style={{ color: t.textSecondary }}>
                        Test muvaffaqiyatli yaratildi va tayyor
                    </p>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {/* Question Count */}
                    <div
                        className="p-4 rounded-xl text-center"
                        style={{
                            background: t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)',
                            border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)'}`,
                        }}
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2"
                            style={{
                                background: t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)',
                            }}
                        >
                            <FileText className="w-5 h-5" style={{ color: '#6366F1' }} strokeWidth={1.75} />
                        </div>
                        <p className="text-2xl font-bold mb-1" style={{ color: t.textPrimary }}>
                            {data.question_count}
                        </p>
                        <p className="text-xs" style={{ color: t.textSecondary }}>
                            {data.question_count} ta savol
                        </p>
                    </div>

                    {/* Quiz ID */}
                    {data.quiz_id !== null && (
                        <div
                            className="p-4 rounded-xl text-center"
                            style={{
                                background: t.isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)',
                                border: `1px solid ${t.isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.2)'}`,
                            }}
                        >
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2"
                                style={{
                                    background: t.isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)',
                                }}
                            >
                                <Hash className="w-5 h-5" style={{ color: '#22C55E' }} strokeWidth={1.75} />
                            </div>
                            <p className="text-2xl font-bold mb-1" style={{ color: t.textPrimary }}>
                                {data.quiz_id}
                            </p>
                            <p className="text-xs" style={{ color: t.textSecondary }}>
                                Test ID
                            </p>
                        </div>
                    )}
                </div>

                {/* Progress Indicator */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: t.textSecondary }}>
              Jarayon
            </span>
                        <span className="text-sm font-bold" style={{ color: '#22C55E' }}>
              {data.progress}%
            </span>
                    </div>
                    <div
                        className="w-full h-2 rounded-full overflow-hidden"
                        style={{
                            background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${data.progress}%`,
                                background: 'linear-gradient(90deg, #22C55E, #16A34A)',
                                boxShadow: t.isDark ? '0 0 10px rgba(34,197,94,0.5)' : 'none',
                            }}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all"
                        style={{
                            background: t.bgInner,
                            border: `1px solid ${t.border}`,
                            color: t.textSecondary,
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = t.bgCard;
                            (e.currentTarget as HTMLElement).style.borderColor = t.accent;
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = t.bgInner;
                            (e.currentTarget as HTMLElement).style.borderColor = t.border;
                        }}
                    >
                        Yopish
                    </button>

                    {data.quiz_id !== null && (
                        <button
                            onClick={handleNavigateToTest}
                            className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                            style={{
                                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                                boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(34,197,94,0.4)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(34,197,94,0.3)';
                            }}
                        >
                            Testga o'tish
                            <ArrowRight className="w-4 h-4" strokeWidth={2} />
                        </button>
                    )}
                </div>

                {/* Info Note */}
                <div
                    className="mt-4 p-3 rounded-lg"
                    style={{
                        background: t.isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)',
                        border: `1px solid ${t.isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)'}`,
                    }}
                >
                    <p className="text-xs leading-relaxed" style={{ color: t.textSecondary }}>
            <span className="font-semibold" style={{ color: '#22C55E' }}>
              ✓ Tayyor
            </span>
                        {' '}
                        — Test "Testlar" bo'limida mavjud va uni ishlashni boshlashingiz mumkin
                    </p>
                </div>
            </div>
        </div>
    );
}

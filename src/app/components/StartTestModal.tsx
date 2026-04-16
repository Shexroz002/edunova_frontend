import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from './ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import {
    PlayCircle,
    Search,
    Clock,
    ChevronDown,
    Check,
    BookOpen,
    Calculator,
    FlaskConical,
    Languages,
    Zap,
    Leaf,
    GraduationCap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Quiz {
    id: number;
    title: string;
    subject: string;
    questionCount: number;
    difficulty: 'Oson' | "O'rtacha" | 'Qiyin';
    icon?: string;
}

interface StartTestModalProps {
    open: boolean;
    onClose: () => void;
    onStart?: (quizId: number, timeLimit: number) => void | Promise<void>;
    quizzes?: Quiz[];
    loading?: boolean;
    error?: string | null;
    startError?: string | null;
    onRetry?: () => void;
    isStarting?: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const DEFAULT_QUIZZES: Quiz[] = [
    {
        id: 1,
        title: 'Algebra asoslari',
        subject: 'Matematika',
        questionCount: 20,
        difficulty: "O'rtacha",
        icon: 'calculator',
    },
    {
        id: 2,
        title: 'Geometriya: Uchburchaklar',
        subject: 'Matematika',
        questionCount: 15,
        difficulty: 'Oson',
        icon: 'calculator',
    },
    {
        id: 3,
        title: 'Mexanika: Harakat qonunlari',
        subject: 'Fizika',
        questionCount: 25,
        difficulty: 'Qiyin',
        icon: 'flask',
    },
    {
        id: 4,
        title: 'Elektr toki',
        subject: 'Fizika',
        questionCount: 18,
        difficulty: "O'rtacha",
        icon: 'flask',
    },
    {
        id: 5,
        title: "Grammatika: Fe'llar",
        subject: 'Ona tili',
        questionCount: 12,
        difficulty: 'Oson',
        icon: 'book',
    },
    {
        id: 6,
        title: 'English Grammar: Present Tenses',
        subject: 'Ingliz tili',
        questionCount: 20,
        difficulty: "O'rtacha",
        icon: 'languages',
    },
    {
        id: 7,
        title: 'Vocabulary Building',
        subject: 'Ingliz tili',
        questionCount: 30,
        difficulty: 'Qiyin',
        icon: 'languages',
    },
    {
        id: 8,
        title: 'Kimyoviy elementlar',
        subject: 'Kimyo',
        questionCount: 22,
        difficulty: "O'rtacha",
        icon: 'leaf',
    },
];

// ─── Time Options ─────────────────────────────────────────────────────────────
const TIME_OPTIONS = [
    { value: 10, label: '10 daqiqa' },
    { value: 15, label: '15 daqiqa' },
    { value: 20, label: '20 daqiqa' },
    { value: 30, label: '30 daqiqa' },
    { value: 45, label: '45 daqiqa' },
    { value: 60, label: '1 soat' },
    { value: 90, label: '1.5 soat' },
    { value: 120, label: '2 soat' },
];

// ─── Subject Icon ─────────────────────────────────────────────────────────────
function SubjectIcon({ type, color, size = 18 }: { type: string; color: string; size?: number }) {
    const props = { style: { color }, strokeWidth: 2, width: size, height: size };
    switch (type) {
        case 'calculator':
            return <Calculator {...props} />;
        case 'flask':
            return <FlaskConical {...props} />;
        case 'book':
            return <BookOpen {...props} />;
        case 'languages':
            return <Languages {...props} />;
        case 'leaf':
            return <Leaf {...props} />;
        case 'zap':
            return <Zap {...props} />;
        default:
            return <GraduationCap {...props} />;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function StartTestModal({
    open,
    onClose,
    onStart,
    quizzes = DEFAULT_QUIZZES,
    loading = false,
    error = null,
    startError = null,
    onRetry,
    isStarting = false,
}: StartTestModalProps) {
    const { theme: t } = useTheme();

    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [selectedTime, setSelectedTime] = useState<number>(20);
    const [searchQuery, setSearchQuery] = useState('');
    const [quizDropdownOpen, setQuizDropdownOpen] = useState(false);
    const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

    const quizDropdownRef = useRef<HTMLDivElement>(null);
    const timeDropdownRef = useRef<HTMLDivElement>(null);

    // Filter quizzes based on search
    const filteredQuizzes = useMemo(() => {
        if (!searchQuery.trim()) return quizzes;
        const query = searchQuery.toLowerCase();
        return quizzes.filter(
            (q) =>
                q.title.toLowerCase().includes(query) ||
                q.subject.toLowerCase().includes(query)
        );
    }, [quizzes, searchQuery]);

    // Reset on open
    useEffect(() => {
        if (open) {
            setSelectedQuiz(null);
            setSelectedTime(20);
            setSearchQuery('');
            setQuizDropdownOpen(false);
            setTimeDropdownOpen(false);
        }
    }, [open]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (quizDropdownRef.current && !quizDropdownRef.current.contains(e.target as Node)) {
                setQuizDropdownOpen(false);
            }
            if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target as Node)) {
                setTimeDropdownOpen(false);
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    // Escape key
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (quizDropdownOpen) setQuizDropdownOpen(false);
                else if (timeDropdownOpen) setTimeDropdownOpen(false);
                else onClose();
            }
        };
        if (open) window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, onClose, quizDropdownOpen, timeDropdownOpen]);

    async function handleStart() {
        if (!selectedQuiz) {
            alert('Iltimos testni tanlang');
            return;
        }
        await onStart?.(selectedQuiz.id, selectedTime);
    }

    function getDifficultyColor(difficulty: string) {
        switch (difficulty) {
            case 'Oson':
                return t.isDark ? '#34D399' : '#22C55E';
            case "O'rtacha":
                return t.isDark ? '#FBBF24' : '#F59E0B';
            case 'Qiyin':
                return t.isDark ? '#F87171' : '#EF4444';
            default:
                return t.textSecondary;
        }
    }

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className="p-0 gap-0 max-w-[calc(100%-2rem)] w-full"
                style={{
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    maxWidth: '540px',
                }}
            >
                {/* Header */}
                <DialogHeader className="p-6 pb-4 sm:p-8 sm:pb-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center relative"
                            style={{
                                background: t.isDark
                                    ? 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(129,140,248,0.2) 100%)'
                                    : 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(129,140,248,0.15) 100%)',
                                border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
                            }}
                        >
                            <PlayCircle
                                className="w-7 h-7 sm:w-8 sm:h-8"
                                style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}
                                strokeWidth={2}
                            />
                            {/* Glow effect */}
                            <div
                                className="absolute inset-0 rounded-2xl opacity-50 blur-xl"
                                style={{
                                    background: t.isDark
                                        ? 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)'
                                        : 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
                                }}
                            />
                        </div>
                    </div>
                    <DialogTitle
                        className="text-left text-xl sm:text-2xl font-semibold"
                        style={{ color: t.textPrimary }}
                    >
                        Test ishlash
                    </DialogTitle>
                    <DialogDescription className="text-sm sm:text-base" style={{ color: t.textSecondary }}>
                        Testni tanlang va vaqt limitini belgilang
                    </DialogDescription>
                </DialogHeader>

                {/* Form */}
                <div className="px-6 pb-6 sm:px-8 sm:pb-8 space-y-5">
                    {/* Quiz Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium" style={{ color: t.textPrimary }}>
                            Test <span style={{ color: '#F87171' }}>*</span>
                        </label>

                        <div className="relative" ref={quizDropdownRef}>
                            {/* Selected value / Trigger */}
                            <button
                                onClick={() => setQuizDropdownOpen(!quizDropdownOpen)}
                                className="w-full px-4 py-3.5 sm:py-4 rounded-xl flex items-center justify-between gap-3 transition-all border"
                                style={{
                                    background: t.bgInput,
                                    borderColor: quizDropdownOpen ? t.accent : t.border,
                                    boxShadow: quizDropdownOpen
                                        ? `0 0 0 3px ${t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'}`
                                        : 'none',
                                }}
                            >
                                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                    {selectedQuiz ? (
                                        <>
                                            <div
                                                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    background: t.isDark
                                                        ? 'rgba(99,102,241,0.12)'
                                                        : 'rgba(99,102,241,0.08)',
                                                }}
                                            >
                                                <SubjectIcon
                                                    type={selectedQuiz.icon || 'graduate'}
                                                    color={t.isDark ? '#818CF8' : '#6366F1'}
                                                    size={18}
                                                />
                                            </div>
                                            <div className="flex-1 text-left overflow-hidden">
                                                <div
                                                    className="text-sm sm:text-base font-medium truncate"
                                                    style={{ color: t.textPrimary }}
                                                >
                                                    {selectedQuiz.title}
                                                </div>
                                                <div className="text-xs sm:text-sm flex items-center gap-2 mt-0.5">
                          <span style={{ color: t.textSecondary }}>
                            {selectedQuiz.subject}
                          </span>
                                                    <span style={{ color: t.textMuted }}>•</span>
                                                    <span style={{ color: getDifficultyColor(selectedQuiz.difficulty) }}>
                            {selectedQuiz.difficulty}
                          </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-sm sm:text-base" style={{ color: t.textMuted }}>
                      Testni tanlang...
                    </span>
                                    )}
                                </div>
                                <ChevronDown
                                    className={`w-5 h-5 flex-shrink-0 transition-transform ${
                                        quizDropdownOpen ? 'rotate-180' : ''
                                    }`}
                                    style={{ color: t.textSecondary }}
                                />
                            </button>

                            {/* Dropdown */}
                            {quizDropdownOpen && (
                                <div
                                    className="absolute z-50 w-full mt-2 rounded-xl border overflow-hidden"
                                    style={{
                                        background: t.bgCard,
                                        borderColor: t.border,
                                        boxShadow: t.shadowHover,
                                        maxHeight: '320px',
                                    }}
                                >
                                    {/* Search */}
                                    <div className="p-3 border-b" style={{ borderColor: t.border }}>
                                        <div
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                            style={{ background: t.bgInput }}
                                        >
                                            <Search className="w-4 h-4" style={{ color: t.textMuted }} />
                                            <input
                                                type="text"
                                                placeholder="Qidirish..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="flex-1 bg-transparent outline-none text-sm"
                                                style={{ color: t.textPrimary }}
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* Options */}
                                    <div className="overflow-y-auto" style={{ maxHeight: '260px' }}>
                                        {loading ? (
                                            <div className="p-4 text-center text-sm" style={{ color: t.textMuted }}>
                                                Testlar yuklanmoqda...
                                            </div>
                                        ) : filteredQuizzes.length === 0 ? (
                                            <div className="p-4 text-center text-sm" style={{ color: t.textMuted }}>
                                                Test topilmadi
                                            </div>
                                        ) : (
                                            filteredQuizzes.map((quiz) => (
                                                <button
                                                    key={quiz.id}
                                                    onClick={() => {
                                                        setSelectedQuiz(quiz);
                                                        setQuizDropdownOpen(false);
                                                        setSearchQuery('');
                                                    }}
                                                    className="w-full px-4 py-3 flex items-center gap-3 transition-all hover:bg-opacity-50"
                                                    style={{
                                                        background:
                                                            selectedQuiz?.id === quiz.id ? t.accentMuted : 'transparent',
                                                        borderLeft:
                                                            selectedQuiz?.id === quiz.id
                                                                ? `3px solid ${t.accent}`
                                                                : '3px solid transparent',
                                                    }}
                                                >
                                                    <div
                                                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                                        style={{
                                                            background: t.isDark
                                                                ? 'rgba(99,102,241,0.12)'
                                                                : 'rgba(99,102,241,0.08)',
                                                        }}
                                                    >
                                                        <SubjectIcon
                                                            type={quiz.icon || 'graduate'}
                                                            color={t.isDark ? '#818CF8' : '#6366F1'}
                                                            size={16}
                                                        />
                                                    </div>
                                                    <div className="flex-1 text-left overflow-hidden">
                                                        <div
                                                            className="text-sm font-medium truncate"
                                                            style={{ color: t.textPrimary }}
                                                        >
                                                            {quiz.title}
                                                        </div>
                                                        <div className="text-xs flex items-center gap-2 mt-0.5">
                                                            <span style={{ color: t.textSecondary }}>{quiz.subject}</span>
                                                            <span style={{ color: t.textMuted }}>•</span>
                                                            <span style={{ color: t.textMuted }}>
                                {quiz.questionCount} ta savol
                              </span>
                                                            <span style={{ color: t.textMuted }}>•</span>
                                                            <span style={{ color: getDifficultyColor(quiz.difficulty) }}>
                                {quiz.difficulty}
                              </span>
                                                        </div>
                                                    </div>
                                                    {selectedQuiz?.id === quiz.id && (
                                                        <Check
                                                            className="w-5 h-5 flex-shrink-0"
                                                            style={{ color: t.accent }}
                                                        />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Time Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium" style={{ color: t.textPrimary }}>
                            Vaqt limiti
                        </label>

                        <div className="relative" ref={timeDropdownRef}>
                            {/* Selected time / Trigger */}
                            <button
                                onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                                className="w-full px-4 py-3.5 sm:py-4 rounded-xl flex items-center justify-between gap-3 transition-all border"
                                style={{
                                    background: t.bgInput,
                                    borderColor: timeDropdownOpen ? t.accent : t.border,
                                    boxShadow: timeDropdownOpen
                                        ? `0 0 0 3px ${t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'}`
                                        : 'none',
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                                        style={{
                                            background: t.isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.1)',
                                        }}
                                    >
                                        <Clock
                                            className="w-5 h-5"
                                            style={{ color: t.isDark ? '#FBBF24' : '#F59E0B' }}
                                        />
                                    </div>
                                    <span className="text-sm sm:text-base font-medium" style={{ color: t.textPrimary }}>
                    {TIME_OPTIONS.find((t) => t.value === selectedTime)?.label || '20 daqiqa'}
                  </span>
                                </div>
                                <ChevronDown
                                    className={`w-5 h-5 transition-transform ${
                                        timeDropdownOpen ? 'rotate-180' : ''
                                    }`}
                                    style={{ color: t.textSecondary }}
                                />
                            </button>

                            {/* Dropdown */}
                            {timeDropdownOpen && (
                                <div
                                    className="absolute z-50 w-full mt-2 rounded-xl border overflow-hidden"
                                    style={{
                                        background: t.bgCard,
                                        borderColor: t.border,
                                        boxShadow: t.shadowHover,
                                    }}
                                >
                                    <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
                                        {TIME_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setSelectedTime(option.value);
                                                    setTimeDropdownOpen(false);
                                                }}
                                                className="w-full px-4 py-3 flex items-center justify-between transition-all hover:bg-opacity-50"
                                                style={{
                                                    background:
                                                        selectedTime === option.value ? t.accentMuted : 'transparent',
                                                    borderLeft:
                                                        selectedTime === option.value
                                                            ? `3px solid ${t.accent}`
                                                            : '3px solid transparent',
                                                }}
                                            >
                        <span
                            className="text-sm font-medium"
                            style={{
                                color: selectedTime === option.value ? t.accent : t.textPrimary,
                            }}
                        >
                          {option.label}
                        </span>
                                                {selectedTime === option.value && (
                                                    <Check className="w-5 h-5" style={{ color: t.accent }} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info card */}
                    {selectedQuiz && (
                        <div
                            className="p-4 rounded-xl border"
                            style={{
                                background: t.isDark
                                    ? 'rgba(99,102,241,0.05)'
                                    : 'rgba(99,102,241,0.03)',
                                borderColor: t.isDark
                                    ? 'rgba(99,102,241,0.15)'
                                    : 'rgba(99,102,241,0.1)',
                            }}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: t.isDark
                                            ? 'rgba(99,102,241,0.15)'
                                            : 'rgba(99,102,241,0.1)',
                                    }}
                                >
                                    <BookOpen
                                        className="w-5 h-5"
                                        style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium mb-2" style={{ color: t.textPrimary }}>
                                        Test haqida
                                    </div>
                                    <div className="space-y-1.5 text-xs sm:text-sm">
                                        <div className="flex items-center justify-between">
                                            <span style={{ color: t.textSecondary }}>Savollar soni:</span>
                                            <span className="font-medium" style={{ color: t.textPrimary }}>
                        {selectedQuiz.questionCount} ta
                      </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span style={{ color: t.textSecondary }}>Qiyinlik darajasi:</span>
                                            <span
                                                className="font-medium"
                                                style={{ color: getDifficultyColor(selectedQuiz.difficulty) }}
                                            >
                        {selectedQuiz.difficulty}
                      </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span style={{ color: t.textSecondary }}>Vaqt limiti:</span>
                                            <span className="font-medium" style={{ color: t.textPrimary }}>
                        {TIME_OPTIONS.find((t) => t.value === selectedTime)?.label}
                      </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {(error || startError) && (
                        <div
                            className="rounded-xl border px-4 py-3"
                            style={{
                                background: 'rgba(239,68,68,0.08)',
                                borderColor: 'rgba(239,68,68,0.18)',
                                color: t.isDark ? '#FCA5A5' : '#DC2626',
                            }}
                        >
                            <div className="text-sm font-medium">
                                {startError ?? error}
                            </div>
                            {error && onRetry && !startError && (
                                <button
                                    onClick={onRetry}
                                    className="mt-2 text-sm font-semibold"
                                    style={{ color: t.isDark ? '#FCA5A5' : '#B91C1C' }}
                                >
                                    Qayta urinish
                                </button>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-5 py-3.5 sm:py-4 rounded-xl font-medium transition-all hover:opacity-80 active:scale-98 border"
                            style={{
                                background: 'transparent',
                                color: t.textPrimary,
                                borderColor: t.border,
                            }}
                        >
                            Bekor qilish
                        </button>
                        <button
                            onClick={handleStart}
                            disabled={!selectedQuiz || loading || isStarting}
                            className="flex-1 px-5 py-3.5 sm:py-4 rounded-xl font-medium transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: selectedQuiz
                                    ? t.isDark
                                        ? 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)'
                                        : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                                    : t.bgInput,
                                color: selectedQuiz ? '#fff' : t.textMuted,
                                boxShadow: selectedQuiz
                                    ? t.isDark
                                        ? '0 4px 16px rgba(99,102,241,0.35)'
                                        : '0 4px 16px rgba(99,102,241,0.25)'
                                    : 'none',
                            }}
                        >
                            {isStarting ? (
                                <>
                                    <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                    Boshlanmoqda...
                                </>
                            ) : (
                                <>
                                    <PlayCircle className="w-5 h-5" strokeWidth={2} />
                                    Boshlash
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

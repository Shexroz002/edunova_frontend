import { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import {
    Clock,
    Play,
    X,
    ChevronDown,
    Check,
    Sparkles,
} from 'lucide-react';

// ─── Time Options ─────────────────────────────────────────────────────────────
const TIME_OPTIONS = [
    { value: 10, label: '10 daqiqa' },
    { value: 15, label: '15 daqiqa', recommended: true },
    { value: 20, label: '20 daqiqa' },
    { value: 30, label: '30 daqiqa' },
    { value: 45, label: '45 daqiqa' },
    { value: 60, label: '1 soat' },
    { value: 90, label: '1.5 soat' },
    { value: 120, label: '2 soat' },
];

interface TestTimeModalProps {
    open: boolean;
    onClose: () => void;
    onStart: (timeLimit: number) => void | Promise<void>;
    testTitle?: string;
    questionCount?: number;
    initialTimeLimit?: number;
    isStarting?: boolean;
    error?: string | null;
}

export function TestTimeModal({
                                  open,
                                  onClose,
                                  onStart,
                                  testTitle = 'Test',
                                  questionCount,
                                  initialTimeLimit = 15,
                                  isStarting = false,
                                  error = null,
                              }: TestTimeModalProps) {
    const { theme: t } = useTheme();
    const [selectedTime, setSelectedTime] = useState<number>(initialTimeLimit);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Reset on open
    useEffect(() => {
        if (open) {
            setSelectedTime(initialTimeLimit);
            setDropdownOpen(false);
        }
    }, [open, initialTimeLimit]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        if (open && dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, dropdownOpen]);

    // Escape key handler
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                if (dropdownOpen) {
                    setDropdownOpen(false);
                } else if (!isStarting) {
                    onClose();
                }
            }
        };
        if (open) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [open, onClose, isStarting, dropdownOpen]);

    async function handleStart() {
        await onStart(selectedTime);
    }

    const selectedOption = TIME_OPTIONS.find((opt) => opt.value === selectedTime);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
                background: t.isDark
                    ? 'rgba(0, 0, 0, 0.7)'
                    : 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(8px)',
                animation: 'fadeIn 0.15s ease-out',
            }}
            onClick={onClose}
        >
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

            <div
                className="relative w-full max-w-sm overflow-hidden rounded-2xl"
                style={{
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    boxShadow: t.isDark
                        ? '0 20px 50px rgba(0,0,0,0.5)'
                        : '0 20px 50px rgba(15,23,42,0.2)',
                    animation: 'slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative gradient */}
                <div
                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none opacity-60"
                    style={{
                        background: t.isDark
                            ? 'radial-gradient(circle, rgba(99,102,241,0.2), transparent 65%)'
                            : 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 65%)',
                        filter: 'blur(30px)',
                    }}
                />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                        background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        color: t.textMuted,
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)';
                        (e.currentTarget as HTMLElement).style.color = '#EF4444';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = t.isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.04)';
                        (e.currentTarget as HTMLElement).style.color = t.textMuted;
                    }}
                >
                    <X style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                </button>

                {/* Content */}
                <div className="p-6 sm:p-7">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div
                            className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-3"
                            style={{
                                background: t.isDark
                                    ? 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)'
                                    : 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.08) 100%)',
                                border: `1.5px solid ${t.isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.22)'}`,
                            }}
                        >
                            <Clock
                                style={{
                                    width: 28,
                                    height: 28,
                                    color: t.isDark ? '#818CF8' : '#6366F1',
                                }}
                                strokeWidth={2}
                            />
                        </div>
                        <h2
                            className="text-xl sm:text-2xl font-bold mb-1.5"
                            style={{ color: t.textPrimary }}
                        >
                            Vaqtni tanlang
                        </h2>
                        <p
                            className="text-sm leading-relaxed line-clamp-1"
                            style={{ color: t.textSecondary }}
                        >
                            {testTitle}
                        </p>
                        {questionCount && (
                            <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                                {questionCount} ta savol
                            </p>
                        )}
                    </div>

                    {/* Time Dropdown */}
                    <div className="mb-5">
                        <label
                            className="block text-sm font-medium mb-2"
                            style={{ color: t.textPrimary }}
                        >
                            Vaqt limiti
                        </label>

                        <div className="relative" ref={dropdownRef}>
                            {/* Trigger */}
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="w-full px-4 py-3.5 rounded-xl flex items-center justify-between gap-3 transition-all"
                                style={{
                                    background: t.bgInput,
                                    border: `1.5px solid ${dropdownOpen ? t.accent : t.border}`,
                                    boxShadow: dropdownOpen
                                        ? `0 0 0 3px ${t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'}`
                                        : 'none',
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                                        style={{
                                            background: t.isDark
                                                ? 'rgba(251,191,36,0.12)'
                                                : 'rgba(251,191,36,0.1)',
                                        }}
                                    >
                                        <Clock
                                            style={{
                                                width: 18,
                                                height: 18,
                                                color: t.isDark ? '#FBBF24' : '#F59E0B',
                                            }}
                                            strokeWidth={2}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                    <span
                        className="text-sm sm:text-base font-semibold"
                        style={{ color: t.textPrimary }}
                    >
                      {selectedOption?.label}
                    </span>
                                        {selectedOption?.recommended && (
                                            <span
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                                                style={{
                                                    background: 'linear-gradient(135deg, #10B981, #22C55E)',
                                                    fontSize: 9,
                                                    fontWeight: 800,
                                                    color: '#fff',
                                                    letterSpacing: '0.02em',
                                                }}
                                            >
                        <Sparkles style={{ width: 8, height: 8 }} />
                        TAVSIYA
                      </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronDown
                                    className="flex-shrink-0 transition-transform"
                                    style={{
                                        width: 18,
                                        height: 18,
                                        color: t.textSecondary,
                                        transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    }}
                                    strokeWidth={2.5}
                                />
                            </button>

                            {/* Dropdown Menu */}
                            {dropdownOpen && (
                                <div
                                    className="absolute z-50 w-full mt-2 rounded-xl overflow-hidden"
                                    style={{
                                        background: t.bgCard,
                                        border: `1px solid ${t.border}`,
                                        boxShadow: t.shadowHover,
                                        animation: 'slideUp 0.2s ease-out',
                                    }}
                                >
                                    <div className="max-h-64 overflow-y-auto">
                                        {TIME_OPTIONS.map((option) => {
                                            const isSelected = selectedTime === option.value;
                                            return (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        setSelectedTime(option.value);
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="w-full px-4 py-3 flex items-center justify-between transition-all"
                                                    style={{
                                                        background: isSelected ? t.accentMuted : 'transparent',
                                                        borderLeft: isSelected
                                                            ? `3px solid ${t.accent}`
                                                            : '3px solid transparent',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) {
                                                            (e.currentTarget as HTMLElement).style.background = t.isDark
                                                                ? 'rgba(255,255,255,0.04)'
                                                                : 'rgba(0,0,0,0.02)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) {
                                                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                            <span
                                className="text-sm font-medium"
                                style={{
                                    color: isSelected ? t.accent : t.textPrimary,
                                }}
                            >
                              {option.label}
                            </span>
                                                        {option.recommended && (
                                                            <span
                                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                                                                style={{
                                                                    background: 'linear-gradient(135deg, #10B981, #22C55E)',
                                                                    fontSize: 9,
                                                                    fontWeight: 800,
                                                                    color: '#fff',
                                                                }}
                                                            >
                                <Sparkles style={{ width: 7, height: 7 }} />
                              </span>
                                                        )}
                                                    </div>
                                                    {isSelected && (
                                                        <Check
                                                            style={{ width: 18, height: 18, color: t.accent }}
                                                            strokeWidth={2.5}
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Tip */}
                    <div
                        className="px-3 py-2.5 rounded-xl mb-5"
                        style={{
                            background: t.isDark
                                ? 'rgba(56,189,248,0.08)'
                                : 'rgba(56,189,248,0.05)',
                            border: `1px solid ${t.isDark ? 'rgba(56,189,248,0.18)' : 'rgba(56,189,248,0.12)'}`,
                        }}
                    >
                        <p
                            className="text-xs leading-relaxed"
                            style={{ color: t.textSecondary }}
                        >
                            💡 <span className="font-semibold" style={{ color: t.isDark ? '#38BDF8' : '#0284C7' }}>Maslahat:</span>{' '}
                            Bir savolga o'rtacha 1-2 daqiqa ajrating
                        </p>
                    </div>

                    {error && (
                        <div
                            className="px-3 py-2.5 rounded-xl mb-5 text-sm font-medium"
                            style={{
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.18)',
                                color: '#DC2626',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isStarting}
                            className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
                            style={{
                                background: 'transparent',
                                color: t.textSecondary,
                                border: `1.5px solid ${t.border}`,
                                opacity: isStarting ? 0.7 : 1,
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.borderColor = t.accent;
                                (e.currentTarget as HTMLElement).style.color = t.accent;
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.borderColor = t.border;
                                (e.currentTarget as HTMLElement).style.color = t.textSecondary;
                            }}
                        >
                            Bekor qilish
                        </button>
                        <button
                            onClick={handleStart}
                            disabled={isStarting}
                            className="flex-1 px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
                            style={{
                                background: isStarting
                                    ? t.isDark
                                        ? 'rgba(99,102,241,0.5)'
                                        : 'rgba(99,102,241,0.4)'
                                    : t.isDark
                                        ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                                        : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                color: '#fff',
                                boxShadow: isStarting
                                    ? 'none'
                                    : t.isDark
                                        ? '0 4px 16px rgba(99,102,241,0.35)'
                                        : '0 4px 16px rgba(99,102,241,0.25)',
                                transform: isStarting ? 'scale(0.98)' : 'scale(1)',
                            }}
                            onMouseEnter={(e) => {
                                if (!isStarting) {
                                    (e.currentTarget as HTMLElement).style.boxShadow = t.isDark
                                        ? '0 6px 20px rgba(99,102,241,0.45)'
                                        : '0 6px 20px rgba(99,102,241,0.35)';
                                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isStarting) {
                                    (e.currentTarget as HTMLElement).style.boxShadow = t.isDark
                                        ? '0 4px 16px rgba(99,102,241,0.35)'
                                        : '0 4px 16px rgba(99,102,241,0.25)';
                                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                }
                            }}
                        >
                            {isStarting ? (
                                <>
                                    <div
                                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                        style={{ animation: 'spin 0.6s linear infinite' }}
                                    />
                                    Yuklanmoqda...
                                </>
                            ) : (
                                <>
                                    <Play
                                        style={{ width: 16, height: 16 }}
                                        strokeWidth={2.5}
                                        fill="currentColor"
                                    />
                                    Boshlash
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

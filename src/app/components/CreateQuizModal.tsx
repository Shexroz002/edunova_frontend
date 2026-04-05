import { useState, useMemo, useEffect } from 'react';
import {
  Plus, X, FileUp, Sparkles, ArrowLeft, Check,
  Clock, Zap, Hash, ChevronDown, AlertCircle,
  Calculator, FlaskConical, Leaf, GraduationCap,
} from 'lucide-react';
import { useTheme } from './ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────
export type QuizType = 'manual' | 'pdf' | 'ai';

export interface QuizCreateData {
  title: string;
  subject: string;
  questions: number;
  type: QuizType;
}

export interface CreateQuizModalProps {
  open: boolean;
  onClose: () => void;
  onCreate?: (quiz: QuizCreateData) => void;
}

type CreateMethod = 'pdf' | 'ai' | null;

// ── Constants ─────────────────────────────────────────────────────────────────
const SUBJECTS = [
  { label: 'Matematika', icon: 'calculator', color: '#6366F1' },
  { label: 'Fizika',     icon: 'zap',        color: '#3B82F6' },
  { label: 'Kimyo',      icon: 'flask',      color: '#22C55E' },
  { label: 'Biologiya',  icon: 'leaf',       color: '#8B5CF6' },
  { label: 'Tarix',      icon: 'graduate',   color: '#F59E0B' },
  { label: 'Geografiya', icon: 'graduate',   color: '#14B8A6' },
  { label: 'Ingliz tili',icon: 'graduate',   color: '#EC4899' },
  { label: 'Adabiyot',   icon: 'graduate',   color: '#EF4444' },
];

const DIFFICULTY_OPTIONS = ['Oson', "O'rtacha", 'Qiyin'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function SubjectIcon({ type, color, size = 20 }: { type: string; color: string; size?: number }) {
  const props = { style: { color }, strokeWidth: 1.75, width: size, height: size };
  switch (type) {
    case 'zap':      return <Zap {...props} />;
    case 'flask':    return <FlaskConical {...props} />;
    case 'leaf':     return <Leaf {...props} />;
    case 'graduate': return <GraduationCap {...props} />;
    default:         return <Calculator {...props} />;
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function CreateQuizModal({ open, onClose, onCreate }: CreateQuizModalProps) {
  const { theme: t } = useTheme();

  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<CreateMethod>(null);
  const [creating, setCreating] = useState(false);

  // Common fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [titleError, setTitleError] = useState('');

  // PDF fields
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDragActive, setPdfDragActive] = useState(false);

  // AI fields
  const [aiTopic, setAiTopic] = useState('');
  const [aiQuestions, setAiQuestions] = useState(20);
  const [aiDifficulty, setAiDifficulty] = useState<string>("O'rtacha");
  const [topicError, setTopicError] = useState('');

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setStep(1);
      setMethod(null);
      setCreating(false);
      setTitle('');
      setSubject(SUBJECTS[0]);
      setPdfFile(null);
      setAiTopic('');
      setAiQuestions(20);
      setAiDifficulty("O'rtacha");
      setTitleError('');
      setTopicError('');
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  function handleMethodSelect(m: CreateMethod) {
    setMethod(m);
    setStep(2);
  }

  function handleNext() {
    if (step === 2) {
      if (!title.trim()) { setTitleError('Test nomini kiriting'); return; }
      setTitleError('');
      if (method === 'pdf' && !pdfFile) { alert('Iltimos PDF faylni yuklang'); return; }
      if (method === 'ai' && !aiTopic.trim()) { setTopicError('Mavzuni kiriting'); return; }
      setTopicError('');

      setCreating(true);
      setTimeout(() => {
        onCreate?.({
          title: title.trim(),
          subject: subject.label,
          questions: method === 'ai' ? aiQuestions : 0,
          type: method!,
        });
        setCreating(false);
        onClose();
      }, 1500);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((s) => s - 1);
      if (step === 2) setMethod(null);
    }
  }

  function handlePdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') setPdfFile(file);
  }

  function handlePdfDrop(e: React.DragEvent) {
    e.preventDefault();
    setPdfDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') setPdfFile(file);
  }

  if (!open) return null;

  const accentColor = method === 'pdf' ? '#3B82F6' : method === 'ai' ? '#8B5CF6' : '#6366F1';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(7px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !creating) onClose(); }}
    >
      <div
        className="w-full max-w-2xl flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.isDark ? accentColor + '30' : t.border}`,
          boxShadow: t.isDark
            ? `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${accentColor}15`
            : '0 32px 80px rgba(15,23,42,0.2)',
          maxHeight: '92vh',
        }}
      >
        {/* Gradient top bar */}
        <div className="h-1 w-full shrink-0"
          style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80, #8B5CF6)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: accentColor + '18', border: `1.5px solid ${accentColor}40` }}
            >
              {method === 'pdf'
                ? <FileUp style={{ width: 18, height: 18, color: accentColor }} strokeWidth={1.75} />
                : method === 'ai'
                ? <Sparkles style={{ width: 18, height: 18, color: accentColor }} strokeWidth={1.75} />
                : <Plus style={{ width: 18, height: 18, color: accentColor }} strokeWidth={1.75} />
              }
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: t.textPrimary }}>
                {step === 1 ? 'Test yaratish usulini tanlang' : 'Yangi test yaratish'}
              </h2>
              <p className="text-xs" style={{ color: t.textMuted }}>
                {step === 1 ? 'PDF yoki AI yordamida' : method === 'pdf' ? 'PDF fayldan' : 'AI yordamida'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={creating}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted, opacity: creating ? 0.5 : 1 }}
            onMouseEnter={(e) => { if (!creating) { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)'; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgInner; (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
          >
            <X style={{ width: 15, height: 15 }} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto min-h-0 px-6 pt-5 pb-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${t.border} transparent` } as React.CSSProperties}
        >
          {/* STEP 1: Choose Method */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5">
              {/* PDF Option */}
              <button
                onClick={() => handleMethodSelect('pdf')}
                className="group p-6 rounded-2xl text-left transition-all relative overflow-hidden"
                style={{ background: t.isDark ? t.bgInner : t.bgCard, border: `2px solid ${t.border}` }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#3B82F6';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.04)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(59,130,246,0.15)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = t.border;
                  (e.currentTarget as HTMLElement).style.background = t.isDark ? t.bgInner : t.bgCard;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}>
                  <FileUp style={{ width: 24, height: 24, color: '#3B82F6' }} strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: t.textPrimary }}>PDF fayldan</h3>
                <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>
                  Mavjud PDF hujjatingizdan testni avtomatik yarating. AI savollarni tahlil qiladi va test tuzadi.
                </p>
                <div className="mt-4 pt-3 border-t flex items-center gap-2" style={{ borderColor: t.border }}>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textSecondary }}>
                    <Clock style={{ width: 12, height: 12 }} strokeWidth={1.75} />
                    <span>~2-3 daqiqa</span>
                  </div>
                  <div className="w-1 h-1 rounded-full" style={{ background: t.textMuted }} />
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textSecondary }}>
                    <Zap style={{ width: 12, height: 12 }} strokeWidth={1.75} />
                    <span>Avtomatik</span>
                  </div>
                </div>
              </button>

              {/* AI Option */}
              <button
                onClick={() => handleMethodSelect('ai')}
                className="group p-6 rounded-2xl text-left transition-all relative overflow-hidden"
                style={{ background: t.isDark ? t.bgInner : t.bgCard, border: `2px solid ${t.border}` }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#8B5CF6';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.04)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(139,92,246,0.15)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = t.border;
                  (e.currentTarget as HTMLElement).style.background = t.isDark ? t.bgInner : t.bgCard;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
                  <Sparkles style={{ width: 24, height: 24, color: '#8B5CF6' }} strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: t.textPrimary }}>AI bilan yaratish</h3>
                <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>
                  Mavzu va parametrlarni kiriting, AI sizga qiyin va sifatli test savollarini yaratib beradi.
                </p>
                <div className="mt-4 pt-3 border-t flex items-center gap-2" style={{ borderColor: t.border }}>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textSecondary }}>
                    <Clock style={{ width: 12, height: 12 }} strokeWidth={1.75} />
                    <span>~1-2 daqiqa</span>
                  </div>
                  <div className="w-1 h-1 rounded-full" style={{ background: t.textMuted }} />
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textSecondary }}>
                    <Sparkles style={{ width: 12, height: 12 }} strokeWidth={1.75} />
                    <span>Intellektual</span>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* STEP 2: Create Form */}
          {step === 2 && (
            <div className="space-y-5 pb-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
                  Test nomi *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setTitleError(''); }}
                  placeholder="Masalan: Algebra 1-bob — Tenglamalar"
                  className="w-full px-4 rounded-xl text-sm focus:outline-none transition-all"
                  style={{
                    background: t.bgInner,
                    border: `1.5px solid ${titleError ? '#EF4444' : t.border}`,
                    color: t.textPrimary,
                    height: '44px',
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLElement).style.borderColor = titleError ? '#EF4444' : accentColor;
                    (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${titleError ? 'rgba(239,68,68,0.15)' : accentColor + '15'}`;
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = titleError ? '#EF4444' : t.border;
                    (e.target as HTMLElement).style.boxShadow = 'none';
                  }}
                />
                {titleError && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <AlertCircle style={{ width: 12, height: 12, color: '#EF4444' }} strokeWidth={2} />
                    <p className="text-xs" style={{ color: '#EF4444' }}>{titleError}</p>
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
                  Fan *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SUBJECTS.map((s) => {
                    const isSelected = subject.label === s.label;
                    return (
                      <button
                        key={s.label}
                        onClick={() => setSubject(s)}
                        className="flex items-center gap-2 p-3 rounded-xl transition-all"
                        style={{
                          background: isSelected ? s.color + '12' : t.bgInner,
                          border: `1.5px solid ${isSelected ? s.color + '50' : t.border}`,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLElement).style.borderColor = s.color + '30';
                            (e.currentTarget as HTMLElement).style.background = s.color + '08';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLElement).style.borderColor = t.border;
                            (e.currentTarget as HTMLElement).style.background = t.bgInner;
                          }
                        }}
                      >
                        <SubjectIcon type={s.icon} color={isSelected ? s.color : t.textMuted} size={16} />
                        <span className="text-xs font-medium" style={{ color: isSelected ? s.color : t.textSecondary }}>
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PDF fields */}
              {method === 'pdf' && (
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
                    PDF fayl *
                  </label>
                  <div
                    className="relative rounded-2xl border-2 border-dashed transition-all"
                    style={{
                      borderColor: pdfDragActive ? '#3B82F6' : pdfFile ? '#22C55E' : t.border,
                      background: pdfDragActive ? 'rgba(59,130,246,0.05)' : pdfFile ? 'rgba(34,197,94,0.03)' : t.bgInner,
                    }}
                    onDragEnter={() => setPdfDragActive(true)}
                    onDragLeave={() => setPdfDragActive(false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handlePdfDrop}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="p-8 flex flex-col items-center text-center">
                      {pdfFile ? (
                        <>
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                            <FileUp style={{ width: 28, height: 28, color: '#22C55E' }} strokeWidth={1.75} />
                          </div>
                          <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>{pdfFile.name}</p>
                          <p className="text-xs" style={{ color: t.textMuted }}>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPdfFile(null); }}
                            className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
                          >
                            O'chirish
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}>
                            <FileUp style={{ width: 28, height: 28, color: '#3B82F6' }} strokeWidth={1.75} />
                          </div>
                          <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>PDF faylni yuklang</p>
                          <p className="text-xs" style={{ color: t.textMuted }}>Faylni bu yerga sudrab oling yoki tanlash uchun bosing</p>
                          <p className="text-xs mt-2" style={{ color: t.textMuted }}>Maksimal: 10 MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AI fields */}
              {method === 'ai' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
                      Mavzu *
                    </label>
                    <textarea
                      value={aiTopic}
                      onChange={(e) => { setAiTopic(e.target.value); setTopicError(''); }}
                      placeholder="Masalan: Kvadrat tenglamalar, ularning ildizlari va diskriminant"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all resize-none"
                      style={{
                        background: t.bgInner,
                        border: `1.5px solid ${topicError ? '#EF4444' : t.border}`,
                        color: t.textPrimary,
                      }}
                      onFocus={(e) => {
                        (e.target as HTMLElement).style.borderColor = topicError ? '#EF4444' : accentColor;
                        (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${topicError ? 'rgba(239,68,68,0.15)' : accentColor + '15'}`;
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLElement).style.borderColor = topicError ? '#EF4444' : t.border;
                        (e.target as HTMLElement).style.boxShadow = 'none';
                      }}
                    />
                    {topicError && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <AlertCircle style={{ width: 12, height: 12, color: '#EF4444' }} strokeWidth={2} />
                        <p className="text-xs" style={{ color: '#EF4444' }}>{topicError}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Questions count */}
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
                        Savollar soni
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={aiQuestions}
                          onChange={(e) => setAiQuestions(Math.max(5, Math.min(50, parseInt(e.target.value) || 10)))}
                          min={5}
                          max={50}
                          className="w-full px-4 rounded-xl text-sm focus:outline-none transition-all"
                          style={{
                            background: t.bgInner,
                            border: `1.5px solid ${t.border}`,
                            color: t.textPrimary,
                            height: '44px',
                          }}
                          onFocus={(e) => {
                            (e.target as HTMLElement).style.borderColor = accentColor;
                            (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${accentColor}15`;
                          }}
                          onBlur={(e) => {
                            (e.target as HTMLElement).style.borderColor = t.border;
                            (e.target as HTMLElement).style.boxShadow = 'none';
                          }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Hash style={{ width: 14, height: 14, color: t.textMuted }} strokeWidth={1.75} />
                        </div>
                      </div>
                      <p className="text-xs mt-1" style={{ color: t.textMuted }}>5-50 oralig'ida</p>
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
                        Qiyinlik darajasi
                      </label>
                      <div className="relative">
                        <select
                          value={aiDifficulty}
                          onChange={(e) => setAiDifficulty(e.target.value)}
                          className="w-full appearance-none px-4 rounded-xl text-sm focus:outline-none cursor-pointer transition-all"
                          style={{
                            background: t.bgInner,
                            border: `1.5px solid ${t.border}`,
                            color: t.textPrimary,
                            height: '44px',
                          }}
                          onFocus={(e) => {
                            (e.target as HTMLElement).style.borderColor = accentColor;
                            (e.target as HTMLElement).style.boxShadow = `0 0 0 3px ${accentColor}15`;
                          }}
                          onBlur={(e) => {
                            (e.target as HTMLElement).style.borderColor = t.border;
                            (e.target as HTMLElement).style.boxShadow = 'none';
                          }}
                        >
                          {DIFFICULTY_OPTIONS.map((d) => (
                            <option key={d} value={d} style={{ background: t.bgCard }}>{d}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ width: 14, height: 14, color: t.textMuted }} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 shrink-0 flex gap-2.5"
          style={{ borderTop: `1px solid ${t.border}`, background: t.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}
        >
          {step > 1 ? (
            <button
              onClick={handleBack}
              disabled={creating}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary, opacity: creating ? 0.5 : 1 }}
              onMouseEnter={(e) => { if (!creating) { (e.currentTarget as HTMLElement).style.borderColor = accentColor; (e.currentTarget as HTMLElement).style.color = accentColor; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}
            >
              <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all"
              style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.textMuted; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
            >
              Bekor qilish
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleNext}
              disabled={creating}
              className="flex-[2] h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all text-white"
              style={{
                background: creating ? accentColor + '55' : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                boxShadow: creating ? 'none' : `0 5px 18px ${accentColor}40`,
                cursor: creating ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!creating) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${accentColor}55`; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = creating ? 'none' : `0 5px 18px ${accentColor}40`; }}
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Yaratilmoqda...
                </>
              ) : (
                <>
                  <Check style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                  Test yaratish
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

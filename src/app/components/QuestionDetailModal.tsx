import { useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { X, BookOpen, Layers, CheckCircle, Table2, Image as ImageIcon } from 'lucide-react';
import { useTheme } from './ThemeContext';
import type { QuestionDetail, Difficulty } from '../pages/teacher/QuizDetailPage.tsx';

interface QuestionDetailModalProps {
  open: boolean;
  question: QuestionDetail | null;
  onClose: () => void;
}

export function QuestionDetailModal({ open, question, onClose }: QuestionDetailModalProps) {
  const { theme: t } = useTheme();

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open || !question) return null;

  // Difficulty badge config
  const difficultyConfig = {
    "oson":  { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',   label: 'Oson'   },
    "o'rta": { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)',  label: "O'rta"  },
    "qiyin": { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',   label: 'Qiyin'  },
  };
  const diffCfg = difficultyConfig[question.difficulty] ?? difficultyConfig["o'rta"];

  // Option colors
  const optionColors: Record<string, { color: string; bg: string; border: string }> = {
    A: { color: '#6366F1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)'  },
    B: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)'  },
    C: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
    D: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'   },
    E: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)'  },
    F: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'   },
  };

  // Parse markdown table
  const parseMathSegments = (value: string) => {
    const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+\$)/g;
    const segments: Array<{ type: 'text' | 'math'; value: string; displayMode?: boolean }> = [];
    let lastIndex = 0;

    value.replace(pattern, (match, _group, offset) => {
      if (offset > lastIndex) {
        segments.push({ type: 'text', value: value.slice(lastIndex, offset) });
      }

      const displayMode = match.startsWith('$$') || match.startsWith('\\[');
      const mathValue = match.startsWith('$$')
        ? match.slice(2, -2)
        : match.startsWith('\\[')
        ? match.slice(2, -2)
        : match.startsWith('\\(')
        ? match.slice(2, -2)
        : match.slice(1, -1);

      segments.push({ type: 'math', value: mathValue, displayMode });
      lastIndex = offset + match.length;
      return match;
    });

    if (lastIndex < value.length) {
      segments.push({ type: 'text', value: value.slice(lastIndex) });
    }

    return segments.length > 0 ? segments : [{ type: 'text', value }];
  };

  const MathText = ({ text }: { text: string }) => (
    <div>
      {parseMathSegments(text).map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <span key={`${segment.type}-${index}`} style={{ whiteSpace: 'pre-wrap' }}>
              {segment.value}
            </span>
          );
        }

        return (
          <span
            key={`${segment.type}-${index}`}
            className={segment.displayMode ? 'block my-1 overflow-x-auto overflow-y-hidden' : 'inline-block align-middle'}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(segment.value, {
                throwOnError: false,
                displayMode: segment.displayMode,
                strict: 'ignore',
              }),
            }}
          />
        );
      })}
    </div>
  );

  const renderMarkdownTable = (markdown: string) => {
    if (!markdown.trim()) return null;

    const normalizedMarkdown = markdown
      .replace(/\|\|/g, '|\n|')
      .replace(/\r\n/g, '\n')
      .trim();

    const lines = normalizedMarkdown.split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;

    // Extract header
    const headerCells = lines[0]
      .split('|')
      .map(c => c.trim())
      .filter(Boolean);

    // Extract rows (skip separator line at index 1)
    const dataRows = lines.slice(2).map(line =>
      line.split('|').map(c => c.trim()).filter(Boolean)
    );

    return (
      <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${t.border}` }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
              {headerCells.map((cell, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-left text-xs font-semibold"
                  style={{ color: t.textPrimary }}
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  borderBottom: rowIdx < dataRows.length - 1 ? `1px solid ${t.border}` : 'none',
                }}
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-4 py-2.5 text-sm"
                    style={{ color: t.textSecondary }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-3xl flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          boxShadow: t.isDark
            ? '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.12)'
            : '0 32px 80px rgba(15,23,42,0.2)',
          maxHeight: '92vh',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 sm:px-6 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.25)' }}
            >
              <BookOpen className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold truncate" style={{ color: t.textPrimary }}>
                Savol tafsilotlari
              </h2>
              <p className="text-xs truncate" style={{ color: t.textMuted }}>
                Savol #{question.id} · {question.subject}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ml-3"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
              (e.currentTarget as HTMLElement).style.color = '#EF4444';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.bgInner;
              (e.currentTarget as HTMLElement).style.color = t.textMuted;
              (e.currentTarget as HTMLElement).style.borderColor = t.border;
            }}
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 sm:px-6 py-5 space-y-5">
          
          {/* Meta info */}
          <div className="flex flex-wrap gap-3">
            {/* Subject */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: t.accent }} strokeWidth={1.75} />
              <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                {question.subject}
              </span>
            </div>

            {/* Topic */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" style={{ color: t.accent }} strokeWidth={1.75} />
              <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                {question.topic}
              </span>
            </div>

            {/* Difficulty */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: diffCfg.bg, border: `1px solid ${diffCfg.border}` }}
            >
              <span className="text-xs font-semibold" style={{ color: diffCfg.color }}>
                {diffCfg.label}
              </span>
            </div>
          </div>

          {/* Question text */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}
              >
                <span className="text-xs font-bold" style={{ color: t.accent }}>?</span>
              </div>
              <h3 className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                Savol matni
              </h3>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
            >
              <div className="text-sm leading-relaxed" style={{ color: t.textPrimary }}>
                <MathText text={question.question_text} />
              </div>
            </div>
          </div>

          {/* Table (if exists) */}
          {question.table_markdown && question.table_markdown.trim() && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}
                >
                  <Table2 className="w-3 h-3" style={{ color: t.accent }} strokeWidth={2} />
                </div>
                <h3 className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                  Jadval
                </h3>
              </div>
              {renderMarkdownTable(question.table_markdown)}
            </div>
          )}

          {/* Images (if exist) */}
          {question.images && question.images.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}
                >
                  <ImageIcon className="w-3 h-3" style={{ color: t.accent }} strokeWidth={2} />
                </div>
                <h3 className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                  Rasmlar ({question.images.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.images.map((img) => (
                  <div
                    key={img.id}
                    className="relative rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${t.border}`, background: t.bgInner }}
                  >
                    <img
                      src={img.image_url}
                      alt={`Savol rasmi ${img.id}`}
                      className="w-full h-auto object-contain"
                      style={{ maxHeight: '300px' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}
              >
                <span className="text-xs font-bold" style={{ color: t.accent }}>
                  {question.options.length}
                </span>
              </div>
              <h3 className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                Javob variantlari
              </h3>
            </div>
            <div className="space-y-2.5">
              {question.options.map((opt) => {
                const oc = optionColors[opt.label] ?? optionColors['A'];
                const isCorrect = opt.is_correct;

                return (
                  <div
                    key={opt.id}
                    className="flex items-start gap-3 p-3.5 rounded-xl transition-all"
                    style={{
                      background: isCorrect ? 'rgba(34,197,94,0.08)' : t.bgInner,
                      border: `1.5px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : t.border}`,
                    }}
                  >
                    {/* Label badge */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: isCorrect ? 'rgba(34,197,94,0.12)' : oc.bg,
                        color: isCorrect ? '#22C55E' : oc.color,
                        border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : oc.border}`,
                      }}
                    >
                      {opt.label}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      <div className="text-sm" style={{ color: isCorrect ? '#22C55E' : t.textPrimary }}>
                        <MathText text={opt.text} />
                      </div>

                      {/* Correct indicator */}
                      {isCorrect && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <CheckCircle
                            className="w-4 h-4"
                            style={{ color: '#22C55E' }}
                            strokeWidth={2}
                          />
                          <span className="text-xs font-bold" style={{ color: '#22C55E' }}>
                            To'g'ri
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-5 sm:px-6 py-4 shrink-0 flex justify-end"
          style={{
            borderTop: `1px solid ${t.border}`,
            background: t.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
          }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 22px rgba(99,102,241,0.5)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)';
            }}
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}

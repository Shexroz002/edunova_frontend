import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  ArrowLeft, BookOpen, Layers, Zap, AlignLeft, Table2,
  ImagePlus, X, CheckCircle, ChevronDown, Save, RotateCcw,
  FileText, AlertCircle, GripVertical, Plus,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';
import { TOPIC_BANKS } from './QuizDetailPage.tsx';
import type { Difficulty } from './QuizDetailPage.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
interface Option {
  id: number;
  key: string;
  text: string;
  isCorrect: boolean;
}

interface FormState {
  subject: string;
  topic: string;
  difficulty: Difficulty;
  questionText: string;
  tableMarkdown: string;
  options: Option[];
}

function normalizeDifficulty(value: string): Difficulty {
  if (value === 'oson' || value === "o'rta" || value === 'qiyin') {
    return value;
  }

  return "o'rta";
}

function normalizeImageUrl(value: string) {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

async function fetchWithAuthRetry(url: string, init: RequestInit = {}) {
  let token = await getValidAccessToken();
  if (!token) {
    throw new Error('Sessiya topilmadi. Qayta kiring');
  }

  const makeRequest = (accessToken: string) => fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let response = await makeRequest(token);

  if (response.status === 401) {
    const refreshed = await refreshStoredAuthToken();
    token = refreshed?.access_token ?? null;
    if (!token) {
      throw new Error('Sessiya tugagan. Qayta kiring');
    }
    response = await makeRequest(token);
  }

  return response;
}

async function fetchQuestionDetail(questionId: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/question/detail/${questionId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Savol ma'lumotlarini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<QuestionEditApiResponse>;
}

async function updateQuestion(questionId: string, payload: {
  subject: string;
  question_text: string;
  table_markdown: string;
  difficulty: Difficulty;
  topic: string;
}) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/question/${questionId}/edit`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status !== 202) {
    throw new Error(`Savolni saqlashda xatolik: ${response.status}`);
  }

  return response.json() as Promise<Omit<QuestionEditApiResponse, 'id' | 'images' | 'options'>>;
}

async function uploadQuestionImage(questionId: string, file: File) {
  let token = await getValidAccessToken();
  if (!token) {
    throw new Error('Sessiya topilmadi. Qayta kiring');
  }

  const formData = new FormData();
  formData.append('image', file);

  const makeRequest = (accessToken: string) => fetch(`${API_BASE_URL}/api/v1/question/upload-image/${questionId}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  let response = await makeRequest(token);

  if (response.status === 401) {
    const refreshed = await refreshStoredAuthToken();
    token = refreshed?.access_token ?? null;
    if (!token) {
      throw new Error('Sessiya tugagan. Qayta kiring');
    }
    response = await makeRequest(token);
  }

  if (!response.ok) {
    throw new Error(`Rasm yuklashda xatolik: ${response.status}`);
  }

  return response.json() as Promise<{
    question_id: number;
    image_url: string;
    id: number;
    created_at: string;
    updated_at: string;
  }>;
}

async function deleteQuestionImage(questionId: string, imageId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/question/delete-image/${questionId}/${imageId}`, {
    method: 'DELETE',
  });

  if (response.status !== 204) {
    throw new Error(`Rasmni o'chirishda xatolik: ${response.status}`);
  }
}

async function updateCorrectOption(questionId: string, optionId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/question/update-correct-option/${questionId}/${optionId}`, {
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(`To'g'ri javobni yangilashda xatolik: ${response.status}`);
  }
}

function mapQuestionToForm(data: QuestionEditApiResponse): FormState {
  return {
    subject: data.subject,
    topic: data.topic,
    difficulty: normalizeDifficulty(data.difficulty),
    questionText: data.question_text,
    tableMarkdown: data.table_markdown ?? '',
    options: data.options.map((option) => ({
      id: option.id,
      key: option.label,
      text: option.text,
      isCorrect: option.is_correct,
    })),
  };
}

function mapQuestionImages(data: QuestionEditApiResponse): UploadedImage[] {
  return data.images.map((image) => ({
    id: image.id,
    url: normalizeImageUrl(image.image_url),
    name: image.image_url.split('/').pop() ?? `image-${image.id}`,
  }));
}

interface QuestionEditApiResponse {
  id: number;
  subject: string;
  question_text: string;
  table_markdown: string;
  difficulty: string;
  topic: string;
  images: Array<{ id: number; image_url: string }>;
  options: Array<{
    id: number;
    label: string;
    text: string;
    is_correct: boolean;
  }>;
}

interface UploadedImage {
  id: number;
  url: string;
  name: string;
}

function parseMathSegments(value: string) {
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
}

function MathText({ text }: { text: string }) {
  return (
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
}

// ─────────────────────────────────────────────
//  Table Builder Helper Functions
// ─────────────────────────────────────────────
function tableToMarkdown(rows: string[][]): string {
  if (rows.length === 0) return '';
  
  const lines: string[] = [];
  
  // Header row
  lines.push('| ' + rows[0].map(cell => cell.trim() || ' ').join(' | ') + ' |');
  
  // Separator
  lines.push('| ' + rows[0].map(() => '---').join(' | ') + ' |');
  
  // Data rows
  for (let i = 1; i < rows.length; i++) {
    lines.push('| ' + rows[i].map(cell => cell.trim() || ' ').join(' | ') + ' |');
  }
  
  return lines.join('\n');
}

// ─────────────────────────────────────────────
//  Table Builder Component
// ─────────────────────────────────────────────
function TableBuilder({ 
  onConvert 
}: { 
  onConvert: (markdown: string) => void;
}) {
  const { theme: t } = useTheme();
  const [rows, setRows] = useState<string[][]>([
    ['Ustun 1', 'Ustun 2', 'Ustun 3'],
    ['', '', ''],
    ['', '', ''],
  ]);

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    setRows(prev => prev.map((row, r) => 
      r === rowIdx 
        ? row.map((cell, c) => c === colIdx ? value : cell)
        : row
    ));
  };

  const addRow = () => {
    setRows(prev => [...prev, Array(prev[0].length).fill('')]);
  };

  const addColumn = () => {
    setRows(prev => prev.map((row, idx) => 
      [...row, idx === 0 ? `Ustun ${row.length + 1}` : '']
    ));
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 2) return; // Keep at least header + 1 row
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const removeColumn = (idx: number) => {
    if (rows[0].length <= 2) return; // Keep at least 2 columns
    setRows(prev => prev.map(row => row.filter((_, i) => i !== idx)));
  };

  const handleConvert = () => {
    const markdown = tableToMarkdown(rows);
    onConvert(markdown);
  };

  const handleReset = () => {
    setRows([
      ['Ustun 1', 'Ustun 2', 'Ustun 3'],
      ['', '', ''],
      ['', '', ''],
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Table builder */}
      <div 
        className="overflow-x-auto rounded-xl p-4"
        style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-10"></th>
              {rows[0]?.map((_, colIdx) => (
                <th key={colIdx} className="text-center pb-2">
                  <button
                    onClick={() => removeColumn(colIdx)}
                    disabled={rows[0].length <= 2}
                    className="w-6 h-6 rounded-lg flex items-center justify-center mx-auto transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ 
                      background: t.bgCard, 
                      border: `1px solid ${t.border}`, 
                      color: t.textMuted 
                    }}
                    onMouseEnter={(e) => {
                      if (rows[0].length > 2) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)';
                        (e.currentTarget as HTMLElement).style.color = '#EF4444';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = t.bgCard;
                      (e.currentTarget as HTMLElement).style.borderColor = t.border;
                      (e.currentTarget as HTMLElement).style.color = t.textMuted;
                    }}
                  >
                    <X className="w-3 h-3" strokeWidth={2} />
                  </button>
                </th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {/* Row delete button */}
                <td className="pr-2">
                  {rowIdx > 0 && (
                    <button
                      onClick={() => removeRow(rowIdx)}
                      disabled={rows.length <= 2}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ 
                        background: t.bgCard, 
                        border: `1px solid ${t.border}`, 
                        color: t.textMuted 
                      }}
                      onMouseEnter={(e) => {
                        if (rows.length > 2) {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)';
                          (e.currentTarget as HTMLElement).style.color = '#EF4444';
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = t.bgCard;
                        (e.currentTarget as HTMLElement).style.borderColor = t.border;
                        (e.currentTarget as HTMLElement).style.color = t.textMuted;
                      }}
                    >
                      <X className="w-3 h-3" strokeWidth={2} />
                    </button>
                  )}
                </td>

                {/* Cells */}
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="p-1">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-all"
                      style={{
                        background: rowIdx === 0 ? t.accentMuted : t.bgCard,
                        border: `1px solid ${rowIdx === 0 ? t.accentBorder : t.border}`,
                        color: rowIdx === 0 ? t.accent : t.textPrimary,
                        fontWeight: rowIdx === 0 ? 600 : 400,
                        minWidth: '120px',
                      }}
                      placeholder={rowIdx === 0 ? 'Sarlavha' : 'Ma\'lumot'}
                      onFocus={(e) => {
                        (e.target as HTMLElement).style.borderColor = '#6366F1';
                        (e.target as HTMLElement).style.boxShadow = '0 0 0 2px rgba(99,102,241,0.12)';
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLElement).style.borderColor = rowIdx === 0 ? t.accentBorder : t.border;
                        (e.target as HTMLElement).style.boxShadow = 'none';
                      }}
                    />
                  </td>
                ))}

                {/* Row grip (decorative) */}
                <td className="pl-2">
                  {rowIdx > 0 && (
                    <GripVertical 
                      className="w-4 h-4 cursor-grab" 
                      style={{ color: t.textMuted }} 
                      strokeWidth={1.5} 
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add row/column buttons */}
        <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${t.border}` }}>
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ 
              background: t.bgCard, 
              border: `1px solid ${t.border}`, 
              color: t.textMuted 
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.accentMuted;
              (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder;
              (e.currentTarget as HTMLElement).style.color = t.accent;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.bgCard;
              (e.currentTarget as HTMLElement).style.borderColor = t.border;
              (e.currentTarget as HTMLElement).style.color = t.textMuted;
            }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            Qator qo'shish
          </button>

          <button
            onClick={addColumn}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ 
              background: t.bgCard, 
              border: `1px solid ${t.border}`, 
              color: t.textMuted 
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.accentMuted;
              (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder;
              (e.currentTarget as HTMLElement).style.color = t.accent;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.bgCard;
              (e.currentTarget as HTMLElement).style.borderColor = t.border;
              (e.currentTarget as HTMLElement).style.color = t.textMuted;
            }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            Ustun qo'shish
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ml-auto"
            style={{ 
              background: t.bgCard, 
              border: `1px solid ${t.border}`, 
              color: t.textMuted 
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)';
              (e.currentTarget as HTMLElement).style.color = '#EF4444';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.bgCard;
              (e.currentTarget as HTMLElement).style.borderColor = t.border;
              (e.currentTarget as HTMLElement).style.color = t.textMuted;
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
            Tozalash
          </button>
        </div>
      </div>

      {/* Convert button */}
      <button
        onClick={handleConvert}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all"
        style={{
          background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
          boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(99,102,241,0.4)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.3)';
        }}
      >
        <CheckCircle className="w-4 h-4" strokeWidth={2} />
        Markdown-ga o'girish va qo'llash
      </button>

      {/* Info */}
      <div 
        className="flex items-start gap-2 p-3 rounded-lg"
        style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}
      >
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: t.accent }} strokeWidth={1.75} />
        <div>
          <p className="text-xs font-semibold" style={{ color: t.accent }}>
            Jadval qanday ishlaydi?
          </p>
          <p className="text-xs mt-1" style={{ color: t.textSecondary }}>
            Jadvalni to'ldiring, keyin "Markdown-ga o'girish" tugmasini bosing. 
            Jadval avtomatik ravishda Markdown formatiga aylanadi va pastdagi matn maydoniga qo'shiladi.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Shared styled primitives
// ─────────────────────────────────────────────
function FieldLabel({ icon: Icon, label, required }: { icon: React.ElementType; label: string; required?: boolean }) {
  const { theme: t } = useTheme();
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold mb-2 select-none">
      <Icon className="w-3.5 h-3.5" style={{ color: t.accent }} strokeWidth={1.75} />
      <span style={{ color: t.textSecondary }}>{label}</span>
      {required && <span style={{ color: '#EF4444' }}>*</span>}
    </label>
  );
}

function StyledInput({
  value, onChange, placeholder, className = '',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  const { theme: t } = useTheme();
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 rounded-xl text-sm focus:outline-none transition-all ${className}`}
      style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textPrimary, height: '42px' }}
      onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
      onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = t.border;  (e.target as HTMLElement).style.boxShadow = 'none'; }}
    />
  );
}

function StyledSelect({
  value, onChange, options,
}: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  const { theme: t } = useTheme();
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none pr-9 pl-4 rounded-xl text-sm focus:outline-none cursor-pointer transition-all"
        style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textPrimary, height: '42px' }}
        onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
        onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = t.border;  (e.target as HTMLElement).style.boxShadow = 'none'; }}
      >
        {options.map(({ value: v, label }) => (
          <option key={v} value={v} style={{ background: t.bgCard }}>{label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: t.textMuted }} />
    </div>
  );
}

function StyledTextarea({
  value, onChange, placeholder, rows = 4, mono = false,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; mono?: boolean;
}) {
  const { theme: t } = useTheme();
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all resize-y"
      style={{
        background: t.bgInner,
        border: `1px solid ${t.border}`,
        color: t.textPrimary,
        fontFamily: mono ? 'ui-monospace, "Cascadia Code", "Fira Code", monospace' : undefined,
        fontSize: mono ? '0.8rem' : undefined,
        minHeight: `${rows * 24 + 24}px`,
      }}
      onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
      onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = t.border;  (e.target as HTMLElement).style.boxShadow = 'none'; }}
    />
  );
}

// ─────────────────────────────────────────────
//  Difficulty selector (coloured pills)
// ─────────────────────────────────────────────
const DIFF_OPTIONS: { value: Difficulty; label: string; color: string; bg: string; border: string }[] = [
  { value: 'oson',   label: 'Oson',   color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)'   },
  { value: "o'rta",  label: "O'rta",  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  { value: 'qiyin',  label: 'Qiyin',  color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)'  },
];

function DifficultyPills({ value, onChange }: { value: Difficulty; onChange: (v: Difficulty) => void }) {
  const { theme: t } = useTheme();
  return (
    <div className="flex gap-2">
      {DIFF_OPTIONS.map((d) => {
        const active = value === d.value;
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => onChange(d.value)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: active ? d.bg : t.bgInner,
              color:      active ? d.color : t.textMuted,
              border:     `1.5px solid ${active ? d.border : t.border}`,
              boxShadow:  active ? `0 0 0 3px ${d.bg}` : 'none',
            }}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Options editor
// ─────────────────────────────────────────────
const OPTION_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  A: { color: '#6366F1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)'  },
  B: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)'  },
  C: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
  D: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'   },
};

function OptionsEditor({
  options, onCorrectChange, updatingOptionId,
}: {
  options: Option[];
  onCorrectChange: (optionId: number) => void;
  updatingOptionId: number | null;
}) {
  const { theme: t } = useTheme();

  return (
    <div className="space-y-2.5">
      {options.map((opt) => {
        const oc = OPTION_COLORS[opt.key] ?? { color: t.accent, bg: t.accentMuted, border: t.accentBorder };
        return (
          <div
            key={opt.key}
            className="flex items-center gap-3 p-3 rounded-xl transition-all"
            style={{
              background: opt.isCorrect ? oc.bg : t.bgInner,
              border: `1.5px solid ${opt.isCorrect ? oc.border : t.border}`,
            }}
          >
            {/* Drag handle (decorative) */}
            <GripVertical className="w-4 h-4 shrink-0 cursor-grab" style={{ color: t.textMuted }} strokeWidth={1.5} />

            {/* Option letter badge */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: oc.bg, color: oc.color, border: `1px solid ${oc.border}` }}
            >
              {opt.key}
            </div>

            <div
              className="flex-1 px-3 py-2 rounded-lg text-sm min-w-0"
              style={{
                background: opt.isCorrect ? 'transparent' : t.bgCard,
                border: `1px solid ${opt.isCorrect ? oc.border : t.border}`,
                color: t.textPrimary,
              }}
            >
              <MathText text={opt.text} />
            </div>

            {/* Correct toggle */}
            <button
              type="button"
              onClick={() => onCorrectChange(opt.id)}
              disabled={updatingOptionId === opt.id}
              title={opt.isCorrect ? "To'g'ri javob" : "To'g'ri deb belgilash"}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
              style={{
                background: opt.isCorrect ? '#22C55E' : t.bgCard,
                border: `1.5px solid ${opt.isCorrect ? '#22C55E' : t.border}`,
                color: opt.isCorrect ? '#fff' : t.textMuted,
              }}
            >
              {updatingOptionId === opt.id ? (
                <div className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" strokeWidth={2} />
              )}
            </button>
          </div>
        );
      })}

      {/* Correct answer legend */}
      <div className="flex items-center gap-1.5 pt-1">
        <CheckCircle className="w-3.5 h-3.5" style={{ color: '#22C55E' }} strokeWidth={2} />
        <span className="text-xs" style={{ color: t.textMuted }}>
          To'g'ri javobni o'zgartirish mumkin. Variant matnlari ushbu ekranda faqat ko'rish uchun.
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Image upload zone
// ─────────────────────────────────────────────
function ImageUploadZone({
  images, onAdd, onRemove, uploading,
}: {
  images: UploadedImage[];
  onAdd: (files: File[]) => void;
  onRemove: (id: number) => void;
  uploading: boolean;
}) {
  const { theme: t } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    onAdd(Array.from(files).filter((f) => f.type.startsWith('image/')));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-xl cursor-pointer transition-all"
        style={{
          background: dragging ? t.accentMuted : t.bgInner,
          border: `2px dashed ${dragging ? t.accent : t.border}`,
        }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}>
          <ImagePlus className="w-5 h-5" style={{ color: t.accent }} strokeWidth={1.75} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>
            Rasm yuklash
          </p>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            Tasvirlarni bu yerga sudrab olib keling yoki bosing
          </p>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
            PNG, JPG, GIF — maks 5 MB
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }}
        >
          <ImagePlus className="w-3.5 h-3.5" strokeWidth={2} />
          {uploading ? 'Yuklanmoqda...' : 'Rasm tanlash'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => processFiles(e.target.files)} />
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden"
              style={{ width: '88px', height: '88px', border: `1px solid ${t.border}` }}>
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
              {/* Overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                style={{ background: 'rgba(0,0,0,0.55)' }}>
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: '#EF4444', color: '#fff' }}
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Section divider
// ─────────────────────────────────────────────
function SectionDivider({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  const { theme: t } = useTheme();
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}>
        <Icon className="w-3.5 h-3.5" style={{ color: t.accent }} strokeWidth={1.75} />
      </div>
      <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>{title}</span>
      <div className="flex-1 h-px" style={{ background: t.border }} />
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
const SUBJECT_OPTIONS = ['Matematika', 'Fizika', 'Kimyo', 'Biologiya'];

export function QuizQuestionEditPage() {
  const { theme: t } = useTheme();
  const { quizId, qnum } = useParams<{ quizId: string; qnum: string }>();
  const navigate = useNavigate();
  const questionId = qnum ?? '';

  const [form, setForm] = useState<FormState>({
    subject: 'Matematika',
    topic: '',
    difficulty: "o'rta",
    questionText: '',
    tableMarkdown: '',
    options: [],
  });
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [initialImages, setInitialImages] = useState<UploadedImage[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [optionUpdatingId, setOptionUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!questionId) {
      setLoading(false);
      setError('Savol identifikatori topilmadi');
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    fetchQuestionDetail(questionId)
      .then((data) => {
        if (cancelled) return;
        const nextForm = mapQuestionToForm(data);
        const nextImages = mapQuestionImages(data);
        setForm(nextForm);
        setInitialForm(nextForm);
        setImages(nextImages);
        setInitialImages(nextImages);
        setShowTable(Boolean(data.table_markdown?.trim()));
        setHasChanges(false);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Savolni yuklashda xatolik yuz berdi");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [questionId]);

  // Subject change → reset topic suggestions
  const handleSubjectChange = (val: string) => {
    const topics = TOPIC_BANKS[val] ?? [];
    setForm((f) => ({ ...f, subject: val, topic: topics[0] ?? '' }));
    setHasChanges(true);
  };

  const update = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!questionId) return;

    setSaving(true);
    setError(null);

    try {
      const result = await updateQuestion(questionId, {
        subject: form.subject,
        question_text: form.questionText,
        table_markdown: form.tableMarkdown,
        difficulty: form.difficulty,
        topic: form.topic,
      });

      const nextForm = {
        ...form,
        subject: result.subject,
        questionText: result.question_text,
        tableMarkdown: result.table_markdown,
        difficulty: normalizeDifficulty(result.difficulty),
        topic: result.topic,
      };

      setForm(nextForm);
      setInitialForm(nextForm);
      setHasChanges(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Savolni saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!initialForm) return;
    setForm(initialForm);
    setImages(initialImages);
    setShowTable(Boolean(initialForm.tableMarkdown.trim()));
    setHasChanges(false);
  };

  const handleUploadImages = async (files: File[]) => {
    if (!questionId || files.length === 0) return;

    setImageUploading(true);
    setError(null);

    try {
      const uploaded = await Promise.all(files.map((file) => uploadQuestionImage(questionId, file)));
      const nextImages = [
        ...images,
        ...uploaded.map((image) => ({
          id: image.id,
          url: normalizeImageUrl(image.image_url),
          name: image.image_url.split('/').pop() ?? `image-${image.id}`,
        })),
      ];
      setImages(nextImages);
      setInitialImages(nextImages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Rasm yuklashda xatolik yuz berdi");
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = async (imageId: number) => {
    if (!questionId) return;

    setError(null);

    try {
      await deleteQuestionImage(questionId, imageId);
      const nextImages = images.filter((image) => image.id !== imageId);
      setImages(nextImages);
      setInitialImages(nextImages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Rasmni o'chirishda xatolik yuz berdi");
    }
  };

  const handleCorrectOptionChange = async (optionId: number) => {
    if (!questionId) return;

    setOptionUpdatingId(optionId);
    setError(null);

    try {
      await updateCorrectOption(questionId, optionId);
      const nextOptions = form.options.map((option) => ({
        ...option,
        isCorrect: option.id === optionId,
      }));
      setForm((current) => ({ ...current, options: nextOptions }));
      setInitialForm((current) => (current ? { ...current, options: nextOptions } : current));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "To'g'ri javobni yangilashda xatolik yuz berdi");
    } finally {
      setOptionUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
          <FileText className="w-7 h-7 animate-pulse" style={{ color: t.textMuted }} strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>Savol yuklanmoqda...</p>
      </div>
    );
  }

  if (error && !initialForm) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
          <AlertCircle className="w-7 h-7" style={{ color: t.textMuted }} strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>{error}</p>
        <button onClick={() => navigate('/quizzes')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
          <ArrowLeft className="w-4 h-4" /> Testlar ro'yxatiga qaytish
        </button>
      </div>
    );
  }

  // Topic suggestions for current subject
  const topicSuggestions = TOPIC_BANKS[form.subject] ?? [];

  return (
    <>
      {/* ══════════════════════════════════════
          BREADCRUMB
      ══════════════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-1.5 mb-6 text-xs" style={{ color: t.textMuted }}>
        <button
          onClick={() => navigate('/quizzes')}
          className="transition-colors hover:underline"
          style={{ color: t.textMuted }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.accent; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
        >
          Testlar
        </button>
        <span>/</span>
        <button
          onClick={() => navigate(`/quizzes/${quizId}`)}
          className="transition-colors hover:underline"
          style={{ color: t.textMuted }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.accent; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
        >
          {`Test #${quizId}`}
        </button>
        <span>/</span>
        <span style={{ color: t.textSecondary }}>Savol #{questionId} — Tahrirlash</span>
      </div>

      {/* ══════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/quizzes/${quizId}`)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.accent; (e.currentTarget as HTMLElement).style.color = t.accent; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: t.textPrimary }}>
                Savolni tahrirlash
              </h1>
              {/* Question number badge */}
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: t.accentMuted, color: t.accent, border: `1px solid ${t.accentBorder}` }}>
                <FileText className="w-3 h-3" strokeWidth={2} />
                Savol #{questionId}
              </span>
              {/* Unsaved indicator */}
              {hasChanges && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                  Saqlanmagan
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
              {`Test #${quizId}`} · {form.subject}
            </p>
          </div>
        </div>

        {/* Top action row */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#F59E0B'; (e.currentTarget as HTMLElement).style.color = '#F59E0B'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border;  (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
          >
            <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Qayta tiklash</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: saved ? '#22C55E' : 'linear-gradient(135deg,#6366F1,#4F46E5)',
              boxShadow: saved ? '0 4px 14px rgba(34,197,94,0.35)' : '0 4px 14px rgba(99,102,241,0.3)',
            }}
            onMouseEnter={(e) => { if (!saved) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            {saved
              ? <><CheckCircle className="w-4 h-4" strokeWidth={2} />Saqlandi!</>
              : saving
              ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saqlanmoqda...</>
              : <><Save className="w-4 h-4" strokeWidth={1.75} />Saqlash</>}
          </button>
        </div>
      </div>

      {error && initialForm && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#DC2626' }}
        >
          {error}
        </div>
      )}

      {/* ══════════════════════════════════════
          MAIN FORM CARD
      ══════════════════════════════════════ */}
      <div
        className="rounded-2xl p-5 sm:p-7"
        style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
      >

        {/* ── SECTION 1: Metadata ───────────── */}
        <SectionDivider title="Asosiy ma'lumotlar" icon={Layers} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Subject */}
          <div>
            <FieldLabel icon={BookOpen} label="Fan" required />
            <StyledSelect
              value={form.subject}
              onChange={handleSubjectChange}
              options={SUBJECT_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
          </div>

          {/* Topic */}
          <div>
            <FieldLabel icon={FileText} label="Mavzu" required />
            <div className="relative">
              <StyledInput
                value={form.topic}
                onChange={(v) => update('topic', v)}
                placeholder="Mavzuni kiriting..."
              />
              {/* Suggestion chips */}
              {topicSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {topicSuggestions.map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => update('topic', tp)}
                      className="px-2 py-0.5 rounded-lg text-xs transition-all"
                      style={{
                        background: form.topic === tp ? t.accentMuted : t.bgInner,
                        color:      form.topic === tp ? t.accent       : t.textMuted,
                        border:     `1px solid ${form.topic === tp ? t.accentBorder : t.border}`,
                      }}
                    >
                      {tp}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <FieldLabel icon={Zap} label="Qiyinlik darajasi" required />
            <DifficultyPills value={form.difficulty} onChange={(v) => update('difficulty', v)} />
          </div>
        </div>

        {/* ── SECTION 2: Question text ──────── */}
        <SectionDivider title="Savol matni" icon={AlignLeft} />

        <div>
          <FieldLabel icon={AlignLeft} label="Savol matni" required />
          <StyledTextarea
            value={form.questionText}
            onChange={(v) => update('questionText', v)}
            placeholder="Savol matnini kiriting..."
            rows={5}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: t.textMuted }}>
              Matematik formulalarni LaTeX formatida yozish mumkin: <code className="px-1 py-0.5 rounded text-xs" style={{ background: t.bgInner }}>$x^2 + y^2 = z^2$</code>
            </span>
            <span className="text-xs tabular-nums" style={{ color: t.textMuted }}>
              {form.questionText.length} ta belgi
            </span>
          </div>
          {form.questionText.trim() && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}>
                  <AlignLeft className="w-3.5 h-3.5" style={{ color: t.accent }} strokeWidth={1.75} />
                </div>
                <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                  Ko'rinish
                </span>
              </div>
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textPrimary }}
              >
                <MathText text={form.questionText} />
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 3: Table markdown ─────── */}
        <SectionDivider title="Jadval (ixtiyoriy)" icon={Table2} />

        <div>
          {/* Toggle */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs" style={{ color: t.textMuted }}>
                Savol jadval ma'lumotlarini o'z ichiga olgan bo'lsa, Markdown formatida kiriting
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: showTable ? t.accentMuted : t.bgInner,
                color: showTable ? t.accent : t.textMuted,
                border: `1px solid ${showTable ? t.accentBorder : t.border}`,
              }}
            >
              <Table2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              {showTable ? 'Yashirish' : "Jadval qo'shish"}
            </button>
          </div>

          {showTable && (
            <div className="space-y-4">
              {/* Table Builder */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>
                  Jadval Yaratish (Grafikli)
                </label>
                <TableBuilder 
                  onConvert={(markdown) => {
                    update('tableMarkdown', markdown);
                    setHasChanges(true);
                  }} 
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: t.border }} />
                <span className="text-xs font-semibold" style={{ color: t.textMuted }}>
                  yoki
                </span>
                <div className="flex-1 h-px" style={{ background: t.border }} />
              </div>

              {/* Manual markdown input */}
              <div>
                <FieldLabel icon={Table2} label="Jadval (Markdown - qo'lda kiritish)" />
                <StyledTextarea
                  value={form.tableMarkdown}
                  onChange={(v) => update('tableMarkdown', v)}
                  placeholder={`| Ustun 1 | Ustun 2 | Ustun 3 |\n|---------|---------|----------|\n| Ma'lumot | Ma'lumot | Ma'lumot |`}
                  rows={6}
                  mono
                />
              </div>

              {/* Preview */}
              {form.tableMarkdown.trim() && (
                <div className="mt-3 p-4 rounded-xl overflow-x-auto"
                  style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: t.textMuted }}>Ko'rinish (Markdown):</p>
                  <pre className="text-xs whitespace-pre-wrap" style={{ color: t.textSecondary, fontFamily: 'monospace' }}>
                    {form.tableMarkdown}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 4: Images ─────────────── */}
        <SectionDivider title="Rasmlar (ixtiyoriy)" icon={ImagePlus} />

        <ImageUploadZone
          images={images}
          onAdd={handleUploadImages}
          onRemove={handleRemoveImage}
          uploading={imageUploading}
        />

        {/* ── SECTION 5: Options ────────────── */}
        <SectionDivider title="Javob variantlari" icon={CheckCircle} />

        <OptionsEditor
          options={form.options}
          onCorrectChange={handleCorrectOptionChange}
          updatingOptionId={optionUpdatingId}
        />

        {/* ── Bottom action bar ─────────────── */}
        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-8 pt-6"
          style={{ borderTop: `1px solid ${t.border}` }}
        >
          {/* Changed count indicator */}
          {hasChanges && (
            <p className="text-xs mr-auto flex items-center gap-1.5" style={{ color: t.textMuted }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              O'zgarishlar saqlanmagan
            </p>
          )}

          {/* Cancel */}
          <button
            type="button"
            onClick={() => navigate(`/quizzes/${quizId}`)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#EF4444'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}
          >
            <X className="w-4 h-4" strokeWidth={2} />
            Bekor qilish
          </button>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: saved ? '#22C55E' : 'linear-gradient(135deg,#6366F1,#4F46E5)',
              boxShadow: saved ? '0 4px 14px rgba(34,197,94,0.35)' : '0 4px 16px rgba(99,102,241,0.3)',
              minWidth: '160px',
            }}
            onMouseEnter={(e) => { if (!saved) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(99,102,241,0.4)'; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = saved ? '0 4px 14px rgba(34,197,94,0.35)' : '0 4px 16px rgba(99,102,241,0.3)'; }}
          >
            {saved
              ? <><CheckCircle className="w-4 h-4" strokeWidth={2} />Muvaffaqiyatli saqlandi!</>
              : saving
              ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saqlanmoqda...</>
              : <><Save className="w-4 h-4" strokeWidth={1.75} />O'zgarishlarni saqlash</>}
          </button>
        </div>
      </div>
    </>
  );
}

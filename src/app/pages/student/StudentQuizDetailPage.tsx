import { useState, useEffect, useRef, type ComponentType } from 'react';
import { useNavigate, useParams } from 'react-router';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  ArrowLeft, ChevronRight, Hash, Users, CalendarDays,
  Calculator, FlaskConical, Leaf, Languages, BookOpen, Globe,
  Pencil, Eye, X, Target, BarChart2,
  Sparkles, Play, ListChecks,
  Save, CheckCircle, GripVertical, Trash2, Plus,
  Table2, AlertCircle, RotateCcw, ImagePlus,
  AlignLeft, Layers, ChevronDown, Cpu, Upload, PenLine,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';
import { QuestionDetailModal } from '../../components/QuestionDetailModal';
import type { QuestionDetail } from '../teacher/QuizDetailPage.tsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

type Difficulty = 'Oson' | "O'rta" | 'Qiyin';
type QuizType = 'manual' | 'pdf' | 'ai';
type QuizGenerateTypeApi = 'AI_GENERATE' | 'PDF' | 'MANUAL' | 'UNDEFINED';

interface QuizQuestion {
  id: number;
  order: number;
  text: string;
  topic: string;
  difficulty: Difficulty;
  correctPct: number;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  subject: string;
  questions: number;
  type: QuizType;
  subjectColor: string;
  subjectIcon: string;
  status: string;
  createdDate: string;
  participants: number;
  isNew: boolean;
  avgScore: number;
}

interface StudentQuizDetailApiQuestion {
  id: number;
  question_text: string | null;
  topic: string | null;
  difficulty: string | null;
}

interface StudentQuizDetailResponse {
  id: number;
  title: string | null;
  description: string | null;
  subject: string | null;
  quiz_generate_type: QuizGenerateTypeApi | null;
  questions: StudentQuizDetailApiQuestion[] | null;
}

interface QuestionDetailApiResponse {
  id: number;
  subject: string | null;
  question_text: string | null;
  table_markdown: string | null;
  difficulty: string | null;
  topic: string | null;
  images: Array<{ id: number; image_url: string }> | null;
  options: Array<{
    id: number;
    label: string;
    text: string;
    is_correct: boolean;
  }> | null;
}

interface UploadedImage {
  id: number;
  url: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function diffStyle(d: Difficulty) {
  switch (d) {
    case 'Oson':  return { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.28)'  };
    case "O'rta": return { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)'  };
    case 'Qiyin': return { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.28)'  };
  }
}

function correctColor(pct: number) {
  if (pct >= 80) return '#22C55E';
  if (pct >= 60) return '#FBBF24';
  return '#EF4444';
}

function SubjectIcon({ type, color, size = 18 }: { type: string; color: string; size?: number }) {
  const p = { style: { color }, strokeWidth: 1.75, width: size, height: size };
  switch (type) {
    case 'flask':     return <FlaskConical {...p} />;
    case 'leaf':      return <Leaf {...p} />;
    case 'book':      return <BookOpen {...p} />;
    case 'languages': return <Languages {...p} />;
    case 'globe':     return <Globe {...p} />;
    default:          return <Calculator {...p} />;
  }
}

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeImageUrl(value: string) {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

function mapApiDifficulty(value: string | null | undefined): Difficulty {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "o'rta" || normalized === 'orta') return "O'rta";
  if (normalized === 'qiyin') return 'Qiyin';
  return 'Oson';
}

function getSubjectPresentation(subject: string | null | undefined) {
  const normalized = normalizeText(subject).toLowerCase();

  switch (normalized) {
    case 'fizika':
      return { color: '#3B82F6', icon: 'flask' };
    case 'kimyo':
      return { color: '#22C55E', icon: 'leaf' };
    case 'biologiya':
      return { color: '#10B981', icon: 'leaf' };
    case 'ona tili':
    case 'adabiyot':
      return { color: '#F59E0B', icon: 'book' };
    case 'ingliz tili':
    case 'rus tili':
      return { color: '#EC4899', icon: 'languages' };
    case 'geografiya':
    case 'tarix':
      return { color: '#14B8A6', icon: 'globe' };
    case 'matematika':
    default:
      return { color: '#6366F1', icon: 'calculator' };
  }
}

function mapApiQuizType(value: QuizGenerateTypeApi | null | undefined): QuizType {
  switch (value) {
    case 'AI_GENERATE':
      return 'ai';
    case 'PDF':
      return 'pdf';
    case 'MANUAL':
    case 'UNDEFINED':
    default:
      return 'manual';
  }
}

function quizTypeStyle(type: QuizType) {
  switch (type) {
    case 'ai':
      return { label: 'AI Generated', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' };
    case 'pdf':
      return { label: 'PDF', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' };
    case 'manual':
    default:
      return { label: "Qo'lda", color: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' };
  }
}

type MathSegment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; displayMode: boolean };

function parseMathSegments(value: string): MathSegment[] {
  const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+\$)/g;
  const segments: MathSegment[] = [];
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

function renderMath(value: string, displayMode: boolean) {
  return katex.renderToString(value, {
    throwOnError: false,
    displayMode,
    strict: 'ignore',
  });
}

function MathText({
  text,
  className = '',
  color,
}: {
  text: string;
  className?: string;
  color: string;
}) {
  const segments = parseMathSegments(text);

  return (
    <div className={className} style={{ color }}>
      {segments.map((segment, index) => {
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
            dangerouslySetInnerHTML={{ __html: renderMath(segment.value, segment.displayMode) }}
          />
        );
      })}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Noma\'lum sana';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function estimateCorrectPct(difficulty: Difficulty) {
  switch (difficulty) {
    case 'Qiyin':
      return 42;
    case "O'rta":
      return 67;
    case 'Oson':
    default:
      return 88;
  }
}

function mapQuizResponse(data: StudentQuizDetailResponse): { quiz: Quiz; questions: QuizQuestion[] } {
  const subject = normalizeText(data.subject, "Noma'lum fan");
  const subjectPresentation = getSubjectPresentation(subject);
  const quizType = mapApiQuizType(data.quiz_generate_type);
  const questionItems = Array.isArray(data.questions) ? data.questions : [];
  const questions = questionItems.map((question, index) => {
    const difficulty = mapApiDifficulty(question.difficulty);
    return {
      id: question.id,
      order: index + 1,
      text: normalizeText(question.question_text, `Savol ${index + 1}`),
      topic: normalizeText(question.topic, 'Umumiy mavzu'),
      difficulty,
      correctPct: estimateCorrectPct(difficulty),
    };
  });

  return {
    quiz: {
      id: data.id,
      title: normalizeText(data.title, 'Nomsiz test'),
      description: normalizeText(data.description, "Tavsif mavjud emas"),
      subject,
      questions: questions.length,
      type: quizType,
      subjectColor: subjectPresentation.color,
      subjectIcon: subjectPresentation.icon,
      status: 'Faol',
      createdDate: formatDate(new Date().toISOString()),
      participants: 0,
      isNew: false,
      avgScore: 0,
    },
    questions,
  };
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

async function fetchStudentQuizDetail(quizId: number) {
  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/student/quizzes/${quizId}/`,
    { method: 'GET' },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Testni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<StudentQuizDetailResponse>;
}

function mapQuizTypeToApi(type: QuizType): QuizGenerateTypeApi {
  switch (type) {
    case 'ai':
      return 'AI_GENERATE';
    case 'pdf':
      return 'PDF';
    case 'manual':
    default:
      return 'MANUAL';
  }
}

async function updateQuizDetail(quizId: number, payload: {
  title: string;
  quiz_generate_type: QuizGenerateTypeApi;
  subject: string;
  description: string;
}) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/quizzes/${quizId}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Testni saqlashda xatolik: ${response.status}`);
  }

  return response.json().catch(() => null);
}

async function fetchQuestionDetail(questionId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/question/detail/${questionId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Savol tafsilotlarini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<QuestionDetailApiResponse>;
}

async function uploadQuestionImage(questionId: number, file: File) {
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

async function deleteQuestionImage(questionId: number, imageId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/question/delete-image/${questionId}/${imageId}`, {
    method: 'DELETE',
  });

  if (response.status !== 204) {
    throw new Error(`Rasmni o'chirishda xatolik: ${response.status}`);
  }
}

async function updateQuestionCorrectOption(questionId: number, optionId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/question/update-correct-option/${questionId}/${optionId}`, {
    method: 'PUT',
  });

  if (response.status !== 200) {
    throw new Error(`To'g'ri javobni saqlashda xatolik: ${response.status}`);
  }
}

async function updateQuestion(questionId: number, payload: {
  subject: string;
  question_text: string;
  table_markdown: string;
  difficulty: 'oson' | "o'rta" | 'qiyin';
  topic: string;
}) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/question/${questionId}/edit`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`Savolni saqlashda xatolik: ${response.status}`);
  }

  return response.json().catch(() => null);
}

function mapQuestionDetail(detail: QuestionDetailApiResponse): QuestionDetail {
  return {
    id: detail.id,
    subject: normalizeText(detail.subject, "Noma'lum fan"),
    question_text: normalizeText(detail.question_text, 'Savol matni mavjud emas'),
    table_markdown: detail.table_markdown ?? '',
    difficulty: mapDiff(mapApiDifficulty(detail.difficulty)),
    topic: normalizeText(detail.topic, 'Umumiy mavzu'),
    images: Array.isArray(detail.images) ? detail.images : [],
    options: Array.isArray(detail.options) ? detail.options : [],
  };
}

// Convert student difficulty to teacher format (lowercase)
function mapDiff(d: Difficulty): 'oson' | "o'rta" | 'qiyin' {
  return ({ 'Oson': 'oson', "O'rta": "o'rta", 'Qiyin': 'qiyin' } as Record<string, 'oson' | "o'rta" | 'qiyin'>)[d] ?? 'oson';
}

// Option seeds per subject for generating answer choices
const OPTION_SEEDS: Record<string, string[][]> = {
  Matematika: [
    ['x = 2', 'x = -2', 'x = 4', 'x = -4'],
    ['D = b²-4ac', 'D = b²+4ac', 'D = 4ac-b²', 'D = b-4ac'],
    ['x = 1, x = 6', 'x = 2, x = 3', 'x = -2, x = -3', 'x = -1, x = 6'],
    ['-4 < x < 4', '-3 < x < 5', 'x < -4 yoki x > 4', 'x ≤ -3 yoki x ≥ 5'],
    ['n(n+1)/2', 'n(n-1)/2', 'n²', '2n+1'],
    ['3a²b - 3ab²', 'a³ - 3a²b + 3ab² - b³', '(a-b)(a²+ab+b²)', '(a+b)(a²-ab+b²)'],
    ['x > 2 yoki x < -2', 'x > 2', '-2 < x < 2', 'x < -2'],
    ['x=1, y=3', 'x=2, y=2', 'x=3, y=0', 'x=0, y=4'],
    ['Xornerning teoremasi', 'Bezu teoremasi', 'Nyuton binom', 'Ferma kichik teoremasi'],
    ['5', '6', '4', '7'],
  ],
  Fizika: [
    ['Inersiya qonuni', 'Harakat miqdori', 'Tortishish qonuni', 'Dinamika asosi'],
    ['Tezlanish', 'Tezlik', 'Massa', 'Kuch'],
    ['9.8 m/s²', '10.2 m/s²', '8.9 m/s²', '11 m/s²'],
    ['Tezlanish o\'zgarganda', 'Doim mavjud', 'Tezlik o\'zgarganda', 'Massa o\'zgarganda'],
    ['1 J', '0.5 J', '2 J', '0.25 J'],
    ['Impuls saqlanadi', 'Kinetik energiya saqlanadi', 'Tezlik saqlanadi', 'Kuch saqlanadi'],
    ['O\'zgarmaydi', 'Ortib boradi', 'Kamayib boradi', 'Nolga teng'],
    ['a = v²/r', 'a = v/r', 'a = rω', 'a = r/v²'],
    ['Ikki jism bir-biriga teng, qarama-qarshi kuch bilan ta\'sir qiladi', 'Kuch massaga proportsional', 'Jism tashqi ta\'sirsiz harakatini o\'zgartirmaydi', 'Energiya saqlanadi'],
    ['ΣF=0, ΣM=0', 'F=ma', 'ΣF≠0', 'M=0'],
  ],
  Kimyo: [
    ['Temperatura, konsentratsiya, bosim, katalizator', 'Faqat temperatura', 'Bosim va hajm', 'Konsentratsiya va hajm'],
    ['Muvozanat siljishi', 'Tezlik oshishi', 'Harorat o\'zgarishi', 'Konsentratsiya o\'zgarishi'],
    ['2H₂ + O₂ → 2H₂O', 'H₂ + O₂ → H₂O', 'H₂ + 2O₂ → 2H₂O', '2H₂ + 2O₂ → 2H₂O'],
    ['+6', '+3', '+7', '+4'],
    ['M = Σ(Ar × n)', 'M = m/V', 'M = n/m', 'M = V/n'],
    ['1 mol', '2 mol', '0.5 mol', '18 mol'],
    ['Neytrallash', 'Oksidlanish-qaytarilish', 'Parchalanish', 'Birikish'],
    ['Elektr toki yordamida moddalarni parchalash', 'Kimyoviy reaksiya', 'Erituvchi aralashma', 'Ionli almashinish'],
    ['Valentlik - atom tomonidan hosil qilinadigan bog\'lar soni, oksidlanish darajasi - shartli zaryad', 'Bir xil tushunchalar', 'Valentlik manfiy bo\'lishi mumkin', 'Oksidlanish darajasi faqat musbat'],
    ['ΔG = ΔH - TΔS; ΔG < 0 spontan', 'ΔG > 0 spontan', 'ΔG = 0 spontan', 'ΔG = ΔH + TΔS'],
  ],
  'Ingliz tili': [
    ['Present Perfect Continuous', 'Past Simple', 'Future Simple', 'Present Continuous'],
    ['has gone', 'went', 'goes', 'had gone'],
    ['Past Perfect - harakatdan oldinroq bo\'lgan voqea', 'Bir xil', 'Past Simple - davomiy harakat', 'Past Perfect - oddiy o\'tgan'],
    ['The bridge was built in 1990', 'The bridge has been built', 'The bridge had been built', 'The bridge is built'],
    ['If + Past Simple + would + V1', 'If + Past Perfect + would have + V3', 'If + Present + will + V1', 'If + V1 + would + V1'],
    ['He said that he was tired', 'He says he is tired', 'He said he is tired', 'He told he was tired'],
    ['Must - shaxsiy majburiyat; have to - tashqi majburiyat', 'Bir xil', 'Must - tashqi majburiyat', 'Have to - shaxsiy majburiyat'],
    ['enjoy swimming (gerund)', 'enjoy to swim', 'enjoy swim', 'enjoy swum'],
    ['will have found', 'will find', 'has found', 'would find'],
    ['on Monday, at 9 am', 'in Monday, on 9 am', 'at Monday, in 9 am', 'on Monday, in 9 am'],
  ],
  Biologiya: [
    ['Energiya ishlab chiqarish (nafas olish)', 'Protein sintezi', 'DNK saqlash', 'Fotosintez'],
    ['DNK - ikki zanjirli, dezoksiriboza bor; RNK - bir zanjirli, riboza bor', 'Bir xil', 'DNK - bir zanjirli', 'RNK - ikki zanjirli'],
    ['Xloroplastda', 'Mitoxondriyada', 'Yadrada', 'Ribosomada'],
    ['Mitoz - somatik hujayralar, diploid; Meyoz - jinsiy hujayralar, gaploid', 'Bir xil', 'Mitoz - gaploid', 'Meyoz - diploid'],
    ['Prokaryot - yadrosi yo\'q; Eukaryot - yadrosi bor', 'Bir xil', 'Prokaryot - yadrosi bor', 'Eukaryot - yadrosi yo\'q'],
    ['Protein (oqsil) sintezi', 'Energiya ishlab chiqarish', 'DNK sintezi', 'Fotosintez'],
    ['Biologik katalizatorlar; amilaza, lipaza, proteaza', 'Inert moddalar', 'Energiya manbalari', 'Hujayraning tarkibiy qismi'],
    ['Birinchi - irsiyat; Ikkinchi - ajralish; Uchinchi - belgilarning mustaqil birikishi', 'Bir qonun bor', 'Faqat irsiyat qonuni', 'Ajralish va birikish qonunlari'],
    ['G1, S, G2, Mitoz', 'Interfaza, Profaza', 'S, G1, Mitoz', 'G2, Mitoz, G1'],
    ['Adenozin trifosfat - energiya valyutasi; glikoliz, Krebs sikli', 'Suvda eritilgan energiya', 'DNK ning bir shakli', 'Hujayra membranasi komponenti'],
  ],
  "O'zbek tili": [
    ['1441', '1440', '1445', '1430'],
    ['Dostonlar to\'plami, epik janr', 'Lirik she\'rlar', 'Drama asari', 'Tarixiy roman'],
    ['Satirik she\'riyat', 'Dramaturgiya', 'Lirik she\'riyat', 'Publitsistika'],
    ['Kumush', 'Zebiniso', 'Nodira', 'Oydin'],
    ['Ikki yoshning fojiali muhabbati haqida', 'Siyosiy kurash', 'Ilmiy asarlar', 'Tabiiy hodisalar'],
    ['Ikki misrali band, monorima', 'To\'rt misrali band', 'Uch misrali band', 'Beshinchi misra'],
    ['Boburnoma, g\'azallar, she\'rlar', 'Faqat g\'azallar', 'Tarixiy asarlar', 'Dramalar'],
    ['Mahmud Koshg\'ariy', 'Alisher Navoiy', 'Zahiriddin Bobur', 'Yusuf Xos Hojib'],
    ['Temur va Temuriylar, Mug\'anniy', 'Faqat komediyalar', 'Lirik she\'rlar', 'Dostonlar'],
    ['Lapar, terma, doston, ashula', 'Faqat lapar', 'G\'azal va qasida', 'Doston va qissa'],
  ],
};

// Build QuestionDetail for the view modal
function buildQuestionDetail(q: QuizQuestion, quiz: Quiz): QuestionDetail {
  const seeds = OPTION_SEEDS[quiz.subject] ?? OPTION_SEEDS['Matematika'];
  const row   = seeds[(q.order - 1) % seeds.length];
  const correctIdx = (q.order * 3 + 2) % 4;

  const sampleTables = [
    "| X | Y | Z |\n| --- | --- | --- |\n| 10 | 20 | 30 |\n| 15 | 25 | 35 |",
    "| Qiymat | Natija | Farq |\n| --- | --- | --- |\n| 100 | 85 | 15 |\n| 200 | 170 | 30 |",
    "",
    "| Fan | Ball | Reyting |\n| --- | --- | --- |\n| Matematika | 95 | A |\n| Fizika | 88 | B |",
  ];

  return {
    id: q.id,
    subject: quiz.subject,
    question_text: q.text,
    table_markdown: sampleTables[(q.order - 1) % sampleTables.length],
    difficulty: mapDiff(q.difficulty),
    topic: q.topic,
    images: [],
    options: ['A', 'B', 'C', 'D'].map((label, i) => ({
      id: q.order * 10 + i,
      label,
      text: row[i] ?? `Variant ${label}`,
      is_correct: i === correctIdx,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Option type for edit modal
// ─────────────────────────────────────────────────────────────────────────────
interface EditOption {
  id?: number;
  key: string;
  text: string;
  isCorrect: boolean;
}

const OPTION_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  A: { color: '#6366F1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)'  },
  B: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)'  },
  C: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.25)'  },
  D: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'   },
  E: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)'  },
  F: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'   },
};

const QUIZ_SUBJECTS = ['Matematika', 'Fizika', 'Kimyo', 'Biologiya'];
const QUIZ_TYPE_OPTIONS: { value: QuizType; label: string; Icon: ComponentType<any>; color: string; bg: string; border: string }[] = [
  { value: 'manual', label: "Qo'lda",      Icon: PenLine, color: '#6366F1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.3)' },
  { value: 'pdf',    label: 'PDF',         Icon: Upload,  color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)' },
  { value: 'ai',     label: 'AI Generated',Icon: Cpu,     color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
];

interface EditQuizModalProps {
  open: boolean;
  quiz: Quiz;
  onClose: () => void;
  onSave: (updated: Quiz) => Promise<void>;
}

function EditQuizModal({ open, quiz, onClose, onSave }: EditQuizModalProps) {
  const { theme: t } = useTheme();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(quiz.title);
  const [subject, setSubject] = useState(quiz.subject);
  const [description, setDescription] = useState(quiz.description);
  const [quizType, setQuizType] = useState<QuizType>(quiz.type);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(quiz.title);
      setSubject(quiz.subject);
      setDescription(quiz.description);
      setQuizType(quiz.type);
      setSaving(false);
      setSaveError('');
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [open, quiz]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const canSave = title.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveError('');

    onSave({
      ...quiz,
      title: title.trim(),
      subject,
      description: description.trim(),
      type: quizType,
    })
      .then(() => {
        setSaving(false);
        onClose();
      })
      .catch((err: unknown) => {
        setSaving(false);
        setSaveError(err instanceof Error ? err.message : "Testni saqlashda xatolik yuz berdi");
      });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          boxShadow: t.isDark
            ? '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.12)'
            : '0 32px 80px rgba(15,23,42,0.2)',
          maxHeight: '92vh',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.25)' }}
            >
              <Pencil className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: t.textPrimary }}>Testni tahrirlash</h2>
              <p className="text-xs" style={{ color: t.textMuted }}>Asosiy ma'lumotlarni yangilang</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted, opacity: saving ? 0.5 : 1 }}
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>
              Test nomi <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Test nomini kiriting..."
              className="w-full px-3.5 rounded-xl text-sm focus:outline-none transition-all"
              style={{
                background: t.bgInner,
                border: `1.5px solid ${title.trim() ? 'rgba(99,102,241,0.5)' : t.border}`,
                color: t.textPrimary,
                height: '42px',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>Fan</label>
            <div className="relative">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-9 rounded-xl text-sm focus:outline-none transition-all cursor-pointer"
                style={{
                  background: t.bgInner,
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                  height: '42px',
                }}
              >
                {QUIZ_SUBJECTS.map((s) => (
                  <option key={s} value={s} style={{ background: t.bgCard, color: t.textPrimary }}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: t.textMuted }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textSecondary }}>
              Tavsif
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Test tavsifini kiriting..."
              className="w-full px-3.5 py-3 rounded-xl text-sm focus:outline-none transition-all resize-none"
              style={{
                background: t.bgInner,
                border: `1.5px solid ${t.border}`,
                color: t.textPrimary,
              }}
            />
          </div>

          {saveError && (
            <div
              className="px-3.5 py-3 rounded-xl text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}
            >
              {saveError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: t.textSecondary }}>Test turi</label>
            <div className="grid grid-cols-3 gap-2">
              {QUIZ_TYPE_OPTIONS.map((opt) => {
                const active = quizType === opt.value;
                const Icon = opt.Icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setQuizType(opt.value)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
                    style={{
                      background: active ? opt.bg : t.bgInner,
                      border: `1.5px solid ${active ? opt.border : t.border}`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: active ? opt.bg : t.bgCard, border: `1px solid ${active ? opt.border : t.border}` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: active ? opt.color : t.textMuted }} strokeWidth={1.75} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: active ? opt.color : t.textSecondary }}>
                      {opt.label}
                    </span>
                    {active && (
                      <div className="w-4 h-1 rounded-full" style={{ background: opt.color }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="flex items-center gap-3 p-3.5 rounded-xl"
            style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <AlertCircle className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
            </div>
            <p className="text-xs" style={{ color: t.textMuted }}>
              Urinishlar soni ({quiz.participants} ta) va o'rtacha ball ({quiz.avgScore}%) avtomatik hisoblanadi va tahrirlanmaydi.
            </p>
          </div>
        </div>

        <div
          className="px-5 py-4 shrink-0 flex gap-2.5"
          style={{ borderTop: `1px solid ${t.border}`, background: t.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all"
            style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-[2] h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: canSave ? 'linear-gradient(135deg, #6366F1, #4F46E5)' : (t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
              color: canSave ? '#fff' : t.textMuted,
              cursor: canSave ? 'pointer' : 'not-allowed',
              boxShadow: canSave ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
            }}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" strokeWidth={2} />
                Saqlash
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Build initial options for edit modal
function buildEditOptions(q: QuizQuestion, quiz: Quiz): EditOption[] {
  const seeds = OPTION_SEEDS[quiz.subject] ?? OPTION_SEEDS['Matematika'];
  const row   = seeds[(q.order - 1) % seeds.length];
  const correctIdx = (q.order * 3 + 2) % 4;
  return ['A', 'B', 'C', 'D'].map((key, i) => ({
    id: undefined,
    key,
    text: row[i] ?? `Variant ${key}`,
    isCorrect: i === correctIdx,
  }));
}

function tableToMarkdown(rows: string[][]): string {
  if (rows.length === 0) return '';
  const lines: string[] = [];
  lines.push('| ' + rows[0].map((c) => c.trim() || ' ').join(' | ') + ' |');
  lines.push('| ' + rows[0].map(() => '---').join(' | ') + ' |');
  for (let i = 1; i < rows.length; i++) {
    lines.push('| ' + rows[i].map((c) => c.trim() || ' ').join(' | ') + ' |');
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// OptionsEditor (mirrors teacher's edit page)
// ─────────────────────────────────────────────────────────────────────────────
function OptionsEditor({
  options,
  onChange,
  onSelectCorrect,
  updatingOptionId,
}: {
  options: EditOption[];
  onChange: (o: EditOption[]) => void;
  onSelectCorrect: (option: EditOption) => void;
  updatingOptionId: number | null;
}) {
  const { theme: t } = useTheme();

  const setCorrect = (key: string) =>
    onChange(options.map((o) => ({ ...o, isCorrect: o.key === key })));

  return (
    <div className="space-y-2.5">
      {options.map((opt) => {
        const oc = OPTION_COLORS[opt.key] ?? { color: t.isDark ? '#818CF8' : '#6366F1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' };
        return (
          <div
            key={opt.key}
            className="flex items-center gap-2.5 p-3 rounded-xl transition-all"
            style={{
              background: opt.isCorrect ? oc.bg : (t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
              border: `1.5px solid ${opt.isCorrect ? oc.border : t.border}`,
            }}
          >
            <GripVertical className="w-4 h-4 shrink-0 cursor-grab" style={{ color: t.textMuted }} strokeWidth={1.5} />

            {/* Letter badge */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: oc.bg, color: oc.color, border: `1px solid ${oc.border}` }}>
              {opt.key}
            </div>

            <div
              className="flex-1 px-3 py-2 rounded-lg text-sm min-w-0"
              style={{
                background: opt.isCorrect ? 'transparent' : (t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                border: `1px solid ${opt.isCorrect ? oc.border : t.border}`,
                color: t.textPrimary,
              }}
            >
              <MathText text={opt.text} color={t.textPrimary} />
            </div>

            {/* Correct toggle */}
            <button
              type="button"
              onClick={() => {
                setCorrect(opt.key);
                onSelectCorrect(opt);
              }}
              disabled={updatingOptionId === opt.id}
              title={opt.isCorrect ? "To'g'ri javob" : "To'g'ri deb belgilash"}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
              style={{
                background: opt.isCorrect ? '#22C55E' : (t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                border: `1.5px solid ${opt.isCorrect ? '#22C55E' : t.border}`,
                color: opt.isCorrect ? '#fff' : t.textMuted,
                opacity: updatingOptionId === opt.id ? 0.7 : 1,
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini Table Builder (inline, similar to teacher's)
// ─────────────────────────────────────────────────────────────────────────────
function MiniTableBuilder({ onConvert }: { onConvert: (md: string) => void }) {
  const { theme: t } = useTheme();
  const [rows, setRows] = useState<string[][]>([
    ['Ustun 1', 'Ustun 2', 'Ustun 3'],
    ['', '', ''],
    ['', '', ''],
  ]);

  const updateCell = (r: number, c: number, v: string) =>
    setRows((prev) => prev.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? v : cell) : row));
  const addRow = () => setRows((p) => [...p, Array(p[0].length).fill('')]);
  const addCol = () => setRows((p) => p.map((row, i) => [...row, i === 0 ? `Ustun ${row.length + 1}` : '']));
  const remRow = (i: number) => { if (rows.length > 2) setRows((p) => p.filter((_, ri) => ri !== i)); };
  const remCol = (i: number) => { if (rows[0].length > 2) setRows((p) => p.map((row) => row.filter((_, ci) => ci !== i))); };
  const reset  = () => setRows([['Ustun 1', 'Ustun 2', 'Ustun 3'], ['', '', ''], ['', '', '']]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl p-3" style={{ background: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${t.border}` }}>
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="w-8" />
              {rows[0]?.map((_, ci) => (
                <th key={ci} className="text-center pb-1.5">
                  <button onClick={() => remCol(ci)} disabled={rows[0].length <= 2}
                    className="w-5 h-5 rounded flex items-center justify-center mx-auto transition-all disabled:opacity-30"
                    style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textMuted }}
                    onMouseEnter={(e) => { if (rows[0].length > 2) { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; } }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCard; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}>
                    <X className="w-2.5 h-2.5" strokeWidth={2} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                <td className="pr-1.5">
                  {ri > 0 && (
                    <button onClick={() => remRow(ri)} disabled={rows.length <= 2}
                      className="w-5 h-5 rounded flex items-center justify-center transition-all disabled:opacity-30"
                      style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textMuted }}
                      onMouseEnter={(e) => { if (rows.length > 2) { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; } }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCard; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}>
                      <X className="w-2.5 h-2.5" strokeWidth={2} />
                    </button>
                  )}
                </td>
                {row.map((cell, ci) => (
                  <td key={ci} className="p-0.5">
                    <input
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="w-24 px-2 py-1.5 rounded-lg text-xs focus:outline-none transition-all"
                      style={{
                        background: ri === 0 ? (t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)') : (t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                        border: `1px solid ${ri === 0 ? (t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)') : t.border}`,
                        color: ri === 0 ? (t.isDark ? '#818CF8' : '#6366F1') : t.textPrimary,
                        fontWeight: ri === 0 ? 600 : 400,
                      }}
                      placeholder={ri === 0 ? 'Sarlavha' : 'Ma\'lumot'}
                      onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 2px rgba(99,102,241,0.12)'; }}
                      onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = ri === 0 ? (t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)') : t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${t.border}` }}>
          {[
            { label: "+ Qator", fn: addRow },
            { label: "+ Ustun", fn: addCol },
          ].map(({ label, fn }) => (
            <button key={label} onClick={fn}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${t.border}`, color: t.textMuted }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)'; (e.currentTarget as HTMLElement).style.color = t.isDark ? '#818CF8' : '#6366F1'; (e.currentTarget as HTMLElement).style.borderColor = t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}>
              {label}
            </button>
          ))}
          <button onClick={reset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ml-auto"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${t.border}`, color: t.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.25)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}>
            <RotateCcw className="w-3 h-3" strokeWidth={2} /> Tozalash
          </button>
        </div>
      </div>
      <button onClick={() => onConvert(tableToMarkdown(rows))}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
        style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(99,102,241,0.4)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.3)'; }}>
        <CheckCircle className="w-4 h-4" strokeWidth={2} />
        Markdown-ga o'girish va qo'llash
      </button>
      <div className="flex items-start gap-2 p-3 rounded-xl"
        style={{ background: t.isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)', border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}` }}>
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.75} />
        <p className="text-xs" style={{ color: t.textSecondary }}>
          Jadvalni to'ldiring, keyin "Markdown-ga o'girish" tugmasini bosing.
        </p>
      </div>
    </div>
  );
}

function ImageUploadZone({
  images,
  onAdd,
  onRemove,
  uploading,
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
    onAdd(Array.from(files).filter((file) => file.type.startsWith('image/')));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-xl cursor-pointer transition-all"
        style={{
          background: dragging ? t.accentMuted : (t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
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
            PNG, JPG, GIF
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
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group rounded-xl overflow-hidden"
              style={{ width: '88px', height: '88px', border: `1px solid ${t.border}` }}
            >
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                style={{ background: 'rgba(0,0,0,0.55)' }}
              >
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

// ─────────────────────────────────────────────────────────────────────────────
// EDIT MODAL — mirrors QuizQuestionEditPage features
// ─────────────────────────────────────────────────────────────────────────────
function StudentQuestionEditModal({
  question,
  quiz,
  onClose,
}: {
  question: QuizQuestion;
  quiz: Quiz;
  onClose: () => void;
}) {
  const { theme: t } = useTheme();
  const [visible, setVisible] = useState(false);

  // Form state
  const [topic,         setTopic]         = useState(question.topic);
  const [difficulty,    setDifficulty]    = useState<Difficulty>(question.difficulty);
  const [questionText,  setQuestionText]  = useState(question.text);
  const [tableMarkdown, setTableMarkdown] = useState('');
  const [showTable,     setShowTable]     = useState(false);
  const [showTableBuilder, setShowTableBuilder] = useState(false);
  const [options,       setOptions]       = useState<EditOption[]>(() => buildEditOptions(question, quiz));
  const [images,        setImages]        = useState<UploadedImage[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageError, setImageError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [initialCorrectOptionId, setInitialCorrectOptionId] = useState<number | null>(null);
  const [updatingCorrectOptionId, setUpdatingCorrectOptionId] = useState<number | null>(null);

  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id); }, []);
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    setSaved(false);
    setSaveError('');
  }, [options, topic, difficulty, tableMarkdown, questionText]);

  useEffect(() => {
    let cancelled = false;

    fetchQuestionDetail(question.id)
      .then((detail) => {
        if (cancelled) return;
        const detailOptions = Array.isArray(detail.options) ? detail.options : [];
        const nextTableMarkdown = detail.table_markdown ?? '';

        setQuestionText(normalizeText(detail.question_text, question.text));
        setTopic(normalizeText(detail.topic, question.topic));
        setDifficulty(mapApiDifficulty(detail.difficulty));
        setTableMarkdown(nextTableMarkdown);
        setShowTable(nextTableMarkdown.trim().length > 0);

        if (detailOptions.length > 0) {
          setOptions(detailOptions.map((option) => ({
            id: option.id,
            key: option.label,
            text: normalizeText(option.text, `${option.label} varianti`),
            isCorrect: option.is_correct,
          })));
          setInitialCorrectOptionId(detailOptions.find((option) => option.is_correct)?.id ?? null);
        }

        setImages((Array.isArray(detail.images) ? detail.images : []).map((image) => ({
          id: image.id,
          url: normalizeImageUrl(image.image_url),
          name: image.image_url.split('/').pop() ?? `image-${image.id}`,
        })));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setImageError(err instanceof Error ? err.message : "Rasmlarni yuklab bo'lmadi");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [question.id]);

  function close() { setVisible(false); setTimeout(onClose, 240); }

  async function handleCorrectOptionSelect(option: EditOption) {
    if (!option.id) {
      setSaveError("To'g'ri javob variantini aniqlab bo'lmadi");
      return;
    }

    if (initialCorrectOptionId === option.id) {
      setOptions((current) => current.map((item) => ({ ...item, isCorrect: item.id === option.id })));
      return;
    }

    setUpdatingCorrectOptionId(option.id);
    setSaveError('');

    try {
      await updateQuestionCorrectOption(question.id, option.id);
      setOptions((current) => current.map((item) => ({ ...item, isCorrect: item.id === option.id })));
      setInitialCorrectOptionId(option.id);
    } catch (err: unknown) {
      setOptions((current) => current.map((item) => ({ ...item, isCorrect: item.id === initialCorrectOptionId })));
      setSaveError(err instanceof Error ? err.message : "To'g'ri javobni yangilashda xatolik yuz berdi");
    } finally {
      setUpdatingCorrectOptionId(null);
    }
  }

  async function handleSave() {
    if (!questionText.trim()) return;
    const selectedOption = options.find((option) => option.isCorrect);
    if (!selectedOption?.id) {
      setSaveError("To'g'ri javob variantini aniqlab bo'lmadi");
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      await updateQuestion(question.id, {
        subject: quiz.subject,
        question_text: questionText.trim(),
        table_markdown: tableMarkdown.trim(),
        difficulty: mapDiff(difficulty),
        topic: topic.trim(),
      });

      setSaving(false);
      setSaved(true);
      setTimeout(close, 900);
    } catch (err: unknown) {
      setSaving(false);
      setSaveError(err instanceof Error ? err.message : "To'g'ri javobni saqlashda xatolik yuz berdi");
    }
  }

  const DIFF_OPTIONS: { value: Difficulty; label: string; color: string; bg: string; border: string }[] = [
    { value: 'Oson',  label: 'Oson',  color: '#22C55E', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)'  },
    { value: "O'rta", label: "O'rta", color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
    { value: 'Qiyin', label: 'Qiyin', color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)'  },
  ];

  const canSave = questionText.trim().length > 0 && options.some((o) => o.isCorrect);

  const handleUploadImages = async (files: File[]) => {
    if (files.length === 0) return;

    setUploadingImages(true);
    setImageError('');

    try {
      const uploaded = await Promise.all(files.map((file) => uploadQuestionImage(question.id, file)));
      setImages((current) => [
        ...current,
        ...uploaded.map((image) => ({
          id: image.id,
          url: normalizeImageUrl(image.image_url),
          name: image.image_url.split('/').pop() ?? `image-${image.id}`,
        })),
      ]);
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : "Rasm yuklashda xatolik yuz berdi");
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = async (imageId: number) => {
    setImageError('');

    try {
      await deleteQuestionImage(question.id, imageId);
      setImages((current) => current.filter((image) => image.id !== imageId));
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : "Rasmni o'chirishda xatolik yuz berdi");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{
        background: visible ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(6px)' : 'none',
        transition: 'background 0.24s ease, backdrop-filter 0.24s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full sm:max-w-2xl flex flex-col overflow-hidden sm:mx-4 sm:my-4"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 'clamp(0px, (100vw - 640px) * 999, 24px) clamp(0px, (100vw - 640px) * 999, 24px) 0 0',
          maxHeight: '92dvh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.24s cubic-bezier(0.32,0.72,0,1)',
          boxShadow: t.isDark
            ? '0 -16px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(99,102,241,0.1)'
            : '0 -16px 64px rgba(0,0,0,0.18)',
        }}
      >
        {/* Drag handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: t.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)' }} />
        </div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${t.border}`, background: t.isDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.03)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.25)' }}>
              <Pencil className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: t.textPrimary }}>Savolni tahrirlash</h2>
              <p className="text-xs" style={{ color: t.textMuted }}>
                Savol #{question.order} · {quiz.subject}
              </p>
            </div>
          </div>
          <button onClick={close}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', border: `1px solid ${t.border}`, color: t.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.25)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}>
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5 space-y-5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${t.border} transparent` }}>

          {/* Fan (read-only) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.75} />
              <span style={{ color: t.textSecondary }}>Fan</span>
            </label>
            <div className="flex items-center gap-2 px-4 rounded-xl h-10"
              style={{ background: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${t.border}` }}>
              <SubjectIcon type={quiz.subjectIcon} color={quiz.subjectColor} size={14} />
              <span className="text-sm font-semibold" style={{ color: quiz.subjectColor }}>{quiz.subject}</span>
            </div>
          </div>

          {/* Mavzu */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-2">
              <Layers className="w-3.5 h-3.5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.75} />
              <span style={{ color: t.textSecondary }}>Mavzu</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Mavzu nomini kiriting..."
              className="w-full px-4 rounded-xl text-sm focus:outline-none transition-all"
              style={{ background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1.5px solid ${t.border}`, color: t.textPrimary, height: '42px' }}
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
              onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
            />
          </div>

          {/* Qiyinlik darajasi */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-2">
              <Target className="w-3.5 h-3.5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.75} />
              <span style={{ color: t.textSecondary }}>Qiyinlik darajasi</span>
            </label>
            <div className="flex gap-2">
              {DIFF_OPTIONS.map((d) => {
                const active = difficulty === d.value;
                return (
                  <button key={d.value} type="button" onClick={() => setDifficulty(d.value)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: active ? d.bg : (t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                      color:      active ? d.color : t.textMuted,
                      border:     `1.5px solid ${active ? d.border : t.border}`,
                      boxShadow:  active ? `0 0 0 3px ${d.bg}` : 'none',
                    }}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Savol matni */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-2">
              <AlignLeft className="w-3.5 h-3.5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.75} />
              <span style={{ color: t.textSecondary }}>Savol matni</span>
              <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${questionText.trim() ? 'rgba(99,102,241,0.4)' : t.border}`,
                color: t.textPrimary,
                minHeight: '96px',
              }}
            >
              <MathText text={questionText} color={t.textPrimary} />
            </div>
            <p className="mt-2 text-xs" style={{ color: t.textMuted }}>
              Savol matni faqat ko'rish uchun ochilgan va bu yerda tahrirlanmaydi.
            </p>
          </div>

          {/* Jadval (ixtiyoriy) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold">
                <Table2 className="w-3.5 h-3.5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.75} />
                <span style={{ color: t.textSecondary }}>Jadval (ixtiyoriy)</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTableBuilder(!showTableBuilder)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: showTableBuilder ? (t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)') : (t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    color: showTableBuilder ? (t.isDark ? '#818CF8' : '#6366F1') : t.textMuted,
                    border: `1px solid ${showTableBuilder ? (t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)') : t.border}`,
                  }}>
                  {showTableBuilder ? 'Yopish' : 'Jadval quruvchi'}
                </button>
                <button onClick={() => setShowTable(!showTable)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: showTable ? (t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)') : (t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    color: showTable ? (t.isDark ? '#818CF8' : '#6366F1') : t.textMuted,
                    border: `1px solid ${showTable ? (t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)') : t.border}`,
                  }}>
                  {showTable ? 'Markdown yopish' : 'Markdown'}
                </button>
              </div>
            </div>

            {showTableBuilder && (
              <MiniTableBuilder onConvert={(md) => { setTableMarkdown(md); setShowTable(true); setShowTableBuilder(false); }} />
            )}

            {showTable && (
              <textarea
                value={tableMarkdown}
                onChange={(e) => setTableMarkdown(e.target.value)}
                placeholder="| Sarlavha | ... |\n| --- | --- |\n| Ma'lumot | ... |"
                rows={4}
                className="w-full px-4 py-3 rounded-xl text-xs focus:outline-none transition-all resize-y"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                  fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
                  minHeight: '88px',
                }}
                onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
              />
            )}
          </div>

          {/* Rasmlar */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-3">
              <ImagePlus className="w-3.5 h-3.5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.75} />
              <span style={{ color: t.textSecondary }}>Rasmlar</span>
            </label>
            <ImageUploadZone
              images={images}
              onAdd={handleUploadImages}
              onRemove={handleRemoveImage}
              uploading={uploadingImages}
            />
            {imageError && (
              <div
                className="mt-3 px-3.5 py-3 rounded-xl text-xs"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}
              >
                {imageError}
              </div>
            )}
          </div>

          {/* Javob variantlari */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-3">
              <CheckCircle className="w-3.5 h-3.5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.75} />
              <span style={{ color: t.textSecondary }}>Javob variantlari</span>
              <span className="ml-auto text-xs font-normal" style={{ color: t.textMuted }}>
                Yashil ✓ = to'g'ri javob
              </span>
            </label>
            <OptionsEditor
              options={options}
              onChange={setOptions}
              onSelectCorrect={handleCorrectOptionSelect}
              updatingOptionId={updatingCorrectOptionId}
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl"
            style={{ background: t.isDark ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.04)', border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.14)'}` }}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.75} />
            <p className="text-xs" style={{ color: t.textSecondary }}>
              To'g'ri javobni belgilash uchun ✓ tugmasini bosing. Saqlash tugmasi backenddagi correct optionni yangilaydi.
            </p>
          </div>
        </div>

        {saveError && (
          <div className="px-5 pb-4">
            <div
              className="rounded-xl px-3.5 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}
            >
              {saveError}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-5 py-4 shrink-0 flex gap-2.5"
          style={{ borderTop: `1px solid ${t.border}`, background: t.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}>
          <button onClick={close}
            className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${t.border}`, color: t.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.textMuted; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}>
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-[2] h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: saved
                ? 'linear-gradient(135deg,#22C55E,#16A34A)'
                : canSave
                  ? 'linear-gradient(135deg, #6366F1, #4F46E5)'
                  : (t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
              color: canSave ? '#fff' : t.textMuted,
              cursor: canSave ? 'pointer' : 'not-allowed',
              boxShadow: saved ? '0 4px 16px rgba(34,197,94,0.35)' : canSave ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
            }}
            onMouseEnter={(e) => { if (canSave && !saved) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 22px rgba(99,102,241,0.5)'; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = saved ? '0 4px 16px rgba(34,197,94,0.35)' : canSave ? '0 4px 16px rgba(99,102,241,0.35)' : 'none'; }}>
            {saved ? (
              <><CheckCircle className="w-4 h-4" strokeWidth={2} /> Saqlandi</>
            ) : saving ? (
              <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Saqlanmoqda...</>
            ) : (
              <><Save className="w-4 h-4" strokeWidth={2} /> Saqlash</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Question Row
// ─────────────────────────────────────────────────────────────────────────────
function QuestionRow({
  question, quiz, onView, onEdit, detailLoading = false,
}: {
  question: QuizQuestion;
  quiz: Quiz;
  onView: () => void;
  onEdit: () => void;
  detailLoading?: boolean;
}) {
  const { theme: t } = useTheme();
  const diff = diffStyle(question.difficulty);
  const cc   = correctColor(question.correctPct);

  return (
    <div
      className="group rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = quiz.subjectColor + '40'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = t.shadowHover; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = t.shadowCard; }}
    >
      <div className="flex">
        {/* Left accent bar */}
        <div className="w-1 shrink-0 rounded-l-2xl"
          style={{
            background: question.difficulty === 'Qiyin'
              ? 'linear-gradient(180deg,#EF4444,#DC2626)'
              : question.difficulty === "O'rta"
              ? 'linear-gradient(180deg,#FBBF24,#F59E0B)'
              : 'linear-gradient(180deg,#22C55E,#16A34A)',
          }} />

        <div className="flex-1 px-4 py-4">
          <div className="flex items-start gap-3">
            {/* Order */}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold"
              style={{ background: `${quiz.subjectColor}14`, border: `1px solid ${quiz.subjectColor}28`, color: quiz.subjectColor, fontSize: 13 }}>
              {question.order}
            </div>

            <div className="flex-1 min-w-0">
              <MathText
                text={question.text}
                className="text-sm leading-relaxed line-clamp-2"
                color={t.textPrimary}
              />

              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-lg text-xs font-medium"
                  style={{ background: `${quiz.subjectColor}12`, color: quiz.subjectColor, border: `1px solid ${quiz.subjectColor}25` }}>
                  {question.topic}
                </span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-semibold"
                  style={{ background: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}>
                  {question.difficulty}
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold"
                    style={{ background: `${cc}14`, color: cc, border: `1px solid ${cc}28` }}>
                    <BarChart2 style={{ width: 10, height: 10 }} strokeWidth={2} />
                    {question.correctPct}%
                  </div>
                </div>
              </div>

              <div className="mt-2 w-full h-1 rounded-full overflow-hidden"
                style={{ background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${question.correctPct}%`, background: `linear-gradient(90deg,${cc}70,${cc})`, boxShadow: t.isDark ? `0 0 4px ${cc}50` : 'none' }} />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 pt-3"
            style={{ borderTop: `1px solid ${t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
            <button onClick={onView}
              disabled={detailLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)', color: t.isDark ? '#818CF8' : '#6366F1', border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.18)'}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.18)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
              {detailLoading ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
              ) : (
                <Eye style={{ width: 12, height: 12 }} strokeWidth={2} />
              )}
              Ko'rish
            </button>

            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: t.isDark ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.06)', color: t.isDark ? '#38BDF8' : '#0284C7', border: `1px solid ${t.isDark ? 'rgba(56,189,248,0.22)' : 'rgba(56,189,248,0.18)'}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.16)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
              <Pencil style={{ width: 12, height: 12 }} strokeWidth={2} />
              Tahrirlash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export function StudentQuizDetailPage() {
  const { theme: t } = useTheme();
  const navigate     = useNavigate();
  const { id }       = useParams<{ id: string }>();
  const quizId = Number(id);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [viewDetail, setViewDetail] = useState<QuestionDetail | null>(null);
  const [editQ,      setEditQ]      = useState<QuizQuestion | null>(null);
  const [startToast, setStartToast] = useState(false);
  const [questionDetailLoadingId, setQuestionDetailLoadingId] = useState<number | null>(null);
  const [questionDetailError, setQuestionDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(quizId) || quizId <= 0) {
      setQuiz(null);
      setQuestions([]);
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);

        const data = await fetchStudentQuizDetail(quizId);
        if (cancelled) return;

        if (!data) {
          setQuiz(null);
          setQuestions([]);
          setNotFound(true);
          return;
        }

        const mapped = mapQuizResponse(data);
        setQuiz(mapped.quiz);
        setQuestions(mapped.questions);
      } catch (err: unknown) {
        if (cancelled) return;
        setQuiz(null);
        setQuestions([]);
        setError(err instanceof Error ? err.message : "Testni yuklab bo'lmadi");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadQuiz();

    return () => {
      cancelled = true;
    };
  }, [quizId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-32 gap-4">
        <div
          className="w-14 h-14 rounded-2xl border-2 animate-spin"
          style={{ borderColor: t.border, borderTopColor: '#6366F1' }}
        />
        <p className="text-sm font-semibold" style={{ color: t.textSecondary }}>
          Test yuklanmoqda...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <AlertCircle style={{ width: 26, height: 26, color: '#EF4444' }} strokeWidth={1.75} />
        </div>
        <div className="text-center">
          <p className="font-bold text-base" style={{ color: t.textPrimary }}>Testni yuklab bo'lmadi</p>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  // Not found
  if (notFound || !quiz) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)', border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.14)'}` }}>
          <BookOpen style={{ width: 26, height: 26, color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="font-bold text-base" style={{ color: t.textPrimary }}>Test topilmadi</p>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>Ushbu ID bo'yicha test mavjud emas.</p>
        </div>
        <button onClick={() => navigate('/student/tests')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
          <ArrowLeft style={{ width: 14, height: 14 }} strokeWidth={2.5} />
          Testlar ro'yxati
        </button>
      </div>
    );
  }

  const easyCount = questions.filter((q) => q.difficulty === 'Oson').length;
  const midCount  = questions.filter((q) => q.difficulty === "O'rta").length;
  const hardCount = questions.filter((q) => q.difficulty === 'Qiyin').length;
  const typeCfg = quizTypeStyle(quiz.type);

  const handleOpenQuestionDetail = async (questionId: number) => {
    setQuestionDetailError(null);
    setQuestionDetailLoadingId(questionId);

    try {
      const data = await fetchQuestionDetail(questionId);
      setViewDetail(mapQuestionDetail(data));
    } catch (err: unknown) {
      setQuestionDetailError(err instanceof Error ? err.message : "Savol tafsilotlarini yuklashda xatolik yuz berdi");
    } finally {
      setQuestionDetailLoadingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <EditQuizModal
        open={editOpen}
        quiz={quiz}
        onClose={() => setEditOpen(false)}
        onSave={async (updated) => {
          await updateQuizDetail(quiz.id, {
            title: updated.title,
            subject: updated.subject,
            description: updated.description,
            quiz_generate_type: mapQuizTypeToApi(updated.type),
          });

          const subjectPresentation = getSubjectPresentation(updated.subject);
          setQuiz((current) => current ? {
            ...current,
            ...updated,
            subjectColor: subjectPresentation.color,
            subjectIcon: subjectPresentation.icon,
          } : current);
        }}
      />

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate('/student/tests')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6366F1'; (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}>
            <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <button onClick={() => navigate('/student/tests')}
              className="text-xs font-medium transition-colors hidden sm:block truncate"
              style={{ color: t.textMuted }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.isDark ? '#818CF8' : '#6366F1'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}>
              Testlar ro'yxati
            </button>
            <ChevronRight style={{ width: 12, height: 12, color: t.textMuted, flexShrink: 0 }} strokeWidth={2} className="hidden sm:block" />
            <span className="text-xs font-semibold truncate" style={{ color: t.textPrimary }}>{quiz.title}</span>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0"
          style={{ background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)', color: t.isDark ? '#818CF8' : '#6366F1', border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.2)'}` }}>
          Bosh sahifa
        </span>
      </div>

      {/* ── QUIZ OVERVIEW CARD ── */}
      <div className="rounded-2xl overflow-hidden mb-5"
        style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}>
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${quiz.subjectColor}, ${quiz.subjectColor}30)` }} />
        <div className="p-4 sm:p-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${quiz.subjectColor}12, transparent)` }} />
          <div className="relative">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${quiz.subjectColor}16`, border: `1.5px solid ${quiz.subjectColor}35` }}>
                <SubjectIcon type={quiz.subjectIcon} color={quiz.subjectColor} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-bold leading-snug" style={{ fontSize: 16, color: t.textPrimary }}>{quiz.title}</h1>
                  <span className="px-1.5 py-0.5 rounded-md text-xs font-semibold shrink-0"
                    style={{ background: t.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: t.textSecondary, border: `1px solid ${t.border}` }}>
                    {quiz.status}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-xs font-semibold shrink-0"
                    style={{ background: typeCfg.bg, color: typeCfg.color, border: `1px solid ${typeCfg.border}` }}>
                    {typeCfg.label}
                  </span>
                  {quiz.isNew && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ fontSize: 9, fontWeight: 800, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff' }}>
                      <Sparkles style={{ width: 8, height: 8 }} strokeWidth={2.5} />
                      YANGI
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: quiz.subjectColor }}>{quiz.subject}</span>
                  <span className="text-xs" style={{ color: t.textMuted }}>•</span>
                  <span className="flex items-center gap-0.5 text-xs" style={{ color: t.textMuted }}>
                    <Hash style={{ width: 10, height: 10 }} strokeWidth={1.75} />{quiz.questions} ta savol
                  </span>
                  <span className="text-xs" style={{ color: t.textMuted }}>•</span>
                  <span className="flex items-center gap-0.5 text-xs" style={{ color: t.textMuted }}>
                    <CalendarDays style={{ width: 10, height: 10 }} strokeWidth={1.75} />{quiz.createdDate}
                  </span>
                  <span className="text-xs" style={{ color: t.textMuted }}>•</span>
                  <span className="flex items-center gap-0.5 text-xs" style={{ color: t.textMuted }}>
                    <Users style={{ width: 10, height: 10 }} strokeWidth={1.75} />{quiz.participants} urinish
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs mt-3 leading-relaxed" style={{ color: t.textSecondary }}>{quiz.description}</p>

            {/* 3 stat cards */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: 'Oson savollar',  value: `${easyCount} ta`,  color: '#22C55E', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.22)'  },
                { label: "O'rta savollar", value: `${midCount} ta`,   color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
                { label: 'Qiyin savollar', value: `${hardCount} ta`,  color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.22)'  },
              ].map(({ label, value, color, bg, border }) => (
                <div key={label} className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-center"
                  style={{ background: bg, border: `1px solid ${border}` }}>
                  <span className="font-bold leading-none" style={{ fontSize: 17, color }}>{value}</span>
                  <span className="mt-1 leading-tight" style={{ fontSize: 10, color: t.textMuted }}>{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 mb-3" style={{ height: 1, background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/student/test-taking/${quiz.id}`)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(99,102,241,0.45)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
                <Play style={{ width: 14, height: 14 }} strokeWidth={2.5} fill="currentColor" />
                Testni boshlash
              </button>
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: t.textSecondary, border: `1px solid ${t.border}` }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6366F1'; (e.currentTarget as HTMLElement).style.color = t.isDark ? '#818CF8' : '#6366F1'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}>
                <Pencil style={{ width: 14, height: 14 }} strokeWidth={2} />
                Tahrirlash
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUESTIONS SECTION HEADER ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-base sm:text-lg" style={{ color: t.textPrimary }}>Savollar</h2>
          <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{questions.length} ta savol ko'rsatilmoqda</p>
        </div>
        <span className="px-2.5 py-1 rounded-xl text-xs font-medium"
          style={{ background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', color: t.textMuted, border: `1px solid ${t.border}` }}>
          <ListChecks style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} strokeWidth={1.75} />
          {quiz.questions} ta jami
        </span>
      </div>

      {questionDetailError && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#DC2626' }}
        >
          {questionDetailError}
        </div>
      )}

      {/* ── QUESTIONS LIST ── */}
      <div className="flex flex-col gap-3">
        {questions.map((q) => (
          <QuestionRow
            key={q.id}
            question={q}
            quiz={quiz}
            onView={() => handleOpenQuestionDetail(q.id)}
            onEdit={() => setEditQ(q)}
            detailLoading={questionDetailLoadingId === q.id}
          />
        ))}
      </div>
      <div className="h-6" />

      {/* ── VIEW MODAL (QuestionDetailModal — same as teacher's page) ── */}
      <QuestionDetailModal
        open={viewDetail !== null}
        question={viewDetail}
        onClose={() => {
          setViewDetail(null);
          setQuestionDetailError(null);
        }}
      />

      {/* ── EDIT MODAL ── */}
      {editQ && (
        <StudentQuestionEditModal
          question={editQ}
          quiz={quiz}
          onClose={() => setEditQ(null)}
        />
      )}

      {/* ── START TOAST ── */}
      {startToast && (
        <div className="fixed bottom-6 left-1/2 z-[60] pointer-events-none" style={{ transform: 'translate(-50%, 0)' }}>
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl whitespace-nowrap"
            style={{ background: t.isDark ? '#1E293B' : '#fff', border: `1px solid ${t.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', color: t.textPrimary, fontSize: 14, fontWeight: 600 }}>
            <Play style={{ width: 14, height: 14, color: '#818CF8' }} strokeWidth={2.5} fill="#818CF8" />
            Test boshlanmoqda...
          </div>
        </div>
      )}
    </div>
  );
}

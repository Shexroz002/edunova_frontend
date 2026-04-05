import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTheme } from '../../components/ThemeContext';
import { CreateQuizModal } from '../teacher/QuizzesPage.tsx';
import { getStoredAuthSession, getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';
import {
  PlayCircle,
  PlusSquare,
  BarChart2,
  Users,
  Zap,
  ChevronRight,
  Flame,
  Trophy,
  Star,
  BookOpen,
  FlaskConical,
  Languages,
  Calculator,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Radio,
  LogIn,
  X,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

type SubjectIconType = typeof Calculator | typeof FlaskConical | typeof BookOpen | typeof Languages;

interface StudentSubjectAnalyticsApi {
  subject_name: string;
  correct_answer: number;
  wrong_answer: number;
  total_answer: number;
  percentage: number;
  first_attempt_date: string | null;
  last_attempt_date: string | null;
}

interface StudentSubjectCard {
  id: string;
  name: string;
  icon: SubjectIconType;
  progress: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalAnswers: number;
  firstAttemptDate: string;
  lastAttemptDate: string;
  color: string;
  colorMuted: string;
  colorBorder: string;
  glow: string;
}

interface UserMeResponse {
  id: number | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  profile_image: string | null;
  email: string | null;
  phone_number: string | null;
  school_name: string | null;
  education_level: string | null;
  subjects: Array<{
    id: number | null;
    subject: {
      id: number | null;
      name: string | null;
      type: string | null;
      icon: string | null;
    } | null;
  }> | null;
}

interface StudentBannerProfile {
  fullName: string;
  avatar: string;
  schoolName: string;
  educationLevel: string;
}

interface InviteNotificationPayload {
  session_code: string;
}

interface InviteNotificationSender {
  id: number;
  first_name: string | null;
  last_name: string | null;
  profile_image: string | null;
}

interface InviteNotificationEvent {
  type: 'test_invite_notification';
  data: {
    id: number;
    type: string;
    action_type: string;
    title: string;
    message: string;
    payload: InviteNotificationPayload | null;
    sender: InviteNotificationSender | null;
  };
}

interface ActiveInviteNotification {
  id: number;
  title: string;
  message: string;
  sessionCode: string;
  senderName: string;
  senderAvatar: string;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
const quickStats = [
  { label: "Jami testlar", value: '40', icon: CheckCircle2, color: '#818CF8', bg: 'rgba(129,140,248,0.12)' },
  { label: 'Streak', value: '7 kun', icon: Flame, color: '#FB923C', bg: 'rgba(251,146,60,0.12)' },
  { label: 'Jami XP', value: '1560', icon: Star, color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  { label: "O'rin", value: '#4', icon: Trophy, color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
];

function normalizeSubjectName(value: string) {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'mathematics':
    case 'matematika':
      return 'Matematika';
    case 'physics':
    case 'fizika':
      return 'Fizika';
    case 'chemistry':
    case 'kimyo':
      return 'Kimyo';
    case 'biology':
    case 'biologiya':
      return 'Biologiya';
    case 'english':
    case 'english language':
    case 'ingliz tili':
      return 'Ingliz tili';
    case 'mother tongue':
    case 'ona tili':
      return 'Ona tili';
    default:
      return value.trim() || "Noma'lum fan";
  }
}

function getSubjectAppearance(subjectName: string): Pick<StudentSubjectCard, 'icon' | 'color' | 'colorMuted' | 'colorBorder' | 'glow'> {
  const normalized = subjectName.trim().toLowerCase();

  switch (normalized) {
    case 'mathematics':
    case 'matematika':
      return {
        icon: Calculator,
        color: '#818CF8',
        colorMuted: 'rgba(129,140,248,0.15)',
        colorBorder: 'rgba(129,140,248,0.3)',
        glow: 'rgba(99,102,241,0.25)',
      };
    case 'physics':
    case 'fizika':
      return {
        icon: FlaskConical,
        color: '#38BDF8',
        colorMuted: 'rgba(56,189,248,0.15)',
        colorBorder: 'rgba(56,189,248,0.3)',
        glow: 'rgba(56,189,248,0.25)',
      };
    case 'chemistry':
    case 'kimyo':
    case 'biology':
    case 'biologiya':
      return {
        icon: BookOpen,
        color: '#34D399',
        colorMuted: 'rgba(52,211,153,0.15)',
        colorBorder: 'rgba(52,211,153,0.3)',
        glow: 'rgba(34,197,94,0.25)',
      };
    case 'english':
    case 'english language':
    case 'ingliz tili':
      return {
        icon: Languages,
        color: '#FBBF24',
        colorMuted: 'rgba(251,191,36,0.15)',
        colorBorder: 'rgba(251,191,36,0.3)',
        glow: 'rgba(245,158,11,0.25)',
      };
    default:
      return {
        icon: BookOpen,
        color: '#A78BFA',
        colorMuted: 'rgba(167,139,250,0.15)',
        colorBorder: 'rgba(167,139,250,0.3)',
        glow: 'rgba(139,92,246,0.25)',
      };
  }
}

function formatAttemptDate(value: string | null) {
  if (!value) return "Mavjud emas";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function mapStudentBannerProfile(data: UserMeResponse): StudentBannerProfile {
  const fullName = `${normalizeText(data.first_name)} ${normalizeText(data.last_name)}`.trim()
    || normalizeText(data.username, "O'quvchi");

  return {
    fullName,
    avatar: normalizeText(data.profile_image, 'https://i.pravatar.cc/150?img=12'),
    schoolName: normalizeText(data.school_name, 'Maktab nomi kiritilmagan'),
    educationLevel: normalizeText(data.education_level, "Sinf ko'rsatilmagan"),
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

async function fetchStudentSubjectsAnalytics() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/quizzes/analytics/subjects`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Fanlar tahlilini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<StudentSubjectAnalyticsApi[]>;
}

async function fetchMe() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/auth/me/`, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Foydalanuvchi ma'lumoti olinmadi: ${response.status}`);
  }

  return response.json() as Promise<UserMeResponse>;
}

async function joinMultiplayerSession(sessionCode: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/multiplayer/join/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_code: sessionCode,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sessiyaga qo'shilmadi: ${response.status}`);
  }

  return response.json() as Promise<{ id: number }>;
}

async function joinMultiplayerSessionFromNotification(sessionCode: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/multiplayer/join/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_code: sessionCode,
    }),
  });

  if (!response.ok) {
    throw new Error(`Taklif qabul qilinmadi: ${response.status}`);
  }

  return response.json() as Promise<{ id: number }>;
}

function JoinRealtimeSessionModal({
  open,
  onClose,
  onJoin,
}: {
  open: boolean;
  onClose: () => void;
  onJoin: (sessionCode: string) => Promise<void>;
}) {
  const { theme: t } = useTheme();
  const [sessionCode, setSessionCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setSessionCode('');
      setJoining(false);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  async function handleJoin() {
    const normalized = sessionCode.trim().toUpperCase();
    if (!normalized) {
      setError('Sessiya kodini kiriting');
      return;
    }

    setJoining(true);
    setError('');
    try {
      await onJoin(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sessiyaga qo'shib bo'lmadi");
      setJoining(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          boxShadow: t.shadowHover,
        }}
      >
        <div
          className="px-5 sm:px-6 py-5 sm:py-6"
          style={{
            background: t.isDark
              ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(14,165,233,0.12))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(14,165,233,0.06))',
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: t.isDark ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.25)',
                }}
              >
                <Radio className="w-5 h-5" style={{ color: '#6366F1' }} />
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: t.textPrimary }}>
                  Jonli sessiyaga qo'shilish
                </h3>
                <p className="text-sm mt-1" style={{ color: t.textMuted }}>
                  Do'stingiz yuborgan sessiya kodini kiriting
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${t.border}`,
                color: t.textMuted,
              }}
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-5 sm:py-6">
          <label className="block text-xs font-semibold mb-2" style={{ color: t.textMuted }}>
            Sessiya kodi
          </label>
          <input
            type="text"
            value={sessionCode}
            onChange={(e) => {
              setSessionCode(e.target.value.toUpperCase());
              if (error) setError('');
            }}
            maxLength={6}
            placeholder="Masalan: 5EDV0V"
            className="w-full px-4 py-3.5 rounded-2xl text-base tracking-[0.18em] font-bold uppercase focus:outline-none"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `1.5px solid ${error ? '#EF4444' : t.border}`,
              color: t.textPrimary,
            }}
          />
          {error && (
            <p className="text-xs mt-2" style={{ color: '#EF4444' }}>
              {error}
            </p>
          )}

          <div
            className="mt-4 rounded-2xl px-4 py-3 text-sm"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${t.border}`,
              color: t.textSecondary,
            }}
          >
            Join qilgandan keyin siz to'g'ridan-to'g'ri kutish xonasiga o'tasiz.
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-5">
            <button
              onClick={onClose}
              disabled={joining}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${t.border}`,
                color: t.textSecondary,
                opacity: joining ? 0.7 : 1,
              }}
            >
              Bekor qilish
            </button>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
              style={{
                background: 'linear-gradient(135deg, #6366F1, #3B82F6)',
                boxShadow: '0 6px 18px rgba(59,130,246,0.28)',
                opacity: joining ? 0.8 : 1,
              }}
            >
              {joining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Qo'shilmoqda...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" strokeWidth={2.5} />
                  Qo'shilish
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InviteNotificationModal({
  notification,
  accepting,
  error,
  onAccept,
  onDismiss,
}: {
  notification: ActiveInviteNotification | null;
  accepting: boolean;
  error: string;
  onAccept: () => Promise<void>;
  onDismiss: () => void;
}) {
  const { theme: t } = useTheme();

  if (!notification) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[70] flex justify-center px-3 pt-3 sm:px-4 sm:pt-4 pointer-events-none"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
      }}
    >
      <div
        className="pointer-events-auto w-full max-w-md rounded-[26px] overflow-hidden"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.24)' : 'rgba(99,102,241,0.16)'}`,
          boxShadow: t.isDark ? '0 18px 48px rgba(2,6,23,0.5)' : '0 18px 42px rgba(15,23,42,0.16)',
        }}
      >
        <div
          className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3"
          style={{
            background: t.isDark
              ? 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(59,130,246,0.08) 58%, rgba(16,185,129,0.08))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.09), rgba(59,130,246,0.05) 58%, rgba(16,185,129,0.05))',
            borderBottom: `1px solid ${t.isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.18)'}`,
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
                boxShadow: '0 10px 22px rgba(245,158,11,0.24)',
              }}
            >
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.2} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base sm:text-lg leading-tight" style={{ color: t.textPrimary }}>
                    {notification.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <img
                      src={notification.senderAvatar}
                      alt={notification.senderName}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                      style={{ border: `1px solid ${t.border}` }}
                    />
                    <p className="text-sm font-medium truncate" style={{ color: t.textSecondary }}>
                      {notification.senderName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="hidden sm:block w-2.5 h-2.5 rounded-full"
                    style={{ background: '#22C55E', boxShadow: '0 0 0 4px rgba(34,197,94,0.12)' }}
                  />
                  <button
                    onClick={onDismiss}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${t.border}`,
                      color: t.textMuted,
                    }}
                  >
                    <X className="w-4 h-4" strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-5 py-4 sm:py-5">
          <p className="text-sm sm:text-[15px] leading-6" style={{ color: t.textSecondary }}>
            {notification.message}
          </p>

          <div
            className="mt-3 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
              border: `1px solid ${t.border}`,
            }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>
              Sessiya kodi
            </span>
            <span className="text-sm font-black tracking-[0.2em]" style={{ color: t.textPrimary }}>
              {notification.sessionCode}
            </span>
          </div>

          {error && (
            <div
              className="mt-3 rounded-2xl px-4 py-3 text-sm"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.18)',
                color: '#DC2626',
              }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-2.5 mt-4">
            <button
              onClick={onDismiss}
              disabled={accepting}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)',
                border: `1px solid ${t.isDark ? 'rgba(148,163,184,0.2)' : t.border}`,
                color: t.textSecondary,
                opacity: accepting ? 0.7 : 1,
              }}
            >
              <X className="w-4 h-4" strokeWidth={2.4} />
              Rad etish
            </button>
            <button
              onClick={onAccept}
              disabled={accepting}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
              style={{
                background: 'linear-gradient(135deg, #111827, #000000)',
                boxShadow: t.isDark ? '0 10px 24px rgba(15,23,42,0.34)' : '0 10px 24px rgba(15,23,42,0.18)',
                opacity: accepting ? 0.85 : 1,
              }}
            >
              {accepting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Qo'shilmoqda...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                  Qabul qilish
                </>
              )}
            </button>
          </div>

          <p className="text-xs mt-3" style={{ color: t.textMuted }}>
            Hozir
          </p>
        </div>
      </div>
    </div>
  );
}

function mapSubjectAnalyticsToCard(item: StudentSubjectAnalyticsApi): StudentSubjectCard {
  const appearance = getSubjectAppearance(item.subject_name);
  return {
    id: `${item.subject_name}-${item.first_attempt_date ?? 'na'}-${item.last_attempt_date ?? 'na'}`,
    name: normalizeSubjectName(item.subject_name),
    icon: appearance.icon,
    progress: Number.isFinite(item.percentage) ? Math.max(0, Math.min(100, item.percentage)) : 0,
    correctAnswers: item.correct_answer,
    wrongAnswers: item.wrong_answer,
    totalAnswers: item.total_answer,
    firstAttemptDate: formatAttemptDate(item.first_attempt_date),
    lastAttemptDate: formatAttemptDate(item.last_attempt_date),
    color: appearance.color,
    colorMuted: appearance.colorMuted,
    colorBorder: appearance.colorBorder,
    glow: appearance.glow,
  };
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, color, glow }: { value: number; color: string; glow: string }) {
  return (
    <div
      className="w-full h-2 rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          boxShadow: `0 0 8px ${glow}`,
        }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function StudentHomePage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinRealtimeOpen, setJoinRealtimeOpen] = useState(false);
  const [subjects, setSubjects] = useState<StudentSubjectCard[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState('');
  const [inviteNotification, setInviteNotification] = useState<ActiveInviteNotification | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const notificationSocketRef = useRef<WebSocket | null>(null);
  const storedSession = getStoredAuthSession();
  const currentUserId = storedSession?.user?.id ?? null;
  const fallbackName = `${normalizeText(storedSession?.user?.first_name)} ${normalizeText(storedSession?.user?.last_name)}`.trim()
    || normalizeText(storedSession?.user?.username, "O'quvchi");
  const [studentProfile, setStudentProfile] = useState<StudentBannerProfile>({
    fullName: fallbackName,
    avatar: normalizeText(storedSession?.user?.profile_image, 'https://i.pravatar.cc/150?img=12'),
    schoolName: 'Maktab nomi kiritilmagan',
    educationLevel: "Sinf ko'rsatilmagan",
  });

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Xayrli tong' : hour < 17 ? 'Xayrli kun' : 'Xayrli kech';

  const cardBase = {
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    boxShadow: t.shadowCard,
  };

  useEffect(() => {
    let cancelled = false;

    fetchMe()
      .then((data) => {
        if (cancelled) return;
        setStudentProfile(mapStudentBannerProfile(data));
      })
      .catch(() => {
        // Keep UI fallbacks if the profile request fails.
      });

    fetchStudentSubjectsAnalytics()
      .then((data) => {
        if (cancelled) return;
        setSubjects(Array.isArray(data) ? data.map(mapSubjectAnalyticsToCard) : []);
        setSubjectsError('');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSubjects([]);
        setSubjectsError(err instanceof Error ? err.message : "Fanlar tahlilini yuklab bo'lmadi");
      })
      .finally(() => {
        if (!cancelled) {
          setSubjectsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let closedByCleanup = false;
    let socket: WebSocket | null = null;

    if (!currentUserId) return;

    getValidAccessToken().then((token) => {
      if (!token || closedByCleanup) return;

      const wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws').replace(/\/+$/, '');
      socket = new WebSocket(`${wsBaseUrl}/ws/notifications/${currentUserId}?token=${encodeURIComponent(token)}`);
      notificationSocketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as InviteNotificationEvent;
          if (payload?.type !== 'test_invite_notification' || !payload.data) return;

          const senderFirstName = normalizeText(payload.data.sender?.first_name);
          const senderLastName = normalizeText(payload.data.sender?.last_name);
          const senderName = `${senderFirstName} ${senderLastName}`.trim() || 'Foydalanuvchi';
          const sessionCode = normalizeText(payload.data.payload?.session_code).toUpperCase();
          if (!sessionCode) return;

          setInviteError('');
          setAcceptingInvite(false);
          setInviteNotification({
            id: payload.data.id,
            title: normalizeText(payload.data.title, 'Quiz sessionga taklif'),
            message: normalizeText(payload.data.message, `${senderName} sizni testga taklif qilmoqda.`),
            sessionCode,
            senderName,
            senderAvatar: normalizeText(payload.data.sender?.profile_image, 'https://i.pravatar.cc/150?img=12'),
          });
        } catch {
          // Ignore invalid notification payloads.
        }
      };
    });

    return () => {
      closedByCleanup = true;
      notificationSocketRef.current = null;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
    };
  }, [currentUserId]);

  async function handleJoinRealtime(sessionCode: string) {
    const data = await joinMultiplayerSession(sessionCode);
    setJoinRealtimeOpen(false);
    navigate(`/student/waiting-room?session_id=${data.id}`);
  }

  async function handleAcceptInvite() {
    if (!inviteNotification) return;

    try {
      setAcceptingInvite(true);
      setInviteError('');
      const data = await joinMultiplayerSessionFromNotification(inviteNotification.sessionCode);
      setInviteNotification(null);
      navigate(`/student/waiting-room?session_id=${data.id}`);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Taklifni qabul qilib bo'lmadi");
      setAcceptingInvite(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <InviteNotificationModal
        notification={inviteNotification}
        accepting={acceptingInvite}
        error={inviteError}
        onAccept={handleAcceptInvite}
        onDismiss={() => {
          if (acceptingInvite) return;
          setInviteNotification(null);
          setInviteError('');
        }}
      />

      {/* ── GREETING BANNER ── */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <img
            src={studentProfile.avatar}
            alt={studentProfile.fullName}
            className="w-10 h-10 rounded-full object-cover shrink-0 lg:flex hidden"
            style={{ border: `2px solid #6366F1` }}
          />
          <div>
            <p className="text-xs" style={{ color: t.textMuted }}>{greeting} 👋</p>
            <h1 className="font-bold" style={{ color: t.textPrimary }}>{studentProfile.fullName}</h1>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
              {studentProfile.schoolName} • {studentProfile.educationLevel}
            </p>
          </div>
        </div>
      </div>

      {/* ── QUICK STATS ROW ── */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl p-2.5 sm:p-3.5 flex flex-col items-center gap-1 text-center transition-all"
              style={cardBase}
            >
              <div
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center"
                style={{ background: stat.bg }}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: stat.color }} />
              </div>
              <p className="font-bold text-xs sm:text-sm leading-tight" style={{ color: t.textPrimary }}>{stat.value}</p>
              <p style={{ fontSize: '10px', color: t.textMuted, lineHeight: 1.2 }}>{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── MAIN ACTION: TEST ISHLASH ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 sm:p-7 mb-4 cursor-pointer group transition-all"
        style={{
          background: t.isDark
            ? 'linear-gradient(135deg, #4C1D95 0%, #6366F1 55%, #3B82F6 100%)'
            : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 60%, #3B82F6 100%)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
        }}
      >
        {/* Glow orbs */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #A5B4FC, transparent)' }} />
        <div className="absolute -bottom-6 right-24 w-28 h-28 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #60A5FA, transparent)' }} />
        <div className="absolute top-4 left-1/2 w-20 h-20 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #C4B5FD, transparent)' }} />

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                ASOSIY
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Test ishlash</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.88)' }}>Bilimingizni sinang</p>
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition-all group-hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                <PlayCircle className="w-4 h-4" />
                Boshlash
              </div>
              <div className="flex items-center gap-1 text-white/60 text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>~15 min</span>
              </div>
            </div>
          </div>

          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
        </div>
      </div>

      {/* ── SECONDARY ACTIONS ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
        {/* Test yaratish */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 sm:p-5 cursor-pointer group transition-all hover:scale-[1.02]"
          style={{
            ...cardBase,
            background: t.isDark
              ? 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)'
              : 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(5,150,105,0.04) 100%)',
            border: `1px solid ${t.isDark ? 'rgba(52,211,153,0.25)' : 'rgba(16,185,129,0.2)'}`,
          }}
          onClick={() => setCreateModalOpen(true)}
        >
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #34D399, transparent)' }} />
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: t.isDark ? 'rgba(52,211,153,0.15)' : 'rgba(16,185,129,0.1)' }}
          >
            <PlusSquare className="w-5 h-5" style={{ color: '#34D399' }} />
          </div>
          <h4 className="font-bold text-sm sm:text-base mb-1" style={{ color: t.textPrimary }}>
            Test yaratish
          </h4>
          <p className="text-xs leading-relaxed" style={{ color: t.isDark ? 'rgba(226,232,240,0.88)' : 'rgba(51,65,85,0.88)' }}>
            PDF yoki AI orqali test yarating
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium" style={{ color: '#34D399' }}>
            <span>Yaratish</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Natijalar */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 sm:p-5 cursor-pointer group transition-all hover:scale-[1.02]"
          style={{
            ...cardBase,
            background: t.isDark
              ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.08) 100%)'
              : 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(217,119,6,0.04) 100%)',
            border: `1px solid ${t.isDark ? 'rgba(251,191,36,0.25)' : 'rgba(245,158,11,0.2)'}`,
          }}
          onClick={() => navigate('/student/results')}
        >
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #FBBF24, transparent)' }} />
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: t.isDark ? 'rgba(251,191,36,0.15)' : 'rgba(245,158,11,0.1)' }}
          >
            <BarChart2 className="w-5 h-5" style={{ color: '#FBBF24' }} />
          </div>
          <h4 className="font-bold text-sm sm:text-base mb-1" style={{ color: t.textPrimary }}>
            Natijalar
          </h4>
          <p className="text-xs leading-relaxed" style={{ color: t.isDark ? 'rgba(226,232,240,0.88)' : 'rgba(51,65,85,0.88)' }}>
            Test tarixi va natijalarni ko'ring
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium" style={{ color: '#FBBF24' }}>
            <span>Ko'rish</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl p-4 sm:p-5 cursor-pointer group transition-all hover:scale-[1.02]"
          style={{
            ...cardBase,
            background: t.isDark
              ? 'linear-gradient(135deg, rgba(59,130,246,0.14) 0%, rgba(99,102,241,0.09) 100%)'
              : 'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(99,102,241,0.05) 100%)',
            border: `1px solid ${t.isDark ? 'rgba(59,130,246,0.28)' : 'rgba(59,130,246,0.2)'}`,
          }}
          onClick={() => setJoinRealtimeOpen(true)}
        >
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #60A5FA, transparent)' }} />
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: t.isDark ? 'rgba(96,165,250,0.16)' : 'rgba(59,130,246,0.1)' }}
          >
            <Radio className="w-5 h-5" style={{ color: '#3B82F6' }} />
          </div>
          <h4 className="font-bold text-sm sm:text-base mb-1" style={{ color: t.textPrimary }}>
            Jonli sessiyaga qo'shilish
          </h4>
          <p className="text-xs leading-relaxed" style={{ color: t.isDark ? 'rgba(226,232,240,0.88)' : 'rgba(51,65,85,0.88)' }}>
            Sessiya kodini kiriting va kutish xonasiga o'ting
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium" style={{ color: '#3B82F6' }}>
            <span>Qo'shilish</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* ── MULTIPLAYER / FRIENDS ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 mb-5 cursor-pointer group transition-all hover:shadow-lg"
        onClick={() => navigate('/student/competition')}
        style={{
          ...cardBase,
          background: t.isDark
            ? 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.08) 60%, rgba(56,189,248,0.08) 100%)'
            : 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.04) 60%, rgba(56,189,248,0.04) 100%)',
          border: `1px solid ${t.isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)'}`,
        }}
      >
        {/* Animated pulse */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: '#34D399' }} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: '#22C55E' }} />
          </span>
          <span className="text-xs font-medium" style={{ color: '#22C55E' }}>Jonli</span>
        </div>

        {/* Decorative orbs */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #A78BFA, transparent)' }} />

        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
            style={{
              background: t.isDark
                ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))'
                : 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))',
              border: `1px solid ${t.isDark ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.25)'}`,
            }}
          >
            <Users className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: '#A78BFA' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-base sm:text-lg" style={{ color: t.textPrimary }}>
                Do'stlar bilan ishlash
              </h4>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: t.isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)',
                  color: '#A78BFA',
                  border: `1px solid ${t.isDark ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.2)'}`,
                }}
              >
                Multiplayer
              </span>
            </div>
            <p className="text-xs sm:text-sm" style={{ color: t.textMuted }}>
              Do'stlaringiz bilan real vaqt rejimida test ishlang
            </p>

            {/* Online friends avatars */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex -space-x-2">
                {['🧑', '👧', '👦'].map((emoji, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2"
                    style={{
                      background: t.isDark ? '#1E293B' : '#E2E8F0',
                      borderColor: t.bgCard,
                    }}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
              <span className="text-xs" style={{ color: t.textMuted }}>+12 do'st onlayn</span>
              <div className="ml-auto flex items-center gap-1 text-xs font-semibold" style={{ color: '#A78BFA' }}>
                Qo'shilish
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {['Real-vaqt', 'Reyting', 'Komanda jang'].map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-lg text-xs"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${t.border}`,
                color: t.textSecondary,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── SUBJECT PROGRESS ── */}
      <div className="rounded-2xl p-5 sm:p-6" style={cardBase}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-base sm:text-lg" style={{ color: t.textPrimary }}>
              Mening fanlarim
            </h3>
            <p
              className="text-xs mt-0.5 font-medium"
              style={{ color: t.isDark ? 'rgba(255,255,255,0.72)' : 'rgba(71,85,105,0.88)' }}
            >
              Hozirgi o'rganayotgan fanlar
            </p>
          </div>
          <button
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
              color: t.isDark ? '#818CF8' : '#6366F1',
              border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)'}`,
            }}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Barchasi
          </button>
        </div>

        {/* Subject list */}
        <div className="space-y-4">
          {subjectsLoading && (
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
            >
              Fanlar yuklanmoqda...
            </div>
          )}

          {!subjectsLoading && subjectsError && (
            <div
              className="rounded-xl p-4 text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}
            >
              <XCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span>{subjectsError}</span>
            </div>
          )}

          {!subjectsLoading && !subjectsError && subjects.length === 0 && (
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textSecondary }}
            >
              Hozircha fanlar bo'yicha statistika mavjud emas.
            </div>
          )}

          {!subjectsLoading && !subjectsError && subjects.map((subj) => {
            const Icon = subj.icon;
            const cardTextMuted = t.isDark ? 'rgba(255,255,255,0.78)' : 'rgba(15,23,42,0.68)';
            const cardMetaBackground = t.isDark ? 'rgba(15,23,42,0.22)' : 'rgba(255,255,255,0.72)';
            const cardMetaBorder = t.isDark ? `${subj.color}30` : 'rgba(148,163,184,0.28)';
            const cardMetaLabel = t.isDark ? 'rgba(255,255,255,0.68)' : 'rgba(71,85,105,0.9)';
            const cardMetaValue = t.isDark ? '#F8FAFC' : '#0F172A';
            return (
              <div
                key={subj.id}
                className="group cursor-pointer rounded-xl p-3.5 sm:p-4 transition-all hover:scale-[1.01]"
                style={{
                  background: t.isDark ? subj.colorMuted : `${subj.color}08`,
                  border: `1px solid ${t.isDark ? subj.colorBorder : `${subj.color}20`}`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: t.isDark ? `${subj.color}20` : `${subj.color}15`,
                      border: `1px solid ${subj.colorBorder}`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: subj.color }} />
                  </div>

                  {/* Name + percent */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm" style={{ color: t.textPrimary }}>
                        {subj.name}
                      </span>
                      <span className="font-bold text-sm shrink-0" style={{ color: subj.color }}>
                        {subj.progress}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${subj.progress}%`,
                        background: `linear-gradient(90deg, ${subj.color}88, ${subj.color})`,
                        boxShadow: t.isDark ? `0 0 8px ${subj.glow}` : 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: subj.color }} />
                    <span className="text-xs font-medium" style={{ color: cardTextMuted }}>
                      {subj.correctAnswers} to'g'ri
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" style={{ color: subj.color }} />
                    <span className="text-xs font-medium" style={{ color: cardTextMuted }}>
                      {subj.wrongAnswers} xato
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" style={{ color: subj.color }} />
                    <span className="text-xs font-medium" style={{ color: cardTextMuted }}>
                      {subj.totalAnswers} jami javob
                    </span>
                  </div>
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <div
                      className="rounded-lg px-3 py-2 text-xs"
                      style={{ background: cardMetaBackground, border: `1px solid ${cardMetaBorder}` }}
                    >
                      <span style={{ color: cardMetaLabel }}>Birinchi urinish: </span>
                      <span className="font-semibold" style={{ color: cardMetaValue }}>{subj.firstAttemptDate}</span>
                    </div>
                    <div
                      className="rounded-lg px-3 py-2 text-xs"
                      style={{ background: cardMetaBackground, border: `1px solid ${cardMetaBorder}` }}
                    >
                      <span style={{ color: cardMetaLabel }}>So'nggi urinish: </span>
                      <span className="font-semibold" style={{ color: cardMetaValue }}>{subj.lastAttemptDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Quiz Modal */}
      <CreateQuizModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={() => {}}
        onPdfCreated={(quizId) => {
          setCreateModalOpen(false);
          navigate(`/quizzes/${quizId}`);
        }}
      />

      <JoinRealtimeSessionModal
        open={joinRealtimeOpen}
        onClose={() => setJoinRealtimeOpen(false)}
        onJoin={handleJoinRealtime}
      />

      {/* Bottom padding for mobile nav */}
      <div className="h-4" />
    </div>
  );
}

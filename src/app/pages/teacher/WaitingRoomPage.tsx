import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft, Users, Copy, Check, PlayCircle,
  XCircle, Wifi, Clock, BookOpen, Hash,
  RefreshCw, CheckCircle2, AlertCircle, WifiOff, MessageCircle, X,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.myedunova.uz';

// ─────────────────────────────────────────────
//  Types & Mock data
// ─────────────────────────────────────────────
type StudentStatus = 'ready' | 'preparing' | 'disconnected';

interface WaitingStudent {
  id: number;
  userId: number;
  name: string;
  initials: string;
  color: string;
  status: StudentStatus;
  joinedAt: string | null;
  profileImage: string | null;
  isHost: boolean;
}

interface WaitingRoomLocationState {
  session?: {
    session_id: number;
    quiz_id: number;
    quiz_name: string | null;
    subject_name: string | null;
    host_id: number;
    join_code: string;
    status: string;
    duration_minutes: number;
    questions_count: number;
    started_at: string | null;
    finished_at: string | null;
  };
  quiz?: {
    id: number;
    title: string;
    subject: string;
    questionCount: number;
  };
  sessionType?: 'public' | 'group';
  maxParticipants?: number | null;
  groupNames?: string[];
}

interface SessionInfoResponse {
  session_id: number;
  quiz_id: number;
  quiz_name: string | null;
  subject_name: string | null;
  host_id: number;
  join_code: string;
  status: string;
  duration_minutes: number;
  questions_count: number;
  started_at: string | null;
  finished_at: string | null;
}

interface StartSessionResponse {
  id: number;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  participants_count: number;
  attempts_created: number;
}

interface SessionParticipantApiItem {
  participant_id: number;
  nickname: string;
  profile_image: string | null;
  is_host: boolean;
  first_name: string;
  joined_at: string | null;
  last_name: string;
  participant_status: StudentStatus;
  user_id: number;
}

interface ParticipantJoinedSocketData {
  participant_id: number;
  user_id: number;
  is_host: boolean;
  nickname: string;
  profile_image: string | null;
  first_name: string;
  last_name: string;
  joined_at: string | null;
  status: StudentStatus;
  participants_online?: number;
}

interface ParticipantStatusSocketData {
  user_id: number;
  status: StudentStatus;
  participants_online?: number;
}

interface ChatSocketData {
  message?: string;
  user_id?: number | string;
  user_info?: {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
}

type QuizSessionSocketEvent =
  | {
      event: 'participant_joined';
      data: ParticipantJoinedSocketData;
    }
  | {
      event: 'participant_reconnected' | 'participant_read' | 'participant_ready' | 'participant_disconnected';
      data: ParticipantStatusSocketData;
    }
  | {
      event: 'chat_message';
      data: ChatSocketData;
    };

interface JoinNotification {
  id: number;
  fullName: string;
  profileImage: string | null;
  initials: string;
  color: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  avatar: string;
  isOwn: boolean;
}

interface ChatNotificationState {
  sender: string;
  avatar: string;
  preview: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

const COLORS = [
  '#6366F1','#8B5CF6','#3B82F6','#22C55E',
  '#F59E0B','#14B8A6','#EC4899','#0EA5E9',
  '#A855F7','#10B981','#F97316','#EF4444',
];

// ─────────────────────────────────────────────
//  Status config
// ─────────────────────────────────────────────
const STATUS_CONFIG: Record<StudentStatus, {
  label: string; color: string; bg: string; border: string; Icon: React.ElementType;
}> = {
  ready:        { label: 'Tayyor',       color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',   Icon: CheckCircle2 },
  preparing:    { label: 'Tayyorlanmoqda', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', Icon: AlertCircle  },
  disconnected: { label: "Ulanmagan",    color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   Icon: WifiOff      },
};

async function fetchWithAuthRetry(url: string, init: RequestInit = {}) {
  let token = await getValidAccessToken();
  if (!token) {
    throw new Error("Tizimga qayta kiring");
  }

  const makeRequest = (accessToken: string) =>
    fetch(url, {
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

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

function pickColor(seed: number) {
  return COLORS[Math.abs(seed) % COLORS.length] ?? COLORS[0];
}

function formatJoinedAt(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getCurrentUserIdFromToken(token: string | null) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    return payload?.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

function mapParticipant(item: SessionParticipantApiItem): WaitingStudent {
  const fullName = `${item.first_name} ${item.last_name}`.trim() || item.nickname || `#${item.user_id}`;

  return {
    id: item.participant_id,
    userId: item.user_id,
    name: fullName,
    initials: getInitials(fullName),
    color: pickColor(item.user_id || item.participant_id),
    status: item.participant_status,
    joinedAt: formatJoinedAt(item.joined_at),
    profileImage: item.profile_image,
    isHost: item.is_host,
  };
}

function mapJoinedParticipant(data: ParticipantJoinedSocketData): WaitingStudent {
  const fullName = `${data.first_name} ${data.last_name}`.trim() || data.nickname || `#${data.user_id}`;

  return {
    id: data.participant_id,
    userId: data.user_id,
    name: fullName,
    initials: getInitials(fullName),
    color: pickColor(data.user_id || data.participant_id),
    status: data.status,
    joinedAt: formatJoinedAt(data.joined_at),
    profileImage: data.profile_image,
    isHost: data.is_host,
  };
}

async function fetchSessionInfo(sessionId: number) {
  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/teacher/quiz-sessions/live/${sessionId}/info/`,
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(`Session ma'lumotini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<SessionInfoResponse>;
}

async function fetchSessionParticipants(sessionId: number, page = 1, size = 50) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/teacher/quiz-sessions/live/${sessionId}/participants/?${params.toString()}`,
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(`Ishtirokchilarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<PaginatedResponse<SessionParticipantApiItem>>;
}

async function startQuizSession(sessionId: number) {
  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/teacher/quiz-sessions/live/${sessionId}/start/`,
    {
      method: 'POST',
    },
  );

  if (!response.ok) {
    throw new Error(`Sessionni boshlashda xatolik: ${response.status}`);
  }

  return response.json() as Promise<StartSessionResponse>;
}

// ─────────────────────────────────────────────
//  Card wrapper
// ─────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { theme: t } = useTheme();
  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Status badge
// ─────────────────────────────────────────────
function StatusBadge({ status }: { status: StudentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <cfg.Icon className="w-3 h-3" strokeWidth={2} />
      {cfg.label}
    </span>
  );
}

function JoinNotificationToast({
  notification,
  onClose,
}: {
  notification: JoinNotification | null;
  onClose: () => void;
}) {
  const { theme: t } = useTheme();

  if (!notification) return null;

  return (
    <div
      className="fixed left-3 right-3 bottom-3 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[360px] z-[60]"
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        boxShadow: t.isDark ? '0 14px 40px rgba(0,0,0,0.35)' : '0 16px 40px rgba(15,23,42,0.14)',
        borderRadius: '20px',
      }}
    >
      <div className="flex items-start gap-3 p-4">
        {notification.profileImage ? (
          <img
            src={notification.profileImage}
            alt={notification.fullName}
            className="w-12 h-12 rounded-2xl object-cover shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: notification.color }}
          >
            {notification.initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.18)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#16A34A' }} />
              Yangi ishtirokchi
            </span>
          </div>
          <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
            {notification.fullName}
          </p>
          <p className="text-xs mt-1" style={{ color: t.textMuted }}>
            Kutish xonasiga qo'shildi
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          style={{ background: t.bgInner, color: t.textMuted, border: `1px solid ${t.border}` }}
        >
          <XCircle className="w-4 h-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

function ChatNotificationToast({
  show,
  onClose,
  sender,
  avatar,
  preview,
}: {
  show: boolean;
  onClose: () => void;
  sender: string;
  avatar: string;
  preview: string;
}) {
  const { theme: t } = useTheme();

  useEffect(() => {
    if (!show) return undefined;
    const timer = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(timer);
  }, [onClose, show]);

  if (!show) return null;

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl"
      style={{
        background: t.bgCard,
        border: '1.5px solid rgba(99,102,241,0.28)',
        color: t.textPrimary,
      }}
    >
      <img src={avatar} alt={sender} className="w-9 h-9 rounded-full object-cover shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
          {sender}
        </div>
        <div className="text-xs truncate" style={{ color: t.textMuted }}>
          {preview}
        </div>
      </div>
    </div>
  );
}

function ChatModal({
  onClose,
  messages,
  onSendMessage,
  sending,
}: {
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  sending: boolean;
}) {
  const { theme: t } = useTheme();
  const [message, setMessage] = useState('');

  function handleSend() {
    if (!message.trim() || sending) return;
    onSendMessage(message);
    setMessage('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      />

      <div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          maxHeight: '90vh',
          height: '600px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: t.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.3)',
              }}
            >
              <MessageCircle className="w-4 h-4" style={{ color: '#A78BFA' }} strokeWidth={2} />
            </div>
            <h2 className="font-bold" style={{ color: t.textPrimary }}>Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: t.textMuted }}
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-sm" style={{ color: t.textMuted }}>
              Hozircha xabarlar yo'q
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col gap-1 ${msg.isOwn ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-center gap-2 ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                <img src={msg.avatar} alt={msg.sender} className="w-7 h-7 rounded-full object-cover" />
                <div className={`flex items-baseline gap-2 ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                    {msg.sender}
                  </span>
                  <span className="text-xs" style={{ color: t.textMuted }}>{msg.time}</span>
                </div>
              </div>
              <div
                className="inline-block px-3 py-2 rounded-xl text-sm max-w-[80%]"
                style={{
                  background: msg.isOwn
                    ? 'linear-gradient(135deg, #6366F1, #A78BFA)'
                    : (t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                  color: msg.isOwn ? '#fff' : t.textPrimary,
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div
          className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderTop: `1px solid ${t.border}` }}
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Xabar yozing..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${t.border}`,
              color: t.textPrimary,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: message.trim() && !sending ? 'linear-gradient(135deg, #6366F1, #A78BFA)' : t.border,
              opacity: message.trim() && !sending ? 1 : 0.5,
              cursor: message.trim() && !sending ? 'pointer' : 'not-allowed',
            }}
          >
            {sending ? 'Yuborilmoqda' : 'Yuborish'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────
export function WaitingRoomPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as WaitingRoomLocationState | null) ?? null;
  const sessionId = locationState?.session?.session_id ?? null;
  const socketRef = useRef<WebSocket | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfoResponse | null>(locationState?.session ?? null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [students, setStudents] = useState<WaitingStudent[]>([]);
  const [participantsTotal, setParticipantsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [joinNotification, setJoinNotification] = useState<JoinNotification | null>(null);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [starting, setStarting] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [showChatNotification, setShowChatNotification] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatNotificationData, setChatNotificationData] = useState<ChatNotificationState>({
    sender: '',
    avatar: 'https://i.pravatar.cc/150?img=1',
    preview: '',
  });
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getValidAccessToken().then((token) => {
      if (!cancelled) {
        setCurrentUserId(getCurrentUserIdFromToken(token));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setError("Session ID topilmadi. Qayta session yarating.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [info, participants] = await Promise.all([
          fetchSessionInfo(sessionId),
          fetchSessionParticipants(sessionId),
        ]);

        if (cancelled) return;

        setSessionInfo(info);
        setStudents(participants.items.map(mapParticipant));
        setParticipantsTotal(participants.total);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Ma'lumotlarni yuklab bo'lmadi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!joinNotification) return;

    const timer = window.setTimeout(() => {
      setJoinNotification(null);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [joinNotification]);

  useEffect(() => {
    if (!sessionId) return;

    let active = true;
    let reconnectTimer: number | null = null;

    const connect = async () => {
      try {
        const token = await getValidAccessToken();
        if (!token || !active) return;

        const apiUrl = new URL(API_BASE_URL);
        const socketProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${socketProtocol}//${apiUrl.host}/ws/quiz/sessions/${sessionId}?token=${encodeURIComponent(token)}`;

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          if (!active) return;
          setSocketConnected(true);
          setSendingChat(false);
        };

        socket.onmessage = (message) => {
          if (!active) return;

          try {
            const parsed = JSON.parse(message.data) as QuizSessionSocketEvent;

            if (parsed.event === 'chat_message') {
              const chatPayload = parsed.data;
              const text = normalizeText(chatPayload?.message);
              if (!text) return;

              const sender = `${normalizeText(chatPayload?.user_info?.first_name)} ${normalizeText(chatPayload?.user_info?.last_name)}`.trim() || 'Foydalanuvchi';
              const avatar = normalizeText(chatPayload?.user_info?.avatar_url, 'https://i.pravatar.cc/150?img=1');
              const isOwnMessage = currentUserId !== null && String(chatPayload?.user_id ?? '') === currentUserId;

              setChatMessages((current) => [
                ...current,
                {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  sender,
                  text,
                  time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
                  avatar,
                  isOwn: isOwnMessage,
                },
              ]);

              if (!showChat && !isOwnMessage) {
                setUnreadChatCount((current) => current + 1);
                setChatNotificationData({
                  sender,
                  avatar,
                  preview: text.length > 42 ? `${text.slice(0, 42)}...` : text,
                });
                setShowChatNotification(true);
              }

              setSendingChat(false);
              return;
            }

            if (parsed.event === 'participant_joined') {
              const participant = mapJoinedParticipant(parsed.data as ParticipantJoinedSocketData);
              let existed = false;

              setStudents((prev) => {
                existed = prev.some((item) => item.userId === participant.userId || item.id === participant.id);
                if (existed) {
                  return prev.map((item) =>
                    item.userId === participant.userId || item.id === participant.id
                      ? { ...item, ...participant }
                      : item,
                  );
                }

                return [...prev, participant];
              });

              if (!existed) {
                setParticipantsTotal((prev) => prev + 1);
                setJoinNotification({
                  id: participant.id,
                  fullName: participant.name,
                  profileImage: participant.profileImage,
                  initials: participant.initials,
                  color: participant.color,
                });
              }
              return;
            }

            if (
              parsed.event === 'participant_reconnected' ||
              parsed.event === 'participant_read' ||
              parsed.event === 'participant_ready' ||
              parsed.event === 'participant_disconnected'
            ) {
              const statusUpdate = parsed.data as ParticipantStatusSocketData;
              setStudents((prev) =>
                prev.map((item) =>
                  item.userId === statusUpdate.user_id
                    ? { ...item, status: statusUpdate.status }
                    : item,
                ),
              );
            }
          } catch {
            // Ignore malformed websocket payloads.
          }
        };

        socket.onerror = () => {
          setSendingChat(false);
          socket.close();
        };

        socket.onclose = () => {
          if (!active) return;
          setSocketConnected(false);
          setSendingChat(false);
          reconnectTimer = window.setTimeout(() => {
            connect().catch(() => {});
          }, 3000);
        };
      } catch {
        if (!active) return;
        setSocketConnected(false);
        setSendingChat(false);
      }
    };

    connect().catch(() => {});

    return () => {
      active = false;
      setSocketConnected(false);
      setSendingChat(false);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [currentUserId, sessionId, showChat]);

  useEffect(() => {
    if (!showChat) return;
    setUnreadChatCount(0);
    setShowChatNotification(false);
  }, [showChat]);

  const handleCopy = () => {
    if (!sessionInfo?.join_code) return;
    navigator.clipboard.writeText(sessionInfo.join_code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    if (!sessionId || starting) return;

    setStarting(true);
    setError('');

    try {
      const startedSession = await startQuizSession(sessionId);
      const nextSession = {
        ...(sessionInfo ?? locationState?.session),
        session_id: startedSession.id,
        status: startedSession.status,
        started_at: startedSession.started_at,
        finished_at: startedSession.finished_at,
      };

      setSessionInfo(nextSession);
      setParticipantsTotal(startedSession.participants_count);

      navigate('/live/session', {
        state: {
          session: nextSession,
          quiz: locationState?.quiz ?? undefined,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sessionni boshlashda xatolik yuz berdi");
    } finally {
      setStarting(false);
    }
  };

  const handleCancel = () => navigate('/live');

  const handleSendChatMessage = (message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    setSendingChat(true);
    socket.send(JSON.stringify({
      event: 'chat_message',
      message: trimmedMessage,
    }));
  };

  const readyCount        = students.filter((s) => s.status === 'ready').length;
  const preparingCount    = students.filter((s) => s.status === 'preparing').length;
  const disconnectedCount = students.filter((s) => s.status === 'disconnected').length;

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const derivedSessionInfo = {
    quizName: locationState?.quiz?.title ?? sessionInfo?.quiz_name ?? "Noma'lum quiz",
    subject: locationState?.quiz?.subject ?? sessionInfo?.subject_name ?? "Noma'lum fan",
    joinCode: sessionInfo?.join_code ?? '------',
    duration: `${sessionInfo?.duration_minutes ?? 0} daqiqa`,
    questionsCount: sessionInfo?.questions_count ?? locationState?.quiz?.questionCount ?? null,
    sessionType: locationState?.sessionType ?? null,
    groupNames: locationState?.groupNames ?? [],
  };

  return (
    <>
      <ChatNotificationToast
        show={showChatNotification}
        onClose={() => setShowChatNotification(false)}
        sender={chatNotificationData.sender}
        avatar={chatNotificationData.avatar}
        preview={chatNotificationData.preview}
      />
      {showChat && (
        <ChatModal
          onClose={() => {
            setShowChat(false);
            setShowChatNotification(false);
          }}
          messages={chatMessages}
          onSendMessage={handleSendChatMessage}
          sending={sendingChat}
        />
      )}
      {/* ── Back ── */}
      <button
        onClick={handleCancel}
        className="flex items-center gap-1.5 mb-5 text-sm transition-colors group"
        style={{ color: t.textMuted }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.accent; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2} />
        Jonli Sessionlar
      </button>

      {/* ── Hero header ── */}
      <div
        className="rounded-2xl p-5 sm:p-6 mb-5"
        style={{
          background: t.isDark
            ? 'linear-gradient(135deg,rgba(99,102,241,0.14) 0%,rgba(139,92,246,0.08) 100%)'
            : 'linear-gradient(135deg,rgba(99,102,241,0.07) 0%,rgba(139,92,246,0.04) 100%)',
          border: `1.5px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.18)'}`,
          boxShadow: t.isDark ? '0 0 32px rgba(99,102,241,0.1)' : t.shadowCard,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1.5px solid rgba(99,102,241,0.3)' }}
          >
            <Wifi className="w-6 h-6" style={{ color: '#6366F1' }} strokeWidth={1.75} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
                Kutish Xonasi
              </h1>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: '#6366F1' }} />
                Kutilmoqda
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{
                  background: socketConnected ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
                  color: socketConnected ? '#16A34A' : '#EF4444',
                  border: `1px solid ${socketConnected ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full inline-block ${socketConnected ? 'animate-pulse' : ''}`}
                  style={{ background: socketConnected ? '#16A34A' : '#EF4444' }}
                />
                {socketConnected ? 'Jonli ulangan' : 'Socket uzilgan'}
              </span>
            </div>

            <p className="text-sm font-semibold mb-3" style={{ color: t.textSecondary }}>
              {derivedSessionInfo.quizName}
            </p>

            <div className="flex flex-wrap gap-5">
              {[
                { Icon: BookOpen, label: derivedSessionInfo.subject,           id: 'subj' },
                { Icon: Hash,     label: `Kod: ${derivedSessionInfo.joinCode}`, id: 'code' },
                { Icon: Users,    label: `${participantsTotal} o'quvchi`,       id: 'cnt'  },
                { Icon: Clock,    label: derivedSessionInfo.duration,           id: 'dur'  },
                ...(derivedSessionInfo.questionsCount
                  ? [{ Icon: AlertCircle, label: `${derivedSessionInfo.questionsCount} ta savol`, id: 'questions' }]
                  : []),
              ].map(({ Icon, label, id }) => (
                <div key={id} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                  <span className="text-xs" style={{ color: t.textSecondary }}>{label}</span>
                </div>
              ))}
            </div>

            {derivedSessionInfo.sessionType === 'group' && derivedSessionInfo.groupNames.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {derivedSessionInfo.groupNames.map((groupName) => (
                  <span
                    key={groupName}
                    className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: t.bgCard, color: t.accent, border: `1px solid ${t.accentBorder}` }}
                  >
                    {groupName}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Timer */}
          <div
            className="flex flex-col items-center justify-center px-5 py-3 rounded-2xl shrink-0"
            style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
          >
            <Clock className="w-4 h-4 mb-1" style={{ color: t.textMuted }} strokeWidth={1.75} />
            <span className="text-xl font-bold tabular-nums" style={{ color: t.textPrimary }}>
              {formatElapsed(elapsed)}
            </span>
            <span className="text-xs" style={{ color: t.textMuted }}>Kutish vaqti</span>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Jami qo'shilgan", val: participantsTotal,  color: '#6366F1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)',  Icon: Users        },
          { label: 'Tayyor',          val: readyCount,         color: '#22C55E', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   Icon: CheckCircle2 },
          { label: 'Tayyorlanmoqda',  val: preparingCount,     color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', Icon: AlertCircle  },
          { label: "Ulanmagan",       val: disconnectedCount,  color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   Icon: WifiOff      },
        ].map(({ label, val, color, bg, border, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}25` }}
            >
              <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums" style={{ color: t.textPrimary }}>{val}</p>
              <p className="text-xs" style={{ color: t.textMuted }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid: Student list + Join code ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-5">

        {/* Students list — 2/3 width */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>
                Kutish xonasidagi o'quvchilar
              </h3>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                {participantsTotal} ta o'quvchi qo'shilgan
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: t.accent }} strokeWidth={1.75} />}
              <span className="text-xs" style={{ color: t.textMuted }}>
                {loading ? 'Yangilanmoqda' : "Hozirgi holat"}
              </span>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
                  {['#', "O'quvchi ismi", 'Holat', "Qo'shilgan vaqti"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: t.textMuted }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {error && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm" style={{ color: '#EF4444' }}>
                      {error}
                    </td>
                  </tr>
                )}
                {!error && students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm" style={{ color: t.textMuted }}>
                      Hozircha ishtirokchi yo'q
                    </td>
                  </tr>
                )}
                {students.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="transition-colors"
                    style={{ borderBottom: idx < students.length - 1 ? `1px solid ${t.border}` : 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-2.5 w-10">
                      <span className="text-xs tabular-nums" style={{ color: t.textMuted }}>{idx + 1}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {s.profileImage ? (
                          <img
                            src={s.profileImage}
                            alt={s.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: s.color }}
                          >
                            {s.initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-sm font-medium block truncate" style={{ color: t.textPrimary }}>{s.name}</span>
                          {s.isHost && (
                            <span className="text-xs" style={{ color: t.accent }}>Host</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                        <span className="text-sm tabular-nums" style={{ color: t.textSecondary }}>{s.joinedAt ?? "—"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="block sm:hidden space-y-2">
            {error && (
              <div className="p-3 rounded-xl text-sm text-center" style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}
            {!error && students.length === 0 && (
              <div className="p-3 rounded-xl text-sm text-center" style={{ background: t.bgInner, color: t.textMuted, border: `1px solid ${t.border}` }}>
                Hozircha ishtirokchi yo'q
              </div>
            )}
            {students.map((s, idx) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
              >
                <span className="text-xs w-5 text-center shrink-0" style={{ color: t.textMuted }}>{idx + 1}</span>
                {s.profileImage ? (
                  <img src={s.profileImage} alt={s.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: s.color }}
                  >
                    {s.initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block" style={{ color: t.textPrimary }}>{s.name}</span>
                  {s.isHost && <span className="text-xs" style={{ color: t.accent }}>Host</span>}
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* Right column: Join code + Controls */}
        <div className="flex flex-col gap-4">
          {/* Join code card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: t.textPrimary }}>Kirish kodi</h3>
              <Hash className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={1.75} />
            </div>

            {/* Big code display */}
            <div
              className="flex items-center justify-center py-5 rounded-xl mb-3"
              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
            >
              <span className="text-3xl font-bold tracking-[0.3em]" style={{ color: t.textPrimary }}>
                {derivedSessionInfo.joinCode}
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: copied ? 'rgba(34,197,94,0.1)' : t.accentMuted,
                color:      copied ? '#22C55E' : t.accent,
                border:    `1px solid ${copied ? 'rgba(34,197,94,0.25)' : t.accentBorder}`,
              }}
            >
              {copied
                ? <><Check className="w-4 h-4" strokeWidth={2.5} />Nusxalandi!</>
                : <><Copy className="w-4 h-4" strokeWidth={1.75} />Kodni nusxalash</>}
            </button>

            <p className="text-xs mt-3 text-center" style={{ color: t.textMuted }}>
              O'quvchilar ushbu kodni kiritib qo'shilishlari mumkin
            </p>
          </Card>

          {/* Session Controls card */}
          <Card>
            <h3 className="text-sm font-semibold mb-4" style={{ color: t.textPrimary }}>
              Session boshqaruvi
            </h3>

            <div className="space-y-2.5">
              <button
                onClick={() => setShowChat(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all relative"
                style={{
                  background: t.isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)',
                  border: '1.5px solid rgba(139,92,246,0.25)',
                  color: '#A78BFA',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.18)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)';
                }}
              >
                <MessageCircle className="w-4 h-4" strokeWidth={2} />
                Chat
                {unreadChatCount > 0 && (
                  <span
                    className="absolute top-2 right-2 min-w-5 h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center"
                    style={{
                      background: '#EF4444',
                      color: '#FFFFFF',
                      boxShadow: '0 6px 16px rgba(239,68,68,0.28)',
                    }}
                  >
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
              </button>

              {/* Start */}
              <button
                onClick={handleStart}
                disabled={starting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: starting
                    ? (t.isDark ? '#1E293B' : '#E2E8F0')
                    : 'linear-gradient(135deg,#22C55E,#16A34A)',
                  boxShadow: starting ? 'none' : '0 4px 16px rgba(34,197,94,0.3)',
                  color:     starting ? t.textMuted : '#fff',
                  cursor:    starting ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!starting) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(34,197,94,0.4)'; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = starting ? 'none' : '0 4px 16px rgba(34,197,94,0.3)'; }}
              >
                {starting
                  ? <><RefreshCw className="w-4 h-4 animate-spin" strokeWidth={2} />Boshlanmoqda...</>
                  : <><PlayCircle className="w-4 h-4" strokeWidth={1.75} />Sessionni boshlash</>}
              </button>

              {/* Cancel */}
              <button
                onClick={handleCancel}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(239,68,68,0.07)',
                  color:      '#EF4444',
                  border:    '1px solid rgba(239,68,68,0.2)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.13)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.07)'; }}
              >
                <XCircle className="w-4 h-4" strokeWidth={1.75} />
                Sessionni bekor qilish
              </button>
            </div>

            {/* Note */}
            <div
              className="mt-4 p-3 rounded-xl"
              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
            >
              <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>
                Barcha o'quvchilar tayyor bo'lgach sessionni boshlang. Tayyor bo'lmagan o'quvchilar sessiyaga kira olmaydi.
              </p>
            </div>
          </Card>
        </div>
      </div>
      <JoinNotificationToast notification={joinNotification} onClose={() => setJoinNotification(null)} />
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeft, Info, Copy, CheckCircle, Users, UserPlus,
  Play, Crown, Clock, Wifi, Shield, Sparkles, MessageCircle, X, Target, Share2, AlertCircle,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { InviteFriendsModal } from './InviteFriendsModal';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Participant {
  participant_id?: number;
  user_id: string;
  full_name: string;
  avatar: string;
  role: 'host' | 'participant';
  status: 'ready' | 'waiting' | 'disconnected';
  online: boolean;
}

interface MultiplayerSessionInfoResponse {
  session_id: number;
  quiz_id: number;
  quiz_name: string | null;
  subject_name: string | null;
  host_id: number;
  join_code: string | null;
  status: string | null;
  duration_minutes: number | null;
  questions_count: number | null;
  started_at: string | null;
  finished_at: string | null;
}

interface ParticipantApiItem {
  participant_id: number;
  nickname: string | null;
  profile_image: string | null;
  is_host: boolean;
  first_name: string | null;
  joined_at: string | null;
  last_name: string | null;
  participant_status: string | null;
  user_id: number;
}

interface ParticipantApiResponse {
  items: ParticipantApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  avatar: string;
  isOwn: boolean;
}

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
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

function getCurrentUserIdFromToken(token: string | null) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    return payload?.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

async function fetchSessionInfo(sessionId: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/multiplayer/${sessionId}/info/`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`Sessiya ma'lumoti olinmadi: ${response.status}`);
  }
  return response.json() as Promise<MultiplayerSessionInfoResponse>;
}

async function fetchParticipants(sessionId: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/multiplayer/${sessionId}/participants/?page=1&size=50`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`Ishtirokchilar olinmadi: ${response.status}`);
  }
  return response.json() as Promise<ParticipantApiResponse>;
}

function mapParticipant(item: ParticipantApiItem): Participant {
  const firstName = normalizeText(item.first_name);
  const lastName = normalizeText(item.last_name);
  return {
    participant_id: item.participant_id,
    user_id: String(item.user_id),
    full_name: `${firstName} ${lastName}`.trim() || normalizeText(item.nickname, 'Foydalanuvchi'),
    avatar: normalizeText(item.profile_image, 'https://i.pravatar.cc/150?img=1'),
    role: item.is_host ? 'host' : 'participant',
    status: item.participant_status === 'ready' ? 'ready' : 'waiting',
    online: true,
  };
}

function mapRealtimeStatus(status: string | null | undefined): Participant['status'] {
  if (status === 'disconnected') return 'disconnected';
  return status === 'ready' ? 'ready' : 'waiting';
}

function mapRealtimeOnline(status: string | null | undefined) {
  return status !== 'disconnected';
}

function getParticipantStatusAppearance(status: Participant['status']) {
  switch (status) {
    case 'ready':
      return {
        label: 'Tayyor',
        color: '#22C55E',
        bg: 'rgba(34,197,94,0.12)',
        border: 'rgba(34,197,94,0.28)',
        Icon: CheckCircle,
      };
    case 'disconnected':
      return {
        label: 'Uzildi.',
        color: '#EF4444',
        bg: 'rgba(239,68,68,0.12)',
        border: 'rgba(239,68,68,0.28)',
        Icon: AlertCircle,
      };
    default:
      return {
        label: 'Kutilmoqda',
        color: '#F59E0B',
        bg: 'rgba(245,158,11,0.12)',
        border: 'rgba(245,158,11,0.28)',
        Icon: Clock,
      };
  }
}

async function leaveMultiplayerSession(sessionId: string, participantId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/multiplayer/leave/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: '*/*',
    },
    body: JSON.stringify({
      session_id: Number(sessionId),
      participant_id: participantId,
    }),
  });

  if (response.status !== 204) {
    throw new Error(`Xonadan chiqib bo'lmadi: ${response.status}`);
  }
}

interface StartMultiplayerSessionResponse {
  id: number;
  status: string;
  started_at: string;
  finished_at: string;
  participants_count: number;
  attempts_created: number;
}

async function startMultiplayerSession(sessionId: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/student/sessions/multiplayer/${sessionId}/start/`, {
    method: 'POST',
  });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Testni boshlab bo'lmadi: ${response.status}`);
  }

  return response.json() as Promise<StartMultiplayerSessionResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy Toast Component
// ─────────────────────────────────────────────────────────────────────────────
function CopyToast({ show, onClose }: { show: boolean; onClose: () => void }) {
  const { theme: t } = useTheme();

  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl transition-all animate-slide-down"
      style={{
        background: t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
        border: `1.5px solid rgba(34,197,94,0.4)`,
        color: '#22C55E',
      }}
    >
      <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
      <span className="text-sm font-semibold">Kod nusxalandi!</span>
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
        border: `1.5px solid rgba(99,102,241,0.28)`,
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

// ─────────────────────────────────────────────────────────────────────────────
// Chat Modal Component
// ─────────────────────────────────────────────────────────────────────────────
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
                border: `1px solid rgba(139,92,246,0.3)`,
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

function LeaveRoomModal({
  onConfirm,
  onClose,
  loading,
}: {
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const { theme: t } = useTheme();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={loading ? undefined : onClose}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.62)' }} />
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: t.isDark ? 'rgba(239,68,68,0.16)' : 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.24)',
          }}
        >
          <AlertCircle className="w-6 h-6" style={{ color: '#EF4444' }} strokeWidth={2.2} />
        </div>

        <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: t.textPrimary }}>
          Siz haqiqatdan xonani tark etmoqchimisiz?
        </h2>
        <p className="text-sm sm:text-[15px] leading-6 mb-5" style={{ color: t.textSecondary }}>
          Agar chiqib ketsangiz, kutish xonasidan chiqasiz va sessiyaga qayta qo'shilish uchun kod kerak bo'ladi.
        </p>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold transition-all"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)',
              border: `1px solid ${t.border}`,
              color: t.textPrimary,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Yo'q
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
              boxShadow: '0 10px 24px rgba(239,68,68,0.22)',
              opacity: loading ? 0.85 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <div
                  className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                  style={{ borderWidth: '2px' }}
                />
                Chiqilmoqda...
              </>
            ) : 'Ha'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
export function StudentWaitingRoomPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<MultiplayerSessionInfoResponse | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [showChatNotification, setShowChatNotification] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatNotificationData, setChatNotificationData] = useState({
    sender: '',
    avatar: 'https://i.pravatar.cc/150?img=1',
    preview: '',
  });
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const socketRef = useRef<WebSocket | null>(null);
  const hasNavigatedToTestRef = useRef(false);
  const isHost = currentUserId !== null && String(sessionInfo?.host_id ?? '') === currentUserId;
  const currentParticipantId = participants.find((participant) => participant.user_id === currentUserId)?.participant_id ?? null;
  const currentParticipantName = participants.find((participant) => participant.user_id === currentUserId)?.full_name ?? '';

  function navigateToRunningSession(nextSessionId: string, nextQuizId: string) {
    if (hasNavigatedToTestRef.current) return;
    hasNavigatedToTestRef.current = true;
    const params = new URLSearchParams();
    if (nextQuizId) params.set('quiz_id', nextQuizId);
    if (currentParticipantId) params.set('participant_id', String(currentParticipantId));
    const query = params.toString();
    navigate(`/student/test-taking/${nextSessionId}${query ? `?${query}` : ''}`);
  }

  useEffect(() => {
    let cancelled = false;

    getValidAccessToken().then((token) => {
      if (!cancelled) {
        setCurrentUserId(getCurrentUserIdFromToken(token));
      }
    });

    if (!sessionId) return () => { cancelled = true; };

    Promise.allSettled([
      fetchSessionInfo(sessionId),
      fetchParticipants(sessionId),
    ]).then(([infoResult, participantsResult]) => {
      if (cancelled) return;

      if (infoResult.status === 'fulfilled') {
        setSessionInfo(infoResult.value);
        if (normalizeText(infoResult.value.status).toLowerCase() === 'running') {
          navigateToRunningSession(String(infoResult.value.session_id ?? sessionId), String(infoResult.value.quiz_id ?? searchParams.get('quiz_id') ?? ''));
          return;
        }
      }

      if (participantsResult.status === 'fulfilled') {
        setParticipants((Array.isArray(participantsResult.value.items) ? participantsResult.value.items : []).map(mapParticipant));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    window.history.pushState({ waitingRoomGuard: true }, '', window.location.href);

    const handlePopState = () => {
      setShowLeaveModal(true);
      window.history.pushState({ waitingRoomGuard: true }, '', window.location.href);
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let closedByCleanup = false;

    if (!sessionId) return;

    getValidAccessToken().then((token) => {
      if (!token || closedByCleanup) return;

      const wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws');
      socket = new WebSocket(`${wsBaseUrl}/ws/quiz/sessions/${sessionId}?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        setSendingChat(false);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            event?: string;
            data?: Record<string, unknown>;
          };

          if (!payload?.event || !payload.data) return;

          if (payload.event === 'session_started') {
            const nextSessionId = String(payload.data.session_id ?? sessionId);
            const nextQuizId = String(payload.data.quiz_id ?? searchParams.get('quiz_id') ?? '');
            navigateToRunningSession(nextSessionId, nextQuizId);
            return;
          }

          if (payload.event === 'chat_message') {
            const userInfo = (payload.data.user_info ?? {}) as Record<string, unknown>;
            const firstName = normalizeText(typeof userInfo.first_name === 'string' ? userInfo.first_name : null);
            const lastName = normalizeText(typeof userInfo.last_name === 'string' ? userInfo.last_name : null);
            const sender = `${firstName} ${lastName}`.trim() || 'Foydalanuvchi';
            const text = normalizeText(typeof payload.data.message === 'string' ? payload.data.message : null);

            if (!text) return;

            const isOwnMessage = sender === currentParticipantName;

            setChatMessages((current) => [
              ...current,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                sender,
                text,
                time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
                avatar: normalizeText(typeof userInfo.avatar_url === 'string' ? userInfo.avatar_url : null, 'https://i.pravatar.cc/150?img=1'),
                isOwn: isOwnMessage,
              },
            ]);
            if (!showChat && !isOwnMessage) {
              setUnreadChatCount((current) => current + 1);
              setChatNotificationData({
                sender,
                avatar: normalizeText(typeof userInfo.avatar_url === 'string' ? userInfo.avatar_url : null, 'https://i.pravatar.cc/150?img=1'),
                preview: text.length > 42 ? `${text.slice(0, 42)}...` : text,
              });
              setShowChatNotification(true);
            }
            setSendingChat(false);
            return;
          }

          if (payload.event === 'participant_read') {
            const userId = String(payload.data.user_id ?? '');
            const status = mapRealtimeStatus(typeof payload.data.status === 'string' ? payload.data.status : null);
            setParticipants((current) => current.map((participant) => (
              participant.user_id === userId
                ? { ...participant, status, online: true }
                : participant
            )));
            return;
          }

          if (payload.event === 'participant_joined') {
            const firstName = normalizeText(typeof payload.data.first_name === 'string' ? payload.data.first_name : null);
            const lastName = normalizeText(typeof payload.data.last_name === 'string' ? payload.data.last_name : null);
            const userId = String(payload.data.user_id ?? '');
            const fullName = `${firstName} ${lastName}`.trim()
              || normalizeText(typeof payload.data.nickname === 'string' ? payload.data.nickname : null, 'Foydalanuvchi');

            const nextParticipant: Participant = {
              user_id: userId,
              full_name: fullName,
              avatar: normalizeText(typeof payload.data.profile_image === 'string' ? payload.data.profile_image : null, 'https://i.pravatar.cc/150?img=1'),
              role: payload.data.is_host === true ? 'host' : 'participant',
              status: mapRealtimeStatus(typeof payload.data.status === 'string' ? payload.data.status : null),
              online: mapRealtimeOnline(typeof payload.data.status === 'string' ? payload.data.status : null),
            };

            setParticipants((current) => {
              const exists = current.some((participant) => participant.user_id === userId);
              if (exists) {
                return current.map((participant) => (
                  participant.user_id === userId ? nextParticipant : participant
                ));
              }
              return [...current, nextParticipant];
            });
            return;
          }

          if (payload.event === 'participant_reconnected' || payload.event === 'participant_disconnected') {
            const userId = String(payload.data.user_id ?? '');
            const rawStatus = typeof payload.data.status === 'string' ? payload.data.status : null;
            setParticipants((current) => current.map((participant) => (
              participant.user_id === userId
                ? {
                  ...participant,
                  status: mapRealtimeStatus(rawStatus),
                  online: mapRealtimeOnline(rawStatus),
                }
                : participant
            )));
          }
        } catch {
          // Ignore invalid websocket payloads.
        }
      };

      socket.onerror = () => {
        setSendingChat(false);
      };
    });

    return () => {
      closedByCleanup = true;
      socketRef.current = null;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [currentParticipantName, navigate, searchParams, sessionId, showChat]);

  useEffect(() => {
    if (!showChat) return;
    setUnreadChatCount(0);
    setShowChatNotification(false);
  }, [showChat]);

  const readyCount = participants.filter(p => p.status === 'ready').length;
  const canStart = isHost && participants.length >= 2 && readyCount >= 2;

  function handleCopyCode() {
    // Fallback copy method that works without Clipboard API permissions
    const textArea = document.createElement('textarea');
    textArea.value = normalizeText(sessionInfo?.join_code);
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      setShowCopyToast(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  function handleToggleReady(userId: string) {
    setParticipants(prev => prev.map(p =>
      p.user_id === userId
        ? { ...p, status: p.status === 'ready' ? 'waiting' : 'ready' }
        : p
    ));
  }

  function handleKickParticipant(userId: string) {
    if (!isHost) return;
    setParticipants(prev => prev.filter(p => p.user_id !== userId));
  }

  async function handleStartQuiz() {
    if (!canStart) return;
    setStarting(true);

    try {
      const data = await startMultiplayerSession(sessionId);
      const nextSessionId = String(data.id || sessionInfo?.session_id || searchParams.get('session_id') || sessionId);
      const nextQuizId = String(sessionInfo?.quiz_id ?? searchParams.get('quiz_id') ?? searchParams.get('quiz') ?? '');
      navigateToRunningSession(nextSessionId, nextQuizId);
    } catch (error) {
      console.error(error);
      setStarting(false);
    }
  }

  function handleInvite() {
    const shareText = `Musobaqa kodingiz: ${normalizeText(sessionInfo?.join_code)}\nMen sizni "${normalizeText(sessionInfo?.quiz_name, 'Test')}" testiga taklif qilaman!`;
    if (navigator.share) {
      navigator.share({ text: shareText });
    } else {
      handleCopyCode();
    }
  }

  function handleSendChatMessage(message: string) {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    setSendingChat(true);
    socket.send(JSON.stringify({
      event: 'chat_message',
      message: trimmedMessage,
    }));
  }

  function openLeaveModal() {
    setLeaveError('');
    setShowLeaveModal(true);
  }

  async function handleConfirmLeave() {
    if (!sessionId || !currentParticipantId || leaving) {
      navigate('/student');
      return;
    }

    setLeaving(true);
    setLeaveError('');

    try {
      await leaveMultiplayerSession(sessionId, currentParticipantId);
      navigate('/student');
    } catch (error) {
      setLeaveError(error instanceof Error ? error.message : 'Xonadan chiqishda xatolik yuz berdi');
      setLeaving(false);
    }
  }

  return (
    <div className="min-h-screen pb-8">
      <ChatNotificationToast
        show={showChatNotification}
        onClose={() => setShowChatNotification(false)}
        sender={chatNotificationData.sender}
        avatar={chatNotificationData.avatar}
        preview={chatNotificationData.preview}
      />
      <CopyToast show={showCopyToast} onClose={() => setShowCopyToast(false)} />
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
      {showLeaveModal && (
        <LeaveRoomModal
          onConfirm={handleConfirmLeave}
          onClose={() => {
            if (!leaving) {
              setLeaveError('');
              setShowLeaveModal(false);
            }
          }}
          loading={leaving}
        />
      )}
      {showInviteModal && (
        <InviteFriendsModal
          sessionId={sessionId}
          onClose={() => setShowInviteModal(false)}
          sessionCode={normalizeText(sessionInfo?.join_code)}
          quizTitle={normalizeText(sessionInfo?.quiz_name, 'Test')}
          excludedUserIds={participants.map(p => p.user_id)}
        />
      )}

      {/* ══════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-start justify-between gap-4 pt-6 pb-5 mb-6" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <button
              onClick={openLeaveModal}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 focus:outline-none mt-0.5"
              style={{
                background: t.bgCard,
                border: `1.5px solid ${t.border}`,
                color: t.textSecondary,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.textMuted; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-xl sm:text-2xl truncate" style={{ color: t.textPrimary }}>
                Do'stlar bilan Test
              </h1>
              <p className="text-sm mt-1 flex items-center gap-2" style={{ color: t.textMuted }}>
                <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                Kutish xonasi · {normalizeText(sessionInfo?.quiz_name, 'Test')}
              </p>
            </div>
          </div>

          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 focus:outline-none"
            style={{
              background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
              border: `1.5px solid rgba(99,102,241,0.25)`,
              color: '#6366F1',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.18)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.25)';
            }}
          >
            <Info className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            MAIN CONTENT GRID
        ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {leaveError && (
            <div
              className="lg:col-span-3 rounded-2xl px-4 py-3 text-sm font-medium"
              style={{
                background: t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.24)',
                color: '#EF4444',
              }}
            >
              {leaveError}
            </div>
          )}

          {/* LEFT SIDEBAR (CODE + INVITE) */}
          <div className="lg:col-span-1 space-y-4">

            {/* SESSION CODE BLOCK */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: t.bgCard,
                border: `1.5px solid ${t.border}`,
              }}
            >
              {/* Gradient header */}
              <div
                className="p-5 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)',
                }}
              >
                <div className="absolute inset-0 opacity-10" style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-white" strokeWidth={2} />
                    <p className="text-sm font-semibold text-white">Musobaqa kodi</p>
                  </div>

                  {/* Join Code Display */}
                  <div className="flex items-center justify-center gap-3 py-4 px-5 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                    <span className="text-3xl sm:text-4xl font-black tracking-widest text-white">
                      {normalizeText(sessionInfo?.join_code, '------')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                <p className="text-sm mb-4" style={{ color: t.textSecondary }}>
                  Do'stlaringizni bu kod bilan taklif qiling
                </p>

                <button
                  onClick={handleCopyCode}
                  className="w-full rounded-xl py-2.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    border: `1.5px solid ${t.border}`,
                    color: t.textPrimary,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
                    (e.currentTarget as HTMLElement).style.borderColor = t.textMuted;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
                    (e.currentTarget as HTMLElement).style.borderColor = t.border;
                  }}
                >
                  <Copy className="w-4 h-4" strokeWidth={2} />
                  Kodni nusxalash
                </button>
              </div>
            </div>

            {/* INVITE BUTTON */}
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-full rounded-2xl py-4 font-bold flex items-center justify-center gap-2.5 text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #22C55E 0%, #10B981 100%)',
                boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(34,197,94,0.5)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(34,197,94,0.35)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              <UserPlus className="w-5 h-5" strokeWidth={2.5} />
              Do'st qo'shish
            </button>

            {/* CHAT BUTTON (OPTIONAL FEATURE) */}
            <button
              onClick={() => setShowChat(true)}
              className="w-full rounded-2xl py-4 font-bold flex items-center justify-center gap-2.5 transition-all relative"
              style={{
                background: t.isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)',
                border: `1.5px solid rgba(139,92,246,0.25)`,
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
              <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
              Chat
              {unreadChatCount > 0 && (
                <span
                  className="absolute top-2.5 right-3 min-w-6 h-6 px-1 rounded-full text-xs font-black flex items-center justify-center"
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

            {/* SESSION INFO CARD */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: t.isDark ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.05)',
                border: `1.5px solid rgba(251,191,36,0.2)`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: '#FBBF24' }} strokeWidth={2} />
                <p className="text-sm font-semibold" style={{ color: '#FBBF24' }}>
                  Sessiya ma'lumotlari
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: t.textMuted }}>Davomiyligi:</span>
                  <span className="font-semibold" style={{ color: t.textSecondary }}>
                    {sessionInfo?.duration_minutes ?? 0} daqiqa
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: t.textMuted }}>Savollar:</span>
                  <span className="font-semibold" style={{ color: t.textSecondary }}>
                    {sessionInfo?.questions_count ?? 0} ta
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT MAIN CONTENT (PARTICIPANTS LIST) */}
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: t.bgCard,
                border: `1.5px solid ${t.border}`,
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: `1px solid ${t.border}` }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                      border: `1px solid rgba(99,102,241,0.3)`,
                    }}
                  >
                    <Users className="w-4 h-4" style={{ color: '#6366F1' }} strokeWidth={2} />
                  </div>
                  <h2 className="font-bold" style={{ color: t.textPrimary }}>
                    Ishtirokchilar
                  </h2>
                </div>

                {/* Ready Count Badge */}
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                  style={{
                    background: readyCount === participants.length
                      ? (t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)')
                      : (t.isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.08)'),
                    border: `1px solid ${readyCount === participants.length ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.25)'}`,
                  }}
                >
                  <CheckCircle
                    className="w-3.5 h-3.5"
                    style={{ color: readyCount === participants.length ? '#22C55E' : '#FBBF24' }}
                    strokeWidth={2.5}
                  />
                  <span
                    className="text-xs font-bold"
                    style={{ color: readyCount === participants.length ? '#22C55E' : '#FBBF24' }}
                  >
                    {readyCount}/{participants.length} tayyor
                  </span>
                </div>
              </div>

              {/* Participants List */}
              <div className="divide-y" style={{ borderColor: t.border }}>
                {participants.map((participant, idx) => {
                  const isCurrentUser = participant.user_id === currentUserId;
                  const canKick = isHost && !isCurrentUser && participant.role !== 'host';
                  const statusAppearance = getParticipantStatusAppearance(participant.status);
                  const StatusIcon = statusAppearance.Icon;

                  return (
                    <div
                      key={participant.user_id}
                      className="px-5 py-4 hover:bg-opacity-50 transition-all"
                      style={{
                        background: isCurrentUser
                          ? (t.isDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.03)')
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <img
                            src={participant.avatar}
                            alt={participant.full_name}
                            className="w-12 h-12 rounded-xl object-cover"
                            style={{ border: `2px solid ${t.border}` }}
                          />
                          {/* Online indicator */}
                          {participant.online && (
                            <div
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full"
                              style={{
                                background: '#22C55E',
                                border: `2px solid ${t.bgCard}`,
                              }}
                            />
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold truncate" style={{ color: t.textPrimary }}>
                              {participant.full_name}
                              {isCurrentUser && (
                                <span className="ml-1.5 text-xs font-normal" style={{ color: t.textMuted }}>
                                  (Siz)
                                </span>
                              )}
                            </p>

                            {/* Role Badge */}
                            {participant.role === 'host' && (
                              <span
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold"
                                style={{
                                  background: t.isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.1)',
                                  color: '#FBBF24',
                                  border: `1px solid rgba(251,191,36,0.25)`,
                                }}
                              >
                                <Crown className="w-3 h-3" strokeWidth={2.5} />
                                Host
                              </span>
                            )}
                          </div>

                          {/* Status */}
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                            style={{
                              background: statusAppearance.bg,
                              border: `1px solid ${statusAppearance.border}`,
                            }}
                          >
                            <StatusIcon
                              className="w-3.5 h-3.5"
                              style={{ color: statusAppearance.color }}
                              strokeWidth={2.2}
                            />
                            <span className="text-xs font-semibold" style={{ color: statusAppearance.color }}>
                              {statusAppearance.label}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Toggle Ready Button (only for current user and not host) */}
                          {isCurrentUser && participant.role !== 'host' && (
                            <button
                              onClick={() => handleToggleReady(participant.user_id)}
                              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                              style={{
                                background: participant.status === 'ready'
                                  ? (t.isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.08)')
                                  : (t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)'),
                                border: `1px solid ${participant.status === 'ready' ? 'rgba(148,163,184,0.25)' : 'rgba(34,197,94,0.3)'}`,
                                color: participant.status === 'ready' ? t.textMuted : '#22C55E',
                              }}
                            >
                              {participant.status === 'ready' ? 'Bekor qilish' : 'Tayyor'}
                            </button>
                          )}

                          {/* Kick Button (only for host) */}
                          {canKick && (
                            <button
                              onClick={() => handleKickParticipant(participant.user_id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                              style={{
                                background: t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                                border: `1px solid rgba(239,68,68,0.25)`,
                                color: '#EF4444',
                              }}
                              title="Chiqarish"
                            >
                              <X className="w-4 h-4" strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty State (if less than max) */}
              {sessionInfo && participants.length < 50 && (
                <div className="px-5 py-6 text-center" style={{ borderTop: `1px dashed ${t.border}` }}>
                  <Wifi className="w-8 h-8 mx-auto mb-2" style={{ color: t.textMuted, opacity: 0.5 }} strokeWidth={1.5} />
                  <p className="text-sm" style={{ color: t.textMuted }}>
                    Hozircha {participants.length} ishtirokchi qo'shildi
                  </p>
                </div>
              )}
            </div>

            {/* HOST CONTROLS */}
            {isHost && (
              <div className="mt-5">
                <button
                  onClick={handleStartQuiz}
                  disabled={!canStart || starting}
                  className="w-full rounded-2xl py-5 font-black text-lg flex items-center justify-center gap-3 text-white transition-all"
                  style={{
                    background: canStart && !starting
                      ? 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)'
                      : t.border,
                    boxShadow: canStart && !starting ? '0 6px 24px rgba(99,102,241,0.4)' : 'none',
                    cursor: canStart && !starting ? 'pointer' : 'not-allowed',
                    opacity: canStart && !starting ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => {
                    if (canStart && !starting) {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(99,102,241,0.55)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canStart && !starting) {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(99,102,241,0.4)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {starting ? (
                    <>
                      <div
                        className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"
                        style={{ borderWidth: '3px' }}
                      />
                      Boshlanmoqda...
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6" strokeWidth={2.5} fill="currentColor" />
                      Testni boshlash
                    </>
                  )}
                </button>

                {!canStart && (
                  <p className="text-center text-xs mt-3" style={{ color: t.textMuted }}>
                    {participants.length < 2
                      ? 'Kamida 2 kishi kerak'
                      : readyCount < 2
                        ? 'Kamida 2 kishi tayyor bo\'lishi kerak'
                        : 'Barcha shartlar bajarilmagan'}
                  </p>
                )}
              </div>
            )}

            {/* PARTICIPANT VIEW (waiting for host) */}
            {!isHost && (
              <div
                className="mt-5 rounded-2xl p-5 text-center"
                style={{
                  background: t.isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
                  border: `1.5px dashed rgba(99,102,241,0.25)`,
                }}
              >
                <Target className="w-8 h-8 mx-auto mb-3" style={{ color: '#6366F1', opacity: 0.7 }} strokeWidth={1.5} />
                <p className="font-semibold mb-1" style={{ color: t.textPrimary }}>
                  Host testni boshlaganda siz avtomatik ravishda kiritilasiz
                </p>
                <p className="text-sm" style={{ color: t.textMuted }}>
                  Iltimos, kuting...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

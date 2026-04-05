import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft, Radio, Users, Copy, Check,
  Wifi, WifiOff, Clock, Pause, Play,
  StopCircle, AlertTriangle, CheckCircle2,
  Circle, Loader2, BarChart3, Hash,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
type StudentStatus = 'preparing' | 'ready' | 'active' | 'finished' | 'disconnected';
type ConnectionStatus = 'online' | 'offline';
type SessionState = 'live' | 'paused' | 'ended';

interface Student {
  id: number;
  userId: number;
  name: string;
  avatar: string;
  profileImage: string | null;
  status: StudentStatus;
  currentQuestion: number;
  answeredCount: number;
  totalQuestions: number;
  connection: ConnectionStatus;
  score: number;
}

interface ActiveSessionLocationState {
  session?: {
    session_id: number;
    quiz_id?: number;
    quiz_name?: string | null;
    subject_name?: string | null;
    join_code?: string;
    status?: string;
    duration_minutes?: number;
    questions_count?: number;
    started_at?: string | null;
    finished_at?: string | null;
  };
  quiz?: {
    id: number;
    title: string;
    subject: string;
    questionCount: number;
  };
}

interface MonitoringParticipantApiItem {
  participant_id: number;
  user_id: number;
  full_name: string;
  nickname: string | null;
  profile_image: string | null;
  is_host: boolean;
  status: string;
  connection_status: ConnectionStatus;
  current_question: number;
  answered_count: number;
  total_questions: number;
  progress_percent: number;
  question_answered_count?: number;
  score: number;
  correct_count: number;
  wrong_count: number;
  started_at: string | null;
  finished_at: string | null;
  last_answer_at: string | null;
  last_seen_at: string | null;
}

interface MonitoringSnapshotResponse {
  event: string;
  session_id: number;
  participants: MonitoringParticipantApiItem[];
  total_participants: number;
  online_participants: number;
  finished_participants: number;
}

interface MonitoringParticipantUpdatedEvent {
  event: 'participant_monitoring_updated';
  payload: {
    session_id: number;
    participant: MonitoringParticipantApiItem;
  };
}

interface MonitoringSnapshotSocketEvent {
  event: 'session_monitoring_snapshot';
  payload?: MonitoringSnapshotResponse;
  session_id?: number;
  participants?: MonitoringParticipantApiItem[];
  total_participants?: number;
  online_participants?: number;
  finished_participants?: number;
}

const INITIALS_COLORS = [
  '#6366F1','#8B5CF6','#3B82F6','#22C55E','#F59E0B','#EF4444','#14B8A6','#EC4899',
];

// ─────────────────────────────────────────────
//  Status config
// ─────────────────────────────────────────────
const STATUS_CFG: Record<StudentStatus, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  preparing:    { label: 'Tayyorlanmoqda', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', Icon: Loader2       },
  ready:        { label: 'Tayyor',         color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)',  Icon: Circle        },
  active:       { label: 'Bajarayapti',    color: '#6366F1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)', Icon: Radio         },
  finished:     { label: 'Tugatdi',        color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',  Icon: CheckCircle2  },
  disconnected: { label: 'Uzildi',         color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)', Icon: WifiOff       },
};

async function fetchWithAuthRetry(url: string, init: RequestInit = {}) {
  let token = await getValidAccessToken();
  if (!token) {
    throw new Error("Tizimga qayta kiring");
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

async function fetchSessionMonitoring(sessionId: number) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/teacher/quiz-sessions/live/${sessionId}/monitoring`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Ishtirokchilarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<MonitoringSnapshotResponse>;
}

function toStudentStatus(status: string, connectionStatus: ConnectionStatus): StudentStatus {
  if (status === 'finished') return 'finished';
  if (connectionStatus === 'offline') return 'disconnected';
  if (status === 'in_progress') return 'active';
  if (status === 'ready') return 'ready';
  return 'preparing';
}

function getInitials(fullName: string, nickname?: string | null) {
  const source = fullName.trim() || nickname?.trim() || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function toAbsoluteMediaUrl(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

function mapParticipantToStudent(item: MonitoringParticipantApiItem): Student {
  return {
    id: item.participant_id,
    userId: item.user_id,
    name: item.full_name,
    avatar: getInitials(item.full_name, item.nickname),
    profileImage: toAbsoluteMediaUrl(item.profile_image),
    status: toStudentStatus(item.status, item.connection_status),
    currentQuestion: item.current_question,
    answeredCount: item.answered_count,
    totalQuestions: item.total_questions,
    connection: item.connection_status,
    score: Number(item.score ?? 0),
  };
}

function formatStartedAt(value: string | null | undefined) {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function upsertStudent(students: Student[], nextStudent: Student) {
  const index = students.findIndex(
    (item) => item.id === nextStudent.id || item.userId === nextStudent.userId,
  );

  if (index === -1) {
    return [...students, nextStudent];
  }

  const next = [...students];
  next[index] = { ...next[index], ...nextStudent };
  return next;
}

// Distribution: how many students per question
function buildProgressData(students: Student[], total: number) {
  const map: Record<number, number> = {};
  for (let q = 1; q <= total; q++) map[q] = 0;
  students.forEach((s) => {
    if (s.currentQuestion >= 1 && s.currentQuestion <= total) {
      map[s.currentQuestion] = (map[s.currentQuestion] ?? 0) + 1;
    }
  });
  return Object.entries(map).map(([q, count]) => ({ question: Number(q), count }));
}

// ─────────────────────────────────────────────
//  Shared card shell
// ─────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { theme: t } = useTheme();
  return (
    <div className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}>
      {children}
    </div>
  );
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme: t } = useTheme();
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Elapsed timer
// ─────────────────────────────────────────────
function ElapsedTimer({ paused }: { paused: boolean }) {
  const { theme: t } = useTheme();
  const [secs, setSecs] = useState(18 * 60 + 43); // start at 18:43

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <span className="tabular-nums text-sm font-bold" style={{ color: t.textPrimary }}>
      {mm}:{ss}
    </span>
  );
}

// ─────────────────────────────────────────────
//  Avatar
// ─────────────────────────────────────────────
function Avatar({ initials, id, image }: { initials: string; id: number; image?: string | null }) {
  const color = INITIALS_COLORS[id % INITIALS_COLORS.length];
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: color }}>
      {image ? (
        <img src={image} alt={initials} className="w-full h-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Progress bar (question-level)
// ─────────────────────────────────────────────
function MiniProgress({ current, total }: { current: number; total: number }) {
  const { theme: t } = useTheme();
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: t.bgInner }}>
        <div className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: '#6366F1' }} />
      </div>
      <span className="text-xs tabular-nums shrink-0" style={{ color: t.textMuted }}>
        {current}/{total}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────
export function ActiveSessionPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as ActiveSessionLocationState | null) ?? null;
  const sessionId = locationState?.session?.session_id ?? null;

  const [sessionState, setSessionState] = useState<SessionState>('live');
  const [copied,       setCopied]       = useState(false);
  const [students,     setStudents]     = useState<Student[]>([]);
  const [filterStatus, setFilterStatus] = useState<StudentStatus | 'all'>('all');
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participantsTotal, setParticipantsTotal] = useState(0);
  const [onlineParticipants, setOnlineParticipants] = useState(0);
  const [finishedParticipants, setFinishedParticipants] = useState(0);

  const paused = sessionState === 'paused';

  useEffect(() => {
    if (!sessionId) {
      setError("Session ID topilmadi. Qayta sessionni oching.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchSessionMonitoring(sessionId);
        if (cancelled) return;

        setStudents(data.participants.map(mapParticipantToStudent));
        setParticipantsTotal(data.total_participants);
        setOnlineParticipants(data.online_participants);
        setFinishedParticipants(data.finished_participants);
      } catch (err) {
        if (cancelled) return;
        setStudents([]);
        setError(err instanceof Error ? err.message : "Ishtirokchilarni yuklab bo'lmadi");
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
    if (!sessionId) return;

    let active = true;
    let socket: WebSocket | null = null;

    const connect = async () => {
      try {
        const token = await getValidAccessToken();
        if (!token || !active) return;

        const apiUrl = new URL(API_BASE_URL);
        const socketProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${socketProtocol}//${apiUrl.host}/ws/quiz-sessions/${sessionId}?token=${encodeURIComponent(token)}`;

        socket = new WebSocket(wsUrl);

        socket.onmessage = (message) => {
          if (!active) return;

          try {
            const parsed = JSON.parse(message.data) as MonitoringParticipantUpdatedEvent | MonitoringSnapshotSocketEvent;

            if (parsed.event === 'participant_monitoring_updated') {
              const participant = mapParticipantToStudent(parsed.payload.participant);
              setStudents((prev) => upsertStudent(prev, participant));
              setOnlineParticipants((prev) =>
                participant.connection === 'online'
                  ? Math.max(prev, 1)
                  : prev,
              );
              setFinishedParticipants((prev) =>
                participant.status === 'finished'
                  ? Math.max(prev, 1)
                  : prev,
              );
              return;
            }

            if (parsed.event === 'session_monitoring_snapshot') {
              const snapshot = parsed.payload ?? {
                event: parsed.event,
                session_id: parsed.session_id ?? sessionId,
                participants: parsed.participants ?? [],
                total_participants: parsed.total_participants ?? 0,
                online_participants: parsed.online_participants ?? 0,
                finished_participants: parsed.finished_participants ?? 0,
              };

              setStudents(snapshot.participants.map(mapParticipantToStudent));
              setParticipantsTotal(snapshot.total_participants);
              setOnlineParticipants(snapshot.online_participants);
              setFinishedParticipants(snapshot.finished_participants);
            }
          } catch {
            // Ignore malformed websocket payloads.
          }
        };

        socket.onerror = () => {
          socket?.close();
        };

        socket.onclose = () => {
          // Keep a single websocket connection attempt for this page.
        };
      } catch {
        if (!active) return;
      }
    };

    connect().catch(() => {});

    return () => {
      active = false;
      socket?.close();
    };
  }, [sessionId]);

  // Stat counters
  const totalJoined    = participantsTotal || students.length;
  const finished       = finishedParticipants || students.filter((s) => s.status === 'finished').length;
  const disconnected   = students.filter((s) => s.status === 'disconnected').length;
  const activeCount    = students.filter((s) => s.status === 'active').length;
  const totalQuestions = Math.max(locationState?.session?.questions_count ?? locationState?.quiz?.questionCount ?? 0, ...students.map((s) => s.totalQuestions), 0);

  const progressData = buildProgressData(students, totalQuestions);
  const maxCount     = Math.max(...progressData.map((d) => d.count), 1);

  const filteredStudents = filterStatus === 'all'
    ? students
    : students.filter((s) => s.status === filterStatus);

  const handleCopy = () => {
    const joinCode = locationState?.session?.join_code;
    if (!joinCode) return;
    navigator.clipboard.writeText(joinCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnd = () => {
    setSessionState('ended');
    setShowEndConfirm(false);
    setTimeout(() => navigate('/live'), 2500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: t.textMuted }} strokeWidth={1.75} />
        <p className="text-sm" style={{ color: t.textMuted }}>Ishtirokchilar yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardTitle title="Ishtirokchilar" subtitle="Monitoring ma'lumotini yuklab bo‘lmadi." />
        <div
          className="px-3.5 py-3 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {error}
        </div>
      </Card>
    );
  }

  // ── Ended state ────────────────────────────
  if (sessionState === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-5">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)' }}>
          <CheckCircle2 className="w-9 h-9" style={{ color: '#22C55E' }} strokeWidth={1.75} />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: t.textPrimary }}>Session yakunlandi!</p>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>Sessionlar sahifasiga yo'naltirilmoqda…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ══════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════ */}
      <div className="mb-6 sm:mb-7">
        {/* Back */}
        <button
          onClick={() => navigate('/live')}
          className="flex items-center gap-2 mb-4 text-sm transition-all group"
          style={{ color: t.textMuted }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = t.accent; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
          Sessionlar
        </button>

        {/* Header card */}
        <div className="rounded-2xl p-5 sm:p-6"
          style={{
            background: t.isDark
              ? 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(99,102,241,0.06) 100%)'
              : 'linear-gradient(135deg, rgba(239,68,68,0.05) 0%, rgba(99,102,241,0.03) 100%)',
            border: `1px solid ${t.isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.18)'}`,
            boxShadow: t.isDark ? '0 0 30px rgba(239,68,68,0.12)' : t.shadowCard,
          }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.3)' }}>
              <Radio className="w-6 h-6 animate-pulse" style={{ color: '#EF4444' }} strokeWidth={1.75} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>
                  Faol Session
                </h1>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  {paused ? "To'xtatilgan" : 'Jonli'}
                </span>
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: t.textSecondary }}>
                {locationState?.quiz?.title ?? locationState?.session?.quiz_name ?? "Noma'lum quiz"}
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { Icon: Users,  label: `${totalJoined} o'quvchi qo'shilgan`,                     id: 'joined'   },
                  { Icon: Clock,  label: `Boshlangan: ${formatStartedAt(locationState?.session?.started_at)}`, id: 'started', extra: <ElapsedTimer paused={paused} /> },
                  { Icon: Hash,   label: `${totalQuestions} ta savol`,            id: 'questions'},
                ].map(({ Icon, label, extra, id }) => (
                  <div key={id} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: t.textMuted }} strokeWidth={1.75} />
                    <span className="text-xs" style={{ color: t.textSecondary }}>{label}</span>
                    {extra && <span className="ml-1">{extra}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Join code */}
            <div className="flex items-center gap-3 shrink-0 p-3 rounded-xl"
              style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: t.textMuted }}>Kirish kodi</p>
                <p className="text-2xl font-bold tracking-widest" style={{ color: t.textPrimary }}>
                  {locationState?.session?.join_code ?? '------'}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: copied ? 'rgba(34,197,94,0.1)' : t.bgInner,
                  border:    `1px solid ${copied ? 'rgba(34,197,94,0.3)' : t.border}`,
                  color:      copied ? '#22C55E' : t.textMuted,
                }}
              >
                {copied
                  ? <Check className="w-4 h-4" strokeWidth={2.5} />
                  : <Copy  className="w-4 h-4" strokeWidth={1.75} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          STAT CHIPS ROW
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {[
          { label: "Qo'shilgan",  val: totalJoined,        color: '#6366F1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)',  Icon: Users       },
          { label: 'Faol',        val: onlineParticipants || activeCount, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  Icon: Radio       },
          { label: 'Tugatgan',    val: finished,     color: '#22C55E', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   Icon: CheckCircle2},
          { label: 'Uzilgan',     val: disconnected, color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   Icon: WifiOff     },
        ].map(({ label, val, color, bg, border, Icon }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: bg, border: `1px solid ${border}` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}22` }}>
              <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums" style={{ color: t.textPrimary }}>{val}</p>
              <p className="text-xs" style={{ color: t.textMuted }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ════════════��═════════════════════════
          ROW 1 — Participants | Controls
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-4 sm:mb-5">

        {/* ─── Participants (2/3 width) ─── */}
        <Card className="lg:col-span-2">
          {/* Header + filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <CardTitle
              title="Ishtirokchilar"
              subtitle={`${filteredStudents.length} ta / ${students.length} o'quvchi`}
            />
            {/* Status filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'active', 'finished', 'disconnected', 'ready', 'preparing'] as const).map((f) => {
                const label = f === 'all' ? 'Barchasi' : STATUS_CFG[f]?.label ?? f;
                const active = filterStatus === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilterStatus(f)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: active ? t.accentMuted : t.bgInner,
                      color:      active ? t.accent       : t.textMuted,
                      border:    `1px solid ${active ? t.accentBorder : t.border}`,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl overflow-hidden"
            style={{ border: `1px solid ${t.border}` }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
                  {["O'quvchi", 'Holat', 'Savol', 'Jarayon', 'Ulanish'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: t.textMuted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => {
                  const sc = STATUS_CFG[s.status];
                  const StatusIcon = sc.Icon;
                  return (
                    <tr key={s.id}
                      className="transition-colors"
                      style={{ borderBottom: idx < filteredStudents.length - 1 ? `1px solid ${t.border}` : 'none' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.bgCardHover; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {/* Student */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={s.avatar} id={s.id} image={s.profileImage} />
                          <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{s.name}</span>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          <StatusIcon className={`w-3 h-3 ${s.status === 'preparing' ? 'animate-spin' : ''}`} strokeWidth={2} />
                          {sc.label}
                        </span>
                      </td>
                      {/* Current question */}
                      <td className="px-4 py-3">
                        <span className="text-sm tabular-nums" style={{ color: t.textSecondary }}>
                          {s.currentQuestion > 0 ? `#${s.currentQuestion}` : '—'}
                        </span>
                      </td>
                      {/* Progress bar */}
                      <td className="px-4 py-3" style={{ minWidth: '120px' }}>
                        <MiniProgress current={s.answeredCount} total={s.totalQuestions} />
                      </td>
                      {/* Connection */}
                      <td className="px-4 py-3">
                        {s.connection === 'online'
                          ? <Wifi    className="w-4 h-4" style={{ color: '#22C55E' }} strokeWidth={1.75} />
                          : <WifiOff className="w-4 h-4" style={{ color: '#EF4444' }} strokeWidth={1.75} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="block sm:hidden space-y-2.5">
            {filteredStudents.map((s) => {
              const sc = STATUS_CFG[s.status];
              const StatusIcon = sc.Icon;
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                  <Avatar initials={s.avatar} id={s.id} image={s.profileImage} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: t.textPrimary }}>{s.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        <StatusIcon className={`w-2.5 h-2.5 ${s.status === 'preparing' ? 'animate-spin' : ''}`} strokeWidth={2} />
                        {sc.label}
                      </span>
                      <MiniProgress current={s.answeredCount} total={s.totalQuestions} />
                    </div>
                  </div>
                  {s.connection === 'online'
                    ? <Wifi    className="w-4 h-4 shrink-0" style={{ color: '#22C55E' }} strokeWidth={1.75} />
                    : <WifiOff className="w-4 h-4 shrink-0" style={{ color: '#EF4444' }} strokeWidth={1.75} />}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ─── Session Controls (1/3 width) ─── */}
        <div className="flex flex-col gap-4 sm:gap-5">

          {/* Controls card */}
          <Card>
            <CardTitle title="Session Boshqaruvi" subtitle="Sessiyani boshqaring" />

            <div className="space-y-3">
              {/* Pause / Resume */}
              <button
                onClick={() => setSessionState(paused ? 'live' : 'paused')}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: paused
                    ? 'linear-gradient(135deg,#22C55E,#16A34A)'
                    : 'rgba(245,158,11,0.1)',
                  color:   paused ? '#fff' : '#F59E0B',
                  border: `1.5px solid ${paused ? 'transparent' : 'rgba(245,158,11,0.3)'}`,
                  boxShadow: paused ? '0 4px 14px rgba(34,197,94,0.3)' : 'none',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                {paused
                  ? <><Play        className="w-4 h-4" strokeWidth={2} />Sessiyani davom ettirish</>
                  : <><Pause       className="w-4 h-4" strokeWidth={1.75} />Sessiyani to'xtatish</>}
              </button>

              {/* End session */}
              <button
                onClick={() => setShowEndConfirm(true)}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  color:      '#EF4444',
                  border:     '1.5px solid rgba(239,68,68,0.25)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.16)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                <StopCircle className="w-4 h-4" strokeWidth={1.75} />
                Sessiyani yakunlash
              </button>
            </div>

            {/* Paused banner */}
            {paused && (
              <div className="mt-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Pause className="w-3.5 h-3.5 shrink-0" style={{ color: '#F59E0B' }} strokeWidth={2} />
                <p className="text-xs" style={{ color: '#F59E0B' }}>
                  Session to'xtatildi. O'quvchilar kutmoqda.
                </p>
              </div>
            )}

            {/* Confirm end modal inline */}
            {showEndConfirm && (
              <div className="mt-4 p-4 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.25)' }}>
                <div className="flex items-start gap-2.5 mb-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#EF4444' }} strokeWidth={1.75} />
                  <p className="text-xs" style={{ color: t.textSecondary }}>
                    Sessionni yakunlashni xohlaysizmi? Barcha o'quvchilar uchun davom etmagan savollar to'xtatiladi.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: t.bgInner, border: `1px solid ${t.border}`, color: t.textMuted }}
                  >
                    Bekor
                  </button>
                  <button
                    onClick={handleEnd}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-all"
                    style={{ background: '#EF4444', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}
                  >
                    Yakunlash
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Quick stats card */}
          <Card>
            <CardTitle title="Jonli Statistika" subtitle="Haqiqiy vaqt" />
            <div className="space-y-2.5">
              {[
                { label: 'Bajarilish darajasi', val: `${totalJoined > 0 ? Math.round((finished / totalJoined) * 100) : 0}%`, color: '#22C55E' },
                { label: "Faol o'quvchilar",    val: onlineParticipants || activeCount,  color: '#6366F1' },
                { label: 'Uzilganlar',           val: disconnected, color: '#EF4444' },
                { label: "O'rtacha savol",
                  val: (() => {
                    const onQ = students.filter((s) => s.currentQuestion > 0);
                    const avg = onQ.length ? onQ.reduce((a, s) => a + s.currentQuestion, 0) / onQ.length : 0;
                    return `#${avg.toFixed(1)}`;
                  })(),
                  color: '#3B82F6',
                },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: t.bgInner, border: `1px solid ${t.border}` }}>
                  <span className="text-xs" style={{ color: t.textSecondary }}>{label}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color }}>{val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════
          ROW 2 — Session Progress Chart
      ══════════════════════════════════════ */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>Session Jarayoni</h3>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
              Har bir savolda o'quvchilar soni — real vaqt taqsimoti
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: t.accentMuted, border: `1px solid ${t.accentBorder}` }}>
            <BarChart3 className="w-4 h-4" style={{ color: t.accent }} strokeWidth={1.75} />
          </div>
        </div>

        {/* Bar chart */}
        <div
          className="rounded-2xl px-3 py-4 sm:px-4 overflow-x-auto pb-3"
          style={{
            background: t.isDark
              ? 'linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(30,41,59,0.42) 100%)'
              : 'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(241,245,249,0.85) 100%)',
            border: `1px solid ${t.border}`,
            boxShadow: t.isDark
              ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
              : 'inset 0 1px 0 rgba(255,255,255,0.9)',
            scrollbarColor: `${t.accentBorder} transparent`,
          }}
        >
          <div
            className="flex items-end gap-2 sm:gap-3 h-40 sm:h-52 min-w-full"
            style={{ width: `${Math.max(progressData.length * 44, 320)}px` }}
          >
            {progressData.map(({ question, count }) => {
              const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const isActive  = count > 0;
              const barHeight = isActive ? Math.max(heightPct, 12) : 4;
              return (
                <div key={question} className="w-9 sm:w-10 md:w-11 shrink-0 flex flex-col items-center gap-1.5 group">
                  {/* Count label */}
                  <span className={`text-xs font-bold tabular-nums transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    style={{ color: t.accent }}>
                    {count > 0 ? count : ''}
                  </span>

                  {/* Bar */}
                  <div className="w-full relative flex items-end rounded-t-lg overflow-visible"
                    style={{ height: '100%' }}>
                    <div
                      className="w-full rounded-xl transition-all duration-700"
                      style={{
                        height: `${barHeight}%`,
                        background: isActive
                          ? t.isDark
                            ? 'linear-gradient(180deg, #818CF8 0%, rgba(99,102,241,0.48) 100%)'
                            : 'linear-gradient(180deg, #6366F1 0%, rgba(99,102,241,0.22) 100%)'
                          : t.isDark
                            ? 'rgba(51,65,85,0.55)'
                            : 'rgba(226,232,240,0.9)',
                        border: `1px solid ${isActive ? 'rgba(99,102,241,0.3)' : t.border}`,
                        boxShadow: isActive
                          ? (t.isDark ? '0 0 18px rgba(99,102,241,0.22)' : '0 6px 18px rgba(99,102,241,0.12)')
                          : 'none',
                      }}
                    />
                  </div>

                  {/* Question label */}
                  <span className="text-xs font-medium whitespace-nowrap" style={{ color: t.textMuted }}>
                    Q{question}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3">
          <p className="text-xs" style={{ color: t.textMuted }}>
            Gorizontal aylantiring
          </p>
          <div
            className="h-1.5 w-20 rounded-full"
            style={{
              background: t.isDark ? 'rgba(51,65,85,0.9)' : 'rgba(226,232,240,0.95)',
              border: `1px solid ${t.borderSubtle}`,
            }}
          >
            <div
              className="h-full w-8 rounded-full"
              style={{
                background: t.isDark
                  ? 'linear-gradient(90deg, #818CF8, #6366F1)'
                  : 'linear-gradient(90deg, #6366F1, #4F46E5)',
              }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-5 mt-4 pt-4"
          style={{ borderTop: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#6366F1' }} />
            <span className="text-xs" style={{ color: t.textMuted }}>O'quvchilar shu savolda</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: t.bgInner, border: `1px solid ${t.border}` }} />
            <span className="text-xs" style={{ color: t.textMuted }}>Hali o'quvchi yo'q</span>
          </div>
          <span className="ml-auto text-xs tabular-nums" style={{ color: t.textMuted }}>
            Jami: {totalJoined} o'quvchi
          </span>
        </div>
      </Card>
    </>
  );
}

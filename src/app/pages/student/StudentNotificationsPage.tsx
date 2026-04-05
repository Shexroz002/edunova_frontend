import { useState, useMemo } from 'react';
import { useTheme } from '../../components/ThemeContext';
import {
  Bell,
  CheckCheck,
  Trophy,
  UserPlus,
  FileText,
  Target,
  Clock,
  Check,
  X,
  Users,
  TrendingUp,
  Award,
  Trash2,
  Filter,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type NotificationType = 'quiz_invite' | 'friend_request' | 'result' | 'achievement' | 'reminder' | 'system';

interface Notification {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  description: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  related_id?: string;
  is_read: boolean;
  created_at: Date;
  metadata?: {
    // Quiz Invite
    session_id?: string;
    participants_count?: number;
    expires_at?: Date;
    quiz_name?: string;
    
    // Friend Request
    mutual_friends?: number;
    
    // Quiz Result
    percentage?: number;
    rank?: number;
    weakest_topic?: string;
    total_participants?: number;
    
    // Achievement
    xp_gained?: number;
    badge_icon?: string;
    progress_to_next?: number;
    
    // Reminder
    countdown_minutes?: number;
  };
}

type FilterType = 'all' | 'tests' | 'friends' | 'system';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS: Notification[] = [
  // Today - Unread
  {
    notification_id: '1',
    user_id: 'current_user',
    type: 'quiz_invite',
    title: 'Yangi test taklifi',
    description: 'Jasur Karimov sizni "Matematika: Trigonometriya" testiga taklif qildi',
    sender_id: '2',
    sender_name: 'Jasur Karimov',
    sender_avatar: 'https://i.pravatar.cc/150?img=13',
    related_id: 'quiz_123',
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
    metadata: {
      session_id: 'session_456',
      participants_count: 4,
      expires_at: new Date(Date.now() + 25 * 60 * 1000), // 25 min from now
      quiz_name: 'Matematika: Trigonometriya',
    },
  },
  {
    notification_id: '2',
    user_id: 'current_user',
    type: 'friend_request',
    title: 'Yangi do\'st so\'rovi',
    description: 'Madina Tursunova sizga do\'st so\'rovi yubordi',
    sender_id: '3',
    sender_name: 'Madina Tursunova',
    sender_avatar: 'https://i.pravatar.cc/150?img=5',
    is_read: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
    metadata: {
      mutual_friends: 8,
    },
  },
  {
    notification_id: '3',
    user_id: 'current_user',
    type: 'result',
    title: 'Test natijasi',
    description: 'Siz "Fizika: Mexanika" testini muvaffaqiyatli tugatdingiz!',
    related_id: 'result_789',
    is_read: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    metadata: {
      percentage: 87,
      rank: 3,
      weakest_topic: 'Kuch va harakat',
      total_participants: 12,
    },
  },
  
  // Today - Read
  {
    notification_id: '4',
    user_id: 'current_user',
    type: 'achievement',
    title: 'Yangi yutuq!',
    description: 'Siz "Test ustasi" ko\'krak nishonini qo\'lga kiritdingiz',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    metadata: {
      xp_gained: 500,
      badge_icon: '🏆',
      progress_to_next: 65,
    },
  },
  {
    notification_id: '5',
    user_id: 'current_user',
    type: 'reminder',
    title: 'Test eslatmasi',
    description: '"Kimyo: Organik birikmalar" testi tez orada boshlanadi',
    related_id: 'quiz_890',
    is_read: true,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    metadata: {
      countdown_minutes: 15,
      quiz_name: 'Kimyo: Organik birikmalar',
    },
  },
  
  // Yesterday
  {
    notification_id: '6',
    user_id: 'current_user',
    type: 'friend_request',
    title: 'Yangi do\'st so\'rovi',
    description: 'Sardor Alimov sizga do\'st so\'rovi yubordi',
    sender_id: '4',
    sender_name: 'Sardor Alimov',
    sender_avatar: 'https://i.pravatar.cc/150?img=12',
    is_read: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    metadata: {
      mutual_friends: 3,
    },
  },
  {
    notification_id: '7',
    user_id: 'current_user',
    type: 'result',
    title: 'Test natijasi',
    description: '"Ingliz tili: Grammar" testi natijalari tayyor',
    related_id: 'result_234',
    is_read: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
    metadata: {
      percentage: 92,
      rank: 1,
      weakest_topic: 'Past Simple Tense',
      total_participants: 8,
    },
  },
  
  // Earlier
  {
    notification_id: '8',
    user_id: 'current_user',
    type: 'system',
    title: 'Tizim yangilandi',
    description: 'Yangi xususiyatlar va yaxshilanishlar qo\'shildi',
    is_read: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    notification_id: '9',
    user_id: 'current_user',
    type: 'achievement',
    title: 'Yangi daraja!',
    description: 'Tabriklaymiz! Siz 5-darajaga ko\'tarildingiz',
    is_read: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    metadata: {
      xp_gained: 1000,
      badge_icon: '⭐',
      progress_to_next: 0,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Hozir';
  if (diffMins < 60) return `${diffMins} daqiqa oldin`;
  if (diffHours < 24) return `${diffHours} soat oldin`;
  if (diffDays === 1) return 'Kecha';
  if (diffDays < 7) return `${diffDays} kun oldin`;
  return date.toLocaleDateString('uz-UZ');
}

function getDateGroup(date: Date): 'today' | 'yesterday' | 'earlier' {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (notifDate.getTime() === today.getTime()) return 'today';
  if (notifDate.getTime() === yesterday.getTime()) return 'yesterday';
  return 'earlier';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function StudentNotificationsPage() {
  const { theme: t } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (selectedFilter === 'all') return notifications;
    
    const typeMap: Record<FilterType, NotificationType[]> = {
      all: [],
      tests: ['quiz_invite', 'result', 'reminder'],
      friends: ['friend_request'],
      system: ['system', 'achievement'],
    };
    
    return notifications.filter(n => typeMap[selectedFilter].includes(n.type));
  }, [notifications, selectedFilter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups = {
      today: [] as Notification[],
      yesterday: [] as Notification[],
      earlier: [] as Notification[],
    };

    filteredNotifications.forEach(notif => {
      const group = getDateGroup(notif.created_at);
      groups[group].push(notif);
    });

    return groups;
  }, [filteredNotifications]);

  // Mark all as read
  function markAllAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  // Mark single as read
  function markAsRead(id: string) {
    setNotifications(prev =>
      prev.map(n => (n.notification_id === id ? { ...n, is_read: true } : n))
    );
  }

  // Delete notification
  function deleteNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.notification_id !== id));
  }

  // Accept quiz invite
  function acceptQuizInvite(notifId: string, sessionId?: string) {
    markAsRead(notifId);
    console.log('Accepting quiz invite:', sessionId);
    // Navigate to waiting room or test
  }

  // Decline quiz invite
  function declineQuizInvite(notifId: string) {
    deleteNotification(notifId);
  }

  // Accept friend request
  function acceptFriendRequest(notifId: string, senderId?: string) {
    markAsRead(notifId);
    console.log('Accepting friend request from:', senderId);
    deleteNotification(notifId);
  }

  // Decline friend request
  function declineFriendRequest(notifId: string) {
    deleteNotification(notifId);
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 1. HEADER SECTION */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="font-bold text-xl" style={{ color: t.textPrimary }}>
              Bildirishnomalar
            </h2>
            {unreadCount > 0 && (
              <p className="text-sm mt-1" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}>
                {unreadCount} ta yangi
              </p>
            )}
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                color: t.isDark ? '#818CF8' : '#6366F1',
                border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)'}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.isDark
                  ? 'rgba(99,102,241,0.2)'
                  : 'rgba(99,102,241,0.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.isDark
                  ? 'rgba(99,102,241,0.12)'
                  : 'rgba(99,102,241,0.08)';
              }}
            >
              <CheckCheck className="w-3.5 h-3.5" strokeWidth={2} />
              Barchasini o'qilgan qilish
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 2. FILTERS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="mb-5">
        <div className="relative">
          <Filter
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ width: 16, height: 16, color: t.textMuted }}
            strokeWidth={2}
          />
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as FilterType)}
            className="w-full sm:w-64 pl-10 pr-10 py-3 rounded-xl text-sm font-medium appearance-none cursor-pointer focus:outline-none transition-all"
            style={{
              background: t.bgCard,
              border: `1.5px solid ${t.border}`,
              color: t.textPrimary,
              boxShadow: t.shadowCard,
            }}
            onFocus={(e) => {
              (e.target as HTMLElement).style.borderColor = '#6366F1';
              (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
            }}
            onBlur={(e) => {
              (e.target as HTMLElement).style.borderColor = t.border;
              (e.target as HTMLElement).style.boxShadow = t.shadowCard;
            }}
          >
            <option value="all">Barchasi</option>
            <option value="tests">Testlar</option>
            <option value="friends">Do'stlar</option>
            <option value="system">Tizim</option>
          </select>
          {/* Dropdown arrow */}
          <div
            className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: t.textMuted }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 3. NOTIFICATIONS LIST */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-6">
        {/* Today */}
        {groupedNotifications.today.length > 0 && (
          <div>
            <h3 className="text-xs font-bold mb-3 px-1" style={{ color: t.textMuted }}>
              BUGUN
            </h3>
            <div className="space-y-2">
              {groupedNotifications.today.map(notif => (
                <NotificationItem
                  key={notif.notification_id}
                  notification={notif}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onAcceptQuiz={acceptQuizInvite}
                  onDeclineQuiz={declineQuizInvite}
                  onAcceptFriend={acceptFriendRequest}
                  onDeclineFriend={declineFriendRequest}
                  theme={t}
                />
              ))}
            </div>
          </div>
        )}

        {/* Yesterday */}
        {groupedNotifications.yesterday.length > 0 && (
          <div>
            <h3 className="text-xs font-bold mb-3 px-1" style={{ color: t.textMuted }}>
              KECHA
            </h3>
            <div className="space-y-2">
              {groupedNotifications.yesterday.map(notif => (
                <NotificationItem
                  key={notif.notification_id}
                  notification={notif}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onAcceptQuiz={acceptQuizInvite}
                  onDeclineQuiz={declineQuizInvite}
                  onAcceptFriend={acceptFriendRequest}
                  onDeclineFriend={declineFriendRequest}
                  theme={t}
                />
              ))}
            </div>
          </div>
        )}

        {/* Earlier */}
        {groupedNotifications.earlier.length > 0 && (
          <div>
            <h3 className="text-xs font-bold mb-3 px-1" style={{ color: t.textMuted }}>
              OLDINGI
            </h3>
            <div className="space-y-2">
              {groupedNotifications.earlier.map(notif => (
                <NotificationItem
                  key={notif.notification_id}
                  notification={notif}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onAcceptQuiz={acceptQuizInvite}
                  onDeclineQuiz={declineQuizInvite}
                  onAcceptFriend={acceptFriendRequest}
                  onDeclineFriend={declineFriendRequest}
                  theme={t}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredNotifications.length === 0 && (
          <div className="text-center py-16">
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
                border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}`,
              }}
            >
              <Bell
                style={{ width: 32, height: 32, color: t.isDark ? '#818CF8' : '#6366F1' }}
                strokeWidth={1.5}
              />
            </div>
            <p className="font-bold text-base mb-2" style={{ color: t.textPrimary }}>
              Bildirishnomalar yo'q
            </p>
            <p className="text-sm" style={{ color: t.textMuted }}>
              Yangi bildirishnomalar paydo bo'lganda bu yerda ko'rinadi
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification Item Component
// ─────────────────────────────────────────────────────────────────────────────
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAcceptQuiz: (id: string, sessionId?: string) => void;
  onDeclineQuiz: (id: string) => void;
  onAcceptFriend: (id: string, senderId?: string) => void;
  onDeclineFriend: (id: string) => void;
  theme: any;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onAcceptQuiz,
  onDeclineQuiz,
  onAcceptFriend,
  onDeclineFriend,
  theme: t,
}: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'quiz_invite':
        return <FileText className="w-5 h-5" style={{ color: '#6366F1' }} strokeWidth={2} />;
      case 'friend_request':
        return <UserPlus className="w-5 h-5" style={{ color: '#22C55E' }} strokeWidth={2} />;
      case 'result':
        return <TrendingUp className="w-5 h-5" style={{ color: '#FBBF24' }} strokeWidth={2} />;
      case 'achievement':
        return <Award className="w-5 h-5" style={{ color: '#A855F7' }} strokeWidth={2} />;
      case 'reminder':
        return <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} strokeWidth={2} />;
      case 'system':
        return <Target className="w-5 h-5" style={{ color: '#818CF8' }} strokeWidth={2} />;
      default:
        return <Bell className="w-5 h-5" style={{ color: t.textMuted }} strokeWidth={2} />;
    }
  };

  const getIconBg = () => {
    switch (notification.type) {
      case 'quiz_invite':
        return t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)';
      case 'friend_request':
        return t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)';
      case 'result':
        return t.isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.1)';
      case 'achievement':
        return t.isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.1)';
      case 'reminder':
        return t.isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)';
      default:
        return t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    }
  };

  return (
    <div
      className="rounded-xl p-4 transition-all cursor-pointer relative"
      style={{
        background: notification.is_read
          ? t.bgCard
          : t.isDark
          ? 'rgba(99,102,241,0.06)'
          : 'rgba(99,102,241,0.03)',
        border: `1px solid ${notification.is_read ? t.border : 'rgba(99,102,241,0.2)'}`,
        boxShadow: t.shadowCard,
      }}
      onClick={() => !notification.is_read && onMarkAsRead(notification.notification_id)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
        (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = notification.is_read
          ? t.border
          : 'rgba(99,102,241,0.2)';
        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
      }}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div
          className="absolute top-4 right-4 w-2 h-2 rounded-full"
          style={{ background: '#6366F1' }}
        />
      )}

      <div className="flex gap-3 sm:gap-4">
        {/* Icon */}
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: getIconBg(),
            border: `1px solid ${t.border}`,
          }}
        >
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Sender info for social notifications */}
          {notification.sender_name && notification.sender_avatar && (
            <div className="flex items-center gap-2 mb-2">
              <img
                src={notification.sender_avatar}
                alt={notification.sender_name}
                className="w-6 h-6 rounded-full object-cover"
                style={{ border: `1.5px solid ${t.border}` }}
              />
              <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                {notification.sender_name}
              </span>
            </div>
          )}

          {/* Title */}
          <h4
            className="font-bold text-sm sm:text-base mb-1"
            style={{ color: t.textPrimary }}
          >
            {notification.title}
          </h4>

          {/* Description */}
          <p className="text-xs sm:text-sm mb-2" style={{ color: t.textSecondary }}>
            {notification.description}
          </p>

          {/* Metadata & Actions by Type */}
          {notification.type === 'quiz_invite' && (
            <div className="space-y-2">
              {/* Metadata */}
              <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: t.textMuted }}>
                {notification.metadata?.participants_count && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" strokeWidth={2} />
                    <span>{notification.metadata.participants_count} ishtirokchi</span>
                  </div>
                )}
                {notification.metadata?.expires_at && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" strokeWidth={2} />
                    <span>
                      {Math.floor(
                        (notification.metadata.expires_at.getTime() - Date.now()) / 60000
                      )}{' '}
                      daqiqa qoldi
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcceptQuiz(notification.notification_id, notification.metadata?.session_id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: '#fff',
                    boxShadow: '0 2px 6px rgba(99,102,241,0.3)',
                  }}
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Qabul qilish
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeclineQuiz(notification.notification_id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                    color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.25)',
                  }}
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                  Rad etish
                </button>
              </div>
            </div>
          )}

          {notification.type === 'friend_request' && (
            <div className="space-y-2">
              {/* Metadata */}
              {notification.metadata?.mutual_friends && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
                  <Users className="w-3 h-3" strokeWidth={2} />
                  <span>{notification.metadata.mutual_friends} umumiy do'st</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcceptFriend(notification.notification_id, notification.sender_id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    color: '#fff',
                    boxShadow: '0 2px 6px rgba(34,197,94,0.3)',
                  }}
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Qabul qilish
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeclineFriend(notification.notification_id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                    color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.25)',
                  }}
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                  Rad etish
                </button>
              </div>
            </div>
          )}

          {notification.type === 'result' && (
            <div className="space-y-2">
              {/* Metadata */}
              <div className="flex items-center gap-3 flex-wrap">
                {notification.metadata?.percentage && (
                  <div
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{
                      background: t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
                      color: '#22C55E',
                      border: '1px solid rgba(34,197,94,0.25)',
                    }}
                  >
                    {notification.metadata.percentage}% to'g'ri
                  </div>
                )}
                {notification.metadata?.rank && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
                    <Trophy className="w-3.5 h-3.5" style={{ color: '#FBBF24' }} strokeWidth={2} />
                    <span>
                      {notification.metadata.rank}-o'rin ({notification.metadata.total_participants} ta)
                    </span>
                  </div>
                )}
              </div>

              {/* Weakest topic */}
              {notification.metadata?.weakest_topic && (
                <div className="text-xs" style={{ color: t.textMuted }}>
                  Zaif mavzu: <span style={{ color: t.textSecondary }}>{notification.metadata.weakest_topic}</span>
                </div>
              )}

              {/* Action */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.notification_id);
                  // Navigate to result page
                }}
                className="text-xs font-semibold"
                style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}
              >
                Batafsil ko'rish →
              </button>
            </div>
          )}

          {notification.type === 'achievement' && (
            <div className="space-y-2">
              {/* Badge & XP */}
              <div className="flex items-center gap-3 flex-wrap">
                {notification.metadata?.badge_icon && (
                  <span className="text-2xl">{notification.metadata.badge_icon}</span>
                )}
                {notification.metadata?.xp_gained && (
                  <div
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{
                      background: t.isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.1)',
                      color: '#A855F7',
                      border: '1px solid rgba(168,85,247,0.25)',
                    }}
                  >
                    +{notification.metadata.xp_gained} XP
                  </div>
                )}
              </div>

              {/* Progress */}
              {notification.metadata?.progress_to_next !== undefined && (
                <div className="text-xs" style={{ color: t.textMuted }}>
                  Keyingi darajaga: {notification.metadata.progress_to_next}%
                </div>
              )}
            </div>
          )}

          {notification.type === 'reminder' && (
            <div className="space-y-2">
              {/* Countdown */}
              {notification.metadata?.countdown_minutes && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#F59E0B' }}>
                  <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                  <span className="font-semibold">
                    {notification.metadata.countdown_minutes} daqiqa qoldi
                  </span>
                </div>
              )}

              {/* Action */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.notification_id);
                  // Navigate to quiz
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#fff',
                  boxShadow: '0 2px 6px rgba(245,158,11,0.3)',
                }}
              >
                Testga kirish
              </button>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
            <span className="text-xs" style={{ color: t.textMuted }}>
              {formatTimestamp(notification.created_at)}
            </span>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.notification_id);
              }}
              className="p-1 rounded-lg transition-all"
              style={{ color: t.textMuted }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = t.isDark
                  ? 'rgba(239,68,68,0.15)'
                  : 'rgba(239,68,68,0.1)';
                (e.currentTarget as HTMLElement).style.color = '#EF4444';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = t.textMuted;
              }}
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
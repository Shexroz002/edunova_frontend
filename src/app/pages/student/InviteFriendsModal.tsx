import { useEffect, useMemo, useState } from 'react';
import { UserPlus, X, Search, CheckCircle, Send } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.myedunova.uz';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface User {
  user_id: string;
  full_name: string;
  username: string;
  avatar: string;
}

interface InviteFriendsModalProps {
  sessionId: string;
  sessionCode: string;
  quizTitle: string;
  onClose: () => void;
  excludedUserIds?: string[]; // IDs of users already in the waiting room
}

interface ContactApiItem {
  id: number;
  friend: {
    id: number | null;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    role: string | null;
    profile_image: string | null;
  } | null;
}

interface ContactListResponse {
  items: ContactApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
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

async function fetchContacts() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/users/contact/list/?page=1&size=50`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Do'stlar ro'yxati olinmadi: ${response.status}`);
  }

  return response.json() as Promise<ContactListResponse>;
}

async function inviteFriend(sessionId: string, sessionCode: string, recipientId: string) {
  const response = await fetchWithAuthRetry(
    `${API_BASE_URL}/api/v1/student/sessions/multiplayer/${sessionId}/invite/?session_code=${encodeURIComponent(sessionCode)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: Number.parseInt(recipientId, 10),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Taklif yuborilmadi: ${response.status}`);
  }
}

function mapUser(item: ContactApiItem): User {
  const firstName = normalizeText(item.friend?.first_name);
  const lastName = normalizeText(item.friend?.last_name);
  const fullName = `${firstName} ${lastName}`.trim() || normalizeText(item.friend?.username, 'Foydalanuvchi');
  const username = normalizeText(item.friend?.username, `friend_${item.id}`);
  return {
    user_id: String(item.friend?.id ?? item.id),
    full_name: fullName,
    username: username.startsWith('@') ? username : `@${username}`,
    avatar: normalizeText(item.friend?.profile_image, ''),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function InviteFriendsModal({ 
  sessionId,
  sessionCode, 
  quizTitle, 
  onClose,
  excludedUserIds = []
}: InviteFriendsModalProps) {
  const { theme: t } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchContacts()
      .then((data) => {
        if (cancelled) return;
        setUsers((Array.isArray(data.items) ? data.items : []).map(mapUser));
      })
      .catch(() => {
        if (cancelled) return;
        setUsers([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Filter users based on search query and exclusions
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    return users.filter(user => {
      // Exclude already joined participants
      if (excludedUserIds.includes(user.user_id)) return false;
      
      // If no search query, show all
      if (!query) return true;
      
      // Search by full_name or username
      return (
        user.full_name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, excludedUserIds, users]);

  function handleInvite(userId: string) {
    setSendingUserId(userId);
    inviteFriend(sessionId, sessionCode, userId)
      .then(() => {
        setInvitedUsers(prev => new Set(prev).add(userId));
      })
      .finally(() => {
        setSendingUserId(null);
      });
  }

  function getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.65)' }}
      />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          maxHeight: '90vh',
          height: 'min(700px, 90vh)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══════════════════════════════════════════════════════
            HEADER SECTION
        ══════════════════════════════════════════════════════ */}
        <div
          className="relative px-6 py-6 overflow-hidden shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)',
          }}
        >
          {/* Pattern overlay */}
          <div 
            className="absolute inset-0 opacity-10" 
            style={{ 
              background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' 
            }} 
          />
          
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <UserPlus className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-black text-white truncate">
                  Do'stlarni taklif qilish
                </h2>
              </div>
              <p className="text-sm text-white/80 ml-12 line-clamp-2">
                Do'stlaringizni "{quizTitle}" testiga taklif qiling
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)';
              }}
            >
              <X className="w-4 h-4 text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            SEARCH SECTION
        ══════════════════════════════════════════════════════ */}
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="relative">
            <Search 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" 
              style={{ color: t.textMuted }}
              strokeWidth={2}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ism yoki username..."
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all focus:outline-none"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${t.border}`,
                color: t.textPrimary,
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#6366F1';
                (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = t.border;
                (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
              }}
            />
          </div>
          
          {/* Results count */}
          <p className="text-xs mt-2" style={{ color: t.textMuted }}>
            {filteredUsers.length} ta foydalanuvchi topildi
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════
            USERS LIST SECTION
        ══════════════════════════════════════════════════════ */}
        <div 
          className="flex-1 overflow-y-auto custom-scrollbar"
          style={{
            // Custom scrollbar styling
            scrollbarWidth: 'thin',
            scrollbarColor: t.isDark 
              ? 'rgba(255,255,255,0.2) rgba(255,255,255,0.05)' 
              : 'rgba(0,0,0,0.2) rgba(0,0,0,0.05)',
          }}
        >
          <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: ${t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: ${t.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
              border-radius: 4px;
              transition: background 0.2s;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: ${t.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'};
            }
          `}</style>
          {filteredUsers.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)',
                  border: `1.5px solid rgba(99,102,241,0.2)`,
                }}
              >
                <Search className="w-7 h-7" style={{ color: '#6366F1', opacity: 0.5 }} strokeWidth={1.5} />
              </div>
              <h3 className="font-bold mb-1" style={{ color: t.textPrimary }}>
                Hech narsa topilmadi
              </h3>
              <p className="text-sm" style={{ color: t.textMuted }}>
                Boshqa ism yoki username bilan qidiring
              </p>
            </div>
          ) : (
            /* Users List */
            <div className="divide-y" style={{ borderColor: t.border }}>
              {filteredUsers.map((user) => {
                const isInvited = invitedUsers.has(user.user_id);
                const isSending = sendingUserId === user.user_id;

                return (
                  <div
                    key={user.user_id}
                    className="px-6 py-4 transition-colors"
                    style={{
                      background: isInvited 
                        ? (t.isDark ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.03)')
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isInvited) {
                        (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isInvited) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      } else {
                        (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.03)';
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center"
                          style={{
                            border: `2px solid ${t.border}`,
                            background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                          }}
                        >
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span 
                              className="text-sm font-bold"
                              style={{ color: '#6366F1' }}
                            >
                              {getInitials(user.full_name)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: t.textPrimary }}>
                          {user.full_name}
                        </p>
                        <p className="text-sm truncate" style={{ color: t.textMuted }}>
                          {user.username}
                        </p>
                      </div>

                      {/* Invite Button */}
                      <button
                        onClick={() => handleInvite(user.user_id)}
                        disabled={isInvited || isSending}
                        className="px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shrink-0"
                        style={{
                          background: isInvited
                            ? (t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)')
                            : isSending
                            ? (t.isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)')
                            : (t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)'),
                          border: `1.5px solid ${isInvited ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.25)'}`,
                          color: isInvited ? '#22C55E' : '#6366F1',
                          cursor: isInvited || isSending ? 'default' : 'pointer',
                          opacity: isInvited ? 0.8 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!isInvited && !isSending) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.18)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isInvited && !isSending) {
                            (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.25)';
                          }
                        }}
                      >
                        {isInvited ? (
                          <>
                            <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">Yuborildi</span>
                          </>
                        ) : isSending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span className="hidden sm:inline">Yuborilmoqda</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" strokeWidth={2} />
                            <span className="hidden sm:inline">Taklif</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            FOOTER SECTION
        ══════════════════════════════════════════════════════ */}
        <div
          className="px-6 py-4 shrink-0"
          style={{ borderTop: `1px solid ${t.border}` }}
        >
          {/* Invited Count Badge */}
          {invitedUsers.size > 0 && (
            <div
              className="mb-3 px-4 py-2.5 rounded-xl flex items-center justify-between"
              style={{
                background: t.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)',
                border: `1.5px solid rgba(34,197,94,0.25)`,
              }}
            >
              <span className="text-sm font-semibold" style={{ color: '#22C55E' }}>
                {invitedUsers.size} ta taklif yuborildi
              </span>
              <CheckCircle className="w-4 h-4" style={{ color: '#22C55E' }} strokeWidth={2.5} />
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold transition-all"
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
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}

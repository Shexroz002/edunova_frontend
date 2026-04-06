import { useEffect, useRef, useState } from 'react';
import { X, Search, UserPlus, Users, Clock, Check } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { getValidAccessToken, refreshStoredAuthToken } from '../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.myedunova.uz';
const PAGE_SIZE = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface User {
  user_id: string;
  full_name: string;
  username?: string;
  avatar?: string;
  online: boolean;
  last_seen?: string;
  mutual_friends?: number;
  is_friend?: boolean;
  is_pending?: boolean;
  from_suggestion?: boolean;
}

interface UserSearchApiItem {
  id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role?: string | null;
  profile_image: string | null;
  contact_available: boolean | null;
}

interface UserSearchApiResponse {
  items: UserSearchApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface AddFriendModalProps {
  onClose: () => void;
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

async function fetchUsersPage(search: string, page: number) {
  const params = new URLSearchParams({
    search,
    page: String(page),
    size: String(PAGE_SIZE),
  });

  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/users/search?${params.toString()}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Foydalanuvchilarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<UserSearchApiResponse>;
}

async function fetchSuggestionsPage(page: number) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(PAGE_SIZE),
  });

  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/users/contact/suggestions/?${params.toString()}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Takliflarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<UserSearchApiResponse>;
}

async function createContact(userId: string) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/users/contact/create/${userId}`, {
    method: 'GET',
  });

  if (response.status !== 201) {
    throw new Error(`Do'st qo'shishda xatolik: ${response.status}`);
  }
}

function mapUser(item: UserSearchApiItem, options?: { forceAddable?: boolean }): User {
  const firstName = normalizeText(item.first_name);
  const lastName = normalizeText(item.last_name);
  const fullName = `${firstName} ${lastName}`.trim() || normalizeText(item.username, 'Nomaʼlum foydalanuvchi');
  const username = normalizeText(item.username, `user_${item.id}`);
  const canAddContact = options?.forceAddable ? true : item.contact_available === false;

  return {
    user_id: String(item.id),
    full_name: fullName,
    username: username.startsWith('@') ? username : `@${username}`,
    avatar: normalizeText(item.profile_image, undefined),
    online: false,
    last_seen: 'Offline',
    mutual_friends: 0,
    is_friend: !canAddContact,
    is_pending: false,
    from_suggestion: options?.forceAddable ?? false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get initials from name
// ─────────────────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function AddFriendModal({ onClose }: AddFriendModalProps) {
  const { theme: t } = useTheme();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingRequest, setLoadingRequest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const query = debouncedSearch.trim();

    setError('');
    setPage(1);
    setPages(1);
    setTotal(0);

    setLoading(true);
    setUsers([]);

    const request = query ? fetchUsersPage(query, 1) : fetchSuggestionsPage(1);

    request
      .then((data) => {
        if (cancelled) return;
        setUsers((Array.isArray(data.items) ? data.items : []).map((item) => mapUser(item, { forceAddable: !query })));
        setPage(data.page ?? 1);
        setPages(data.pages ?? 1);
        setTotal(data.total ?? 0);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setUsers([]);
        setError(err instanceof Error ? err.message : "Foydalanuvchilarni yuklab bo'lmadi");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    const root = listRef.current;
    const node = loadMoreRef.current;
    if (!root || !node || loading || loadingMore || page >= pages) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;

      setLoadingMore(true);

      const query = debouncedSearch.trim();
      const request = query ? fetchUsersPage(query, page + 1) : fetchSuggestionsPage(page + 1);

      request
        .then((data) => {
          setUsers((current) => [
            ...current,
            ...(Array.isArray(data.items) ? data.items : []).map((item) => mapUser(item, { forceAddable: !query })),
          ]);
          setPage(data.page ?? (page + 1));
          setPages(data.pages ?? 1);
          setTotal(data.total ?? 0);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Keyingi foydalanuvchilarni yuklab bo'lmadi");
        })
        .finally(() => {
          setLoadingMore(false);
        });
    }, { root, rootMargin: '120px 0px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [debouncedSearch, loading, loadingMore, page, pages]);

  // Handle friend request
  function handleAddFriend(userId: string) {
    setLoadingRequest(userId);
    setError('');

    createContact(userId)
      .then(() => {
        setUsers(prev =>
          prev.map(user =>
            user.user_id === userId
              ? { ...user, is_pending: false, is_friend: true }
              : user
          )
        );
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Do'st qo'shib bo'lmadi");
      })
      .finally(() => {
        setLoadingRequest(null);
      });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 1. HEADER SECTION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div
          className="px-5 sm:px-6 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                border: `1.5px solid rgba(99,102,241,0.25)`,
              }}
            >
              <UserPlus className="w-5 h-5" style={{ color: '#6366F1' }} strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg" style={{ color: t.textPrimary }}>
                Do'st qo'shish
              </h2>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                Yangi do'stlar toping
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${t.border}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
              (e.currentTarget as HTMLElement).style.borderColor = t.border;
            }}
          >
            <X className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={2} />
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. SEARCH INPUT */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="px-5 sm:px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width: 16, height: 16, color: t.textMuted }}
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Ism yoki username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
              style={{
                background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${t.border}`,
                color: t.textPrimary,
              }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = '#6366F1';
                (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = t.border;
                (e.target as HTMLElement).style.boxShadow = 'none';
              }}
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: t.textMuted,
                }}
              >
                <X style={{ width: 12, height: 12 }} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 3. SEARCH RESULTS INFO */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div
          className="px-5 sm:px-6 py-3 flex items-center justify-between shrink-0"
          style={{
            background: t.isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#6366F1' }} />
            <span className="text-xs font-semibold" style={{ color: t.textSecondary }}>
              {debouncedSearch.trim() ? total : users.length} foydalanuvchi topildi
            </span>
          </div>
          {debouncedSearch && (
            <span className="text-xs" style={{ color: t.textMuted }}>
              "<span style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}>{debouncedSearch}</span>" bo'yicha
            </span>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 4. USERS LIST */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div
          ref={listRef}
          className="overflow-y-auto flex-1"
          style={{ background: t.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <p className="text-sm text-center" style={{ color: t.textMuted }}>
                Foydalanuvchilar yuklanmoqda...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <p className="text-sm text-center" style={{ color: '#EF4444' }}>
                {error}
              </p>
            </div>
          ) : users.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
                  border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}`,
                }}
              >
                <Search
                  style={{ width: 28, height: 28, color: t.isDark ? '#818CF8' : '#6366F1' }}
                  strokeWidth={1.5}
                />
              </div>
              <p className="font-bold text-base mb-1" style={{ color: t.textPrimary }}>
                Foydalanuvchi topilmadi
              </p>
              <p className="text-sm text-center" style={{ color: t.textMuted }}>
                {debouncedSearch
                  ? `"${debouncedSearch}" bo'yicha natija yo'q`
                  : 'Taklif qilinadigan foydalanuvchilar topilmadi'}
              </p>
            </div>
          ) : (
            // Users Grid
            <div className="p-4 sm:p-5 space-y-2">
              {users.map((user) => (
                <div
                  key={user.user_id}
                  className="rounded-xl p-3 sm:p-4 transition-all hover:scale-[1.01]"
                  style={{
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    boxShadow: t.shadowCard,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                    (e.currentTarget as HTMLElement).style.boxShadow = t.shadowHover;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = t.border;
                    (e.currentTarget as HTMLElement).style.boxShadow = t.shadowCard;
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.full_name}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover"
                          style={{ border: `2px solid ${t.border}` }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-bold text-sm"
                          style={{
                            background: `linear-gradient(135deg, ${t.isDark ? '#6366F1' : '#818CF8'}, ${t.isDark ? '#8B5CF6' : '#A78BFA'})`,
                            color: '#fff',
                          }}
                        >
                          {getInitials(user.full_name)}
                        </div>
                      )}
                      {/* Online indicator */}
                      {user.online && (
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{
                            background: t.bgCard,
                            border: `2px solid ${t.bgCard}`,
                          }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3
                          className="font-bold text-sm sm:text-base truncate"
                          style={{ color: t.textPrimary }}
                        >
                          {user.full_name}
                        </h3>
                      </div>
                      
                      {user.username && (
                        <p className="text-xs truncate mb-1" style={{ color: t.textMuted }}>
                          {user.username}
                        </p>
                      )}

                      {/* Status & Mutual Friends */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Online Status / Last Seen */}
                        <div className="flex items-center gap-1.5">
                          {user.online ? (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                              <span className="text-xs font-medium" style={{ color: '#22C55E' }}>
                                Onlayn
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={2} />
                              <span className="text-xs" style={{ color: t.textMuted }}>
                                {user.last_seen || 'Offline'}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Mutual Friends */}
                        {user.mutual_friends !== undefined && user.mutual_friends > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3" style={{ color: t.textMuted }} strokeWidth={2} />
                            <span className="text-xs font-medium" style={{ color: t.textSecondary }}>
                              {user.mutual_friends} umumiy do'st
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════ */}
                    {/* 5. ACTION BUTTON */}
                    {/* ═══════════════════════════════════════════════════════════════ */}
                    <div className="shrink-0">
                      {user.is_friend ? (
                        // Already Friends
                        <div
                          className="px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                          style={{
                            background: t.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)',
                            color: '#22C55E',
                            border: '1.5px solid rgba(34,197,94,0.25)',
                          }}
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                          <span className="hidden sm:inline">Do'st</span>
                        </div>
                      ) : user.is_pending ? (
                        // Pending Request
                        <div
                          className="px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                          style={{
                            background: t.isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.08)',
                            color: '#FBBF24',
                            border: '1.5px solid rgba(251,191,36,0.25)',
                          }}
                        >
                          <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                          <span className="hidden sm:inline">Kutilmoqda</span>
                        </div>
                      ) : (
                        // Add Friend Button
                        <button
                          onClick={() => handleAddFriend(user.user_id)}
                          disabled={loadingRequest === user.user_id}
                          className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: loadingRequest === user.user_id
                              ? t.border
                              : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                            color: '#fff',
                            boxShadow: loadingRequest === user.user_id ? 'none' : '0 2px 8px rgba(99,102,241,0.3)',
                          }}
                          onMouseEnter={(e) => {
                            if (loadingRequest !== user.user_id) {
                              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.45)';
                              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (loadingRequest !== user.user_id) {
                              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(99,102,241,0.3)';
                              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                            }
                          }}
                        >
                          {loadingRequest === user.user_id ? (
                            <>
                              <div
                                className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
                              />
                              <span className="hidden sm:inline">Yuborilmoqda...</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
                              <span className="hidden sm:inline">Qo'shish</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={loadMoreRef} className="h-3" />
              {loadingMore && (
                <div className="pb-3 text-center">
                  <span className="text-xs" style={{ color: t.textMuted }}>Yana yuklanmoqda...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

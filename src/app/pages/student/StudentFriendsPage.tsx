import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../components/ThemeContext';
import { Users, Search, UserPlus, MessageCircle, Clock } from 'lucide-react';
import { AddFriendModal } from '../../components/AddFriendModal';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.myedunova.uz';
const PAGE_SIZE = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Friend {
  user_id: string;
  full_name: string;
  username: string;
  avatar: string;
  is_online: boolean;
  last_seen_at?: string; // e.g., "2 soat oldin"
}

interface FriendContactApiItem {
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

interface FriendContactApiResponse {
  items: FriendContactApiItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────
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

async function fetchFriendsPage(page: number) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(PAGE_SIZE),
  });

  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/users/contact/list/?${params.toString()}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Do'stlarni olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<FriendContactApiResponse>;
}

function mapFriend(item: FriendContactApiItem): Friend {
  const friend = item.friend;
  const firstName = normalizeText(friend?.first_name);
  const lastName = normalizeText(friend?.last_name);
  const fullName = `${firstName} ${lastName}`.trim() || normalizeText(friend?.username, 'Nomaʼlum foydalanuvchi');
  const username = normalizeText(friend?.username, `friend_${item.id}`);
  const avatar = normalizeText(friend?.profile_image, 'https://i.pravatar.cc/150?img=1');

  return {
    user_id: String(friend?.id ?? item.id),
    full_name: fullName,
    username: username.startsWith('@') ? username : `@${username}`,
    avatar,
    is_online: false,
    last_seen_at: 'Faol emas',
  };
}

export function StudentFriendsPage() {
  const { theme: t } = useTheme();
  const cardBase = { background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard };
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    fetchFriendsPage(1)
      .then((data) => {
        if (cancelled) return;
        setFriends((Array.isArray(data.items) ? data.items : []).map(mapFriend));
        setPage(data.page ?? 1);
        setPages(data.pages ?? 1);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFriends([]);
        setPage(1);
        setPages(1);
        setError(err instanceof Error ? err.message : "Do'stlarni yuklab bo'lmadi");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || loadingMore || page >= pages) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;

      setLoadingMore(true);

      fetchFriendsPage(page + 1)
        .then((data) => {
          setFriends((current) => [
            ...current,
            ...(Array.isArray(data.items) ? data.items : []).map(mapFriend),
          ]);
          setPage(data.page ?? (page + 1));
          setPages(data.pages ?? 1);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Keyingi do'stlarni yuklab bo'lmadi");
        })
        .finally(() => {
          setLoadingMore(false);
        });
    }, { rootMargin: '120px 0px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, page, pages]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Sort & Filter Friends
  // ─────────────────────────────────────────────────────────────────────────────
  const sortedAndFilteredFriends = useMemo(() => {
    let filtered = friends;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        f =>
          f.full_name.toLowerCase().includes(query) ||
          f.username.toLowerCase().includes(query)
      );
    }

    // Sort: online first, then by last seen
    return filtered.sort((a, b) => {
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;
      return 0;
    });
  }, [searchQuery, friends]);

  const onlineCount = friends.filter(f => f.is_online).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="font-bold text-xl" style={{ color: t.textPrimary }}>Do'stlar</h2>
        <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>Do'stlaringiz bilan raqobatlashing</p>
      </div>

      {/* Search + Add */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.textMuted }} />
          <input
            type="text"
            placeholder="Do'st qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none"
            style={{ ...cardBase, color: t.textPrimary }}
          />
        </div>
        <button
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff' }}
          onClick={() => setIsAddFriendModalOpen(true)}
        >
          <UserPlus className="w-4 h-4" /> Qo'shish
        </button>
      </div>

      {/* Online now */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ background: t.isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs font-semibold" style={{ color: '#22C55E' }}>
            Hozir onlayn — {onlineCount} do'st
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {friends.filter(f => f.is_online).slice(0, 5).map(f => (
            <div
              key={f.user_id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
            >
              <img src={f.avatar} alt={f.full_name} className="w-6 h-6 rounded-full object-cover" />
              <div>
                <p className="text-xs font-semibold" style={{ color: t.textPrimary }}>
                  {f.full_name.split(' ')[0]}
                </p>
                <p style={{ fontSize: '10px', color: '#22C55E' }}>Onlayn</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MENING DO'STLARIM - REDESIGNED SECTION */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-5" style={cardBase}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users
              className="w-5 h-5"
              style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}
              strokeWidth={2}
            />
            <h3 className="font-bold text-base" style={{ color: t.textPrimary }}>
              Mening do'stlarim
            </h3>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                color: t.isDark ? '#818CF8' : '#6366F1',
              }}
            >
              {sortedAndFilteredFriends.length}
            </span>
          </div>
        </div>

        {/* Friends list */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-xs" style={{ color: t.textMuted }}>
                Do'stlar yuklanmoqda...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-xs" style={{ color: '#EF4444' }}>
                {error}
              </p>
            </div>
          ) : sortedAndFilteredFriends.length === 0 ? (
            // Empty state
            <div className="text-center py-8">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{
                  background: t.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
                  border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}`,
                }}
              >
                <Users
                  style={{ width: 28, height: 28, color: t.isDark ? '#818CF8' : '#6366F1' }}
                  strokeWidth={1.5}
                />
              </div>
              <p className="font-bold text-sm mb-1" style={{ color: t.textPrimary }}>
                Do'stlar topilmadi
              </p>
              <p className="text-xs" style={{ color: t.textMuted }}>
                {searchQuery ? `"${searchQuery}" bo'yicha natija yo'q` : 'Yangi do\'stlar qo\'shing'}
              </p>
            </div>
          ) : (
            sortedAndFilteredFriends.map(friend => (
              <div
                key={friend.user_id}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all hover:scale-[1.01] cursor-pointer"
                style={{
                  background: t.isDark ? t.bgInner : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${t.borderSubtle}`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                  (e.currentTarget as HTMLElement).style.background = t.isDark
                    ? 'rgba(99,102,241,0.08)'
                    : 'rgba(99,102,241,0.04)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = t.borderSubtle;
                  (e.currentTarget as HTMLElement).style.background = t.isDark
                    ? t.bgInner
                    : 'rgba(0,0,0,0.02)';
                }}
              >
                {/* Avatar with online indicator */}
                <div className="relative shrink-0">
                  <img
                    src={friend.avatar}
                    alt={friend.full_name}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover"
                    style={{ border: `2px solid ${t.border}` }}
                  />
                  {friend.is_online && (
                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{
                        background: t.bgCard,
                        border: `2px solid ${t.bgCard}`,
                      }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                  )}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-sm sm:text-base truncate" style={{ color: t.textPrimary }}>
                      {friend.full_name}
                    </h4>
                  </div>
                  <p className="text-xs truncate mb-1.5" style={{ color: t.textMuted }}>
                    {friend.username}
                  </p>

                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    {friend.is_online ? (
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
                          {friend.last_seen_at}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0">
                  <button
                    className="p-2 sm:p-2.5 rounded-xl transition-all"
                    style={{
                      background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                      color: t.isDark ? '#818CF8' : '#6366F1',
                      border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)'}`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = t.isDark
                        ? 'rgba(99,102,241,0.2)'
                        : 'rgba(99,102,241,0.15)';
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = t.isDark
                        ? 'rgba(99,102,241,0.12)'
                        : 'rgba(99,102,241,0.08)';
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    }}
                  >
                    <MessageCircle className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))
          )}
          <div ref={loadMoreRef} className="h-3" />
          {loadingMore && (
            <div className="text-center py-3">
              <p className="text-xs" style={{ color: t.textMuted }}>
                Yana yuklanmoqda...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Friend Modal */}
      {isAddFriendModalOpen && (
        <AddFriendModal onClose={() => setIsAddFriendModalOpen(false)} />
      )}
    </div>
  );
}

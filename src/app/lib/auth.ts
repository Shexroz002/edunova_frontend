const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.myedunova.uz';
export const AUTH_STORAGE_KEY = 'teacher_dashboard_auth';

export interface AuthUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string | null;
  profile_image: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type AppUserRole = 'teacher' | 'schoolboy' | null;

interface StoredAuthSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser | null;
}

export function normalizeUserRole(role: string | null | undefined): AppUserRole {
  const value = typeof role === 'string' ? role.trim().toLowerCase() : '';

  if (value === 'teacher') return 'teacher';
  if (value === 'schoolboy' || value === 'student' || value === 'pupil') return 'schoolboy';

  return null;
}

export function getStoredUserRole(): AppUserRole {
  return normalizeUserRole(getStoredAuthSession()?.user?.role);
}

export function getDefaultRouteForRole(role: string | null | undefined) {
  const normalizedRole = normalizeUserRole(role);

  if (normalizedRole === 'schoolboy') {
    return '/student';
  }

  return '/';
}

export function clearStoredAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getStoredAuthSession(): StoredAuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function persistAuthSession(data: LoginResponse | (RefreshResponse & { user?: AuthUser })) {
  const current = getStoredAuthSession();

  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      user: 'user' in data ? data.user ?? current?.user ?? null : current?.user ?? null,
    }),
  );
}

export async function refreshStoredAuthToken() {
  const session = getStoredAuthSession();
  if (!session?.refresh_token) return null;

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh_token: session.refresh_token,
    }),
  });

  if (!response.ok) {
    clearStoredAuthSession();
    throw new Error(`Tokenni yangilashda xatolik: ${response.status}`);
  }

  const data: RefreshResponse = await response.json();
  persistAuthSession(data);
  return data;
}

export async function getValidAccessToken() {
  const session = getStoredAuthSession();
  if (!session?.access_token) return null;

  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1] ?? ''));
    const expiresAt = typeof payload?.exp === 'number' ? payload.exp * 1000 : 0;

    if (expiresAt && expiresAt - Date.now() <= 60_000) {
      const refreshed = await refreshStoredAuthToken();
      return refreshed?.access_token ?? null;
    }
  } catch {
    return session.access_token;
  }

  return session.access_token;
}

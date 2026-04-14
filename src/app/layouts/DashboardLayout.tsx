import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { TopNavigation } from '../components/TopNavigation';
import { useTheme } from '../components/ThemeContext';
import { getValidAccessToken, refreshStoredAuthToken } from '../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

interface MeResponse {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string | null;
  profile_image: string | null;
}

interface HeaderProfile {
  fullName: string;
  roleLabel: string;
  profileImage: string | null;
}

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
      throw new Error("Sessiya tugagan. Qayta kiring");
    }
    response = await makeRequest(token);
  }

  return response;
}

export function DashboardLayout() {
  const { theme: t } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<HeaderProfile>({
    fullName: 'Anna Smirnova',
    roleLabel: "Matematika o'qituvchisi",
    profileImage: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/auth/me/`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`Profilni olishda xatolik: ${response.status}`);
        }

        const data: MeResponse = await response.json();
        if (!isMounted) return;

        const firstName = data.first_name?.trim() ?? '';
        const lastName = data.last_name?.trim() ?? '';
        const fullName = `${firstName} ${lastName}`.trim() || data.username || 'Ustoz';

        setProfile({
          fullName,
          roleLabel: data.role === 'teacher' ? "O'qituvchi" : 'Foydalanuvchi',
          profileImage: data.profile_image ?? null,
        });
      } catch {
        if (!isMounted) return;
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      className="flex min-h-screen transition-colors duration-300"
      style={{ background: t.bgBase }}
    >
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNavigation
          onMenuClick={() => setMenuOpen(true)}
          profile={profile}
        />
        <main className="flex-1 p-4 lg:p-7 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

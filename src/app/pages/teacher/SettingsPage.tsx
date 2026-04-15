import { useEffect, useMemo, useRef, useState } from 'react';
import {
  User, Bell, Shield, Palette, Globe, Save, Camera,
  Moon, Sun, Check,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

interface MeResponse {
  id: number;
  username: string;
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

interface SettingsProfile {
  userId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  school: string;
  educationLevel: string;
  avatar: string | null;
  subjectIds: number[];
}

interface SubjectOption {
  id: number;
  name: string;
  type: string | null;
  icon: string | null;
}

type EditableProfileFieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'school'
  | 'educationLevel';

function getSubjectTone(subject: SubjectOption) {
  const type = normalizeText(subject.type).toLowerCase();

  if (type === 'stem') {
    return {
      color: '#38BDF8',
      bg: 'rgba(56,189,248,0.14)',
      border: 'rgba(56,189,248,0.35)',
    };
  }

  if (type === 'languages') {
    return {
      color: '#818CF8',
      bg: 'rgba(129,140,248,0.14)',
      border: 'rgba(129,140,248,0.35)',
    };
  }

  return {
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.14)',
    border: 'rgba(34,197,94,0.35)',
  };
}

async function fetchWithAuthRetry(url: string, init: RequestInit = {}) {
  let token = await getValidAccessToken();
  if (!token) {
    throw new Error('Tizimga qayta kiring');
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

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

async function fetchSubjectList() {
  const response = await fetch(`${API_BASE_URL}/api/v1/subject/list/`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Fanlar ro'yxatini olishda xatolik: ${response.status}`);
  }

  return response.json() as Promise<SubjectOption[]>;
}

async function updateProfile(profile: SettingsProfile) {
  if (!profile.userId) {
    throw new Error('Foydalanuvchi aniqlanmadi');
  }

  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/users/${profile.userId}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      first_name: profile.firstName.trim(),
      last_name: profile.lastName.trim(),
      email: profile.email.trim(),
      phone_number: profile.phone.trim(),
      school_name: profile.school.trim(),
      education_level: profile.educationLevel.trim(),
      subject_ids: profile.subjectIds,
    }),
  });

  if (!response.ok) {
    throw new Error(`Profilni saqlashda xatolik: ${response.status}`);
  }

  return response;
}

async function updateAvatar(userId: number, file: File) {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/users/${userId}/avatar/`, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Avatarni saqlashda xatolik: ${response.status}`);
  }

  return response;
}

function mapMeToProfile(data: MeResponse): SettingsProfile {
  const avatar = typeof data.profile_image === 'string' && data.profile_image.trim()
    ? data.profile_image.trim()
    : null;
  const subjectIds = (Array.isArray(data.subjects) ? data.subjects : [])
    .map((item) => item.subject?.id)
    .filter((id): id is number => typeof id === 'number');

  return {
    userId: data.id ?? null,
    firstName: normalizeText(data.first_name, data.username || ''),
    lastName: normalizeText(data.last_name),
    email: normalizeText(data.email),
    phone: normalizeText(data.phone_number),
    school: normalizeText(data.school_name),
    educationLevel: normalizeText(data.education_level),
    avatar,
    subjectIds,
  };
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { theme: t } = useTheme();
  return (
    <div className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{ background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadowCard }}>
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme: t } = useTheme();
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold" style={{ color: t.textPrimary }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{subtitle}</p>}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { theme: t } = useTheme();
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0"
      style={{ background: value ? '#6366F1' : t.isDark ? '#334155' : '#CBD5E1' }}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${value ? 'left-5' : 'left-0.5'}`}
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

function FieldRow({ label, subtitle, children }: { label: string; subtitle?: string; children: React.ReactNode }) {
  const { theme: t } = useTheme();
  return (
    <div className="flex items-center justify-between gap-4 py-4" style={{ borderBottom: `1px solid ${t.border}` }}>
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: t.textPrimary }}>{label}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{subtitle}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const TABS = [
  { id: 'profile', label: 'Profil', Icon: User },
  { id: 'appearance', label: 'Ko\'rinish', Icon: Palette },
  { id: 'notifications', label: 'Bildirishnomalar', Icon: Bell },
  { id: 'security', label: 'Xavfsizlik', Icon: Shield },
  { id: 'language', label: 'Til', Icon: Globe },
];

const PROFILE_FIELDS: Array<{ label: string; key: EditableProfileFieldKey }> = [
  { label: 'Ism', key: 'firstName' },
  { label: 'Familiya', key: 'lastName' },
  { label: 'Email', key: 'email' },
  { label: 'Telefon', key: 'phone' },
  { label: 'Maktab', key: 'school' },
  { label: "Ta'lim darajasi", key: 'educationLevel' },
];

export function SettingsPage() {
  const { theme: t, toggleTheme } = useTheme();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const isDark = t.isDark;
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const [profile, setProfile] = useState({
    userId: null as number | null,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    school: '',
    educationLevel: '',
    avatar: null as string | null,
    subjectIds: [] as number[],
  });

  const [notifications, setNotifications] = useState({
    testSubmitted: true, newStudent: true, liveSession: true,
    weeklyReport: false, systemUpdates: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setProfileLoading(true);
        setProfileError('');

        const [profileResponse, subjectsResponse] = await Promise.all([
          fetchWithAuthRetry(`${API_BASE_URL}/api/v1/auth/me/`, {
            method: 'GET',
          }),
          fetchSubjectList(),
        ]);

        if (!profileResponse.ok) {
          throw new Error(`Profilni olishda xatolik: ${profileResponse.status}`);
        }

        const data: MeResponse = await profileResponse.json();
        if (!isMounted) return;

        setProfile(mapMeToProfile(data));
        setSubjectOptions(Array.isArray(subjectsResponse) ? subjectsResponse : []);
      } catch (error) {
        if (!isMounted) return;
        setProfileError(error instanceof Error ? error.message : 'Profil ma\'lumotlarini yuklab bo\'lmadi');
      } finally {
        if (isMounted) {
          setProfileLoading(false);
          setSubjectsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (activeTab !== 'profile') {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      return;
    }

    try {
      setIsSaving(true);
      setSaveError('');
      await updateProfile(profile);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Profilni saqlab bo\'lmadi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!profile.userId) {
      setSaveError('Foydalanuvchi aniqlanmadi');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    try {
      setIsUploadingAvatar(true);
      setSaveError('');
      setProfile((current) => ({ ...current, avatar: previewUrl }));
      await updateAvatar(profile.userId, file);
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setSaveError(error instanceof Error ? error.message : 'Avatarni yuklab bo\'lmadi');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const profileFullName = useMemo(() => {
    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    return fullName || 'Foydalanuvchi';
  }, [profile.firstName, profile.lastName]);

  const selectedSubjects = useMemo(
    () => subjectOptions.filter((subject) => profile.subjectIds.includes(subject.id)),
    [profile.subjectIds, subjectOptions],
  );
  const profileSubtitle = selectedSubjects.length > 0
    ? selectedSubjects.map((subject) => subject.name).join(', ')
    : "Fan ko'rsatilmagan";
  const profileSchoolMeta = [profile.school, profile.educationLevel].filter(Boolean).join(' • ') || "Maktab ko'rsatilmagan";
  const profileInitials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.trim().toUpperCase() || 'U';

  const inputStyle = {
    background: t.bgInner, border: `1px solid ${t.border}`,
    color: t.textPrimary, borderRadius: '10px',
    padding: '9px 12px', width: '100%', outline: 'none',
    fontSize: '14px',
  };

  return (
    <>
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: t.textPrimary }}>Sozlamalar</h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMuted }}>Hisob va ilova sozlamalarini boshqaring</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar tabs */}
        <div className="lg:w-52 shrink-0">
          <Card className="p-2">
            {TABS.map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 last:mb-0 text-left transition-all"
                  style={{
                    background: isActive ? t.accentMuted : 'transparent',
                    color: isActive ? t.accent : t.textSecondary,
                    border: isActive ? `1px solid ${t.accentBorder}` : '1px solid transparent',
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* Profile */}
          {activeTab === 'profile' && (
            <Card>
              <SectionTitle title="Profil ma'lumotlari" subtitle="Shaxsiy ma'lumotlaringizni tahrirlang" />

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: `1px solid ${t.border}` }}>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    void handleAvatarChange(e);
                  }}
                />
                <div className="relative">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profileFullName}
                      className="w-16 h-16 rounded-2xl object-cover"
                      style={{ border: `2px solid ${t.accentBorder}` }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold"
                      style={{
                        background: t.accentMuted,
                        color: t.accent,
                        border: `2px solid ${t.accentBorder}`,
                      }}
                    >
                      {profileInitials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar || profileLoading}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      background: '#6366F1',
                      border: `2px solid ${t.bgCard}`,
                      opacity: isUploadingAvatar || profileLoading ? 0.7 : 1,
                    }}
                  >
                    {isUploadingAvatar ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-white" />
                    )}
                  </button>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                    {profileFullName}
                  </p>
                  <p className="text-xs" style={{ color: t.textMuted }}>{profileSubtitle}</p>
                  <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{profileSchoolMeta}</p>
                  <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                    {isUploadingAvatar ? 'Avatar yuklanmoqda...' : 'Avatarni almashtirish'}
                  </p>
                </div>
              </div>

              {profileLoading && (
                <div className="mb-4 text-sm" style={{ color: t.textMuted }}>
                  Profil ma'lumotlari yuklanmoqda...
                </div>
              )}

              {!profileLoading && profileError && (
                <div
                  className="mb-4 px-4 py-3 rounded-xl text-sm"
                  style={{ background: t.trendDownBg, color: t.trendDownText, border: `1px solid ${t.trendDownText}33` }}
                >
                  {profileError}
                </div>
              )}

              {!profileLoading && !profileError && saveError && (
                <div
                  className="mb-4 px-4 py-3 rounded-xl text-sm"
                  style={{ background: t.trendDownBg, color: t.trendDownText, border: `1px solid ${t.trendDownText}33` }}
                >
                  {saveError}
                </div>
              )}

              {/* Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {PROFILE_FIELDS.map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textMuted }}>{label}</label>
                    <input
                      type="text"
                      value={profile[key]}
                      onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                      style={inputStyle}
                      onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                      onBlur={(e) => { (e.target as HTMLElement).style.borderColor = t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
                    />
                  </div>
                ))}
              </div>

              <div
                className="rounded-2xl p-4 sm:p-5"
                style={{
                  background: t.isDark ? 'rgba(15,23,42,0.38)' : t.bgInner,
                  border: `1px solid ${t.border}`,
                }}
              >
                <div className="mb-4">
                  <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                    Fanlar
                  </p>
                  <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                    Qiziqadigan fanlaringizni tanlang
                  </p>
                </div>
                {subjectsLoading ? (
                  <div className="text-sm" style={{ color: t.textMuted }}>
                    Fanlar yuklanmoqda...
                  </div>
                ) : subjectOptions.length === 0 ? (
                  <div className="text-sm" style={{ color: t.textMuted }}>
                    Fanlar ro'yxati mavjud emas
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {subjectOptions.map((subject) => {
                      const selected = profile.subjectIds.includes(subject.id);
                      const tone = getSubjectTone(subject);
                      return (
                        <button
                          key={subject.id}
                          type="button"
                          onClick={() => {
                            setProfile((current) => ({
                              ...current,
                              subjectIds: selected
                                ? current.subjectIds.filter((id) => id !== subject.id)
                                : [...current.subjectIds, subject.id],
                            }));
                          }}
                          className="px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left flex items-center justify-between gap-3"
                          style={{
                            background: selected
                              ? tone.bg
                              : (t.isDark ? 'rgba(51,65,85,0.42)' : t.bgCard),
                            color: selected ? tone.color : t.textSecondary,
                            border: `1px solid ${selected ? tone.border : t.border}`,
                            boxShadow: selected ? `0 0 0 1px ${tone.border} inset` : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (!selected) {
                              e.currentTarget.style.borderColor = t.isDark ? 'rgba(148,163,184,0.45)' : t.accentBorder;
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!selected) {
                              e.currentTarget.style.borderColor = t.border;
                              e.currentTarget.style.transform = 'translateY(0)';
                            }
                          }}
                        >
                          <span className="truncate">{subject.name}</span>
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              background: selected ? tone.border : 'transparent',
                              color: selected ? tone.color : 'transparent',
                              border: `1px solid ${selected ? 'transparent' : t.border}`,
                            }}
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <Card>
              <SectionTitle title="Ko'rinish" subtitle="Interfeys va mavzu sozlamalari" />
              <div className="divide-y-0">
                <FieldRow label="Qorong'i rejim" subtitle="Interfeys mavzusini almashtirish">
                  <div className="flex items-center gap-3">
                    <Sun className="w-4 h-4" style={{ color: t.textMuted }} />
                    <Toggle value={isDark} onChange={toggleTheme} />
                    <Moon className="w-4 h-4" style={{ color: t.textMuted }} />
                  </div>
                </FieldRow>
                <FieldRow label="Kompakt rejim" subtitle="UI elementlarini kichiklashtirish">
                  <Toggle value={false} onChange={() => { }} />
                </FieldRow>
                <FieldRow label="Animatsiyalar" subtitle="Interfeys animatsiyalarini yoqish">
                  <Toggle value={true} onChange={() => { }} />
                </FieldRow>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold mb-3" style={{ color: t.textPrimary }}>Aksent rangi</p>
                <div className="flex gap-3 flex-wrap">
                  {['#6366F1', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B'].map((color) => (
                    <button
                      key={color}
                      className="w-9 h-9 rounded-xl transition-all flex items-center justify-center"
                      style={{ background: color, border: color === '#6366F1' ? `3px solid ${t.textPrimary}` : '3px solid transparent', boxShadow: `0 4px 10px ${color}44` }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    >
                      {color === '#6366F1' && <Check className="w-4 h-4 text-white" strokeWidth={2.5} />}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <Card>
              <SectionTitle title="Bildirishnomalar" subtitle="Qaysi hodisalar haqida xabar olishni tanlang" />
              <div>
                {[
                  { key: 'testSubmitted', label: 'Test topshirildi', sub: "O'quvchi test topshirganida xabar oling" },
                  { key: 'newStudent', label: "Yangi o'quvchi", sub: "Sinfga yangi o'quvchi qo'shilganida" },
                  { key: 'liveSession', label: 'Jonli dars eslatmasi', sub: 'Dars boshlanishidan 15 daqiqa oldin' },
                  { key: 'weeklyReport', label: 'Haftalik hisobot', sub: 'Har dushanba kuni umumiy hisobot' },
                  { key: 'systemUpdates', label: 'Tizim yangilanishlari', sub: 'Platforma yangilanishlari haqida' },
                ].map(({ key, label, sub }) => (
                  <FieldRow key={key} label={label} subtitle={sub}>
                    <Toggle
                      value={notifications[key as keyof typeof notifications]}
                      onChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))}
                    />
                  </FieldRow>
                ))}
              </div>
            </Card>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <Card>
              <SectionTitle title="Xavfsizlik" subtitle="Parol va kirish sozlamalari" />
              <div className="space-y-4 mb-4">
                {[
                  { label: 'Joriy parol', type: 'password', placeholder: '••••••••' },
                  { label: 'Yangi parol', type: 'password', placeholder: '••••••••' },
                  { label: 'Parolni tasdiqlang', type: 'password', placeholder: '••••••••' },
                ].map(({ label, type, placeholder }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textMuted }}>{label}</label>
                    <input type={type} placeholder={placeholder} style={inputStyle}
                      onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                      onBlur={(e) => { (e.target as HTMLElement).style.borderColor = t.border; (e.target as HTMLElement).style.boxShadow = 'none'; }}
                    />
                  </div>
                ))}
              </div>
              <FieldRow label="Ikki faktorli autentifikatsiya" subtitle="Qo'shimcha himoya uchun 2FA ni yoqing">
                <Toggle value={false} onChange={() => { }} />
              </FieldRow>
            </Card>
          )}

          {/* Language */}
          {activeTab === 'language' && (
            <Card>
              <SectionTitle title="Til sozlamalari" subtitle="Interfeys tilini tanlang" />
              <div className="space-y-2.5">
                {[
                  { code: "O'zbek (lotin)", flag: '🇺🇿', active: true },
                  { code: "O'zbek (kirill)", flag: '🇺🇿', active: false },
                  { code: 'Русский', flag: '🇷🇺', active: false },
                  { code: 'English', flag: '🇬🇧', active: false },
                ].map(({ code, flag, active }) => (
                  <div
                    key={code}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: active ? t.accentMuted : t.bgInner,
                      border: `1px solid ${active ? t.accentBorder : t.border}`,
                    }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = t.accentBorder; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
                  >
                    <span className="text-xl">{flag}</span>
                    <span className="text-sm font-medium flex-1" style={{ color: active ? t.accent : t.textPrimary }}>{code}</span>
                    {active && <Check className="w-4 h-4" style={{ color: t.accent }} strokeWidth={2.5} />}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Save button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSave}
              disabled={isSaving || profileLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: saved ? '#22C55E' : 'linear-gradient(135deg, #6366F1, #4F46E5)',
                boxShadow: saved ? '0 4px 14px rgba(34,197,94,0.3)' : '0 4px 14px rgba(99,102,241,0.25)',
                minWidth: '140px',
                justifyContent: 'center',
                opacity: isSaving || profileLoading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { if (!saved) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" strokeWidth={2.5} />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saqlanmoqda...' : saved ? 'Saqlandi!' : 'Saqlash'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

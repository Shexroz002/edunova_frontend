import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTheme } from '../../components/ThemeContext';
import {
  ArrowLeft,
  Camera,
  User,
  Mail,
  Phone,
  School,
  GraduationCap,
  BookOpen,
  Check,
  X,
  Lock,
  LogOut,
  Edit3,
  Save,
  AlertCircle,
} from 'lucide-react';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const EDUCATION_LEVELS = [
  '1-sinf',
  '2-sinf',
  '3-sinf',
  '4-sinf',
  '5-sinf',
  '6-sinf',
  '7-sinf',
  '8-sinf',
  '9-sinf',
  '10-sinf',
  '11-sinf',
  'Universitet',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Subject {
  subject_id: string;
  subject_name: string;
  subject_icon: string;
  color: string;
}

interface UserProfile {
  user_id: string;
  avatar?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  school_name: string;
  class_name: string;
  subjects: Subject[];
}

interface UserMeResponse {
  id: number | null;
  username: string | null;
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

interface SubjectListItem {
  id: number | null;
  name: string | null;
  type: string | null;
  icon: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_PROFILE: UserProfile = {
  user_id: 'user_123',
  avatar: 'https://i.pravatar.cc/150?img=8',
  first_name: 'Shehrozbek',
  last_name: "Toshpo'latov",
  email: 'shehrozbek@example.com',
  phone: '+998 90 123 45 67',
  school_name: '67-Maktab Paryiq',
  class_name: '8-sinf',
  subjects: [
    { subject_id: '1', subject_name: 'Matematika', subject_icon: '📐', color: '#818CF8' },
    { subject_id: '2', subject_name: 'Fizika', subject_icon: '⚛️', color: '#38BDF8' },
    { subject_id: '3', subject_name: 'Ingliz tili', subject_icon: '🇬🇧', color: '#FBBF24' },
    { subject_id: '4', subject_name: 'Ona tili', subject_icon: '📖', color: '#34D399' },
  ],
};

const AVAILABLE_SUBJECTS: Subject[] = [
  { subject_id: '1', subject_name: 'Matematika', subject_icon: '📐', color: '#818CF8' },
  { subject_id: '2', subject_name: 'Fizika', subject_icon: '⚛️', color: '#38BDF8' },
  { subject_id: '3', subject_name: 'Ingliz tili', subject_icon: '🇬🇧', color: '#FBBF24' },
  { subject_id: '4', subject_name: 'Ona tili', subject_icon: '📖', color: '#34D399' },
  { subject_id: '5', subject_name: 'Kimyo', subject_icon: '🧪', color: '#A855F7' },
  { subject_id: '6', subject_name: 'Biologiya', subject_icon: '🧬', color: '#22C55E' },
  { subject_id: '7', subject_name: 'Tarix', subject_icon: '📜', color: '#F59E0B' },
  { subject_id: '8', subject_name: 'Geografiya', subject_icon: '🌍', color: '#06B6D4' },
];

function normalizeText(value: string | null | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getSubjectColor(name: string) {
  switch (name.toLowerCase()) {
    case 'matematika':
    case 'mathematika':
    case 'mathematics':
      return '#818CF8';
    case 'fizika':
    case 'physics':
      return '#38BDF8';
    case 'ingliz tili':
    case 'english':
      return '#FBBF24';
    case 'ona tili':
      return '#34D399';
    case 'kimyo':
      return '#A855F7';
    case 'biologiya':
      return '#22C55E';
    case 'tarix':
      return '#F59E0B';
    case 'geografiya':
      return '#06B6D4';
    default:
      return '#94A3B8';
  }
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

async function fetchMe() {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/auth/me/`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Profil ma'lumoti olinmadi: ${response.status}`);
  }
  return response.json() as Promise<UserMeResponse>;
}

async function fetchSubjectList() {
  const response = await fetch(`${API_BASE_URL}/api/v1/subject/list/`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Fanlar ro'yxati olinmadi: ${response.status}`);
  }

  return response.json() as Promise<SubjectListItem[]>;
}

async function updateProfile(profile: UserProfile) {
  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/users/${profile.user_id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      phone_number: profile.phone ?? '',
      school_name: profile.school_name,
      education_level: profile.class_name,
      subject_ids: profile.subjects
        .map((subject) => Number.parseInt(subject.subject_id, 10))
        .filter((subjectId) => Number.isFinite(subjectId)),
    }),
  });

  if (!response.ok) {
    throw new Error(`Profilni saqlab bo'lmadi: ${response.status}`);
  }
}

async function updateAvatar(userId: string, file: File) {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetchWithAuthRetry(`${API_BASE_URL}/api/v1/users/${userId}/avatar/`, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Avatarni saqlab bo'lmadi: ${response.status}`);
  }
}

function mapProfile(data: UserMeResponse): UserProfile {
  const mappedSubjects = (Array.isArray(data.subjects) ? data.subjects : []).map((item) => {
    const subjectName = normalizeText(item.subject?.name, "Noma'lum fan");
    return {
      subject_id: String(item.subject?.id ?? item.id ?? subjectName),
      subject_name: subjectName,
      subject_icon: normalizeText(item.subject?.icon, '📘'),
      color: getSubjectColor(subjectName),
    };
  });

  return {
    user_id: String(data.id ?? 'user_123'),
    avatar: normalizeText(data.profile_image, MOCK_PROFILE.avatar),
    first_name: normalizeText(data.first_name, MOCK_PROFILE.first_name),
    last_name: normalizeText(data.last_name, MOCK_PROFILE.last_name),
    email: normalizeText(data.email, MOCK_PROFILE.email),
    phone: normalizeText(data.phone_number, ''),
    school_name: normalizeText(data.school_name, MOCK_PROFILE.school_name),
    class_name: EDUCATION_LEVELS.includes(normalizeText(data.education_level) as (typeof EDUCATION_LEVELS)[number])
      ? normalizeText(data.education_level)
      : MOCK_PROFILE.class_name,
    subjects: mappedSubjects.length > 0 ? mappedSubjects : MOCK_PROFILE.subjects,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function StudentProfileEditPage() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile>(MOCK_PROFILE);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>(AVAILABLE_SUBJECTS);

  // Form state
  const [formData, setFormData] = useState<UserProfile>(MOCK_PROFILE);

  useEffect(() => {
    let cancelled = false;

    fetchMe()
      .then((data) => {
        if (cancelled) return;
        const mapped = mapProfile(data);
        setProfile(mapped);
        setFormData(mapped);
      })
      .catch(() => {
        // Keep existing UI defaults if profile fetch fails.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchSubjectList()
      .then((data) => {
        if (cancelled) return;
        const mapped = (Array.isArray(data) ? data : []).map((item) => {
          const subjectName = normalizeText(item.name, "Noma'lum fan");
          return {
            subject_id: String(item.id ?? subjectName),
            subject_name: subjectName,
            subject_icon: normalizeText(item.icon, '📘'),
            color: getSubjectColor(subjectName),
          };
        });

        if (mapped.length > 0) {
          setAvailableSubjects(mapped);
        }
      })
      .catch(() => {
        // Keep default subject list on failure.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Profile completion calculation
  const profileCompletion = (() => {
    let completed = 0;
    const total = 7;

    if (profile.avatar) completed++;
    if (profile.first_name) completed++;
    if (profile.last_name) completed++;
    if (profile.email) completed++;
    if (profile.phone) completed++;
    if (profile.school_name) completed++;
    if (profile.subjects.length > 0) completed++;

    return Math.round((completed / total) * 100);
  })();

  // Handle avatar upload
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);

      setIsUploadingAvatar(true);
      updateAvatar(profile.user_id, file)
        .then(() => {
          const previewUrl = URL.createObjectURL(file);
          setProfile((current) => ({ ...current, avatar: previewUrl }));
          setFormData((current) => ({ ...current, avatar: previewUrl }));
        })
        .finally(() => {
          setIsUploadingAvatar(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        });
    }
  }

  // Handle subject toggle
  function toggleSubject(subject: Subject) {
    const isSelected = formData.subjects.some(s => s.subject_id === subject.subject_id);

    if (isSelected) {
      setFormData({
        ...formData,
        subjects: formData.subjects.filter(s => s.subject_id !== subject.subject_id),
      });
    } else {
      setFormData({
        ...formData,
        subjects: [...formData.subjects, subject],
      });
    }
  }

  // Handle save
  async function handleSave() {
    setIsSaving(true);
    try {
      await updateProfile(formData);
      setProfile(formData);
      setIsEditMode(false);
    } finally {
      setIsSaving(false);
    }
  }

  // Handle cancel
  function handleCancel() {
    setFormData(profile);
    setIsEditMode(false);
  }

  // Handle logout
  function handleLogout() {
    console.log('Logging out...');
    navigate('/login');
  }

  const cardBase = {
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    boxShadow: t.shadowCard,
  };

  return (
    <div className="max-w-4xl mx-auto pb-6">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 1. HEADER SECTION */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${t.border}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.isDark
                ? 'rgba(99,102,241,0.15)'
                : 'rgba(99,102,241,0.1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = t.isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.04)';
              (e.currentTarget as HTMLElement).style.borderColor = t.border;
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: t.textPrimary }} strokeWidth={2} />
          </button>
          <div>
            <h2 className="font-bold text-xl" style={{ color: t.textPrimary }}>
              Profil
            </h2>
            <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>
              Shaxsiy ma'lumotlaringizni boshqaring
            </p>
          </div>
        </div>

        {/* Action button */}
        {!isEditMode ? (
          <button
            onClick={() => setIsEditMode(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.45)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(99,102,241,0.3)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <Edit3 className="w-4 h-4" strokeWidth={2} />
            Tahrirlash
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{
                background: t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              <span className="hidden sm:flex items-center gap-2">
                <X className="w-4 h-4" strokeWidth={2} />
                Bekor qilish
              </span>
              <span className="sm:hidden">
                <X className="w-4 h-4" strokeWidth={2} />
              </span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 sm:px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
              }}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Saqlanmoqda...</span>
                </span>
              ) : (
                <>
                  <span className="hidden sm:flex items-center gap-2">
                    <Save className="w-4 h-4" strokeWidth={2} />
                    Saqlash
                  </span>
                  <span className="sm:hidden">
                    <Save className="w-4 h-4" strokeWidth={2} />
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Profile Completion */}
      {profileCompletion < 100 && (
        <div
          className="rounded-xl p-4 mb-5"
          style={{
            background: t.isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>
              Profil to'ldirish
            </span>
            <span className="text-sm font-bold" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}>
              {profileCompletion}%
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${profileCompletion}%`,
                background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                boxShadow: t.isDark ? '0 0 8px rgba(99,102,241,0.5)' : 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 2. USER OVERVIEW */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-5 sm:p-6 mb-5" style={cardBase}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative">
            {formData.avatar ? (
              <img
                src={formData.avatar}
                alt={`${formData.first_name} ${formData.last_name}`}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover"
                style={{ border: `3px solid ${t.border}` }}
              />
            ) : (
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  border: `3px solid ${t.border}`,
                }}
              >
                <User className="w-12 h-12 sm:w-14 sm:h-14" style={{ color: '#fff' }} strokeWidth={1.5} />
              </div>
            )}

            {/* Upload button */}
            {isEditMode && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                    opacity: isUploadingAvatar ? 0.7 : 1,
                  }}
                >
                  {isUploadingAvatar ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" strokeWidth={2} />
                  )}
                </button>
              </>
            )}
          </div>

          {/* User info */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-xl sm:text-2xl mb-2" style={{ color: t.textPrimary }}>
              {formData.first_name} {formData.last_name}
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={2} />
                <span className="text-sm" style={{ color: t.textSecondary }}>
                  {formData.school_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" style={{ color: t.textMuted }} strokeWidth={2} />
                <span className="text-sm" style={{ color: t.textSecondary }}>
                  {formData.class_name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 3. PERSONAL INFORMATION SECTION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-5" style={cardBase}>
          <h4 className="font-bold text-base mb-4" style={{ color: t.textPrimary }}>
            Shaxsiy ma'lumotlar
          </h4>

          <div className="space-y-4">
            {/* First Name */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: t.textMuted }}>
                <User className="w-3.5 h-3.5" strokeWidth={2} />
                Ism
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                disabled={!isEditMode}
                className="w-full px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
                style={{
                  background: isEditMode
                    ? t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                    : t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                }}
                onFocus={(e) => {
                  if (isEditMode) {
                    (e.target as HTMLElement).style.borderColor = '#6366F1';
                    (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                  }
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.borderColor = t.border;
                  (e.target as HTMLElement).style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: t.textMuted }}>
                <User className="w-3.5 h-3.5" strokeWidth={2} />
                Familiya
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                disabled={!isEditMode}
                className="w-full px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
                style={{
                  background: isEditMode
                    ? t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                    : t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                }}
                onFocus={(e) => {
                  if (isEditMode) {
                    (e.target as HTMLElement).style.borderColor = '#6366F1';
                    (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                  }
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.borderColor = t.border;
                  (e.target as HTMLElement).style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: t.textMuted }}>
                <Mail className="w-3.5 h-3.5" strokeWidth={2} />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditMode}
                className="w-full px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
                style={{
                  background: isEditMode
                    ? t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                    : t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                }}
                onFocus={(e) => {
                  if (isEditMode) {
                    (e.target as HTMLElement).style.borderColor = '#6366F1';
                    (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                  }
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.borderColor = t.border;
                  (e.target as HTMLElement).style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: t.textMuted }}>
                <Phone className="w-3.5 h-3.5" strokeWidth={2} />
                Telefon
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditMode}
                placeholder="+998 XX XXX XX XX"
                className="w-full px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
                style={{
                  background: isEditMode
                    ? t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                    : t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                }}
                onFocus={(e) => {
                  if (isEditMode) {
                    (e.target as HTMLElement).style.borderColor = '#6366F1';
                    (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                  }
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.borderColor = t.border;
                  (e.target as HTMLElement).style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════���═══════════════════════════════════ */}
        {/* 4. EDUCATION SECTION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl p-5" style={cardBase}>
          <h4 className="font-bold text-base mb-4" style={{ color: t.textPrimary }}>
            Ta'lim
          </h4>

          <div className="space-y-4">
            {/* School */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: t.textMuted }}>
                <School className="w-3.5 h-3.5" strokeWidth={2} />
                Maktab / Muassasa
              </label>
              <input
                type="text"
                value={formData.school_name}
                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                disabled={!isEditMode}
                className="w-full px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
                style={{
                  background: isEditMode
                    ? t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                    : t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                }}
                onFocus={(e) => {
                  if (isEditMode) {
                    (e.target as HTMLElement).style.borderColor = '#6366F1';
                    (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                  }
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.borderColor = t.border;
                  (e.target as HTMLElement).style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Class */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: t.textMuted }}>
                <GraduationCap className="w-3.5 h-3.5" strokeWidth={2} />
                Sinf
              </label>
              {isEditMode ? (
                <select
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                  style={{
                    background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    border: `1.5px solid ${t.border}`,
                    color: t.textPrimary,
                    colorScheme: t.isDark ? 'dark' : 'light',
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLElement).style.borderColor = '#6366F1';
                    (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = t.border;
                    (e.target as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  {EDUCATION_LEVELS.map((level) => (
                    <option
                      key={level}
                      value={level}
                      style={{
                        background: t.isDark ? '#111827' : '#FFFFFF',
                        color: t.isDark ? '#F3F4F6' : '#111827',
                      }}
                    >
                      {level}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.class_name}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
                  style={{
                    background: t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    border: `1.5px solid ${t.border}`,
                    color: t.textPrimary,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 5. SUBJECTS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-5 mt-5" style={cardBase}>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={2} />
          <h4 className="font-bold text-base" style={{ color: t.textPrimary }}>
            Fanlar
          </h4>
        </div>

        {isEditMode ? (
          // Edit mode - subject selection
          <div>
            <p className="text-xs mb-3" style={{ color: t.textMuted }}>
              Qiziqadigan fanlaringizni tanlang
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {availableSubjects.map((subject) => {
                const isSelected = formData.subjects.some(s => s.subject_id === subject.subject_id);
                return (
                  <button
                    key={subject.subject_id}
                    onClick={() => toggleSubject(subject)}
                    className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: isSelected
                        ? t.isDark ? `${subject.color}20` : `${subject.color}15`
                        : t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: `1.5px solid ${isSelected ? `${subject.color}60` : t.border}`,
                      color: isSelected ? subject.color : t.textSecondary,
                    }}
                  >
                    <span className="flex-1 text-left text-xs">{subject.subject_name}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 shrink-0" style={{ color: subject.color }} strokeWidth={2.5} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // View mode - selected subjects
          <div className="flex flex-wrap gap-2">
            {formData.subjects.map((subject) => (
              <div
                key={subject.subject_id}
                className="px-4 py-2.5 rounded-xl"
                style={{
                  background: t.isDark ? `${subject.color}20` : `${subject.color}15`,
                  border: `1.5px solid ${subject.color}40`,
                }}
              >
                <span className="text-sm font-medium" style={{ color: subject.color }}>
                  {subject.subject_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 8. OPTIONAL FEATURES */}
      {/* ═════════���════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        {/* Change Password */}
        <button
          onClick={() => setShowChangePassword(true)}
          className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowCard,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
            (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = t.border;
            (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
            }}
          >
            <Lock className="w-5 h-5" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: t.textPrimary }}>
              Parolni o'zgartirish
            </p>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
              Hisobingizni himoyalang
            </p>
          </div>
        </button>

        {/* Logout */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowCard,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)';
            (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = t.border;
            (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
            }}
          >
            <LogOut className="w-5 h-5" style={{ color: '#EF4444' }} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: t.textPrimary }}>
              Chiqish
            </p>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
              Hisobdan chiqish
            </p>
          </div>
        </button>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowChangePassword(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={cardBase}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: t.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                }}
              >
                <Lock className="w-6 h-6" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: t.textPrimary }}>
                  Parolni o'zgartirish
                </h3>
                <p className="text-xs" style={{ color: t.textMuted }}>
                  Yangi parolni kiriting
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <input
                type="password"
                placeholder="Joriy parol"
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                }}
              />
              <input
                type="password"
                placeholder="Yangi parol"
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                }}
              />
              <input
                type="password"
                placeholder="Parolni tasdiqlang"
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1.5px solid ${t.border}`,
                  color: t.textPrimary,
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowChangePassword(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  color: t.textSecondary,
                  border: `1px solid ${t.border}`,
                }}
              >
                Bekor qilish
              </button>
              <button
                onClick={() => setShowChangePassword(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  color: '#fff',
                }}
              >
                O'zgartirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={cardBase}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: t.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
                }}
              >
                <AlertCircle className="w-6 h-6" style={{ color: '#EF4444' }} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: t.textPrimary }}>
                  Chiqishni tasdiqlang
                </h3>
                <p className="text-xs" style={{ color: t.textMuted }}>
                  Haqiqatan ham chiqmoqchimisiz?
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  color: t.textSecondary,
                  border: `1px solid ${t.border}`,
                }}
              >
                Bekor qilish
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  color: '#fff',
                }}
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

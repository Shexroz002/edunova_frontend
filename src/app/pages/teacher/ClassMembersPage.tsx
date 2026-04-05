import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTheme } from '../../components/ThemeContext.tsx';
import { getValidAccessToken, refreshStoredAuthToken } from '../../lib/auth.ts';
import { fetchTeacherGroups } from './ClassesPage.tsx';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  Phone,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

interface MemberApiItem {
  student_id: number;
  full_name: string;
  profile_image: string | null;
  gender: string | null;
  phone_number: string | null;
  birth_date: string | null;
}

interface SuggestionApiItem {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_image: string | null;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface ClassMember {
  id: number;
  fullName: string;
  profileImage: string | null;
  gender: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
}

interface SuggestedStudent {
  id: number;
  fullName: string;
  username: string;
  role: string;
  profileImage: string | null;
}

interface GroupSummary {
  id: number;
  name: string;
  subject: string;
  color: string;
}

interface CustomCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  color: string;
}

function mapMember(item: MemberApiItem): ClassMember {
  return {
    id: item.student_id,
    fullName: item.full_name,
    profileImage: item.profile_image,
    gender: item.gender,
    phoneNumber: item.phone_number,
    birthDate: item.birth_date,
  };
}

function mapSuggestion(item: SuggestionApiItem): SuggestedStudent {
  return {
    id: item.id,
    fullName: `${item.first_name} ${item.last_name}`.trim() || item.username,
    username: item.username,
    role: item.role,
    profileImage: item.profile_image,
  };
}

async function fetchWithAuthRetry(url: string, init: RequestInit = {}) {
  let token = await getValidAccessToken();
  if (!token) {
    throw new Error("Tizimga qayta kiring");
  }

  const makeRequest = (accessToken: string) =>
    fetch(url, {
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

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

function formatGender(value: string | null) {
  if (!value) return 'Kiritilmagan';

  const normalized = value.toLowerCase();
  if (normalized === 'male' || normalized === 'erkak') return 'Erkak';
  if (normalized === 'female' || normalized === 'ayol') return 'Ayol';
  return value;
}

function formatBirthDate(value: string | null) {
  if (!value) return 'Kiritilmagan';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('uz-UZ');
}

function Avatar({
  name,
  src,
  sizeClass,
  color,
  borderColor,
}: {
  name: string;
  src: string | null;
  sizeClass: string;
  color: string;
  borderColor: string;
}) {
  const initials = getInitials(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
        style={{ border: `2px solid ${borderColor}` }}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 text-white font-bold`}
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        border: `2px solid ${borderColor}`,
      }}
    >
      {initials}
    </div>
  );
}

function CustomCheckbox({ checked, indeterminate = false, onChange, color }: CustomCheckboxProps) {
  const { theme: t } = useTheme();

  return (
    <button
      type="button"
      onClick={onChange}
      className="w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer shrink-0"
      style={{
        background: checked || indeterminate ? color : t.bgInner,
        border: `2px solid ${checked || indeterminate ? color : t.border}`,
        boxShadow: checked || indeterminate ? `0 0 0 3px ${color}15` : 'none',
      }}
    >
      {checked && <Check style={{ width: 14, height: 14, color: 'white' }} strokeWidth={3} />}
      {indeterminate && !checked && (
        <div style={{ width: 10, height: 2, background: 'white', borderRadius: 1 }} />
      )}
    </button>
  );
}

export function ClassMembersPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme: t } = useTheme();

  const classId = Number.parseInt(id || '1', 10);
  const [classData, setClassData] = useState<GroupSummary>({
    id: classId,
    name: `Guruh #${classId}`,
    subject: '',
    color: '#6366F1',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [addError, setAddError] = useState('');
  const [removeError, setRemoveError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadClassMeta() {
      try {
        const data = await fetchTeacherGroups();
        const matched = data.items.find((item) => item.id === classId);

        if (isMounted && matched) {
          setClassData({
            id: matched.id,
            name: matched.name,
            subject: matched.subject,
            color: matched.color,
          });
        }
      } catch {
        if (isMounted) {
          setClassData({
            id: classId,
            name: `Guruh #${classId}`,
            subject: '',
            color: '#6366F1',
          });
        }
      }
    }

    void loadClassMeta();

    return () => {
      isMounted = false;
    };
  }, [classId]);

  const loadMembers = async (query: string, options?: { preserveSearch?: boolean }) => {
    setMembersLoading(true);
    setMembersError('');

    try {
      const params = new URLSearchParams({
        page: '1',
        size: '50',
      });

      const trimmedSearch = query.trim();
      if (trimmedSearch) {
        params.set('search', trimmedSearch);
      }

      const response = await fetchWithAuthRetry(
        `${API_BASE_URL}/api/v1/teacher/group/${classId}/members?${params.toString()}`,
        { method: 'GET' },
      );

      if (!response.ok) {
        throw new Error(`A'zolar ro'yxatini olishda xatolik: ${response.status}`);
      }

      const data: PaginatedResponse<MemberApiItem> = await response.json();
      setMembers(data.items.map(mapMember));
      setMembersTotal(data.total);

      if (!options?.preserveSearch) {
        setSearchQuery(query);
      }
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const timeoutId = window.setTimeout(async () => {
      try {
        await loadMembers(searchQuery, { preserveSearch: true });
      } catch (error) {
        if (isMounted) {
          setMembers([]);
          setMembersTotal(0);
          setMembersError(error instanceof Error ? error.message : "A'zolarni yuklab bo'lmadi");
        }
      }
    }, searchQuery.trim() ? 300 : 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [classId, searchQuery]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((selectedId) => members.some((member) => member.id === selectedId)));
  }, [members]);

  const allSelected = members.length > 0 && selectedIds.length === members.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(members.map((member) => member.id));
  };

  const handleAddMembers = async (ids: number[]) => {
    setAddError('');
    setRemoveError('');

    const body = new URLSearchParams({
      student_ids: ids.join(','),
    });

    const response = await fetchWithAuthRetry(
      `${API_BASE_URL}/api/v1/teacher/group/${classId}/add/members`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );

    if (response.status !== 200 && response.status !== 201) {
      let message = "A'zolarni qo'shishda xatolik yuz berdi";

      try {
        const data = await response.json();
        if (typeof data?.message === 'string') {
          message = data.message;
        } else if (typeof data?.detail === 'string') {
          message = data.detail;
        }
      } catch {
        message = `A'zolarni qo'shishda xatolik: ${response.status}`;
      }

      setAddError(message);
      throw new Error(message);
    }

    setAddModalOpen(false);
    setSelectedIds([]);
    await loadMembers('', { preserveSearch: false });
  };

  const handleRemoveMembers = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    setAddError('');
    setRemoveError('');

    const body = new URLSearchParams({
      student_ids: selectedIds.join(','),
    });

    const response = await fetchWithAuthRetry(
      `${API_BASE_URL}/api/v1/teacher/group/${classId}/remove/members`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );

    if (response.status !== 204) {
      let message = "A'zolarni o'chirishda xatolik yuz berdi";

      try {
        const data = await response.json();
        if (typeof data?.message === 'string') {
          message = data.message;
        } else if (typeof data?.detail === 'string') {
          message = data.detail;
        }
      } catch {
        message = `A'zolarni o'chirishda xatolik: ${response.status}`;
      }

      setRemoveError(message);
      throw new Error(message);
    }

    setDeleteModalOpen(false);
    setSelectedIds([]);
    await loadMembers(searchQuery, { preserveSearch: true });
  };

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8" style={{ background: t.bgBase }}>
      <div className="max-w-7xl mx-auto mb-4 sm:mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-3 sm:mb-4 px-3 py-2 rounded-lg transition-all"
          style={{ color: t.textSecondary }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = t.bgInner;
            e.currentTarget.style.color = classData.color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = t.textSecondary;
          }}
        >
          <ArrowLeft style={{ width: 18, height: 18 }} strokeWidth={2} />
          <span className="text-sm font-semibold">Orqaga</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: t.textPrimary }}>
              {classData.subject ? `${classData.subject} - ${classData.name}` : classData.name}
            </h1>
            <p className="text-sm" style={{ color: t.textMuted }}>
              Jami {membersTotal} ta o&apos;quvchi
            </p>
          </div>

          <button
            onClick={() => setAddModalOpen(true)}
            className="w-full sm:w-auto h-11 px-5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #2f6fe4, #3f82f6)',
              boxShadow: '0 10px 24px rgba(47,111,228,0.35)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 14px 28px rgba(47,111,228,0.42)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 24px rgba(47,111,228,0.35)';
            }}
          >
            <UserPlus style={{ width: 16, height: 16 }} strokeWidth={2.5} />
            A&apos;zo qo&apos;shish
          </button>
        </div>
      </div>

      <div
        className="max-w-7xl mx-auto mb-4 sm:mb-5 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
        style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
      >
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ width: 18, height: 18, color: t.textMuted }}
            strokeWidth={2}
          />
          <input
            type="text"
            placeholder="Ism yoki familiya bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-xl text-sm outline-none transition-all"
            style={{
              background: t.bgInner,
              border: `1px solid ${t.border}`,
              color: t.textPrimary,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = classData.color;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = t.border;
            }}
          />
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="w-full sm:w-auto h-11 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${t.isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}`,
              color: '#ef4444',
            }}
          >
            <Trash2 style={{ width: 16, height: 16 }} strokeWidth={2} />
            <span className="hidden sm:inline">{selectedIds.length} ta a&apos;zoni o&apos;chirish</span>
            <span className="sm:hidden">O&apos;chirish ({selectedIds.length})</span>
          </button>
        )}
      </div>

      {(addError || removeError) && (
        <div className="max-w-7xl mx-auto mb-4">
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
            style={{
              background: t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${t.isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.18)'}`,
              color: '#ef4444',
            }}
          >
            <AlertCircle style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
            <span>{addError || removeError}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div
          className="hidden md:block rounded-xl lg:rounded-2xl overflow-hidden"
          style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: t.bgInner, borderBottom: `1px solid ${t.border}` }}>
                  <th className="p-3 lg:p-4 text-left w-12">
                    <CustomCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleSelectAll}
                      color={classData.color}
                    />
                  </th>
                  <th className="p-3 lg:p-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                    O&apos;quvchi
                  </th>
                  <th className="p-3 lg:p-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Jinsi
                  </th>
                  <th className="p-3 lg:p-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Telefon
                  </th>
                  <th className="hidden lg:table-cell p-3 lg:p-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
                    Tug&apos;ilgan sana
                  </th>
                  <th className="p-3 lg:p-4 text-center text-xs font-bold uppercase tracking-wider w-20 lg:w-24" style={{ color: t.textMuted }}>
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody>
                {membersLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 lg:p-12 text-center text-sm" style={{ color: t.textMuted }}>
                      Yuklanmoqda...
                    </td>
                  </tr>
                ) : membersError ? (
                  <tr>
                    <td colSpan={6} className="p-8 lg:p-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div
                          className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center mb-3"
                          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                        >
                          <AlertCircle className="w-7 h-7 lg:w-8 lg:h-8" style={{ color: '#ef4444' }} />
                        </div>
                        <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>
                          A&apos;zolarni yuklab bo&apos;lmadi
                        </p>
                        <p className="text-xs" style={{ color: t.textMuted }}>
                          {membersError}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 lg:p-12">
                      <div className="flex flex-col items-center justify-center">
                        <div
                          className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center mb-3"
                          style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                        >
                          <Users className="w-7 h-7 lg:w-8 lg:h-8" style={{ color: t.textMuted }} />
                        </div>
                        <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>
                          O&apos;quvchi topilmadi
                        </p>
                        <p className="text-xs" style={{ color: t.textMuted }}>
                          {searchQuery.trim() ? 'Qidiruv shartini o‘zgartiring' : 'Hozircha guruhda aʼzo yoʻq'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  members.map((student, idx) => {
                    const isSelected = selectedIds.includes(student.id);

                    return (
                      <tr
                        key={student.id}
                        style={{
                          borderBottom: idx < members.length - 1 ? `1px solid ${t.border}` : 'none',
                          background: isSelected
                            ? t.isDark
                              ? `${classData.color}15`
                              : `${classData.color}0a`
                            : 'transparent',
                        }}
                        className="transition-colors"
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = t.bgInner;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <td className="p-3 lg:p-4">
                          <CustomCheckbox
                            checked={isSelected}
                            onChange={() => {
                              setSelectedIds((prev) =>
                                prev.includes(student.id)
                                  ? prev.filter((value) => value !== student.id)
                                  : [...prev, student.id],
                              );
                            }}
                            color={classData.color}
                          />
                        </td>
                        <td className="p-3 lg:p-4">
                          <div className="flex items-center gap-2 lg:gap-3">
                            <Avatar
                              name={student.fullName}
                              src={student.profileImage}
                              sizeClass="w-9 h-9 lg:w-10 lg:h-10"
                              color={classData.color}
                              borderColor={t.border}
                            />
                            <div>
                              <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                                {student.fullName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 lg:p-4 text-sm" style={{ color: t.textSecondary }}>
                          {formatGender(student.gender)}
                        </td>
                        <td className="p-3 lg:p-4 text-sm font-mono" style={{ color: t.textSecondary }}>
                          {student.phoneNumber ?? 'Kiritilmagan'}
                        </td>
                        <td className="hidden lg:table-cell p-3 lg:p-4 text-sm" style={{ color: t.textSecondary }}>
                          {formatBirthDate(student.birthDate)}
                        </td>
                        <td className="p-3 lg:p-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => {
                                setSelectedIds([student.id]);
                                setDeleteModalOpen(true);
                              }}
                              className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center transition-all"
                              style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = t.isDark
                                  ? 'rgba(239,68,68,0.15)'
                                  : 'rgba(239,68,68,0.08)';
                                e.currentTarget.style.borderColor = '#ef4444';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = t.bgInner;
                                e.currentTarget.style.borderColor = t.border;
                              }}
                            >
                              <Trash2 style={{ width: 15, height: 15 }} strokeWidth={2} color="#ef4444" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden space-y-3">
          {membersLoading ? (
            <div
              className="rounded-xl p-8 text-center text-sm"
              style={{ background: t.bgCard, border: `1px solid ${t.border}`, color: t.textMuted }}
            >
              Yuklanmoqda...
            </div>
          ) : membersError ? (
            <div
              className="rounded-xl p-5"
              style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle style={{ width: 18, height: 18, color: '#ef4444', flexShrink: 0 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                    A&apos;zolarni yuklab bo&apos;lmadi
                  </p>
                  <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                    {membersError}
                  </p>
                </div>
              </div>
            </div>
          ) : members.length === 0 ? (
            <div
              className="rounded-xl p-8"
              style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
            >
              <div className="flex flex-col items-center justify-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                >
                  <Users className="w-7 h-7" style={{ color: t.textMuted }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>
                  O&apos;quvchi topilmadi
                </p>
                <p className="text-xs text-center" style={{ color: t.textMuted }}>
                  {searchQuery.trim() ? 'Qidiruv shartini o‘zgartiring' : 'Hozircha guruhda aʼzo yoʻq'}
                </p>
              </div>
            </div>
          ) : (
            members.map((student) => {
              const isSelected = selectedIds.includes(student.id);

              return (
                <div
                  key={student.id}
                  className="rounded-xl p-3 transition-all"
                  style={{
                    background: isSelected
                      ? t.isDark
                        ? `${classData.color}15`
                        : `${classData.color}0a`
                      : t.bgCard,
                    border: `1px solid ${isSelected ? classData.color + '60' : t.border}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <CustomCheckbox
                        checked={isSelected}
                        onChange={() => {
                          setSelectedIds((prev) =>
                            prev.includes(student.id)
                              ? prev.filter((value) => value !== student.id)
                              : [...prev, student.id],
                          );
                        }}
                        color={classData.color}
                      />
                    </div>

                    <Avatar
                      name={student.fullName}
                      src={student.profileImage}
                      sizeClass="w-12 h-12"
                      color={classData.color}
                      borderColor={t.border}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold mb-1" style={{ color: t.textPrimary }}>
                        {student.fullName}
                      </p>
                      <div className="space-y-1">
                        <p className="text-xs flex items-center gap-1.5" style={{ color: t.textSecondary }}>
                          <span className="font-semibold" style={{ color: t.textMuted }}>Jinsi:</span>
                          {formatGender(student.gender)}
                        </p>
                        <p className="text-xs flex items-center gap-1.5" style={{ color: t.textSecondary }}>
                          <Phone style={{ width: 12, height: 12 }} strokeWidth={2} />
                          <span className="font-mono">{student.phoneNumber ?? 'Kiritilmagan'}</span>
                        </p>
                        <p className="text-xs flex items-center gap-1.5" style={{ color: t.textSecondary }}>
                          <Calendar style={{ width: 12, height: 12 }} strokeWidth={2} />
                          {formatBirthDate(student.birthDate)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedIds([student.id]);
                        setDeleteModalOpen(true);
                      }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0"
                      style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
                      onTouchStart={(e) => {
                        e.currentTarget.style.background = t.isDark
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(239,68,68,0.08)';
                        e.currentTarget.style.borderColor = '#ef4444';
                      }}
                      onTouchEnd={(e) => {
                        e.currentTarget.style.background = t.bgInner;
                        e.currentTarget.style.borderColor = t.border;
                      }}
                    >
                      <Trash2 style={{ width: 16, height: 16 }} strokeWidth={2} color="#ef4444" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {deleteModalOpen && (
        <DeleteConfirmModal
          count={selectedIds.length}
          onConfirm={() => void handleRemoveMembers()}
          onCancel={() => {
            setDeleteModalOpen(false);
            setSelectedIds([]);
          }}
        />
      )}

      {addModalOpen && (
        <AddMembersModal
          currentMemberIds={members.map((member) => member.id)}
          onAdd={handleAddMembers}
          onClose={() => setAddModalOpen(false)}
          color={classData.color}
        />
      )}
    </div>
  );
}

interface DeleteConfirmModalProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ count, onConfirm, onCancel }: DeleteConfirmModalProps) {
  const { theme: t } = useTheme();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden"
        style={{
          background: '#243043',
          border: '1px solid rgba(148,163,184,0.22)',
          boxShadow: '0 32px 80px rgba(2,6,23,0.45)',
        }}
      >
        <div className="p-5 sm:p-6 pb-3 sm:pb-4 flex justify-center">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.4)',
            }}
          >
            <AlertCircle style={{ width: 26, height: 26 }} strokeWidth={2} color="#ef4444" />
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-center">
          <h3 className="text-base sm:text-lg font-bold mb-2" style={{ color: '#f8fafc' }}>
            Guruhdan o&apos;chirish
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(226,232,240,0.62)' }}>
            Siz {count} ta o&apos;quvchini guruhdan o&apos;chirmoqchimisiz? Bu amal ortga qaytarilmaydi.
          </p>
        </div>

        <div
          className="px-5 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-3"
          style={{
            borderTop: '1px solid rgba(148,163,184,0.18)',
            background: 'rgba(15,23,42,0.16)',
          }}
        >
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: '#192338',
              border: '1px solid rgba(148,163,184,0.24)',
              color: '#94a3b8',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(148,163,184,0.38)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(148,163,184,0.24)';
            }}
          >
            Yo&apos;q, bekor qilish
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 rounded-xl text-sm font-bold text-white transition-all"
            style={{
              background: 'linear-gradient(180deg, #ff4b43, #ef2f2f)',
              boxShadow: '0 10px 24px rgba(239,47,47,0.35)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 14px 28px rgba(239,47,47,0.42)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 24px rgba(239,47,47,0.35)';
            }}
          >
            Ha, o&apos;chirish
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddMembersModalProps {
  currentMemberIds: number[];
  onAdd: (ids: number[]) => Promise<void>;
  onClose: () => void;
  color: string;
}

function AddMembersModal({ currentMemberIds, onAdd, onClose, color }: AddMembersModalProps) {
  const { theme: t } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [students, setStudents] = useState<SuggestedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSuggestions() {
      setLoading(true);
      setError('');

      try {
        const response = await fetchWithAuthRetry(
          `${API_BASE_URL}/api/v1/teacher/my/student/suggestions/?page=1&size=50`,
          { method: 'GET' },
        );

        if (!response.ok) {
          throw new Error(`Takliflarni olishda xatolik: ${response.status}`);
        }

        const data: PaginatedResponse<SuggestionApiItem> = await response.json();
        if (isMounted) {
          setStudents(data.items.map(mapSuggestion));
        }
      } catch (loadError) {
        if (isMounted) {
          setStudents([]);
          setError(loadError instanceof Error ? loadError.message : "Takliflarni yuklab bo'lmadi");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadSuggestions();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const available = students.filter((student) => !currentMemberIds.includes(student.id));
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return available;
    }

    return available.filter((student) =>
      `${student.fullName} ${student.username}`.toLowerCase().includes(query),
    );
  }, [currentMemberIds, searchQuery, students]);

  const allSelected = filteredStudents.length > 0 && selectedIds.length === filteredStudents.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredStudents.map((student) => student.id));
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onAdd(selectedIds);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "A'zolarni qo'shib bo'lmadi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.isDark ? color + '30' : t.border}`,
          boxShadow: t.isDark
            ? `0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px ${color}15`
            : '0 32px 80px rgba(15,23,42,0.25)',
          maxHeight: '90vh',
        }}
      >
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 shrink-0"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div>
            <h3 className="text-base sm:text-lg font-bold" style={{ color: t.textPrimary }}>
              A&apos;zo qo&apos;shish
            </h3>
            <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
              {selectedIds.length > 0
                ? `${selectedIds.length} ta o'quvchi tanlandi`
                : "Guruhga qo'shish uchun o'quvchilarni tanlang"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0"
            style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
          >
            <X style={{ width: 18, height: 18, color: t.textMuted }} strokeWidth={2} />
          </button>
        </div>

        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 shrink-0">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width: 18, height: 18, color: t.textMuted }}
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Ism yoki login bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl text-sm outline-none transition-all"
              style={{
                background: t.bgInner,
                border: `1px solid ${t.border}`,
                color: t.textPrimary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = color;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = t.border;
              }}
            />
          </div>

          {filteredStudents.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="mt-3 text-xs font-semibold transition-colors"
              style={{ color }}
            >
              {allSelected ? 'Tanlovni bekor qilish' : 'Barchasini tanlash'}
            </button>
          )}
        </div>

        {error && (
          <div className="px-4 sm:px-6 pb-3">
            <div
              className="rounded-xl px-4 py-3 text-xs flex items-start gap-2"
              style={{
                background: t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${t.isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.18)'}`,
                color: '#ef4444',
              }}
            >
              <AlertCircle style={{ width: 14, height: 14, marginTop: 1, flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm" style={{ color: t.textMuted }}>
              Yuklanmoqda...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: t.bgInner, border: `1px solid ${t.border}` }}
              >
                <Users className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: t.textMuted }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: t.textPrimary }}>
                O&apos;quvchi topilmadi
              </p>
              <p className="text-xs text-center" style={{ color: t.textMuted }}>
                {students.length === 0
                  ? 'Tavsiya etilgan o‘quvchilar mavjud emas'
                  : "Barcha tavsiya etilgan o'quvchilar guruhga qo'shilgan"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredStudents.map((student) => {
                const isSelected = selectedIds.includes(student.id);

                return (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedIds((prev) =>
                        prev.includes(student.id)
                          ? prev.filter((value) => value !== student.id)
                          : [...prev, student.id],
                      );
                    }}
                    className="w-full p-3 rounded-xl flex items-center gap-3 transition-all"
                    style={{
                      background: isSelected
                        ? t.isDark
                          ? `${color}15`
                          : `${color}0a`
                        : t.bgInner,
                      border: `1px solid ${isSelected ? color : t.border}`,
                    }}
                  >
                    <Avatar
                      name={student.fullName}
                      src={student.profileImage}
                      sizeClass="w-11 h-11 sm:w-12 sm:h-12"
                      color={color}
                      borderColor={isSelected ? color : t.border}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>
                        {student.fullName}
                      </p>
                      <p className="text-xs truncate" style={{ color: t.textMuted }}>
                        @{student.username} • {student.role}
                      </p>
                    </div>
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: isSelected ? color : t.bgInner,
                        border: `2px solid ${isSelected ? color : t.border}`,
                      }}
                    >
                      {isSelected && <Check style={{ width: 12, height: 12, color: 'white' }} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="px-4 sm:px-6 py-3 sm:py-4 shrink-0 flex flex-col sm:flex-row gap-3"
          style={{
            borderTop: `1px solid ${t.border}`,
            background: t.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: t.bgInner,
              border: `1px solid ${t.border}`,
              color: t.textSecondary,
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Bekor qilish
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={selectedIds.length === 0 || submitting}
            className="flex-1 h-11 rounded-xl text-sm font-bold text-white transition-all"
            style={{
              background:
                selectedIds.length === 0 || submitting
                  ? t.textMuted
                  : `linear-gradient(135deg, ${color}, ${color}cc)`,
              boxShadow:
                selectedIds.length === 0 || submitting ? 'none' : `0 5px 18px ${color}40`,
              cursor: selectedIds.length === 0 || submitting ? 'not-allowed' : 'pointer',
              opacity: selectedIds.length === 0 || submitting ? 0.5 : 1,
            }}
          >
            {submitting
              ? 'Qo‘shilmoqda...'
              : selectedIds.length > 0
                ? `${selectedIds.length} ta a'zo qo'shish`
                : 'Tanlang'}
          </button>
        </div>
      </div>
    </div>
  );
}

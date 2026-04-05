import { useState } from 'react';
import {
  User, Bell, Shield, Palette, Globe, Save, Camera,
  Moon, Sun, Check,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';

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
  { id: 'profile',   label: 'Profil',        Icon: User    },
  { id: 'appearance',label: 'Ko\'rinish',    Icon: Palette },
  { id: 'notifications', label: 'Bildirishnomalar', Icon: Bell },
  { id: 'security',  label: 'Xavfsizlik',    Icon: Shield  },
  { id: 'language',  label: 'Til',           Icon: Globe   },
];

export function SettingsPage() {
  const { theme: t, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    firstName: 'Anna', lastName: 'Smirnova',
    email: 'anna.smirnova@edu.uz', phone: '+998 90 123 45 67',
    subject: 'Matematika', school: '45-maktab, Toshkent',
  });

  const [notifications, setNotifications] = useState({
    testSubmitted: true, newStudent: true, liveSession: true,
    weeklyReport: false, systemUpdates: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1551989745-347c28b620e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200"
                    alt="Avatar"
                    className="w-16 h-16 rounded-2xl object-cover"
                    style={{ border: `2px solid ${t.accentBorder}` }}
                  />
                  <button
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: '#6366F1', border: `2px solid ${t.bgCard}` }}
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>
                    {profile.firstName} {profile.lastName}
                  </p>
                  <p className="text-xs" style={{ color: t.textMuted }}>{profile.subject} o'qituvchisi</p>
                  <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{profile.school}</p>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {[
                  { label: 'Ism', key: 'firstName' },
                  { label: 'Familiya', key: 'lastName' },
                  { label: 'Email', key: 'email' },
                  { label: 'Telefon', key: 'phone' },
                  { label: 'Fan', key: 'subject' },
                  { label: 'Maktab', key: 'school' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: t.textMuted }}>{label}</label>
                    <input
                      type="text"
                      value={profile[key as keyof typeof profile]}
                      onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                      style={inputStyle}
                      onFocus={(e) => { (e.target as HTMLElement).style.borderColor = '#6366F1'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                      onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = t.border;  (e.target as HTMLElement).style.boxShadow = 'none'; }}
                    />
                  </div>
                ))}
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
                  <Toggle value={false} onChange={() => {}} />
                </FieldRow>
                <FieldRow label="Animatsiyalar" subtitle="Interfeys animatsiyalarini yoqish">
                  <Toggle value={true} onChange={() => {}} />
                </FieldRow>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold mb-3" style={{ color: t.textPrimary }}>Aksent rangi</p>
                <div className="flex gap-3 flex-wrap">
                  {['#6366F1','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#F59E0B'].map((color) => (
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
                  { key: 'testSubmitted', label: 'Test topshirildi',      sub: "O'quvchi test topshirganida xabar oling" },
                  { key: 'newStudent',    label: "Yangi o'quvchi",         sub: "Sinfga yangi o'quvchi qo'shilganida" },
                  { key: 'liveSession',  label: 'Jonli dars eslatmasi',   sub: 'Dars boshlanishidan 15 daqiqa oldin' },
                  { key: 'weeklyReport', label: 'Haftalik hisobot',        sub: 'Har dushanba kuni umumiy hisobot' },
                  { key: 'systemUpdates',label: 'Tizim yangilanishlari',   sub: 'Platforma yangilanishlari haqida' },
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
                      onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = t.border;  (e.target as HTMLElement).style.boxShadow = 'none'; }}
                    />
                  </div>
                ))}
              </div>
              <FieldRow label="Ikki faktorli autentifikatsiya" subtitle="Qo'shimcha himoya uchun 2FA ni yoqing">
                <Toggle value={false} onChange={() => {}} />
              </FieldRow>
            </Card>
          )}

          {/* Language */}
          {activeTab === 'language' && (
            <Card>
              <SectionTitle title="Til sozlamalari" subtitle="Interfeys tilini tanlang" />
              <div className="space-y-2.5">
                {[
                  { code: "O'zbek (lotin)",   flag: '🇺🇿', active: true  },
                  { code: "O'zbek (kirill)",  flag: '🇺🇿', active: false },
                  { code: 'Русский',          flag: '🇷🇺', active: false },
                  { code: 'English',          flag: '🇬🇧', active: false },
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: saved ? '#22C55E' : 'linear-gradient(135deg, #6366F1, #4F46E5)',
                boxShadow: saved ? '0 4px 14px rgba(34,197,94,0.3)' : '0 4px 14px rgba(99,102,241,0.25)',
                minWidth: '140px',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => { if (!saved) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              {saved ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Save className="w-4 h-4" />}
              {saved ? 'Saqlandi!' : 'Saqlash'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

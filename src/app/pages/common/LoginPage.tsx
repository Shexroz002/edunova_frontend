import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff, Sun, Moon, BookOpen, ArrowRight, Lock, Mail } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext.tsx';
import { getDefaultRouteForRole, persistAuthSession, type LoginResponse } from '../../lib/auth.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.myedunova.uz';

// ── Telegram SVG icon ─────────────────────────────────────────────────────────
function TelegramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"
        fill="#2CA5E0"
      />
      <path
        d="M17.89 7.4L15.58 18.23c-.17.77-.63.96-1.28.6l-3.53-2.6-1.7 1.64c-.19.19-.35.35-.71.35l.25-3.59 6.52-5.89c.28-.25-.06-.39-.44-.14L6.06 13.6 2.58 12.5c-.76-.24-.78-.76.16-1.12l14.14-5.45c.63-.23 1.18.15.97 1.47z"
        fill="white"
      />
    </svg>
  );
}

// ── Google SVG icon ───────────────────────────────────────────────────────────
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ── Animated background orbs ─────────────────────────────────────────────────
function BackgroundOrbs({ isDark }: { isDark: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Top-right orb */}
      <div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          top: -180,
          right: -140,
          background: isDark
            ? 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        }}
      />
      {/* Bottom-left orb */}
      <div
        className="absolute rounded-full"
        style={{
          width: 420,
          height: 420,
          bottom: -120,
          left: -120,
          background: isDark
            ? 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        }}
      />
      {/* Center accent */}
      <div
        className="absolute rounded-full"
        style={{
          width: 300,
          height: 300,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: isDark
            ? 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)',
        }}
      />
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isDark
            ? `linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
               linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)`
            : `linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
               linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}

// ── Main login page ───────────────────────────────────────────────────────────
export function LoginPage() {
  const { theme: t, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [focusField,  setFocusField]  = useState<'user' | 'pass' | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Iltimos, foydalanuvchi nomi va parolni kiriting.");
      return;
    }

    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams({
        grant_type: 'password',
        username: username.trim(),
        password,
        scope: '',
        client_id: 'string',
        client_secret: 'string',
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me/`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        let message = 'Login yoki parol noto‘g‘ri';

        try {
          const errorData = await response.json();
          if (typeof errorData?.detail === 'string') {
            message = errorData.detail;
          } else if (typeof errorData?.message === 'string') {
            message = errorData.message;
          }
        } catch {
          message = `Kirishda xatolik: ${response.status}`;
        }

        throw new Error(message);
      }

      const data: LoginResponse = await response.json();
      persistAuthSession(data);
      navigate(getDefaultRouteForRole(data.user?.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirishni yakunlab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }

  function handleSocial(provider: string) {
    setError(`${provider} orqali kirish hali ulanmagan.`);
  }

  const inputStyle = (focused: boolean) => ({
    background: t.bgInner,
    border: `1.5px solid ${focused ? '#6366F1' : t.border}`,
    color: t.textPrimary,
    boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
    height: '48px',
    transition: 'all 0.2s',
  });

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ background: t.bgBase }}
    >
      <BackgroundOrbs isDark={t.isDark} />

      {/* Theme toggle — top right */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          color: t.textMuted,
          boxShadow: t.shadowCard,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = '#6366F1';
          (e.currentTarget as HTMLElement).style.color = '#6366F1';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = t.border;
          (e.currentTarget as HTMLElement).style.color = t.textMuted;
        }}
      >
        {t.isDark
          ? <Sun  className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} strokeWidth={1.75} />
          : <Moon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} strokeWidth={1.75} />
        }
      </button>

      {/* ── Card ── */}
      <div
        className="relative z-10 w-full mx-4"
        style={{ maxWidth: 440 }}
      >
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: t.bgCard,
            border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.2)' : t.border}`,
            boxShadow: t.isDark
              ? '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.1)'
              : '0 24px 64px rgba(15,23,42,0.12), 0 1px 3px rgba(15,23,42,0.06)',
          }}
        >
          {/* ── Top accent bar ── */}
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 50%, #3B82F6 100%)' }}
          />

          <div className="px-8 pt-8 pb-8">
            {/* ── Logo / Brand ── */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: t.isDark
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))'
                    : 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                  border: `1.5px solid ${t.isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.2)'}`,
                  boxShadow: t.isDark ? '0 8px 32px rgba(99,102,241,0.25)' : '0 4px 16px rgba(99,102,241,0.12)',
                }}
              >
                <BookOpen className="w-7 h-7" style={{ color: '#6366F1' }} strokeWidth={1.75} />
              </div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: t.textPrimary }}>
                EduPanel
              </h1>
              <p className="text-sm" style={{ color: t.textMuted }}>
                O'qituvchi boshqaruv tizimi
              </p>
            </div>

            {/* ── Social buttons ── */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Google */}
              <button
                onClick={() => handleSocial('google')}
                disabled={loading}
                className="flex items-center justify-center gap-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  height: 46,
                  background: t.bgInner,
                  border: `1.5px solid ${t.border}`,
                  color: t.textSecondary,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#EA4335';
                  (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(234,67,53,0.06)' : 'rgba(234,67,53,0.04)';
                  (e.currentTarget as HTMLElement).style.color = t.textPrimary;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = t.border;
                  (e.currentTarget as HTMLElement).style.background = t.bgInner;
                  (e.currentTarget as HTMLElement).style.color = t.textSecondary;
                }}
              >
                <GoogleIcon size={18} />
                Google
              </button>

              {/* Telegram */}
              <button
                onClick={() => handleSocial('telegram')}
                disabled={loading}
                className="flex items-center justify-center gap-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  height: 46,
                  background: t.bgInner,
                  border: `1.5px solid ${t.border}`,
                  color: t.textSecondary,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#2CA5E0';
                  (e.currentTarget as HTMLElement).style.background = t.isDark ? 'rgba(44,165,224,0.06)' : 'rgba(44,165,224,0.04)';
                  (e.currentTarget as HTMLElement).style.color = t.textPrimary;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = t.border;
                  (e.currentTarget as HTMLElement).style.background = t.bgInner;
                  (e.currentTarget as HTMLElement).style.color = t.textSecondary;
                }}
              >
                <TelegramIcon size={18} />
                Telegram
              </button>
            </div>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px" style={{ background: t.border }} />
              <span className="text-xs font-medium px-2" style={{ color: t.textMuted }}>
                yoki email bilan kirish
              </span>
              <div className="flex-1 h-px" style={{ background: t.border }} />
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: t.textSecondary }}
                >
                  Foydalanuvchi nomi yoki email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ width: 16, height: 16, color: focusField === 'user' ? '#6366F1' : t.textMuted }}
                    strokeWidth={1.75}
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    onFocus={() => setFocusField('user')}
                    onBlur={() => setFocusField(null)}
                    placeholder="username yoki email@example.com"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 rounded-xl text-sm focus:outline-none"
                    style={inputStyle(focusField === 'user')}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                    Parol
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium transition-colors"
                    style={{ color: '#6366F1' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#4F46E5'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
                  >
                    Parolni unutdingizmi?
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ width: 16, height: 16, color: focusField === 'pass' ? '#6366F1' : t.textMuted }}
                    strokeWidth={1.75}
                  />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    onFocus={() => setFocusField('pass')}
                    onBlur={() => setFocusField(null)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 rounded-xl text-sm focus:outline-none"
                    style={inputStyle(focusField === 'pass')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg transition-all"
                    style={{ color: t.textMuted }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
                  >
                    {showPass
                      ? <EyeOff style={{ width: 15, height: 15 }} strokeWidth={1.75} />
                      : <Eye    style={{ width: 15, height: 15 }} strokeWidth={1.75} />
                    }
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#EF4444',
                  }}
                >
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(239,68,68,0.15)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>!</span>
                  </div>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl text-sm font-bold text-white transition-all mt-2"
                style={{
                  height: 50,
                  background: loading
                    ? (t.isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)')
                    : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  boxShadow: loading
                    ? 'none'
                    : (t.isDark
                        ? '0 6px 24px rgba(99,102,241,0.4)'
                        : '0 4px 16px rgba(99,102,241,0.3)'),
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = t.isDark
                      ? '0 8px 32px rgba(99,102,241,0.55)'
                      : '0 6px 22px rgba(99,102,241,0.42)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = loading
                    ? 'none'
                    : (t.isDark ? '0 6px 24px rgba(99,102,241,0.4)' : '0 4px 16px rgba(99,102,241,0.3)');
                }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Kirilmoqda...
                  </>
                ) : (
                  <>
                    Kirish
                    <ArrowRight style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>

            {/* ── Footer note ── */}
            <p className="text-center text-xs mt-6" style={{ color: t.textMuted }}>
              Hisobingiz yo'qmi?{' '}
              <Link
                to="/register"
                className="font-semibold transition-colors"
                style={{ color: '#6366F1' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#4F46E5'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6366F1'; }}
              >
                Ro'yxatdan o'tish
              </Link>
            </p>
          </div>
        </div>

        {/* ── Bottom decorative dots ── */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: i === 1 ? 24 : 6,
                height: 6,
                background: i === 1 ? '#6366F1' : t.border,
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

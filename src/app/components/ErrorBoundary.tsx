import { useNavigate, useRouteError } from 'react-router';
import { useTheme } from './ThemeContext';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export function ErrorBoundary() {
  const { theme: t } = useTheme();
  const navigate = useNavigate();
  const error = useRouteError() as any;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: t.bgBase }}
    >
      <div className="max-w-md w-full text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: t.isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
            border: '2px solid rgba(239,68,68,0.3)',
          }}
        >
          <AlertCircle className="w-10 h-10" style={{ color: '#EF4444' }} strokeWidth={2} />
        </div>

        <h1
          className="text-2xl font-bold mb-3"
          style={{ color: t.textPrimary }}
        >
          Xatolik yuz berdi
        </h1>

        <p className="text-sm mb-6" style={{ color: t.textMuted }}>
          {error?.status === 404
            ? "Kechirasiz, siz qidirayotgan sahifa topilmadi."
            : "Nimadir xato ketdi. Iltimos, qaytadan urinib ko'ring."}
        </p>

        {error?.statusText && (
          <div
            className="p-4 rounded-xl mb-6 text-sm"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${t.border}`,
              color: t.textMuted,
            }}
          >
            {error.statusText}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: `1.5px solid ${t.border}`,
              color: t.textSecondary,
            }}
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Orqaga
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}
          >
            <Home className="w-4 h-4" strokeWidth={2} />
            Bosh sahifa
          </button>
        </div>
      </div>
    </div>
  );
}

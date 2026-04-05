import { useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { TopNavigation } from '../components/TopNavigation';
import { useTheme } from '../components/ThemeContext';

export function DashboardLayout() {
  const { theme: t } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="flex min-h-screen transition-colors duration-300"
      style={{ background: t.bgBase }}
    >
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNavigation onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 p-4 lg:p-7 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

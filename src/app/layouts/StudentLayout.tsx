import {Outlet, NavLink, useNavigate} from 'react-router';
import {
    LayoutDashboard,
    FileText,
    Users,
    BarChart3,
    User,
    Bell,
    Sun,
    Moon,
    Zap,
    GraduationCap,
} from 'lucide-react';
import {useTheme} from '../components/ThemeContext';

const studentNavItems = [
    {name: 'Bosh sahifa', icon: LayoutDashboard, path: '/student'},
    {name: 'Guruhlar', icon: GraduationCap, path: '/student/group'},
    {name: "Do'stlar", icon: Users, path: '/student/friends'},
    {name: 'Statistika', icon: BarChart3, path: '/student/statistics'},
    {name: 'Profil', icon: User, path: '/student/profile'},
];

// ── Desktop Sidebar ──────────────────────────────────────────────────────────
function Sidebar() {
    const {theme: t, toggleTheme} = useTheme();
    return (
        <aside className="w-64 h-full flex flex-col" style={{background: t.bgCard}}>
            {/* Logo */}
            <div className="px-6 py-7 flex items-center gap-2.5">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                        background: t.isDark
                            ? 'linear-gradient(135deg, #7C3AED, #6366F1)'
                            : 'linear-gradient(135deg, #6366F1, #4F46E5)',
                    }}
                >
                    <Zap className="w-4 h-4 text-white"/>
                </div>
                <h1 className="text-lg font-bold tracking-tight" style={{color: t.textPrimary}}>
                    EduPlatform
                </h1>
            </div>

            {/* Student badge */}
            {/*<div*/}
            {/*    className="mx-4 mb-4 px-3 py-2 rounded-xl flex items-center gap-2"*/}
            {/*    style={{*/}
            {/*      background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',*/}
            {/*      border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,*/}
            {/*    }}*/}
            {/*>*/}
            {/*  <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />*/}
            {/*  <span className="text-xs font-medium" style={{ color: t.isDark ? '#818CF8' : '#6366F1' }}>*/}
            {/*  O'quvchi paneli*/}
            {/*</span>*/}
            {/*</div>*/}

            {/* Section label */}
            <div className="px-5 mb-2">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{color: t.textMuted}}>
          Menyu
        </span>
            </div>

            {/* Nav items */}
            <nav className="px-3 flex-1">
                {studentNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            end={item.path === '/student'}
                            className="w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-xl transition-all text-left group"
                            style={({isActive}) =>
                                isActive
                                    ? {
                                        background: t.isDark
                                            ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(124,58,237,0.15))'
                                            : 'rgba(99,102,241,0.08)',
                                        border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.2)'}`,
                                        color: t.isDark ? '#818CF8' : '#6366F1',
                                        boxShadow: t.isDark ? '0 0 12px rgba(99,102,241,0.15)' : 'none',
                                        textDecoration: 'none',
                                    }
                                    : {
                                        background: 'transparent',
                                        border: '1px solid transparent',
                                        color: t.textSecondary,
                                        textDecoration: 'none',
                                    }
                            }
                        >
                            {({isActive}) => (
                                <>
                                    <div
                                        className="p-2 rounded-lg flex items-center justify-center"
                                        style={
                                            isActive
                                                ? {background: t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)'}
                                                : {background: t.isDark ? 'rgba(30,41,59,0.6)' : 'rgba(0,0,0,0.04)'}
                                        }
                                    >
                                        <Icon className="w-4 h-4" strokeWidth={t.isDark ? 2 : 1.75}/>
                                    </div>
                                    <span className="text-sm font-medium">{item.name}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-5 rounded-full"
                                             style={{background: '#6366F1'}}/>
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
}

// ─ Mobile Bottom Nav ────────────────────────────────────────────────────────
function MobileBottomNav() {
    const {theme: t} = useTheme();
    return (
        <nav
            className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-1"
            style={{
                background: t.bgCard,
                borderTop: `1px solid ${t.border}`,
                boxShadow: t.isDark ? '0 -4px 20px rgba(0,0,0,0.4)' : '0 -2px 12px rgba(15,23,42,0.08)',
            }}
        >
            {studentNavItems.map((item) => {
                const Icon = item.icon;
                return (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        end={item.path === '/student'}
                        className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
                        style={({isActive}) =>
                            isActive
                                ? {color: t.isDark ? '#818CF8' : '#6366F1', textDecoration: 'none'}
                                : {color: t.textMuted, textDecoration: 'none'}
                        }
                    >
                        {({isActive}) => (
                            <>
                                <div
                                    className="p-1.5 rounded-lg transition-all"
                                    style={
                                        isActive
                                            ? {background: t.isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'}
                                            : {background: 'transparent'}
                                    }
                                >
                                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.75}/>
                                </div>
                                <span style={{fontSize: '10px', fontWeight: isActive ? 600 : 400}}>{item.name}</span>
                            </>
                        )}
                    </NavLink>
                );
            })}
        </nav>
    );
}

// ── Mobile Top Bar ───────────────────────────────────────────────────────────
function MobileTopBar() {
    const {theme: t, toggleTheme} = useTheme();
    const navigate = useNavigate();
    return (
        <header
            className="lg:hidden px-4 py-3 flex items-center justify-between shrink-0"
            style={{background: t.bgCard, borderBottom: `1px solid ${t.border}`}}
        >
            {/* Logo */}
            <div className="flex items-center gap-2">
                <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{background: 'linear-gradient(135deg, #7C3AED, #6366F1)'}}
                >
                    <Zap className="w-3.5 h-3.5 text-white"/>
                </div>
                <span className="font-bold text-base" style={{color: t.textPrimary}}>EduPlatform</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                    style={{
                        background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.1)',
                        border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    }}
                >
                    {t.isDark
                        ? <Sun className="w-4 h-4" style={{color: '#FBBF24'}}/>
                        : <Moon className="w-4 h-4" style={{color: '#6366F1'}}/>
                    }
                </button>
                <button
                    onClick={() => navigate('/student/notifications')}
                    className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                    style={{background: t.bgButton, border: `1px solid ${t.border}`}}
                >
                    <Bell className="w-4 h-4" style={{color: t.textSecondary}}/>
                    <span
                        className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
                        style={{background: '#EF4444', borderColor: t.bgCard}}
                    />
                </button>
            </div>
        </header>
    );
}

// ── Desktop Top Bar ──────────────────────────────────────────────────────────
function DesktopTopBar() {
    const {theme: t, toggleTheme} = useTheme();
    const navigate = useNavigate();
    return (
        <header
            className="hidden lg:flex px-7 py-4 items-center justify-end gap-3 shrink-0"
            style={{background: t.bgCard, borderBottom: `1px solid ${t.border}`}}
        >
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                style={{
                    background: t.isDark ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${t.isDark ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`,
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
            >
                {t.isDark
                    ? <Sun className="w-4 h-4" style={{color: '#FBBF24'}} strokeWidth={2}/>
                    : <Moon className="w-4 h-4" style={{color: '#6366F1'}} strokeWidth={2}/>
                }
            </button>

            {/* Notifications */}
            <button
                onClick={() => navigate('/student/notifications')}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                style={{background: t.bgButton, border: `1px solid ${t.border}`}}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
            >
                <Bell className="w-4 h-4" style={{color: t.textSecondary}} strokeWidth={2}/>
                <span
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
                    style={{background: '#EF4444', borderColor: t.bgCard}}
                />
            </button>
        </header>
    );
}

// ── Layout ───────────────────────────────────────────────────────────────────
export function StudentLayout() {
    const {theme: t} = useTheme();

    return (
        <div
            className="flex min-h-screen transition-colors duration-300"
            style={{background: t.bgBase}}
        >
            {/* Desktop Sidebar — only on lg+ */}
            <div
                className="hidden lg:flex flex-col min-h-screen shrink-0 transition-colors duration-300"
                style={{borderRight: `1px solid ${t.border}`}}
            >
                <Sidebar/>
            </div>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile top bar */}
                <MobileTopBar/>

                {/* Desktop top bar */}
                <DesktopTopBar/>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-7 overflow-auto pb-20 lg:pb-7">
                    <Outlet/>
                </main>
            </div>

            {/* Mobile bottom nav — only on < lg */}
            <MobileBottomNav/>
        </div>
    );
}
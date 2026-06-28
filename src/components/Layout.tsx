import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  LayoutGrid,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  UserCheck,
  Bell,
  ChevronRight,
  Flame,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../hooks/useAlerts';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useDemoMode } from '../context/DemoContext';

import { GlobalSearch } from './GlobalSearch';
export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: alerts } = useAlerts();
  const openAlertsCount = alerts?.filter((a) => a.status === 'open').length || 0;

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const { isDemoMode, toggleDemoMode } = useDemoMode();

  const navItems = [
    { name: 'Fleet Dashboard', path: '/', icon: LayoutGrid, num: '01' },
    { name: 'Engine Details', path: '/engines/TF-0001', icon: Flame, num: '02' },
    { name: 'Alerts Center', path: '/alerts', icon: AlertTriangle, num: '03', badge: openAlertsCount },
    { name: 'Model Benchmarks', path: '/models', icon: Cpu, num: '04' },
    { name: 'Admin Pipeline', path: '/admin', icon: Database, num: '05' },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, num: '06' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 overflow-hidden transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-20 flex-shrink-0">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-9 w-9 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white block">AeroPredict</span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-600 dark:text-indigo-400 font-semibold">AI Turbofan Ops</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-2 px-2">Navigation</p>
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-indigo-600/25 dark:text-indigo-300 dark:border dark:border-indigo-500/30 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center">
                      <span className={cn('mr-3 font-mono text-[10px] italic', isActive ? 'opacity-80 dark:text-indigo-400' : 'opacity-40 text-slate-400')}>
                        {item.num}
                      </span>
                      <item.icon className={cn('w-4 h-4 mr-2.5 flex-shrink-0', isActive ? 'text-white dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300')} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && item.badge > 0 ? (
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-mono font-bold', isActive ? 'bg-white text-indigo-600 dark:bg-rose-500 dark:text-white' : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400')}>
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className={cn('w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity', isActive && 'opacity-60')} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom User Area */}
        <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          {user ? (
            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-lg object-cover flex-shrink-0 border border-indigo-500/20" />
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider truncate">{user.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" /> Sign In
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-100 dark:bg-slate-950">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] px-2.5 py-1 border rounded-md uppercase tracking-widest font-bold font-mono flex items-center gap-1.5",
                isDemoMode 
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                  : "bg-indigo-600/10 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-600/20 dark:border-indigo-500/20"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full animate-ping",
                  isDemoMode ? "bg-amber-500" : "bg-indigo-500"
                )} />
                {isDemoMode ? 'DEMO MODE' : 'PROD ENVIRONMENT'}
              </span>
              <span className="hidden md:inline-block text-xs font-mono text-slate-400 dark:text-slate-500">
                {isDemoMode ? 'Mock Data Active' : 'FastAPI v1 Connected'}
              </span>
            </div>
            
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_#10b981]" />
              System: Operational
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleDemoMode}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold font-mono tracking-widest uppercase rounded-md transition-colors border",
                  isDemoMode 
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
                title={isDemoMode ? "Disable Demo Mode (use real backend)" : "Enable Demo Mode (use mock data)"}
              >
                {isDemoMode ? 'Demo: ON' : 'Demo: OFF'}
              </button>

              <button
                onClick={() => navigate('/alerts')}
                className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
                title="Alerts Center"
              >
                <Bell className="w-4 h-4" />
                {openAlertsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-950" />
                )}
              </button>

              <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content View */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Map as MapIcon,
  Flame,
  Home,
  Shield,
  LogOut,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AuthorityRoute = '/' | '/dashboard' | '/reports' | '/map' | '/hotspots';

interface SidebarProps {
  currentRoute: AuthorityRoute;
  onRouteChange: (route: AuthorityRoute) => void;
  onLogout: () => void;
  onResetDemo?: () => void;
  isResettingDemo?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  onLogout,
  onResetDemo,
  isResettingDemo = false,
}) => {
  const { user } = useAuth();

  const navItems = [
    { route: '/' as AuthorityRoute, label: 'Portal Home', icon: Home },
    { route: '/dashboard' as AuthorityRoute, label: 'Command Center', icon: LayoutDashboard },
    { route: '/reports' as AuthorityRoute, label: 'Complaint Queue', icon: ClipboardList },
    { route: '/map' as AuthorityRoute, label: 'Map Intelligence', icon: MapIcon },
    { route: '/hotspots' as AuthorityRoute, label: 'Hotspot Intelligence', icon: Flame },
  ];

  return (
    <aside className="w-60 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 flex flex-col shrink-0 min-h-screen transition-colors duration-150">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-tight leading-snug">
              NagarDrishti AI
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Authority Portal</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium tracking-wider uppercase">
          Municipal Civic Intelligence
        </p>
      </div>

      {/* Navigation */}
      <nav className="p-2.5 space-y-0.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route;
          return (
            <button
              key={item.route}
              onClick={() => onRouteChange(item.route)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/60'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive
                    ? 'text-white dark:text-slate-900'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Authority Profile & System Status */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5">
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
            <span className="font-medium">Backend Sync</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            FastAPI + Shared Datastore
          </p>
        </div>

        {onResetDemo && (
          <button
            onClick={onResetDemo}
            disabled={isResettingDemo}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            title="Resets seeded demo dataset while preserving citizen submissions"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResettingDemo ? 'animate-spin' : ''}`} />
            <span>{isResettingDemo ? 'Resetting...' : 'Reset Demo Data'}</span>
          </button>
        )}

        {user && (
          <div className="bg-slate-100/70 dark:bg-slate-900/40 rounded-lg p-2.5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                  Authority
                </span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded font-semibold uppercase">
                {user.role}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate" title={user.email}>
              {user.email}
            </p>

            <button
              onClick={onLogout}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-1 text-[11px] font-medium text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

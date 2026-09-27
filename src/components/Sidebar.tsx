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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AuthorityRoute = '/' | '/dashboard' | '/reports' | '/map' | '/hotspots';

interface SidebarProps {
  currentRoute: AuthorityRoute;
  onRouteChange: (route: AuthorityRoute) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  onLogout,
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
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-100 text-sm leading-tight tracking-wide">
              NagarDrishti AI
            </h1>
            <p className="text-xs font-medium text-blue-400">Authority Portal</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-medium tracking-wider uppercase">
          Municipal Civic Intelligence
        </p>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route;
          return (
            <button
              key={item.route}
              onClick={() => onRouteChange(item.route)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Authority Profile & System Status */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>FastAPI Backend</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Authenticated Spatial PostGIS
          </p>
        </div>

        {user && (
          <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                  Authority Session
                </span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded font-semibold uppercase">
                {user.role}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-300 truncate" title={user.email}>
              {user.email}
            </p>

            <button
              onClick={onLogout}
              className="w-full mt-2.5 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
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

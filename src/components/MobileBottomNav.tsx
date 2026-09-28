import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Map as MapIcon,
  Flame,
} from 'lucide-react';
import type { AuthorityRoute } from './Sidebar';

interface MobileBottomNavProps {
  currentRoute: AuthorityRoute;
  onRouteChange: (route: AuthorityRoute) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRoute,
  onRouteChange,
}) => {
  const tabs = [
    { route: '/dashboard' as AuthorityRoute, label: 'Command', icon: LayoutDashboard },
    { route: '/reports' as AuthorityRoute, label: 'Queue', icon: ClipboardList },
    { route: '/map' as AuthorityRoute, label: 'Map', icon: MapIcon },
    { route: '/hotspots' as AuthorityRoute, label: 'Hotspots', icon: Flame },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 py-1.5 px-3 flex items-center justify-around shadow-lg transition-colors">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentRoute === tab.route;
        return (
          <button
            key={tab.route}
            onClick={() => onRouteChange(tab.route)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                isActive
                  ? 'bg-slate-100 dark:bg-slate-900'
                  : 'bg-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

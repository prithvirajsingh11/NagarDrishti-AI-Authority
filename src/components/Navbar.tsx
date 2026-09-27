import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, ExternalLink, ShieldCheck, LogOut, User, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  title: string;
  subtitle?: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
  lastUpdated?: Date;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  subtitle = 'Municipal Civic Intelligence',
  onRefresh,
  isRefreshing = false,
  lastUpdated,
  onLogout,
}) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-150">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {title}
        </h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {lastUpdated && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden md:inline-block font-mono">
            Synced {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Refresh Live Data */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh live complaints & statistics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
          <span className="hidden sm:inline">Sync</span>
        </button>

        {/* Citizen Portal Link */}
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors"
          title="Open Citizen Website"
        >
          <span>Citizen Portal</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>

        {/* Account Menu (Simple Dropdown) */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors text-xs text-slate-200 cursor-pointer"
              title="Authority Account Menu"
              aria-expanded={menuOpen}
            >
              <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <User className="w-3 h-3" />
              </div>
              <span className="max-w-[130px] truncate hidden md:inline-block font-mono text-[11px]">
                {user.email}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 text-[10px] font-semibold uppercase">
                {user.role}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-800">
                  <p className="text-xs font-semibold text-slate-100 truncate">{user.fullName || 'Authority Officer'}</p>
                  <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{user.email}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                      Role: {user.role}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

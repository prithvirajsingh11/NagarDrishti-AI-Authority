import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, ExternalLink, ShieldCheck, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    <header className="h-16 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-[11px] text-slate-400 hidden sm:inline-block">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh live complaints & statistics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          <span>Sync Live</span>
        </button>

        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
          title="Open Citizen Website"
        >
          <span>Citizen Portal</span>
          <ExternalLink className="w-3 h-3" />
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

import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccessDeniedPageProps {
  onBackToLogin: () => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ onBackToLogin }) => {
  const { user, logout } = useAuth();

  const handleReturnToLogin = async () => {
    await logout();
    onBackToLogin();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 text-center select-none">
      <div className="w-full max-w-md bg-slate-900/90 border border-rose-500/20 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-5 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
          Access Restricted
        </h1>

        {/* Message */}
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          This portal is available only to authorized municipal authority users.
        </p>

        {user && (
          <div className="mt-5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-left">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
              Signed-in Account
            </span>
            <p className="text-xs font-mono text-slate-200 mt-0.5 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-slate-400">Assigned Role:</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase">
                {user.role}
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-7 space-y-3">
          <button
            onClick={handleReturnToLogin}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </button>

          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="block text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Go to NagarDrishti Citizen Portal →
          </a>
        </div>
      </div>
    </div>
  );
};

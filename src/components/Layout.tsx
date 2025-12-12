import React from 'react';
import { Trophy, Users, Settings } from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
  currentView: 'dashboard' | 'admin';
  onNavigate: (view: 'dashboard' | 'admin') => void;
  currentWeek: number;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, currentWeek }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg shadow-cyan-500/20">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
                CryptoChampionships
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="px-4 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm font-medium text-slate-400">
                Week <span className="text-cyan-400">{currentWeek}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={clsx(
                    "p-2 rounded-lg transition-all",
                    currentView === 'dashboard' 
                      ? "bg-cyan-500/10 text-cyan-400" 
                      : "hover:bg-slate-800 text-slate-400"
                  )}
                >
                  <Users className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigate(currentView === 'admin' ? 'dashboard' : 'admin')}
                  className={clsx(
                    "p-2 rounded-lg transition-all",
                    currentView === 'admin' 
                      ? "bg-cyan-500/10 text-cyan-400" 
                      : "hover:bg-slate-800 text-slate-400"
                  )}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

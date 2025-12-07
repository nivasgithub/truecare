import React from 'react';
import { UserProfile } from '../types';
import { Icons } from './ui';

interface NavbarProps {
  onHomeClick?: () => void;
  currentView?: string;
  user?: UserProfile | null;
  onSignIn?: () => void;
  onLogout?: () => void;
  onSettingsClick?: () => void;
  onLiveClick?: () => void;
}

export default function Navbar({ onHomeClick, currentView, user, onSignIn, onLogout, onSettingsClick, onLiveClick }: NavbarProps) {
  
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSettings = () => {
      if (onSettingsClick) onSettingsClick();
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={onHomeClick}>
              <div className="bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl p-2 text-white shadow-lg shadow-blue-200 transition-transform group-hover:scale-105">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/></svg>
              </div>
              <span className="font-bold text-xl md:text-2xl tracking-tight text-slate-900 group-hover:text-blue-900 transition-colors">
                Care<span className="text-blue-600">Transia</span>
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
                {currentView === 'landing' ? (
                  <>
                    <button onClick={() => scrollToSection('how-it-works')} className="cursor-pointer hover:text-slate-900 transition-colors">How it works</button>
                    <button onClick={() => scrollToSection('safety')} className="cursor-pointer hover:text-slate-900 transition-colors">Safety</button>
                  </>
                ) : (
                  <button onClick={onHomeClick} className="cursor-pointer hover:text-slate-900 transition-colors">
                    {user ? 'Dashboard' : 'Home'}
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {/* Live Help Button */}
                <button 
                  onClick={onLiveClick}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold hover:bg-red-100 transition-colors border border-red-100 animate-pulse"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Talk to CareTransia Live
                </button>

                {user ? (
                  <div className="flex items-center gap-4">
                     {/* Settings Button - Only visible if logged in */}
                    <button 
                       onClick={handleSettings}
                       className="p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-100"
                       title="Settings & Administration"
                    >
                       <Icons.Settings className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                      <div className="flex flex-col items-end hidden sm:flex">
                        <span className="text-sm font-bold text-slate-900 leading-tight">{user.name}</span>
                        <button onClick={onLogout} className="text-xs text-slate-500 hover:text-red-500">Sign Out</button>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-700 font-bold">
                        {user.avatarUrl ? <img src={user.avatarUrl} alt="User" className="w-full h-full rounded-full" /> : user.name[0]}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={onSignIn} className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors">
                      Sign In
                    </button>
                    <button onClick={onSignIn} className="hidden sm:block text-xs font-semibold px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
    </nav>
  );
}
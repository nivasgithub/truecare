import React, { useState, useRef, useEffect } from 'react';
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
  onNavigate?: (path: string) => void;
  hasActivePlan?: boolean;
}

export default function Navbar({ onHomeClick, currentView, user, onSignIn, onLogout, onSettingsClick, onLiveClick, onNavigate, hasActivePlan }: NavbarProps) {
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSettings = () => {
      if (onSettingsClick) onSettingsClick();
      setIsDropdownOpen(false);
  };

  const handleLogout = () => {
      if (onLogout) onLogout();
      setIsDropdownOpen(false);
  };

  const handleNav = (path: string) => {
      if (path === 'results' && !hasActivePlan) {
          alert("Please generate a care plan first.");
          return;
      }
      if (onNavigate) onNavigate(path);
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <button 
                className="group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-xl px-2 -ml-2" 
                onClick={onHomeClick}
                aria-label="CareTransia Home"
            >
              <div className="ct-logo group-hover:opacity-90 transition-opacity">
                {/* MODERN LOGO MARK */}
                <div className="ct-logoMark">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </div>
                {/* TEXT */}
                <span className="ct-logoText hidden md:inline">
                  Care<span>Transia</span>
                </span>
                {/* Mobile Fallback */}
                <span className="ct-logoText md:hidden">Care<span>T.</span></span>
              </div>
            </button>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex gap-2 text-sm font-medium text-slate-600">
                {user ? (
                  <>
                    <button 
                        onClick={onHomeClick} 
                        className={`cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-4 py-2 ${currentView === 'dashboard' ? 'text-blue-700 bg-blue-50 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Home
                    </button>
                    <button 
                        onClick={() => handleNav('results')}
                        disabled={!hasActivePlan}
                        className={`cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-4 py-2 ${currentView === 'results' ? 'text-blue-700 bg-blue-50 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'} ${!hasActivePlan ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      My Plan
                    </button>
                    {/* Changed label from Scan to Add */}
                    <button 
                        onClick={() => handleNav('intake')}
                        className={`cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-4 py-2 ${currentView === 'intake' ? 'text-blue-700 bg-blue-50 font-bold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Add
                    </button>
                  </>
                ) : (
                  currentView === 'landing' ? (
                    <>
                      <button onClick={() => scrollToSection('how-it-works')} className="cursor-pointer hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-3 py-2">How it works</button>
                      <button onClick={() => scrollToSection('safety')} className="cursor-pointer hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-3 py-2">Safety</button>
                    </>
                  ) : null
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {/* Live Help Button - Available to everyone including anonymous users */}
                <button 
                  onClick={onLiveClick}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Icons.Mic className="w-3 h-3 text-blue-500" />
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Live Assistant</span>
                </button>

                {user ? (
                  <div className="flex items-center gap-4">
                    <div className="relative" ref={dropdownRef}>
                      <button 
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="flex items-center gap-3 pl-4 md:border-l border-slate-200 focus:outline-none group focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg py-1 pr-1"
                          aria-label="User menu"
                          aria-expanded={isDropdownOpen}
                      >
                          <div className="flex flex-col items-end hidden sm:flex">
                              <span className="text-sm font-bold text-slate-900 leading-tight">{user.name}</span>
                              <span className="text-[10px] font-medium text-slate-500 group-hover:text-blue-600 uppercase tracking-wide">My Account</span>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-200 flex items-center justify-center text-white font-bold text-lg overflow-hidden border-2 border-white">
                              {user.avatarUrl ? <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" /> : user.name[0]}
                          </div>
                          <Icons.ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </button>

                      {isDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in-up origin-top-right ring-1 ring-black/5">
                              <div className="px-4 py-3 border-b border-slate-50 mb-1 sm:hidden bg-slate-50/50">
                                <p className="font-bold text-slate-900">{user.name}</p>
                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                              </div>
                              <button onClick={handleSettings} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors focus:outline-none focus:bg-slate-50">
                                  <Icons.Settings className="w-4 h-4 text-slate-400" /> Settings
                              </button>
                               <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors border-t border-slate-50 mt-1 focus:outline-none focus:bg-red-50">
                                  <Icons.LogOut className="w-4 h-4" /> Sign Out
                              </button>
                          </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={onSignIn} className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-4 py-2">
                      Sign In
                    </button>
                    {/* Get Started removed as duplicates functionality */}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
    </nav>
  );
}
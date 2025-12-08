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
                className="flex items-center gap-3 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-xl px-2 -ml-2" 
                onClick={onHomeClick}
                aria-label="CareTransia Home"
            >
              <div className="bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl p-2 text-white shadow-lg shadow-blue-200 transition-transform group-hover:scale-105">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/></svg>
              </div>
              <span className="font-bold text-xl md:text-2xl tracking-tight text-slate-900 group-hover:text-blue-900 transition-colors">
                Care<span className="text-blue-600">Transia</span>
              </span>
            </button>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex gap-4 text-sm font-medium text-slate-600">
                {currentView === 'landing' ? (
                  <>
                    <button onClick={() => scrollToSection('how-it-works')} className="cursor-pointer hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2">How it works</button>
                    <button onClick={() => scrollToSection('safety')} className="cursor-pointer hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2">Safety</button>
                  </>
                ) : (
                  <>
                    <button 
                        onClick={onHomeClick} 
                        className={`cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2 ${currentView === 'dashboard' ? 'text-blue-600 bg-blue-50' : 'hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Home
                    </button>
                    <button 
                        onClick={() => handleNav('results')}
                        disabled={!hasActivePlan}
                        className={`cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2 ${currentView === 'results' ? 'text-blue-600 bg-blue-50' : 'hover:text-slate-900 hover:bg-slate-50'} ${!hasActivePlan ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      My Plan
                    </button>
                    {/* Changed label from Scan to Add */}
                    <button 
                        onClick={() => handleNav('intake')}
                        className={`cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2 ${currentView === 'intake' ? 'text-blue-600 bg-blue-50' : 'hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Add
                    </button>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {/* Live Help Button */}
                <button 
                  onClick={onLiveClick}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold hover:bg-red-100 transition-colors border border-red-100 animate-pulse focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Talk to CareTransia Live
                </button>

                {user ? (
                  <div className="flex items-center gap-4">
                    <div className="relative" ref={dropdownRef}>
                      <button 
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="flex items-center gap-3 pl-4 border-l border-slate-200 focus:outline-none group focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg py-1 pr-1"
                          aria-label="User menu"
                          aria-expanded={isDropdownOpen}
                      >
                          <div className="flex flex-col items-end hidden sm:flex">
                              <span className="text-sm font-bold text-slate-900 leading-tight">{user.name}</span>
                              <span className="text-xs text-slate-500 group-hover:text-blue-600">My Account</span>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-700 font-bold overflow-hidden">
                              {user.avatarUrl ? <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" /> : user.name[0]}
                          </div>
                          <Icons.ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </button>

                      {isDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in-up origin-top-right">
                              <div className="px-4 py-2 border-b border-slate-50 mb-1 sm:hidden">
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
                    <button onClick={onSignIn} className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1">
                      Sign In
                    </button>
                    <button onClick={onSignIn} className="hidden sm:block text-xs font-semibold px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">
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
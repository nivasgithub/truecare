import React, { useState } from 'react';
import { Icons } from './ui';
import { UserProfile } from '../types';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLiveClick: () => void;
  hasActivePlan: boolean;
  isLiveActive?: boolean;
  user: UserProfile | null;
}

export default function BottomNav({ currentView, onNavigate, onLiveClick, hasActivePlan, isLiveActive, user }: BottomNavProps) {
  
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Icons.Home },
    // Tooltip added for disabled state
    { id: 'results', label: 'My Plan', icon: Icons.Clipboard, disabled: !hasActivePlan && !!user, tooltip: "Complete your first plan to access" },
    // Label changed from Scan to Add
    { id: 'intake', label: 'Add', icon: Icons.Camera },
    { id: 'live', label: 'Agent', icon: Icons.Mic },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
      // Light Haptic Feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(5); 
      }

      if (item.id === 'live') {
          onLiveClick();
          return;
      }
      
      // Auth Guard for Add/My Plan
      if ((item.id === 'intake' || item.id === 'results') && !user) {
          onNavigate('signin');
          return;
      }
      
      if (item.disabled) {
          alert(item.tooltip || "Please generate a care plan first.");
          return;
      }
      
      onNavigate(item.id);
  };

  return (
    <div 
      className="fixed bottom-0 left-0 w-full z-40 pb-safe md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
    >
        <div className="flex items-center justify-around w-full max-w-md mx-auto px-2 py-2">
            {navItems.map((item) => {
              const isActive = item.id === 'live' ? isLiveActive : currentView === item.id;
              
              return (
                 <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    disabled={item.disabled}
                    className={`
                        relative flex flex-col items-center justify-center py-2 px-4 rounded-2xl transition-all duration-200 ease-out min-w-[70px]
                        ${isActive 
                            ? 'text-blue-600 bg-blue-50' 
                            : 'text-slate-400 hover:text-slate-600 active:bg-slate-50'
                        }
                        ${item.disabled ? 'opacity-40' : ''}
                    `}
                    title={item.tooltip || item.label}
                 >
                    {/* Icon */}
                    <item.icon className={`w-6 h-6 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5px]' : ''}`} />
                    
                    {/* Label */}
                    <span className={`text-[10px] font-bold mt-1 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                        {item.label}
                    </span>

                    {/* Active Dot Indicator (Subtle) */}
                    {isActive && (
                        <span className="absolute top-1 right-3 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm animate-fade-in"></span>
                    )}
                 </button>
              );
            })}
        </div>
    </div>
  );
}
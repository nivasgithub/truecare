import React, { useState } from 'react';
import { Icons } from './ui';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLiveClick: () => void;
  hasActivePlan: boolean;
  isLiveActive?: boolean;
}

export default function BottomNav({ currentView, onNavigate, onLiveClick, hasActivePlan, isLiveActive }: BottomNavProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Icons.Home },
    { id: 'results', label: 'My Plan', icon: Icons.Clipboard, disabled: !hasActivePlan },
    { id: 'intake', label: 'Scan', icon: Icons.Camera },
    { id: 'live', label: 'Live Agent', icon: Icons.Mic },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
      // Haptic Feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(10); 
      }

      if (item.id === 'live') {
          onLiveClick();
          return;
      }
      
      if (item.disabled) {
          // Explicit explanation instead of silent failure
          alert("Please generate a care plan first to view this section.");
          return;
      }
      
      onNavigate(item.id);
  };

  return (
    <div 
      className="fixed bottom-0 left-0 w-full z-40 flex flex-col items-center justify-end pb-4 pointer-events-none md:hidden"
    >
      <div 
         className="pointer-events-auto flex flex-col items-center relative w-[92%]"
         onMouseEnter={() => setIsHovered(true)}
         onMouseLeave={() => setIsHovered(false)}
      >
        
        {/* Navigation Dock */}
        <div 
          className={`
             bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl 
             flex items-end justify-between px-4 py-2 gap-1
             transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ease-out origin-bottom
             w-full rounded-2xl h-20 opacity-100 scale-100 translate-y-0 relative
          `}
        >
            {navItems.map((item) => {
              const isActive = item.id === 'live' ? isLiveActive : currentView === item.id;
              
              return (
                 <div key={item.id} className="w-16 flex justify-center pb-2">
                     <button
                        onClick={() => handleNavClick(item)}
                        className={`
                            transition-all duration-300 ease-out flex flex-col items-center justify-center
                            ${isActive 
                                ? 'relative -top-5 w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-500/30 scale-110 border-4 border-white' 
                                : 'w-full h-full text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl py-2'
                            }
                            ${item.disabled ? 'opacity-40' : ''}
                        `}
                        title={item.disabled ? "Generate a plan first to view this" : item.label}
                     >
                        <item.icon className={`${isActive ? 'w-6 h-6' : 'w-5 h-5 mb-1'}`} />
                        {!isActive && <span className="text-[10px] font-bold tracking-wide">{item.label}</span>}
                     </button>
                 </div>
              );
            })}
        </div>

      </div>
    </div>
  );
}
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

  return (
    <div 
      className="fixed bottom-0 left-0 w-full z-40 flex flex-col items-center justify-end pb-4 md:pb-6 pointer-events-none"
    >
      <div 
         className="pointer-events-auto flex flex-col items-center relative w-full md:w-auto"
         onMouseEnter={() => setIsHovered(true)}
         onMouseLeave={() => setIsHovered(false)}
      >
        
        {/* Navigation Dock */}
        <div 
          className={`
             bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl 
             flex items-end justify-between px-4 py-2 gap-1
             transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ease-out origin-bottom
             
             /* Mobile: Always visible, fixed bar style */
             w-[92%] rounded-2xl h-20 opacity-100 scale-100 translate-y-0 relative

             /* Desktop: Auto-hide dock style */
             md:rounded-full md:h-24 md:px-6 md:gap-4 md:w-auto md:min-w-[360px]
             ${isHovered 
                ? 'md:opacity-100 md:scale-100 md:translate-y-0' 
                : 'md:opacity-0 md:scale-50 md:translate-y-12 md:absolute md:bottom-0'
             }
          `}
        >
            {navItems.map((item) => {
              const isActive = item.id === 'live' ? isLiveActive : currentView === item.id;
              
              return (
                 <div key={item.id} className="w-16 md:w-20 flex justify-center pb-2">
                     <button
                        onClick={() => item.id === 'live' ? onLiveClick() : (!item.disabled && onNavigate(item.id))}
                        disabled={item.disabled}
                        className={`
                            transition-all duration-300 ease-out flex flex-col items-center justify-center
                            ${isActive 
                                ? 'relative -top-5 md:-top-6 w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-500/30 scale-110 border-4 border-white' 
                                : 'w-full h-full text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl py-2'
                            }
                            ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                        `}
                     >
                        <item.icon className={`${isActive ? 'w-6 h-6 md:w-8 md:h-8' : 'w-5 h-5 md:w-6 md:h-6 mb-1'}`} />
                        {!isActive && <span className="text-[9px] md:text-[10px] font-bold tracking-wide">{item.label}</span>}
                     </button>
                 </div>
              );
            })}
        </div>

        {/* Minimized Trigger Icon (Little Icon) - Desktop Only */}
        <div 
            className={`
               hidden md:flex
               bg-white/80 backdrop-blur-md border border-slate-200 shadow-lg rounded-full w-14 h-14
               items-center justify-center cursor-pointer absolute bottom-0
               transition-all duration-300 ease-out
               hover:scale-110 hover:bg-white
               ${isHovered ? 'md:opacity-0 md:scale-0 md:pointer-events-none' : 'md:opacity-100 md:scale-100 md:delay-100'}
            `}
        >
            <Icons.Grip className="w-6 h-6 text-slate-600" />
        </div>

      </div>
    </div>
  );
}
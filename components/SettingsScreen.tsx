import React from 'react';
import { Card, Icons, SectionTitle } from './ui';
import { UserProfile } from '../types';

interface SettingsScreenProps {
  user: UserProfile;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export default function SettingsScreen({ user, onNavigate, onLogout }: SettingsScreenProps) {
  
  const settingSections = [
    {
      title: "General",
      items: [
        {
          id: 'profile',
          icon: <Icons.User className="w-5 h-5 text-blue-600" />,
          label: "Profile Settings",
          desc: "Manage your personal information and login details.",
          actionLabel: "Edit Profile",
          onClick: () => alert("Profile editing would open here.")
        },
        {
          id: 'notifications',
          icon: <Icons.Alert className="w-5 h-5 text-amber-600" />,
          label: "Notifications",
          desc: "Configure email and SMS alerts for medication reminders.",
          actionLabel: "Manage",
          onClick: () => alert("Notification settings would open here.")
        }
      ]
    },
    {
      title: "System & Diagnostics",
      items: [
        {
          id: 'models',
          icon: <Icons.Sparkle className="w-5 h-5 text-purple-600" />,
          label: "Model Diagnostics",
          desc: "Run verification tests on Gemini Flash, Pro, Veo, and Live APIs.",
          actionLabel: "Test Models",
          onClick: () => onNavigate('test')
        },
        {
          id: 'cache',
          icon: <Icons.Refresh className="w-5 h-5 text-emerald-600" />,
          label: "Data Management",
          desc: "Clear local cache and manage offline storage usage.",
          actionLabel: "Clear Cache",
          onClick: () => {
             if (confirm("Clear all local application data?")) {
                 localStorage.clear();
                 sessionStorage.clear();
                 window.location.reload();
             }
          }
        }
      ]
    },
    {
      title: "Security",
      items: [
        {
          id: 'security',
          icon: <Icons.Shield className="w-5 h-5 text-slate-600" />,
          label: "Security & Privacy",
          desc: "Manage password, 2FA, and data retention policies.",
          actionLabel: "Review",
          onClick: () => alert("Security settings would open here.")
        }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
       
       <div className="flex items-center gap-4 mb-8 border-b border-slate-200 pb-6">
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600">
             {user.name[0]}
          </div>
          <div>
             <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
             <p className="text-slate-500">{user.email} • <span className="text-green-600 font-medium">Enterprise Plan</span></p>
          </div>
       </div>

       <div className="space-y-10">
          {settingSections.map((section, idx) => (
             <div key={idx}>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">{section.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {section.items.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={item.onClick}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col"
                      >
                         <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                               {item.icon}
                            </div>
                            <Icons.ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                         </div>
                         <h4 className="font-bold text-slate-900 mb-1">{item.label}</h4>
                         <p className="text-sm text-slate-500 mb-4 flex-1">{item.desc}</p>
                         <span className="text-xs font-bold text-blue-600 uppercase tracking-wide group-hover:underline">
                            {item.actionLabel}
                         </span>
                      </div>
                   ))}
                </div>
             </div>
          ))}

          <div className="pt-8 border-t border-slate-200">
             <button onClick={onLogout} className="text-red-600 font-bold text-sm hover:text-red-700 flex items-center gap-2">
                Log Out of TrueCare
             </button>
             <p className="text-xs text-slate-400 mt-2">Version 2.5.0 (Build 2024.10.25)</p>
          </div>
       </div>
    </div>
  );
}
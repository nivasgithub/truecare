
import React from 'react';
import { Card, Icons, SectionTitle } from './ui';
import { UserProfile, AppSettings } from '../types';

interface SettingsScreenProps {
  user: UserProfile;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

export default function SettingsScreen({ user, onNavigate, onLogout, settings, onUpdateSettings }: SettingsScreenProps) {
  
  const settingSections = [
    {
      title: "Display & Accessibility",
      items: [
        {
          id: 'fontsize',
          icon: <Icons.Type className="w-5 h-5 text-blue-600" />,
          label: "Font Size",
          desc: "Adjust the text size for better readability.",
          actionLabel: settings.fontSize === 'normal' ? "Normal" : "Large",
          onClick: () => onUpdateSettings({ fontSize: settings.fontSize === 'normal' ? 'large' : 'normal' })
        },
        {
          id: 'simplemode',
          icon: <Icons.Eye className="w-5 h-5 text-purple-600" />,
          label: "Simple View Mode",
          desc: "Hide complex charts and extra details for a cleaner look.",
          actionLabel: settings.simpleMode ? "On" : "Off",
          onClick: () => onUpdateSettings({ simpleMode: !settings.simpleMode })
        },
        {
          id: 'calmmode',
          icon: <Icons.Sparkle className="w-5 h-5 text-teal-600" />,
          label: "Calm Mode",
          desc: "Reduces animations and pulsing effects for a more relaxed experience.",
          actionLabel: settings.calmMode ? "On" : "Off",
          onClick: () => onUpdateSettings({ calmMode: !settings.calmMode })
        }
      ]
    },
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
          icon: <Icons.Bell className="w-5 h-5 text-amber-600" />,
          label: "Notifications",
          desc: "Configure medication reminders.",
          actionLabel: "Go to Dashboard",
          onClick: () => {
              alert("Please configure your reminders using the 'Reminders' button on the Dashboard.");
              onNavigate('dashboard');
          }
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
          desc: "Run verification tests on Gemini Flash, Vision, and Veo models.",
          actionLabel: "Run Tests",
          onClick: () => onNavigate('test')
        }
      ]
    }
  ];

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-fade-in">
      <SectionTitle title="Settings" subtitle="Customize your CareTransia experience" />
      
      {/* Profile Card */}
      <Card className="p-6 mb-8 flex items-center justify-between">
         <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden">
                 {user.avatarUrl ? <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-2xl">{user.name[0]}</div>}
             </div>
             <div>
                 <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
                 <p className="text-slate-500">{user.email}</p>
             </div>
         </div>
         <button onClick={onLogout} className="text-red-600 font-bold text-sm hover:underline">
             Sign Out
         </button>
      </Card>

      <div className="space-y-8">
        {settingSections.map((section, idx) => (
            <div key={idx}>
                <h3 className="font-bold text-slate-900 mb-4 px-2">{section.title}</h3>
                <div className="space-y-3">
                    {section.items.map((item) => (
                        <Card key={item.id} className="p-4 flex items-center gap-4 hover:border-blue-200 transition-colors cursor-pointer" onClick={item.onClick}>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                {item.icon}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800">{item.label}</h4>
                                <p className="text-sm text-slate-500">{item.desc}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${item.actionLabel === "On" ? "text-emerald-600" : "text-blue-600"}`}>{item.actionLabel}</span>
                                <Icons.ArrowRight className="w-4 h-4 text-slate-300" />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        ))}
      </div>
      
      <div className="mt-12 text-center">
          <button onClick={() => onNavigate('faq')} className="text-slate-500 font-bold hover:text-blue-600 transition-colors">
              Help & FAQ
          </button>
      </div>

    </div>
  );
}

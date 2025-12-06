import React from 'react';
import { Card, Icons, Badge, Button, SectionTitle } from './ui';
import { UserProfile, HistoricalRecord } from '../types';

interface DashboardScreenProps {
  user: UserProfile;
  onViewRecord: (recordId: string) => void;
  onNewPlan: () => void;
}

const MOCK_RECORDS: HistoricalRecord[] = [
  {
    id: 'rec_1',
    hospitalName: 'Mercy General Hospital',
    dischargeDate: 'Oct 12, 2024',
    primaryCondition: 'Total Hip Replacement',
    doctorName: 'Dr. Sarah Chen',
    status: 'active',
    medicationCount: 4,
    appointmentCount: 2
  },
  {
    id: 'rec_2',
    hospitalName: 'St. Mary\'s Clinic',
    dischargeDate: 'Aug 05, 2024',
    primaryCondition: 'Pneumonia Recovery',
    doctorName: 'Dr. James Wilson',
    status: 'archived',
    medicationCount: 2,
    appointmentCount: 0
  },
  {
    id: 'rec_3',
    hospitalName: 'City Urgent Care',
    dischargeDate: 'Feb 14, 2024',
    primaryCondition: 'Minor Fracture',
    doctorName: 'Dr. Emily Brooks',
    status: 'archived',
    medicationCount: 1,
    appointmentCount: 1
  }
];

export default function DashboardScreen({ user, onViewRecord, onNewPlan }: DashboardScreenProps) {
  return (
    <div className="animate-fade-in pb-20 max-w-6xl mx-auto">
      
      {/* 1. Welcoming Header - Soothing & Clear */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 p-8 md:p-12 mb-10">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3 text-blue-600 font-bold bg-blue-50 w-fit px-3 py-1 rounded-full text-sm tracking-wide">
                <Icons.Sparkle className="w-4 h-4" />
                <span>Good Morning</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                Hello, {user.name.split(' ')[0]}
              </h1>
              <p className="text-slate-600 text-xl max-w-2xl leading-relaxed font-medium">
                You have <span className="text-slate-900 font-bold border-b-2 border-blue-200">1 active plan</span> and <span className="text-slate-900 font-bold border-b-2 border-amber-200">2 appointments</span> coming up.
              </p>
            </div>
            
            <Button 
              onClick={onNewPlan} 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200/50 text-lg px-8 py-4 h-auto rounded-2xl flex items-center gap-3 transition-transform hover:-translate-y-1"
              aria-label="Create a new care plan"
            >
              <span className="text-3xl font-light leading-none pb-1">+</span> 
              <span>New Care Plan</span>
            </Button>
         </div>
         
         {/* Decorative Soft Background Blobs */}
         <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-gradient-to-bl from-blue-50 to-purple-50 rounded-full blur-3xl opacity-60 -z-0 pointer-events-none"></div>
      </section>

      {/* 2. Key Statistics - Modern Colored Tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12" aria-label="Health Statistics">
        <StatCard 
          icon={<Icons.Clipboard />} 
          label="Total Plans" 
          value="3" 
          color="blue" 
          desc="Stored Records"
        />
        <StatCard 
          icon={<Icons.Pill />} 
          label="Active Meds" 
          value="6" 
          color="emerald" 
          desc="Daily Medications"
        />
        <StatCard 
          icon={<Icons.Calendar />} 
          label="Next Visit" 
          value="In 3 days" 
          color="amber" 
          desc="Dr. Sarah Chen"
        />
        <StatCard 
          icon={<Icons.Shield />} 
          label="Safety Score" 
          value="100%" 
          color="indigo" 
          desc="No Conflicts Found"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* 3. Timeline - Clear List */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-2">
             <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
               <Icons.Clipboard className="w-6 h-6 text-slate-400" />
               Your Health Timeline
             </h2>
             <button className="text-base text-blue-600 font-bold hover:text-blue-800 hover:underline px-2 py-1 rounded">
               View All
             </button>
           </div>
           
           <div className="space-y-5" role="list">
              {MOCK_RECORDS.map((record) => (
                <RecordCard key={record.id} record={record} onClick={() => onViewRecord(record.id)} />
              ))}
           </div>
        </div>

        {/* 4. Sidebar - Focus & Tips */}
        <div className="space-y-8">
           
           {/* Daily Routine Checklist */}
           <div className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-emerald-100/50 overflow-hidden">
              <div className="bg-emerald-50/50 p-6 border-b border-emerald-100">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Icons.Check className="w-5 h-5" />
                  </div>
                  Daily Routine
                </h2>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  <ChecklistItem label="Morning Medications" completed={true} />
                  <ChecklistItem label="Physical Therapy Exercises (20m)" completed={false} />
                  <ChecklistItem label="Evening Medications" completed={false} />
                </ul>
              </div>
           </div>

           {/* Tip Card */}
           <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden">
             <div className="relative z-10">
               <div className="flex items-center gap-3 mb-3 text-indigo-700">
                 <div className="bg-white p-2 rounded-full shadow-sm">
                   <Icons.Question className="w-5 h-5" />
                 </div>
                 <span className="font-bold text-lg">Did you know?</span>
               </div>
               <p className="text-base text-slate-700 leading-relaxed mb-5 font-medium">
                 Bringing a written list of questions to your follow-up appointment improves outcomes by 30%.
               </p>
               <button className="text-sm font-bold text-indigo-600 uppercase tracking-wide hover:text-indigo-800 hover:underline flex items-center gap-1">
                 View Question List <Icons.ArrowRight className="w-4 h-4" />
               </button>
             </div>
             {/* Decor */}
             <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-100 rounded-full blur-2xl opacity-50"></div>
           </div>

        </div>

      </div>

    </div>
  );
}

// --- Sub Components for Readability ---

function StatCard({ icon, label, value, color, desc }: { icon: React.ReactNode, label: string, value: string, color: 'blue' | 'emerald' | 'amber' | 'indigo', desc: string }) {
    // Modern Gradient Backgrounds (Tiles)
    const gradients = {
        blue: "bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100 text-blue-900",
        emerald: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100 text-emerald-900",
        amber: "bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-100 text-amber-900",
        indigo: "bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-100 text-indigo-900"
    };

    const iconBg = {
        blue: "bg-white text-blue-600 shadow-sm",
        emerald: "bg-white text-emerald-600 shadow-sm",
        amber: "bg-white text-amber-600 shadow-sm",
        indigo: "bg-white text-indigo-600 shadow-sm"
    };

    return (
        <div className={`${gradients[color]} p-6 rounded-[2rem] border shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col items-start gap-4 group h-full relative overflow-hidden`}>
            {/* Subtle gloss effect */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 pointer-events-none"></div>

            <div className={`p-4 rounded-2xl ${iconBg[color]} mb-1 transition-transform group-hover:scale-110 relative z-10`}>
              {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" }) : icon}
            </div>
            <div className="relative z-10">
                <div className="text-4xl font-black tracking-tight mb-1">{value}</div>
                <div className="text-sm font-bold opacity-70 uppercase tracking-wider">{label}</div>
                <div className="text-xs font-medium opacity-50 mt-2">{desc}</div>
            </div>
        </div>
    );
}

function RecordCard({ record, onClick }: { record: HistoricalRecord, onClick: () => void }) {
  const isActive = record.status === 'active';
  
  return (
    <div 
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`group bg-white p-6 md:p-8 rounded-3xl border transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center gap-6 ${isActive ? 'border-blue-200 shadow-md shadow-blue-50 ring-1 ring-blue-100' : 'border-slate-100 shadow-sm hover:border-slate-300'}`}
    >
        <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
               {isActive ? (
                 <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wide border border-emerald-200 shadow-sm">Active Plan</span>
               ) : (
                 <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wide border border-slate-200">Archived</span>
               )}
               <span className="text-sm text-slate-500 font-semibold">{record.dischargeDate}</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
              {record.primaryCondition}
            </h3>
            <div className="flex items-center gap-2 text-slate-600 text-base">
               <span className="font-medium">{record.hospitalName}</span>
               <span className="text-slate-300">•</span>
               <span>{record.doctorName}</span>
            </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8">
            <div className="flex flex-col items-center min-w-[60px]">
                <div className="text-2xl font-bold text-slate-900">{record.medicationCount}</div>
                <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Meds</div>
            </div>
            <div className="flex flex-col items-center min-w-[60px]">
                <div className="text-2xl font-bold text-slate-900">{record.appointmentCount}</div>
                <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Appts</div>
            </div>
            <div className="ml-auto md:ml-2 bg-slate-50 p-3 rounded-full text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1 shadow-sm">
               <Icons.ArrowRight className="w-6 h-6" />
            </div>
        </div>
    </div>
  );
}

function ChecklistItem({ label, completed }: { label: string, completed: boolean }) {
  return (
    <li className="flex items-center gap-4 group cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-colors">
      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
        {completed && <Icons.Check className="w-5 h-5" />}
      </div>
      <span className={`text-lg font-medium transition-colors ${completed ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-slate-900'}`}>
        {label}
      </span>
    </li>
  );
}
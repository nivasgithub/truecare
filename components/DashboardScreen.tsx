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
    <div className="animate-fade-in pb-20">
      
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-12 mb-10 shadow-xl shadow-slate-300">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 opacity-80">
                <Icons.User className="w-5 h-5" />
                <span className="text-sm font-medium tracking-wide uppercase">Patient Dashboard</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">Hello, {user.name.split(' ')[0]}</h1>
              <p className="text-slate-300 text-lg max-w-xl">You have <span className="text-white font-bold">1 active care plan</span> and 2 upcoming appointments this week.</p>
            </div>
            <Button onClick={onNewPlan} className="bg-white text-slate-900 hover:bg-slate-100 border-none shadow-none">
              <span className="text-xl leading-none mr-1">+</span> New Care Plan
            </Button>
         </div>
         
         {/* Decorative Background Elements */}
         <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-30"></div>
         <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-cyan-500 rounded-full blur-3xl opacity-20"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
        <StatCard icon={<Icons.Clipboard />} label="Total Plans" value="3" color="blue" />
        <StatCard icon={<Icons.Pill />} label="Active Meds" value="6" color="emerald" />
        <StatCard icon={<Icons.Calendar />} label="Next Visit" value="In 3 days" color="amber" />
        <StatCard icon={<Icons.Shield />} label="Safety Score" value="100%" color="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Timeline */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between mb-2">
             <h2 className="text-xl font-bold text-slate-900">Your Health Timeline</h2>
             <button className="text-sm text-blue-600 font-medium hover:text-blue-800">View All</button>
           </div>
           
           <div className="space-y-4">
              {MOCK_RECORDS.map((record) => (
                <RecordCard key={record.id} record={record} onClick={() => onViewRecord(record.id)} />
              ))}
           </div>
        </div>

        {/* Right Column: Quick Actions & Tips */}
        <div className="space-y-6">
           <div className="flex items-center justify-between mb-2">
             <h2 className="text-xl font-bold text-slate-900">Today's Focus</h2>
           </div>
           
           <Card className="p-6 border-l-4 border-l-emerald-500">
              <h3 className="font-bold text-slate-900 mb-2">Daily Routine</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-4 h-4 rounded-full border border-emerald-500 bg-emerald-100 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  </div>
                  <span className="text-sm text-slate-600 line-through">Morning Medications</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-4 h-4 rounded-full border border-slate-300 bg-white"></div>
                  <span className="text-sm text-slate-700">Physical Therapy Exercises (20m)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-4 h-4 rounded-full border border-slate-300 bg-white"></div>
                  <span className="text-sm text-slate-700">Evening Medications</span>
                </li>
              </ul>
           </Card>

           <Card className="bg-gradient-to-br from-indigo-50 to-white p-6 border-indigo-100">
             <div className="flex items-center gap-3 mb-3 text-indigo-700">
               <Icons.Question className="w-5 h-5" />
               <span className="font-bold">Did you know?</span>
             </div>
             <p className="text-sm text-slate-600 leading-relaxed mb-4">
               Bringing a written list of questions to your follow-up appointment improves outcomes by 30%.
             </p>
             <button className="text-xs font-bold text-indigo-600 uppercase tracking-wide hover:text-indigo-800">
               View Question List →
             </button>
           </Card>

        </div>

      </div>

    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: 'blue' | 'emerald' | 'amber' | 'slate' }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600",
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        slate: "bg-slate-100 text-slate-600"
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-start gap-4">
            <div className={`p-3 rounded-xl ${colors[color]} mb-1`}>{icon}</div>
            <div>
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</div>
            </div>
        </div>
    );
}

function RecordCard({ record, onClick }: { record: HistoricalRecord, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center gap-6"
    >
        <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
               {record.status === 'active' ? (
                 <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wide">Active</span>
               ) : (
                 <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wide">Archived</span>
               )}
               <span className="text-sm text-slate-400 font-medium">{record.dischargeDate}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{record.primaryCondition}</h3>
            <p className="text-sm text-slate-500">{record.hospitalName} • {record.doctorName}</p>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <div className="text-center">
                <div className="font-bold text-slate-900">{record.medicationCount}</div>
                <div className="text-[10px] uppercase text-slate-400 font-bold">Meds</div>
            </div>
            <div className="text-center">
                <div className="font-bold text-slate-900">{record.appointmentCount}</div>
                <div className="text-[10px] uppercase text-slate-400 font-bold">Appts</div>
            </div>
            <div className="ml-auto md:ml-0 bg-slate-50 p-2 rounded-full text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
               <Icons.ArrowRight className="w-5 h-5" />
            </div>
        </div>
    </div>
  );
}

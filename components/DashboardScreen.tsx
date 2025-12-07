import React, { useEffect, useState } from 'react';
import { Card, Icons, Button } from './ui';
import { UserProfile, HistoricalRecord } from '../types';
import { fetchUserRecords } from '../services/firebase';

interface DashboardScreenProps {
  user: UserProfile;
  onViewRecord: (recordId: string, fullData?: string) => void;
  onNewPlan: () => void;
}

export default function DashboardScreen({ user, onViewRecord, onNewPlan }: DashboardScreenProps) {
  
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (user.id) {
        setIsLoading(true);
        const data = await fetchUserRecords(user.id);
        setRecords(data);
        setIsLoading(false);
      }
    };
    loadData();
  }, [user.id]);
  
  // Find the most recent active record
  const activeRecord = records.find(r => r.status === 'active');
  const pastRecords = records.filter(r => r.id !== activeRecord?.id);

  return (
    <div className="animate-fade-in pb-24 max-w-5xl mx-auto">
      
      {/* 1. Header */}
      <div className="mb-8 md:flex md:items-end md:justify-between">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 mb-2">Good Morning, {user.name.split(' ')[0]}</h1>
           <p className="text-slate-500 font-medium">
             Here is your care snapshot for <span className="text-slate-900 font-bold">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric'})}</span>.
           </p>
        </div>
        <div className="mt-4 md:mt-0">
            <Button onClick={onNewPlan} className="shadow-lg shadow-blue-200">
                <Icons.Sparkle className="w-4 h-4" /> New Scan
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: The "Now" (Active Care) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 2. Hero Card: The Active Plan */}
            {isLoading ? (
                <div className="h-64 bg-white rounded-3xl animate-pulse flex items-center justify-center border border-slate-200">
                    <Icons.Spinner className="w-8 h-8 text-blue-400" />
                </div>
            ) : activeRecord ? (
                <div 
                    onClick={() => onViewRecord(activeRecord.id, activeRecord.fullData)}
                    className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200 cursor-pointer transition-transform hover:scale-[1.01]"
                >
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-white/20 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                Active Recovery
                            </div>
                            <Icons.ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-all" />
                        </div>

                        <h2 className="text-3xl font-bold mb-2">{activeRecord.primaryCondition}</h2>
                        <p className="text-blue-100 text-lg mb-8">Discharged from {activeRecord.hospitalName} • {activeRecord.dischargeDate}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <div className="text-blue-200 text-xs font-bold uppercase mb-1">Medications</div>
                                <div className="font-semibold text-lg flex items-center gap-2">
                                    <Icons.Pill className="w-4 h-4" />
                                    {activeRecord.medicationCount} Prescribed
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <div className="text-blue-200 text-xs font-bold uppercase mb-1">Appointments</div>
                                <div className="font-semibold text-lg flex items-center gap-2">
                                    <Icons.Calendar className="w-4 h-4" />
                                    {activeRecord.appointmentCount} Scheduled
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-100 rounded-3xl p-8 text-center border-2 border-dashed border-slate-300">
                    <Icons.Clipboard className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No Active Plans</h3>
                    <p className="text-slate-500 mb-6">Scan your discharge papers to generate a new care plan.</p>
                    <Button onClick={onNewPlan}>Start New Scan</Button>
                </div>
            )}

            {/* 3. Daily Checklist Placeholder - Static for Demo, could be dynamic */}
            {activeRecord && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                          <Icons.Check className="w-6 h-6" />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-slate-900">Today's Routine</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Suggested Schedule</p>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <TaskItem label="Morning Medication" time="8:00 AM" status="pending" />
                      <TaskItem label="Review Warning Signs" time="10:00 AM" status="completed" />
                      <TaskItem label="Evening Medication" time="8:00 PM" status="pending" />
                  </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Support & History */}
          <div className="lg:col-span-4 space-y-6">
             
             {/* 4. Quick Actions */}
             <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Icons.Settings className="w-5 h-5 text-slate-400" /> Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={onNewPlan} className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                        <Icons.Upload className="w-6 h-6" />
                        <span className="text-sm font-bold">Add Papers</span>
                    </button>
                    <button 
                        onClick={() => activeRecord && onViewRecord(activeRecord.id, activeRecord.fullData)}
                        disabled={!activeRecord}
                        className={`p-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors ${!activeRecord ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                         <Icons.Bell className="w-6 h-6" />
                         <span className="text-sm font-bold">Reminders</span>
                    </button>
                    <button 
                        onClick={() => activeRecord && onViewRecord(activeRecord.id, activeRecord.fullData)}
                        disabled={!activeRecord}
                        className={`col-span-2 p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl flex items-center justify-center gap-3 transition-colors ${!activeRecord ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Icons.Alert className="w-6 h-6" />
                        <span className="text-sm font-bold">View Warning Signs</span>
                    </button>
                </div>
             </div>

             {/* 5. Past Records (Collapsed view) */}
             <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-700">Past Records</h3>
                    <span className="text-xs font-bold bg-white px-2 py-1 rounded text-slate-500 border border-slate-200">{pastRecords.length}</span>
                </div>
                
                <div className="space-y-3">
                    {pastRecords.map(rec => (
                        <div 
                            key={rec.id} 
                            onClick={() => onViewRecord(rec.id, rec.fullData)}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 cursor-pointer transition-colors"
                        >
                            <div className="text-sm font-bold text-slate-900">{rec.primaryCondition}</div>
                            <div className="text-xs text-slate-500 mt-1">{rec.dischargeDate} • {rec.hospitalName}</div>
                        </div>
                    ))}
                    {!isLoading && pastRecords.length === 0 && <p className="text-slate-400 text-sm italic">No archived records found.</p>}
                    {isLoading && <p className="text-slate-400 text-sm animate-pulse">Loading history...</p>}
                </div>
             </div>

          </div>

      </div>
    </div>
  );
}

// --- Helper Components ---

function TaskItem({ label, time, status }: { label: string, time: string, status: 'completed' | 'pending' }) {
    const isCompleted = status === 'completed';
    return (
        <div className={`flex items-center p-3 rounded-2xl border transition-all ${isCompleted ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 hover:border-blue-300 cursor-pointer'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 transition-colors ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>
                {isCompleted ? <Icons.Check className="w-6 h-6" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>}
            </div>
            <div className="flex-1">
                <div className={`font-bold text-base ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{label}</div>
                <div className="text-xs font-bold text-slate-400">{time}</div>
            </div>
        </div>
    );
}
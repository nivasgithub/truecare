import React, { useEffect, useState, useMemo } from 'react';
import { Card, Icons, Button } from './ui';
import { UserProfile, HistoricalRecord, ParsedEpisode, FormattedCarePlan } from '../types';
import { fetchUserRecords } from '../services/firebase';
import AssistantChat from './AssistantChat';

interface DashboardScreenProps {
  user: UserProfile;
  onViewRecord: (recordId: string, fullData?: string) => void;
  onNewPlan: () => void;
}

export default function DashboardScreen({ user, onViewRecord, onNewPlan }: DashboardScreenProps) {
  
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State for Modals & Assistant
  const [showReminders, setShowReminders] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [showMeds, setShowMeds] = useState(false);
  const [showAppts, setShowAppts] = useState(false);
  
  // Assistant State
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantInitialQuery, setAssistantInitialQuery] = useState<string | undefined>(undefined);

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

  // Parse active record data for Assistant & Modals
  const parsedData = useMemo(() => {
    if (!activeRecord?.fullData) return null;
    try {
      const json = JSON.parse(activeRecord.fullData);
      return {
        parsedEpisode: json.parsed as ParsedEpisode,
        carePlan: json.plan as FormattedCarePlan
      };
    } catch (e) {
      console.error("Failed to parse active record data", e);
      return null;
    }
  }, [activeRecord]);

  const openAssistant = (query?: string) => {
    setAssistantInitialQuery(query);
    setShowAssistant(true);
  };

  return (
    <div className="animate-fade-in pb-24 max-w-5xl mx-auto relative">
      
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
                <Icons.Sparkle className="w-4 h-4" /> New Discharge Plan
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
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewRecord(activeRecord.id, activeRecord.fullData);
                                }}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <Icons.ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <h2 className="text-3xl font-bold mb-2">{activeRecord.primaryCondition}</h2>
                        <p className="text-blue-100 text-lg mb-8">Discharged from {activeRecord.hospitalName} • {activeRecord.dischargeDate}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div 
                                onClick={(e) => { e.stopPropagation(); setShowMeds(true); }}
                                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/20 transition-colors cursor-pointer group/item"
                            >
                                <div className="text-blue-200 text-xs font-bold uppercase mb-1 flex items-center justify-between">
                                    Medications
                                    <Icons.ArrowRight className="w-3 h-3 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                </div>
                                <div className="font-semibold text-lg flex items-center gap-2">
                                    <Icons.Pill className="w-4 h-4" />
                                    {activeRecord.medicationCount} Prescribed
                                </div>
                            </div>
                            <div 
                                onClick={(e) => { e.stopPropagation(); setShowAppts(true); }}
                                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/20 transition-colors cursor-pointer group/item"
                            >
                                <div className="text-blue-200 text-xs font-bold uppercase mb-1 flex items-center justify-between">
                                    Appointments
                                    <Icons.ArrowRight className="w-3 h-3 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                </div>
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
                    <Button onClick={onNewPlan}>New Discharge Plan</Button>
                </div>
            )}

            {/* 3. Daily Checklist Placeholder */}
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
                      {parsedData?.carePlan?.patient_friendly_plan?.daily_routine?.slice(0, 3).map((item, i) => (
                          <TaskItem key={i} label={item} status="pending" />
                      ))}
                      {(!parsedData?.carePlan?.patient_friendly_plan?.daily_routine || parsedData.carePlan.patient_friendly_plan.daily_routine.length === 0) && (
                          <p className="text-slate-400 italic">No specific daily routine found in the plan.</p>
                      )}
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
                        onClick={() => openAssistant("Find pharmacies nearby")}
                        className="p-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors"
                    >
                         <Icons.Home className="w-6 h-6" />
                         <span className="text-sm font-bold">Find Care</span>
                    </button>
                    <button 
                        onClick={() => setShowReminders(true)}
                        disabled={!activeRecord}
                        className={`p-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors ${!activeRecord ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                         <Icons.Bell className="w-6 h-6" />
                         <span className="text-sm font-bold">Reminders</span>
                    </button>
                    <button 
                        onClick={() => setShowWarnings(true)}
                        disabled={!activeRecord}
                        className={`p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors ${!activeRecord ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Icons.Alert className="w-6 h-6" />
                        <span className="text-sm font-bold">Warnings</span>
                    </button>
                </div>
             </div>

             {/* 5. Past Records */}
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

      {/* Floating Assistant Button (FAB) */}
      <button 
        onClick={() => openAssistant()}
        className="fixed bottom-24 right-6 z-40 bg-gradient-to-tr from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-xl shadow-blue-500/40 hover:scale-110 transition-transform active:scale-95"
        title="Chat with Assistant"
      >
        <Icons.Sparkle className="w-6 h-6" />
      </button>

      {/* --- MODALS --- */}
      
      {/* Assistant Modal */}
      {showAssistant && (
          <AssistantChat 
              isOpen={showAssistant} 
              onClose={() => {
                  setShowAssistant(false);
                  setAssistantInitialQuery(undefined);
              }}
              carePlan={parsedData?.carePlan || null}
              patientName={parsedData?.parsedEpisode?.patient?.name || user.name}
              initialMessage={assistantInitialQuery}
          />
      )}

      {/* Reminders Modal */}
      <SimpleModal 
          isOpen={showReminders} 
          onClose={() => setShowReminders(false)} 
          title="Upcoming Reminders" 
          icon={Icons.Bell}
          color="amber"
      >
          {parsedData?.parsedEpisode?.appointments && parsedData.parsedEpisode.appointments.length > 0 ? (
             <div className="space-y-4">
                 {parsedData.parsedEpisode.appointments.map((appt, i) => (
                    <div key={i} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-900">{appt.specialty_or_clinic || 'Appointment'}</h4>
                            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-lg">{appt.type}</span>
                        </div>
                        <p className="text-slate-600 text-sm mt-1">{appt.target_date_or_window}</p>
                        {appt.location && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">📍 {appt.location}</p>}
                    </div>
                 ))}
             </div>
          ) : (
             <div className="text-center py-8 text-slate-500">
                <Icons.Check className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                No specific appointments scheduled in this plan.
             </div>
          )}
      </SimpleModal>

      {/* Warnings Modal */}
      <SimpleModal 
          isOpen={showWarnings} 
          onClose={() => setShowWarnings(false)} 
          title="Warning Signs" 
          icon={Icons.Alert}
          color="red"
      >
           <div className="space-y-4">
             <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="font-bold text-red-800 text-sm">Call your doctor immediately if you experience:</p>
             </div>
             {parsedData?.parsedEpisode?.warnings && parsedData.parsedEpisode.warnings.length > 0 ? (
                 <ul className="space-y-3">
                     {parsedData.parsedEpisode.warnings.map((w, i) => (
                         <li key={i} className="flex gap-3 items-start p-3 hover:bg-slate-50 rounded-lg">
                             <Icons.Alert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                             <div>
                                <p className="font-bold text-slate-800">{w.description}</p>
                                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide font-bold">{w.urgency}</p>
                             </div>
                         </li>
                     ))}
                 </ul>
             ) : (
                <div className="text-center py-8 text-slate-500">
                    <Icons.Shield className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                    No critical warnings found. Always call 911 in an emergency.
                </div>
             )}
           </div>
      </SimpleModal>

      {/* Medications Detail Modal */}
      <SimpleModal 
          isOpen={showMeds} 
          onClose={() => setShowMeds(false)} 
          title="Prescribed Medications" 
          icon={Icons.Pill}
          color="blue"
      >
           {parsedData?.parsedEpisode?.medications && parsedData.parsedEpisode.medications.length > 0 ? (
             <div className="space-y-4">
                 {parsedData.parsedEpisode.medications.map((med, i) => (
                    <div key={i} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-900 text-lg">{med.name}</h4>
                            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg uppercase">{med.route}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
                            <div><span className="font-bold text-slate-400 text-xs uppercase block">Dose</span> {med.dose}</div>
                            <div><span className="font-bold text-slate-400 text-xs uppercase block">Frequency</span> {med.frequency}</div>
                        </div>
                        {med.timing_notes && (
                            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                                "{med.timing_notes}"
                            </p>
                        )}
                    </div>
                 ))}
             </div>
           ) : (
             <div className="text-center py-8 text-slate-500">
                <Icons.Pill className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                No medications listed in this plan.
             </div>
           )}
      </SimpleModal>

      {/* Appointments Detail Modal (Reusing structure but separate state for clarity) */}
      <SimpleModal 
          isOpen={showAppts} 
          onClose={() => setShowAppts(false)} 
          title="Scheduled Appointments" 
          icon={Icons.Calendar}
          color="blue"
      >
          {parsedData?.parsedEpisode?.appointments && parsedData.parsedEpisode.appointments.length > 0 ? (
             <div className="space-y-4">
                 {parsedData.parsedEpisode.appointments.map((appt, i) => (
                    <div key={i} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-900">{appt.specialty_or_clinic || 'Follow-up'}</h4>
                            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">{appt.type}</span>
                        </div>
                        <p className="text-slate-600 text-sm mt-1 font-semibold">{appt.target_date_or_window}</p>
                        {appt.location && <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">📍 {appt.location}</p>}
                        {appt.prep_instructions && <p className="text-xs text-slate-400 mt-1 italic">Note: {appt.prep_instructions}</p>}
                    </div>
                 ))}
             </div>
          ) : (
             <div className="text-center py-8 text-slate-500">
                <Icons.Calendar className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                No appointments scheduled in this plan.
             </div>
          )}
      </SimpleModal>

    </div>
  );
}

// --- Helper Components ---

function TaskItem({ label, status }: { label: string, status: 'completed' | 'pending' }) {
    const isCompleted = status === 'completed';
    return (
        <div className={`flex items-center p-3 rounded-2xl border transition-all ${isCompleted ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 hover:border-blue-300 cursor-pointer'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 transition-colors ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>
                {isCompleted ? <Icons.Check className="w-6 h-6" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>}
            </div>
            <div className="flex-1">
                <div className={`font-bold text-base ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{label}</div>
            </div>
        </div>
    );
}

function SimpleModal({ isOpen, onClose, title, children, icon: Icon, color = "blue" }: any) {
  if (!isOpen) return null;
  const colors: any = {
      blue: "bg-blue-50 text-blue-600",
      red: "bg-red-50 text-red-600",
      amber: "bg-amber-50 text-amber-600"
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
       <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${colors[color]}`}>
                      {Icon && <Icon className="w-6 h-6" />}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <span className="text-2xl leading-none text-slate-400">&times;</span>
              </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
              {children}
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end flex-shrink-0">
              <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors">Close</button>
          </div>
       </div>
    </div>
  );
}
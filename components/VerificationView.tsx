
import React, { useState, useEffect } from 'react';
import { ParsedEpisode, Medication, Appointment, ConsistencyReport } from '../types';
import { Icons, Card, Button, Badge } from './ui';

interface VerificationViewProps {
  data: ParsedEpisode;
  consistency?: ConsistencyReport | null;
  onConfirm: (updatedData: ParsedEpisode) => void;
  isLoading: boolean;
  progressMsg?: string;
  onBack: () => void;
}

// Wrapper types for local state
type EditableMedication = Medication & { _id: string; verified: boolean };
type EditableAppointment = Appointment & { _id: string; verified: boolean };

interface EditLog {
    field: string;
    originalValue: string;
    newValue: string;
    timestamp: number;
}

export default function VerificationView({ data, onConfirm, isLoading, progressMsg, consistency, onBack }: VerificationViewProps) {
  // Initialize local state with unique IDs for stable rendering and verification tracking
  const [meds, setMeds] = useState<EditableMedication[]>([]);
  const [appts, setAppts] = useState<EditableAppointment[]>([]);
  const [editLog, setEditLog] = useState<EditLog[]>([]);

  useEffect(() => {
      setMeds(data.medications.map((m, i) => ({ ...m, _id: `med-${i}`, verified: false })));
      setAppts(data.appointments.map((a, i) => ({ ...a, _id: `appt-${i}`, verified: false })));
  }, [data]);

  // Handlers for Meds
  const updateMed = (id: string, field: keyof Medication, value: string) => {
      // Log changes
      const med = meds.find(m => m._id === id);
      if (med && med[field] !== value) {
          setEditLog(prev => [...prev, {
              field: `${med.name} - ${field}`,
              originalValue: String(med[field] || ''),
              newValue: value,
              timestamp: Date.now()
          }]);
      }
      setMeds(prev => prev.map(m => m._id === id ? { ...m, [field]: value, verified: true } : m));
  };

  const toggleMedVerified = (id: string) => {
      setMeds(prev => prev.map(m => m._id === id ? { ...m, verified: !m.verified } : m));
  };

  const removeMed = (id: string) => {
      if (window.confirm("Are you sure you want to remove this medication?")) {
          const med = meds.find(m => m._id === id);
          if (med) {
              setEditLog(prev => [...prev, {
                  field: `${med.name} - Removed`,
                  originalValue: 'Active',
                  newValue: 'Removed',
                  timestamp: Date.now()
              }]);
          }
          setMeds(prev => prev.filter(m => m._id !== id));
      }
  };

  // Handlers for Appointments
  const updateAppt = (id: string, field: keyof Appointment, value: string) => {
      setAppts(prev => prev.map(a => a._id === id ? { ...a, [field]: value } : a));
  };

  const toggleApptVerified = (id: string) => {
      setAppts(prev => prev.map(a => a._id === id ? { ...a, verified: !a.verified } : a));
  };

  const removeAppt = (id: string) => {
      if (window.confirm("Remove this appointment?")) {
          setAppts(prev => prev.filter(a => a._id !== id));
      }
  };

  const handleConfirm = () => {
      // Strip local fields before passing back
      const cleanMeds = meds.map(({ _id, verified, ...rest }) => rest);
      const cleanAppts = appts.map(({ _id, verified, ...rest }) => rest);
      
      onConfirm({
          ...data,
          medications: cleanMeds,
          appointments: cleanAppts,
          // Include audit metadata
          _verificationMeta: {
              verifiedAt: new Date().toISOString(),
              changesCount: editLog.length,
              editLog: editLog
          }
      });
  };

  // Helper to find issues related to a specific medication string
  const getMedicationIssues = (medName: string) => {
      if (!consistency || !medName) return [];
      const normalizedName = medName.toLowerCase();
      return consistency.conflicts.filter(c => {
          const text = (c.summary + " " + c.details).toLowerCase();
          return text.includes(normalizedName);
      });
  };

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
              <div className="relative">
                  <div className="w-20 h-20 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Icons.Sparkle className="w-6 h-6 text-teal-500 animate-pulse" />
                  </div>
              </div>
              <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{progressMsg || "Generating..."}</p>
                  <p className="text-sm text-slate-500 mt-2">Creating your personalized care plan</p>
              </div>
          </div>
      );
  }

  const confidence = data.extraction_confidence || 'high';
  
  const doseAlertCount = consistency?.conflicts.filter(c => c.type === 'Dosage Alert').length || 0;
  const interactionCount = consistency?.conflicts.filter(c => c.type === 'Drug Interaction').length || 0;
  const hasSafetyWarnings = doseAlertCount > 0 || interactionCount > 0;

  // Validation Logic
  const unverifiedMedsCount = meds.filter(m => !m.verified).length;
  // const unverifiedApptsCount = appts.filter(a => !a.verified).length; // Optional to enforce appointments? Usually meds are the safety critical ones.
  const canProceed = unverifiedMedsCount === 0;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in relative">
        
        {/* Back Button (Top Left) */}
        <div className="absolute top-0 left-0 md:-ml-16 hidden md:block">
            <button 
                onClick={onBack}
                className="p-3 rounded-full bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500"
                title="Back to Uploads"
            >
                <Icons.ArrowRight className="w-5 h-5 rotate-180" />
            </button>
        </div>

        {/* Mobile Back Button */}
        <div className="md:hidden mb-4">
             <button 
                onClick={onBack}
                className="flex items-center gap-2 text-slate-500 font-bold text-sm"
            >
                <Icons.ArrowRight className="w-4 h-4 rotate-180" /> Back to Uploads
            </button>
        </div>
        
        {/* Header Section */}
        <div className="text-center mb-8">
            
            {/* Confidence Badge */}
            {confidence !== 'high' && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-4 ${
                    confidence === 'low'
                       ? 'bg-amber-100 text-amber-700 border border-amber-200'
                       : 'bg-blue-50 text-blue-600 border border-blue-200'
                }`}>
                    <Icons.Alert className="w-4 h-4" />
                    {confidence === 'low'
                       ? 'Low confidence extraction - verify carefully'
                       : 'Some items may need verification'}
                </div>
            )}

            {hasSafetyWarnings ? (
                <div className="inline-block bg-red-100 border border-red-200 rounded-2xl p-6 mb-6 w-full text-left">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-red-600 text-white p-2 rounded-full">
                            <Icons.Alert className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-red-800 uppercase tracking-tight">Please Verify Before Continuing</h2>
                    </div>
                    <p className="text-red-700 mb-2">
                        We detected <strong>{doseAlertCount + interactionCount} potential safety issue{doseAlertCount + interactionCount > 1 ? 's' : ''}</strong> in the extracted text.
                    </p>
                    <ul className="list-disc list-inside text-sm text-red-700/80 space-y-1 ml-2">
                        {doseAlertCount > 0 && <li>Unusually high dosages detected</li>}
                        {interactionCount > 0 && <li>Potential drug interactions identified</li>}
                    </ul>
                </div>
            ) : (
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-4 shadow-lg shadow-slate-200">
                        <Icons.Eye className="w-4 h-4" /> Verification Step
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Confirm Your Medications</h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Please check the box next to each item to confirm it matches your actual documents.
                    </p>
                </div>
            )}
        </div>

        {/* Medications List */}
        <div className="space-y-4 mb-10">
            {meds.length > 0 && (
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">
                    Medications ({meds.filter(m => m.verified).length}/{meds.length} Confirmed)
                </h3>
            )}
            
            {meds.map((med) => {
                const issues = getMedicationIssues(med.name);
                const doseWarning = issues.find(x => x.type === 'Dosage Alert');
                const interactionWarning = issues.find(x => x.type === 'Drug Interaction');
                const hasWarning = !!doseWarning || !!interactionWarning;

                return (
                    <div 
                        key={med._id} 
                        className={`group relative bg-white rounded-2xl border transition-all duration-200 ${
                            hasWarning 
                                ? 'border-red-300 shadow-[0_0_0_1px_rgba(252,165,165,0.5)]' 
                                : med.verified 
                                    ? 'border-emerald-200 bg-emerald-50/10' 
                                    : 'border-slate-200 hover:border-teal-300 shadow-sm'
                        }`}
                    >
                        <div className="p-4 flex items-start gap-4">
                            
                            {/* Custom Checkbox (Circular for new theme) */}
                            <button
                                type="button"
                                onClick={() => toggleMedVerified(med._id)}
                                className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    med.verified 
                                        ? 'bg-teal-500 border-teal-500 text-white focus:ring-teal-500' 
                                        : 'bg-white border-slate-300 text-transparent hover:border-teal-400 focus:ring-teal-500'
                                }`}
                                aria-label={`Confirm ${med.name}`}
                            >
                                <Icons.Check className="w-3 h-3 stroke-[3]" />
                            </button>

                            {/* Content */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                                
                                {/* Drug Name & Warnings */}
                                <div className="md:col-span-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Medication</label>
                                    <input 
                                        value={med.name} 
                                        onChange={(e) => updateMed(med._id, 'name', e.target.value)}
                                        className="w-full font-bold text-slate-900 bg-transparent border-b border-transparent focus:border-teal-500 outline-none transition-colors py-0.5"
                                    />
                                    
                                    {/* Inline Warnings */}
                                    <div className="flex flex-col gap-1 mt-2">
                                        {doseWarning && (
                                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded mt-1">
                                                <Icons.Alert className="w-3 h-3" /> Check Dose!
                                            </div>
                                        )}
                                        {interactionWarning && (
                                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1">
                                                <Icons.Alert className="w-3 h-3" /> Interaction
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dosage */}
                                <div className="md:col-span-3">
                                    <label className={`text-[10px] font-bold uppercase block mb-1 ${doseWarning ? 'text-red-500' : 'text-slate-400'}`}>
                                        Dose
                                    </label>
                                    <input 
                                        value={med.dose} 
                                        onChange={(e) => updateMed(med._id, 'dose', e.target.value)}
                                        className={`w-full font-medium bg-transparent border-b outline-none transition-colors py-0.5 ${
                                            doseWarning 
                                                ? 'text-red-700 border-red-300 focus:border-red-500 bg-red-50/50' 
                                                : 'text-slate-700 border-transparent focus:border-teal-500'
                                        }`}
                                    />
                                </div>

                                {/* Frequency */}
                                <div className="md:col-span-4">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Instructions</label>
                                    <input 
                                        value={med.frequency} 
                                        onChange={(e) => updateMed(med._id, 'frequency', e.target.value)}
                                        className="w-full text-slate-600 bg-transparent border-b border-transparent focus:border-teal-500 outline-none transition-colors py-0.5"
                                    />
                                </div>

                                {/* Delete Action */}
                                <div className="md:col-span-1 flex justify-end">
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeMed(med._id);
                                        }}
                                        className="text-slate-300 hover:text-red-500 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                        title="Remove"
                                    >
                                        <Icons.Trash className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Validation overlay for unverified items to draw attention */}
                        {!med.verified && (
                            <div className="absolute inset-0 bg-slate-50/0 pointer-events-none rounded-2xl ring-1 ring-inset ring-slate-200 group-hover:ring-teal-200 transition-all" />
                        )}
                    </div>
                );
            })}

            {meds.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <p className="text-slate-400 italic">No medications detected.</p>
                </div>
            )}
        </div>

        {/* Appointments Section (Simplified) */}
        {appts.length > 0 && (
            <div className="space-y-4 mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2 mt-8">
                    Appointments
                </h3>
                {appts.map((appt) => (
                    <div key={appt._id} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4 items-center shadow-sm">
                         <button
                            type="button"
                            onClick={() => toggleApptVerified(appt._id)}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                appt.verified 
                                    ? 'bg-teal-500 border-teal-500 text-white' 
                                    : 'bg-white border-slate-300 text-transparent hover:border-teal-400'
                            }`}
                        >
                            <Icons.Check className="w-3 h-3 stroke-[3]" />
                        </button>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                                value={appt.specialty_or_clinic || ''} 
                                onChange={(e) => updateAppt(appt._id, 'specialty_or_clinic', e.target.value)}
                                className="font-bold text-slate-900 border-b border-transparent focus:border-teal-500 outline-none bg-transparent"
                                placeholder="Clinic Name"
                            />
                            <input 
                                value={appt.target_date_or_window} 
                                onChange={(e) => updateAppt(appt._id, 'target_date_or_window', e.target.value)}
                                className="text-slate-600 border-b border-transparent focus:border-teal-500 outline-none bg-transparent"
                                placeholder="Date/Time"
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={() => removeAppt(appt._id)} 
                            className="text-slate-300 hover:text-red-500 p-2"
                        >
                            <Icons.Trash className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* --- SPACER FOR FIXED FOOTER --- */}
        <div className="h-48 md:h-72 w-full pointer-events-none"></div>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 p-4 z-[60]">
            <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm">
                    {canProceed ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-2">
                            <Icons.Check className="w-4 h-4" /> All items verified
                        </span>
                    ) : (
                        <span className="text-slate-500">
                            Please check <span className="font-bold text-slate-900">{unverifiedMedsCount} remaining</span> items above.
                        </span>
                    )}
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={onBack}
                        className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors md:hidden"
                    >
                        Back
                    </button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={!canProceed}
                        className={`flex-1 md:flex-none px-8 py-3 text-lg shadow-xl transition-all ${canProceed ? 'shadow-teal-500/20' : 'opacity-50 cursor-not-allowed bg-slate-300'}`}
                    >
                        Continue to Care Plan <Icons.ArrowRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>

    </div>
  );
}

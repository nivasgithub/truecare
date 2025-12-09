import React, { useState } from 'react';
import { ParsedEpisode, Medication, Appointment, ConsistencyReport } from '../types';
import { Icons, Card, Button } from './ui';

interface VerificationViewProps {
  data: ParsedEpisode;
  consistency?: ConsistencyReport | null; // Added consistency report prop
  onConfirm: (updatedData: ParsedEpisode) => void;
  isLoading: boolean;
  progressMsg?: string;
}

export default function VerificationView({ data, onConfirm, isLoading, progressMsg, consistency }: VerificationViewProps) {
  // Local state for editing to avoid mutating props directly before confirmation
  const [meds, setMeds] = useState<Medication[]>(data.medications);
  const [appts, setAppts] = useState<Appointment[]>(data.appointments);

  // Handlers for Meds
  const updateMed = (index: number, field: keyof Medication, value: string) => {
      const newMeds = [...meds];
      newMeds[index] = { ...newMeds[index], [field]: value };
      setMeds(newMeds);
  };

  const removeMed = (index: number) => {
      if (confirm("Are you sure you want to remove this medication?")) {
          setMeds(meds.filter((_, i) => i !== index));
      }
  };

  // Handlers for Appointments
  const updateAppt = (index: number, field: keyof Appointment, value: string) => {
      const newAppts = [...appts];
      newAppts[index] = { ...newAppts[index], [field]: value };
      setAppts(newAppts);
  };

  const removeAppt = (index: number) => {
      if (confirm("Remove this appointment?")) {
          setAppts(appts.filter((_, i) => i !== index));
      }
  };

  const handleConfirm = () => {
      onConfirm({
          ...data,
          medications: meds,
          appointments: appts
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
                  <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Icons.Sparkle className="w-6 h-6 text-blue-600 animate-pulse" />
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
  const isLowConfidence = confidence === 'low' || confidence === 'medium';
  
  // Count specific safety flags for the header
  const doseAlertCount = consistency?.conflicts.filter(c => c.type === 'Dosage Alert').length || 0;
  const interactionCount = consistency?.conflicts.filter(c => c.type === 'Drug Interaction').length || 0;

  return (
    <div className="max-w-4xl mx-auto pb-24 animate-fade-in">
        <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-4 shadow-lg shadow-slate-200">
                <Icons.Eye className="w-4 h-4" /> Verification Required
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Check Extracted Details</h2>
            <p className="text-slate-500 max-w-lg mx-auto">
                AI can make mistakes. Please verify medications and dosages match your actual documents before we generate the plan.
            </p>
        </div>

        {/* Global Safety Alert Banner (Aggregated) */}
        {(doseAlertCount > 0 || interactionCount > 0 || isLowConfidence) && (
            <div className={`mb-8 p-4 rounded-xl border flex gap-3 items-start text-left max-w-3xl mx-auto shadow-sm ${doseAlertCount > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className={`p-2 rounded-full mt-0.5 ${doseAlertCount > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    <Icons.Alert className="w-5 h-5" />
                </div>
                <div>
                    <h4 className={`font-bold text-sm uppercase tracking-wide ${doseAlertCount > 0 ? 'text-red-800' : 'text-amber-800'}`}>
                        {doseAlertCount > 0 ? 'Critical Safety Checks Failed' : 'Attention Needed'}
                    </h4>
                    <ul className={`text-sm mt-1 space-y-1 ${doseAlertCount > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                        {doseAlertCount > 0 && <li>• <strong>{doseAlertCount} Dosage Issue{doseAlertCount > 1 ? 's' : ''}:</strong> Extracted amounts seem unusually high.</li>}
                        {interactionCount > 0 && <li>• <strong>{interactionCount} Interaction{interactionCount > 1 ? 's' : ''}:</strong> Potential drug conflict detected.</li>}
                        {isLowConfidence && <li>• <strong>Low Visibility:</strong> The image was blurry. Please check spelling carefully.</li>}
                    </ul>
                </div>
            </div>
        )}

        {/* Medications */}
        <div className="mb-10">
            <div className="flex items-center justify-between mb-4 px-2 max-w-3xl mx-auto">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Icons.Pill className="w-5 h-5 text-blue-600" /> Medications ({meds.length})
                </h3>
            </div>
            
            <div className="space-y-4 max-w-3xl mx-auto">
                {meds.map((med, i) => {
                    const issues = getMedicationIssues(med.name);
                    const doseWarning = issues.find(x => x.type === 'Dosage Alert');
                    const interactionWarning = issues.find(x => x.type === 'Drug Interaction');
                    const hasIssues = issues.length > 0;

                    return (
                        <Card key={i} className={`p-5 border shadow-sm transition-all group ${hasIssues ? (doseWarning ? 'border-red-300 bg-red-50/30' : 'border-amber-300 bg-amber-50/30') : 'border-slate-200 hover:border-blue-300'}`}>
                            
                            {/* Inline Safety Banner for this specific card */}
                            {hasIssues && (
                                <div className="mb-4 flex flex-wrap gap-2">
                                    {doseWarning && (
                                        <div className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold border border-red-200">
                                            <Icons.Alert className="w-3 h-3" /> Dosage Alert: Value seems too high
                                        </div>
                                    )}
                                    {interactionWarning && (
                                        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold border border-amber-200">
                                            <Icons.Alert className="w-3 h-3" /> Interaction Risk
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Drug Name</label>
                                        <input 
                                            value={med.name} 
                                            onChange={(e) => updateMed(i, 'name', e.target.value)}
                                            className="w-full font-bold text-slate-900 border-b border-slate-200 focus:border-blue-500 outline-none bg-transparent py-1 transition-colors"
                                            placeholder="Medication Name"
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase block mb-1.5 ${doseWarning ? 'text-red-500' : 'text-slate-400'}`}>
                                            Dose {doseWarning && '(Verify!)'}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                value={med.dose} 
                                                onChange={(e) => updateMed(i, 'dose', e.target.value)}
                                                className={`w-full font-medium border-b outline-none bg-transparent py-1 transition-colors ${doseWarning ? 'text-red-700 border-red-300 focus:border-red-500 bg-red-50' : 'text-slate-900 border-slate-200 focus:border-blue-500'}`}
                                                placeholder="e.g. 10mg"
                                            />
                                            {/* Highlight dose for attention */}
                                            {isLowConfidence && !doseWarning && (
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-amber-400 rounded-full opacity-50 group-hover:opacity-100 transition-opacity" title="Check dose carefully (Low Confidence Scan)"></div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Frequency</label>
                                        <input 
                                            value={med.frequency} 
                                            onChange={(e) => updateMed(i, 'frequency', e.target.value)}
                                            className="w-full text-slate-700 border-b border-slate-200 focus:border-blue-500 outline-none bg-transparent py-1 transition-colors"
                                            placeholder="e.g. Daily"
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={() => removeMed(i)} 
                                    className="text-slate-300 hover:text-red-500 p-2 transition-colors self-start md:self-center"
                                    title="Remove medication"
                                >
                                    <Icons.Trash className="w-5 h-5" />
                                </button>
                            </div>
                        </Card>
                    );
                })}
                {meds.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                        No medications found in extraction.
                    </div>
                )}
            </div>
        </div>

        {/* Appointments */}
        <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 px-2 max-w-3xl mx-auto">
                <Icons.Calendar className="w-5 h-5 text-purple-600" /> Appointments ({appts.length})
            </h3>
             <div className="space-y-4 max-w-3xl mx-auto">
                {appts.map((appt, i) => (
                    <Card key={i} className="p-5 border-slate-200 shadow-sm hover:border-purple-300 transition-colors">
                        <div className="flex gap-4 items-center">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Type / Clinic</label>
                                    <input 
                                        value={appt.specialty_or_clinic || ''} 
                                        onChange={(e) => updateAppt(i, 'specialty_or_clinic', e.target.value)}
                                        className="w-full font-bold text-slate-900 border-b border-slate-200 focus:border-purple-500 outline-none bg-transparent py-1"
                                        placeholder="e.g. Cardiology"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Date / Timing</label>
                                    <input 
                                        value={appt.target_date_or_window} 
                                        onChange={(e) => updateAppt(i, 'target_date_or_window', e.target.value)}
                                        className="w-full text-slate-700 border-b border-slate-200 focus:border-purple-500 outline-none bg-transparent py-1"
                                        placeholder="e.g. Next Week"
                                    />
                                </div>
                            </div>
                            <button onClick={() => removeAppt(i)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                                <Icons.Trash className="w-5 h-5" />
                            </button>
                        </div>
                    </Card>
                ))}
                 {appts.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                        No appointments found in extraction.
                    </div>
                )}
            </div>
        </div>

        <div className="sticky bottom-6 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
            <div className="text-sm text-slate-500 hidden md:block">
                {doseAlertCount > 0 ? <span className="text-red-600 font-bold">Please correct dosage alerts before confirming.</span> : "Confirm details match your documents."}
            </div>
            <Button onClick={handleConfirm} className="w-full md:w-auto text-base px-8 py-4 shadow-xl shadow-blue-500/20">
                Confirm & Generate Plan <Icons.ArrowRight className="w-5 h-5" />
            </Button>
        </div>
    </div>
  );
}
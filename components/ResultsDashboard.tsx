import React, { useState } from 'react';
import { Card, Badge, Icons, Button } from './ui';
import { ParsedEpisode, ConsistencyReport, FormattedCarePlan } from '../types';

interface ResultsDashboardProps {
  data: ParsedEpisode;
  consistency: ConsistencyReport | null;
  carePlan: FormattedCarePlan | null;
  onReset: () => void;
}

export default function ResultsDashboard({ data, consistency, carePlan, onReset }: ResultsDashboardProps) {
  
  // Default to playbook if available, otherwise clinical
  const [view, setView] = useState<'clinical' | 'playbook'>('playbook'); 
  const [showDebug, setShowDebug] = useState(false);
  const hasIssues = consistency?.status === 'success' && (consistency.conflicts.length > 0 || consistency.gaps.length > 0);

  return (
    <div className="animate-fade-in-up space-y-6 pb-20">
      
      {/* Header Actions - Simplified as we are now part of a larger page flow */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-2">
        <div>
           <p className="text-slate-500">Analysis complete for <span className="font-semibold text-slate-800">{data.patient.name || 'Patient'}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onReset} className="py-2.5 px-4 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100"><Icons.Trash className="w-4 h-4" /> Clear & Start Over</Button>
        </div>
      </div>

      {/* View Switcher (Screens 3 & 4 toggle) */}
      <div className="flex p-1 bg-slate-200 rounded-xl w-full md:w-fit">
        <button 
          onClick={() => setView('playbook')}
          className={`flex-1 md:flex-none px-6 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${view === 'playbook' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <Icons.Clipboard className="w-4 h-4" /> Your Care Plan (Patient)
        </button>
        <button 
          onClick={() => setView('clinical')}
          className={`flex-1 md:flex-none px-6 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${view === 'clinical' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <Icons.Shield className="w-4 h-4" /> For Doctors & Safety
        </button>
      </div>

      {/* --- PLAYBOOK VIEW (Screen 3) --- */}
      {view === 'playbook' && (
        carePlan ? (
        <div className="space-y-8 animate-fade-in">
          
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your Care Plan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Today & Tomorrow */}
            <Card className="p-0 overflow-hidden border-blue-200 shadow-blue-100/50">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm"><Icons.Calendar /></div>
                  <h3 className="text-xl font-bold text-slate-800">Today & Tomorrow</h3>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  {carePlan.patient_friendly_plan.today_and_tomorrow.map((item, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded-full border-2 border-blue-200 flex-shrink-0 mt-0.5"></div>
                      <p className="text-slate-700 font-medium text-lg leading-snug">{item}</p>
                    </li>
                  ))}
                  {carePlan.patient_friendly_plan.today_and_tomorrow.length === 0 && <p className="text-slate-500 italic">No specific immediate tasks.</p>}
                </ul>
              </div>
            </Card>

            {/* Daily Routine */}
            <Card className="p-0 overflow-hidden border-emerald-200 shadow-emerald-100/50">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-emerald-600 shadow-sm"><Icons.Check /></div>
                  <h3 className="text-xl font-bold text-slate-800">Daily Routine</h3>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  {carePlan.patient_friendly_plan.daily_routine.map((item, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <div className="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <p className="text-slate-700 font-medium text-lg leading-snug">{item}</p>
                    </li>
                  ))}
                  {carePlan.patient_friendly_plan.daily_routine.length === 0 && <p className="text-slate-500 italic">No specific daily routine found.</p>}
                </ul>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             
             {/* Before Your Next Appointment (was Weekly) */}
            <Card className="p-0 overflow-hidden border-indigo-200 shadow-indigo-100/50">
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 border-b border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-indigo-600 shadow-sm"><Icons.Calendar /></div>
                  <h3 className="text-xl font-bold text-slate-800">Before Your Next Appointment</h3>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  {carePlan.patient_friendly_plan.weekly_or_followup_tasks.length > 0 ? (
                    carePlan.patient_friendly_plan.weekly_or_followup_tasks.map((item, i) => (
                      <li key={i} className="flex gap-4 items-start">
                         <div className="bg-indigo-100 text-indigo-600 rounded-lg p-1 flex-shrink-0 mt-0.5">
                           <Icons.Check className="w-3.5 h-3.5" />
                         </div>
                        <p className="text-slate-700 font-medium text-lg leading-snug">{item}</p>
                      </li>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">No specific tasks before your next visit.</p>
                  )}
                </ul>
              </div>
            </Card>

             {/* Warning Signs */}
            <Card className="p-0 overflow-hidden border-red-200 shadow-red-100/50 bg-red-50/30">
              <div className="bg-red-50 p-6 border-b border-red-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-red-600 shadow-sm"><Icons.Alert /></div>
                  <h3 className="text-xl font-bold text-red-900">Warning Signs – Do Not Ignore</h3>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {carePlan.patient_friendly_plan.warning_signs_card.map((item, i) => (
                    <li key={i} className="flex gap-3 items-start p-3 bg-white rounded-lg border border-red-100">
                      <Icons.Alert className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-red-900 font-semibold">{item}</p>
                    </li>
                  ))}
                  {carePlan.patient_friendly_plan.warning_signs_card.length === 0 && <p className="text-slate-500 italic">No specific warnings found.</p>}
                </ul>
              </div>
            </Card>
          </div>

          {/* Questions for Doctor */}
          <Card className="p-0 overflow-hidden bg-amber-50/30 border-amber-200">
            <div className="bg-amber-50 p-6 border-b border-amber-100">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg text-amber-600 shadow-sm"><Icons.Question /></div>
                <h3 className="text-xl font-bold text-amber-900">Questions to Ask at Your Next Visit</h3>
              </div>
            </div>
            <div className="p-6">
               {carePlan.patient_friendly_plan.doctor_questions.length > 0 ? (
                 <ul className="space-y-3">
                  {carePlan.patient_friendly_plan.doctor_questions.map((item, i) => (
                    <li key={i} className="flex gap-3 items-start p-3 bg-white rounded-lg border border-amber-100">
                      <span className="text-amber-500 font-bold text-lg select-none">Q.</span>
                      <p className="text-slate-800 font-medium">{item}</p>
                    </li>
                  ))}
                 </ul>
               ) : (
                 <div className="text-center py-4 text-slate-500 italic">
                   No specific questions identified from conflicts or gaps.
                 </div>
               )}
            </div>
          </Card>

          {/* Footer Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="bg-white p-2 rounded-full shadow-sm text-2xl">💡</div>
            <p className="text-blue-900 font-medium text-lg">Bring this screen (or a printout) to your next appointment and review it with your care team.</p>
          </div>

          {/* Technical Summary */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-2">Technical Summary</h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-slate-600 text-sm leading-relaxed">
                {carePlan.technical_summary_for_clinicians}
              </p>
            </div>
          </div>
        </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl animate-fade-in">
            <Icons.Clipboard className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Playbook Unavailable</h3>
            <p className="text-slate-500 text-center max-w-md mb-6">
              We were able to read the documents, but couldn't generate the simplified playbook. Please check the Clinical Details tab for raw data.
            </p>
            <Button variant="secondary" onClick={() => setView('clinical')}>
              View Clinical Details
            </Button>
          </div>
        )
      )}

      {/* --- CLINICAL VIEW (Screen 4) --- */}
      {view === 'clinical' && (
        <div className="space-y-8 animate-fade-in">

          {/* Technical Summary (Prominent in Clinical View) */}
          {carePlan?.technical_summary_for_clinicians && (
            <div className="bg-slate-800 rounded-xl p-6 text-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Icons.Note className="text-blue-400" />
                <h3 className="text-lg font-bold text-white">Clinician Executive Summary</h3>
              </div>
              <p className="leading-relaxed text-slate-300">
                {carePlan.technical_summary_for_clinicians}
              </p>
            </div>
          )}
          
          {/* Safety Alerts */}
          {hasIssues && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Icons.Shield className="text-amber-500" />
                <h2 className="text-xl font-bold text-slate-800">Safety Check & Clarifications</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...(consistency?.conflicts || []), ...(consistency?.gaps || [])].map((issue, i) => (
                  <div key={i} className={`p-5 rounded-xl border-l-4 shadow-sm bg-white ${issue.severity === 'critical' ? 'border-l-red-500' : 'border-l-amber-400'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <Badge color={issue.severity === 'critical' ? 'red' : 'amber'}>{issue.type}</Badge>
                    </div>
                    <p className="font-bold text-slate-800 mb-1">{issue.summary}</p>
                    <p className="text-sm text-slate-600 mb-3">{issue.details}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Medications */}
            <Card className="p-0 overflow-hidden h-full">
              <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-2">
                <div className="bg-white p-1.5 rounded-md text-emerald-700 border border-emerald-100"><Icons.Pill className="w-5 h-5"/></div>
                <h3 className="font-bold text-slate-800">Medications</h3>
                <Badge color="slate" >{data.medications.length}</Badge>
              </div>
              <div className="divide-y divide-slate-100">
                {data.medications.length === 0 ? <p className="p-6 text-slate-400 italic text-center">No medications found.</p> : 
                  data.medications.map((med, i) => (
                    <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900">{med.name}</h4>
                        <Badge color="green">{med.route}</Badge>
                      </div>
                      <p className="text-slate-600 text-sm mt-1 font-medium">{med.dose} • {med.frequency}</p>
                      {med.timing_notes && <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded border border-slate-100">📝 {med.timing_notes}</p>}
                    </div>
                  ))
                }
              </div>
            </Card>

            {/* Appointments */}
            <Card className="p-0 overflow-hidden h-full">
              <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-2">
                <div className="bg-white p-1.5 rounded-md text-blue-700 border border-blue-100"><Icons.Check className="w-5 h-5"/></div>
                <h3 className="font-bold text-slate-800">Follow Up</h3>
                <Badge color="slate">{data.appointments.length}</Badge>
              </div>
              <div className="divide-y divide-slate-100">
                {data.appointments.length === 0 ? <p className="p-6 text-slate-400 italic text-center">No appointments found.</p> :
                  data.appointments.map((apt, i) => (
                    <div key={i} className="p-4 hover:bg-slate-50 transition-colors border-l-4 border-transparent hover:border-l-blue-500">
                      <p className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-1">{apt.target_date_or_window}</p>
                      <h4 className="font-bold text-slate-900">{apt.specialty_or_clinic || 'Clinic Visit'}</h4>
                      {apt.location && <p className="text-sm text-slate-500 mt-1">📍 {apt.location}</p>}
                    </div>
                  ))
                }
              </div>
            </Card>

            {/* Warnings & Instructions (Combined Column) */}
            <div className="space-y-6">
              <Card className="p-0 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-2">
                  <div className="bg-white p-1.5 rounded-md text-red-700 border border-red-100"><Icons.Alert className="w-5 h-5"/></div>
                  <h3 className="font-bold text-slate-800">Red Flags</h3>
                </div>
                <div className="p-4 space-y-3">
                  {data.warnings.length === 0 ? <p className="text-slate-400 italic text-center">No warnings found.</p> :
                    data.warnings.map((w, i) => (
                      <div key={i} className="flex gap-3 items-start bg-red-50 p-3 rounded-lg border border-red-100">
                        <Icons.Alert className="text-red-500 w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-red-600 uppercase">{w.urgency}</span>
                          <p className="text-sm text-slate-800 font-medium leading-tight">{w.description}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-2">
                  <div className="bg-white p-1.5 rounded-md text-purple-700 border border-purple-100"><Icons.Check className="w-5 h-5"/></div>
                  <h3 className="font-bold text-slate-800">Instructions</h3>
                </div>
                <div className="p-4 space-y-3">
                    {data.activities.length === 0 ? <p className="text-slate-400 italic text-center">No instructions found.</p> :
                    data.activities.map((act, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0"></div>
                        <div>
                          <p className="text-sm text-slate-800 font-medium">{act.instruction}</p>
                          <span className="text-xs text-purple-500 font-semibold">{act.category}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </Card>
            </div>

          </div>
        </div>
      )}

      {/* --- DEBUG SECTION (Dev Only) --- */}
      <div className="mt-12 pt-8 border-t border-slate-300">
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="text-slate-500 hover:text-slate-700 text-sm font-mono flex items-center gap-2 focus:outline-none"
        >
          {showDebug ? '[-] Hide Debug Data' : '[+] Show Debug JSON (Dev Only)'}
        </button>
        
        {showDebug && (
          <div className="mt-4 space-y-6 animate-fade-in">
            <div>
              <h4 className="font-bold text-slate-700 mb-2">Parsed Episode Data</h4>
              <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl overflow-x-auto text-xs font-mono max-h-96">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
            {consistency && (
              <div>
                <h4 className="font-bold text-slate-700 mb-2">Consistency Report</h4>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl overflow-x-auto text-xs font-mono max-h-96">
                  {JSON.stringify(consistency, null, 2)}
                </pre>
              </div>
            )}
            {carePlan && (
              <div>
                <h4 className="font-bold text-slate-700 mb-2">Formatted Care Plan</h4>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl overflow-x-auto text-xs font-mono max-h-96">
                  {JSON.stringify(carePlan, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
import React, { useState } from 'react';
import { Card, Badge, Icons, Button } from './ui';
import { ParsedEpisode, ConsistencyReport, FormattedCarePlan } from '../types';
import { generateRecoveryVideo } from '../services/video';
import { generateSpeech, generateImage, editImage, playRawAudio, stopAudio } from '../services/media';
import AssistantChat from './AssistantChat';

interface CareTransiaResultsProps {
  data: ParsedEpisode;
  consistency: ConsistencyReport | null;
  carePlan: FormattedCarePlan | null;
  onReset: () => void;
}

export default function CareTransiaResults({ data, consistency, carePlan, onReset }: CareTransiaResultsProps) {
  
  const [view, setView] = useState<'playbook' | 'clinical'>('playbook'); 
  const hasIssues = consistency?.status === 'success' && (consistency.conflicts.length > 0 || consistency.gaps.length > 0);

  // Deep Safety Fallback for Plan Data
  const rawFriendlyPlan = (carePlan?.patient_friendly_plan || {}) as any;
  const safePlan = {
    today_and_tomorrow: Array.isArray(rawFriendlyPlan.today_and_tomorrow) ? rawFriendlyPlan.today_and_tomorrow : [],
    daily_routine: Array.isArray(rawFriendlyPlan.daily_routine) ? rawFriendlyPlan.daily_routine : [],
    weekly_or_followup_tasks: Array.isArray(rawFriendlyPlan.weekly_or_followup_tasks) ? rawFriendlyPlan.weekly_or_followup_tasks : [],
    warning_signs_card: Array.isArray(rawFriendlyPlan.warning_signs_card) ? rawFriendlyPlan.warning_signs_card : [],
    doctor_questions: Array.isArray(rawFriendlyPlan.doctor_questions) ? rawFriendlyPlan.doctor_questions : []
  };

  const planError = carePlan?.status === 'error' ? carePlan.error_message : null;

  // Media State
  const [mediaPrompt, setMediaPrompt] = useState('');
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("16:9");

  // TTS State
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'generating' | 'playing'>('idle');

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);

  const playTTS = async (text: string) => {
    if (ttsStatus !== 'idle') {
        stopAudio();
        setTtsStatus('idle');
        return;
    }
    
    setTtsStatus('generating');
    try {
         const cleanText = text.replace(/[*#]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
         const base64Audio = await generateSpeech(cleanText);
         setTtsStatus('playing');
         await playRawAudio(base64Audio);
         setTtsStatus('idle'); // Resolved when audio finishes
    } catch(e) {
         console.error("TTS Error", e);
         setTtsStatus('idle');
    }
  };

  const handleMainReadAloud = () => {
     if (ttsStatus === 'playing') {
         playTTS(""); // Toggle stop
         return;
     }

     const questions = safePlan.doctor_questions.length > 0 
        ? `Questions you might want to ask your doctor: ${safePlan.doctor_questions.join(". ")}`
        : "";

     const actions = safePlan.today_and_tomorrow.length > 0 ? safePlan.today_and_tomorrow.join(". ") : "No immediate actions listed.";
     const warnings = safePlan.warning_signs_card.length > 0 ? safePlan.warning_signs_card.join(". ") : "No specific warnings listed.";

     const textToRead = `Here is the care plan for ${data.patient?.name || 'the patient'}. 
         Today and tomorrow: ${actions}. 
         Remember: ${warnings}.
         ${questions}`;
         
     playTTS(textToRead);
  };

  const handleGenerateImage = async () => {
      if (!mediaPrompt) return;
      setIsGeneratingMedia(true);
      try {
          const b64 = await generateImage(mediaPrompt, aspectRatio);
          setGeneratedImage(b64);
          setVideoUrl(null); 
      } catch (e) {
          console.error(e);
          alert("Failed to generate image.");
      } finally {
          setIsGeneratingMedia(false);
      }
  };

  const handleEditImage = async () => {
      if (!generatedImage || !mediaPrompt) return;
      setIsGeneratingMedia(true);
      try {
          const b64 = await editImage(generatedImage, mediaPrompt);
          setGeneratedImage(b64);
      } catch (e) {
          console.error(e);
          alert("Failed to edit image.");
      } finally {
          setIsGeneratingMedia(false);
      }
  };

  const handleAnimateImage = async () => {
      if (!generatedImage) return;
      setIsGeneratingMedia(true);
      try {
          const result = await generateRecoveryVideo("Animate this scene naturally", generatedImage);
          setVideoUrl(result.uri);
      } catch (e) {
          console.error(e);
          alert("Failed to animate image.");
      } finally {
          setIsGeneratingMedia(false);
      }
  };

  const handleSetReminder = async (appt: any) => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications");
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission === "granted") {
      new Notification("Reminder Set", {
        body: `We'll remind you about: ${appt.specialty_or_clinic || 'Appointment'} - ${appt.target_date_or_window}`,
        icon: '/favicon.ico'
      });
      alert(`Reminder scheduled for ${appt.target_date_or_window}. You will be notified.`);
    } else {
      alert("Please allow notifications to set reminders.");
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pb-32 max-w-6xl mx-auto relative">
      
      {/* Dashboard Header */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg shadow-slate-100/50 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-3">
             <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wide flex items-center gap-2 border border-emerald-100">
               <Icons.Sparkle className="w-3 h-3"/> Analysis Complete
             </span>
           </div>
           <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
             Care Plan for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{data.patient?.name || 'Patient'}</span>
           </h2>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={handleMainReadAloud}
                className={`bg-slate-50 hover:bg-slate-100 text-slate-700 p-4 rounded-2xl transition-colors border border-slate-200 ${ttsStatus === 'playing' ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}`}
                title={ttsStatus === 'playing' ? "Stop Reading" : "Read Aloud Summary"}
            >
                {ttsStatus === 'generating' ? (
                     <div className="flex items-center gap-2"><Icons.Spinner className="w-6 h-6 text-blue-500" /> <span className="font-bold hidden md:inline">Generating...</span></div>
                ) : ttsStatus === 'playing' ? (
                     <div className="flex items-center gap-2"><Icons.Stop className="w-6 h-6" /> <span className="font-bold hidden md:inline">Stop</span></div>
                ) : (
                     <div className="flex items-center gap-2"><Icons.Speaker className="w-6 h-6" /> <span className="font-bold hidden md:inline">Read Aloud</span></div>
                )}
            </button>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button 
                onClick={() => setView('playbook')}
                className={`px-6 py-3 rounded-xl text-base font-bold transition-all flex items-center gap-2 ${view === 'playbook' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Icons.Clipboard className="w-5 h-5" /> Patient View
            </button>
            <button 
                onClick={() => setView('clinical')}
                className={`px-6 py-3 rounded-xl text-base font-bold transition-all flex items-center gap-2 ${view === 'clinical' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Icons.Shield className="w-5 h-5" /> Clinician View
            </button>
            </div>
        </div>
      </div>
      
      {planError && (
          <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-red-700 flex items-start gap-3">
              <Icons.Alert className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                  <h3 className="font-bold text-lg">Plan Generation Issue</h3>
                  <p>{planError}</p>
                  <p className="text-sm mt-2">Some sections may be missing. Please review the clinical data directly.</p>
              </div>
          </div>
      )}

      {/* --- PATIENT PLAYBOOK VIEW --- */}
      {view === 'playbook' && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 1. Immediate Actions (Hero Card) */}
            <Card className="col-span-1 lg:col-span-2 overflow-hidden border-blue-100 shadow-xl shadow-blue-100/50 rounded-3xl">
              <div className="bg-gradient-to-r from-blue-50 to-white p-8 border-b border-blue-50">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-white p-3 rounded-2xl text-blue-600 shadow-sm border border-blue-100"><Icons.Calendar /></div>
                  <h3 className="text-3xl font-extrabold text-slate-900">Today & Tomorrow</h3>
                </div>
                <p className="text-slate-600 ml-[4.25rem] text-lg font-medium">The most important things to do right now.</p>
              </div>
              <div className="p-8 md:p-10">
                <ul className="space-y-6">
                  {safePlan.today_and_tomorrow.map((item, i) => (
                    <li key={i} className="flex gap-5 items-start group p-4 hover:bg-blue-50/50 rounded-2xl transition-colors cursor-default">
                      <div className="w-8 h-8 rounded-full border-4 border-blue-100 bg-white group-hover:border-blue-400 transition-colors flex-shrink-0 mt-1"></div>
                      <p className="text-slate-800 font-medium text-xl leading-relaxed">{item}</p>
                    </li>
                  ))}
                  {safePlan.today_and_tomorrow.length === 0 && <p className="text-slate-400 italic text-lg">No immediate actions found.</p>}
                </ul>
              </div>
            </Card>
            
            {/* Upcoming Appointments */}
            {data.appointments.length > 0 && (
                <Card className="col-span-1 lg:col-span-2 overflow-hidden border-amber-100 shadow-xl shadow-amber-50/50 rounded-3xl">
                    <div className="bg-gradient-to-r from-amber-50 to-white p-8 border-b border-amber-50 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-3 rounded-2xl text-amber-600 shadow-sm border border-amber-100"><Icons.Bell /></div>
                            <h3 className="text-2xl font-bold text-slate-900">Upcoming Appointments</h3>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {data.appointments.map((appt, i) => (
                                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xs font-bold uppercase text-amber-700 bg-amber-50 px-3 py-1 rounded-full tracking-wide border border-amber-100">
                                                {appt.type || 'Visit'}
                                            </span>
                                            <span className="text-base font-bold text-slate-600">{appt.target_date_or_window}</span>
                                        </div>
                                        <h4 className="font-extrabold text-xl text-slate-900 leading-tight">{appt.specialty_or_clinic || 'Follow-up'}</h4>
                                        {appt.location && <p className="text-base text-slate-500 mt-2 flex items-center gap-1">📍 {appt.location}</p>}
                                    </div>
                                    <Button 
                                        onClick={() => handleSetReminder(appt)} 
                                        variant="secondary" 
                                        className="w-full text-sm py-3 h-auto"
                                    >
                                        <Icons.Bell className="w-4 h-4" /> Set Reminder
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* 2. Daily Routine */}
            <Card className="overflow-hidden border-emerald-100 shadow-xl shadow-emerald-50/50 rounded-3xl">
              <div className="bg-gradient-to-r from-emerald-50 to-white p-8 border-b border-emerald-50">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100"><Icons.Check /></div>
                  <h3 className="text-2xl font-bold text-slate-900">Daily Routine</h3>
                </div>
              </div>
              <div className="p-8">
                <ul className="space-y-6">
                  {safePlan.daily_routine.map((item, i) => (
                    <li key={i} className="flex gap-4 items-start p-3 hover:bg-emerald-50/30 rounded-xl transition-colors">
                      <div className="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-bold shadow-sm">✓</div>
                      <p className="text-slate-700 font-medium text-lg leading-relaxed">{item}</p>
                    </li>
                  ))}
                  {safePlan.daily_routine.length === 0 && <p className="text-slate-400 italic text-lg">No specific daily routine found.</p>}
                </ul>
              </div>
            </Card>

            {/* 3. Warning Signs */}
            <Card className="overflow-hidden border-red-100 shadow-xl shadow-red-50/50 rounded-3xl">
              <div className="bg-gradient-to-r from-red-50 to-white p-8 border-b border-red-50">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl text-red-600 shadow-sm border border-red-100"><Icons.Alert /></div>
                  <h3 className="text-2xl font-bold text-red-900">Warning Signs</h3>
                </div>
              </div>
              <div className="p-8 bg-red-50/30 h-full">
                <p className="text-sm font-bold text-red-700 uppercase tracking-wide mb-6 bg-red-100 w-fit px-3 py-1 rounded-full">Call your doctor if:</p>
                <ul className="space-y-4">
                  {safePlan.warning_signs_card.map((item, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <Icons.Alert className="text-red-500 w-6 h-6 flex-shrink-0 mt-0.5" />
                      <p className="text-slate-800 font-medium text-lg leading-relaxed">{item}</p>
                    </li>
                  ))}
                  {safePlan.warning_signs_card.length === 0 && <p className="text-slate-600 italic">No specific warnings found in the documents.</p>}
                </ul>
              </div>
            </Card>

            {/* 4. Questions for Doctor */}
            {safePlan.doctor_questions.length > 0 && (
                <Card className="overflow-hidden border-indigo-100 shadow-xl shadow-indigo-50/50 rounded-3xl">
                  <div className="bg-gradient-to-r from-indigo-50 to-white p-8 border-b border-indigo-50">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-2xl text-indigo-600 shadow-sm border border-indigo-100"><Icons.Question /></div>
                      <h3 className="text-2xl font-bold text-indigo-900">Questions for Doctor</h3>
                    </div>
                  </div>
                  <div className="p-8">
                    <ul className="space-y-4">
                      {safePlan.doctor_questions.map((item, i) => (
                        <li key={i} className="flex gap-4 items-start">
                           <div className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">?</div>
                           <p className="text-slate-800 font-medium text-lg leading-relaxed">{item}</p>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 pt-4 border-t border-indigo-50">
                        <Button 
                            variant="secondary" 
                            onClick={() => playTTS(`Questions you should ask your doctor: ${safePlan.doctor_questions.join(". ")}`)}
                            className="text-indigo-600 text-sm py-2 hover:bg-indigo-50 border-indigo-200"
                        >
                            <Icons.Speaker className="w-4 h-4" /> Listen to Questions
                        </Button>
                    </div>
                  </div>
                </Card>
            )}

            {/* 5. Visualize Recovery */}
             <Card className="col-span-1 lg:col-span-2 p-10 bg-gradient-to-br from-purple-50 to-white border-purple-100 rounded-3xl shadow-xl shadow-purple-100/50">
                <div className="flex flex-col md:flex-row items-start gap-10">
                    <div className="flex-1 w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <Icons.Sparkle className="w-8 h-8 text-purple-600" />
                            <h3 className="text-3xl font-extrabold text-slate-800">Visualize Your Recovery</h3>
                        </div>
                        <p className="text-slate-600 mb-8 text-lg font-medium">
                            Create a motivational image of your recovery goal to stay inspired.
                        </p>
                        
                        <div className="space-y-4">
                            <textarea
                                value={mediaPrompt}
                                onChange={e => setMediaPrompt(e.target.value)}
                                placeholder="Describe your goal (e.g., 'Walking in a sunny park with my dog')"
                                className="w-full p-4 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none h-28 resize-none bg-white/50 backdrop-blur-sm"
                            />
                            
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={handleGenerateImage} disabled={!mediaPrompt || isGeneratingMedia}>
                                    {isGeneratingMedia && !generatedImage ? <Icons.Spinner /> : <Icons.Camera className="w-5 h-5" />} Generate Image
                                </Button>
                                <Button onClick={handleEditImage} disabled={!generatedImage || isGeneratingMedia} variant="secondary">
                                    <Icons.Sparkle className="w-5 h-5 text-purple-500" /> Edit Image
                                </Button>
                                <Button onClick={handleAnimateImage} disabled={!generatedImage || isGeneratingMedia} variant="secondary">
                                    <Icons.Maximize className="w-5 h-5 text-blue-500" /> Animate (Veo)
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full flex items-center justify-center">
                        <div className="w-full aspect-video bg-slate-100 rounded-2xl border-2 border-dashed border-purple-200 flex items-center justify-center overflow-hidden relative shadow-inner">
                            {isGeneratingMedia ? (
                                <div className="text-purple-500 animate-pulse flex flex-col items-center">
                                    <Icons.Sparkle className="w-10 h-10 mb-2 spin-slow" />
                                    <span className="font-bold">Creating Magic...</span>
                                </div>
                            ) : videoUrl ? (
                                <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                            ) : generatedImage ? (
                                <img src={generatedImage} alt="Generated Goal" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-slate-400 text-center p-6">
                                    <Icons.Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Your vision will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

          </div>
        </div>
      )}
      
      {/* Floating Assistant Button (FAB) */}
      <button 
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-24 right-6 z-40 bg-gradient-to-tr from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-xl shadow-blue-500/40 hover:scale-110 transition-transform active:scale-95 animate-fade-in-up"
        title="Chat with Assistant"
      >
        <Icons.Sparkle className="w-6 h-6" />
      </button>

      <AssistantChat 
          isOpen={chatOpen} 
          onClose={() => setChatOpen(false)} 
          carePlan={carePlan} 
          patientName={data.patient?.name || undefined}
      />
    </div>
  );
}
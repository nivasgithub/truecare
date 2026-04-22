
import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Icons, Button, HelpTip, Breadcrumbs } from './ui';
import { ParsedEpisode, ConsistencyReport, FormattedCarePlan, PlanItem, PillIdentificationResult } from '../types';
import { generateRecoveryVideo } from '../services/video';
import { generateSpeech, generateImage, editImage, playRawAudio, stopAudio } from '../services/media';
import { identifyPill } from '../services/pill_identifier';
import SmartCamera from './SmartCamera';
import AssistantChat from './AssistantChat';
import TechnicalInsightPanel from './TechnicalInsightPanel';

interface CareTransiaResultsProps {
  data: ParsedEpisode;
  consistency: ConsistencyReport | null;
  carePlan: FormattedCarePlan | null;
  onReset: () => void;
  simpleMode?: boolean;
  onBack: () => void;
  onDashboard?: () => void;
}

// Helper to normalize data from potentially old string[] records to new PlanItem[]
function normalizePlanItems(items: any[]): PlanItem[] {
  if (!Array.isArray(items)) return [];
  return items.map(i => {
    if (typeof i === 'string') return { text: i, source: 'Legacy Record' };
    return i;
  });
}

// --- Helper Components ---

const TimelineItem: React.FC<{ timeLabel: string, task: string }> = ({ timeLabel, task }) => (
  <div className="relative pl-8 pb-6 last:pb-0 border-l-2 border-slate-200 last:border-l-0 ml-2">
    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-purple-400"></div>
    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">{timeLabel}</div>
    <div className="text-slate-700 font-medium text-sm leading-relaxed">{task}</div>
  </div>
);

// --- Pill Result Modal Component ---
function PillResultModal({ result, onClose, onPlayTTS }: { result: PillIdentificationResult, onClose: () => void, onPlayTTS: (text: string) => void }) {
    if (!result) return null;
    
    const isMatch = result.match_status === 'confirmed';
    const isNoMatch = result.match_status === 'no_match';
    
    const color = isMatch ? "emerald" : isNoMatch ? "red" : "amber";
    const bgClass = isMatch ? "bg-emerald-50" : isNoMatch ? "bg-red-50" : "bg-amber-50";
    const textClass = isMatch ? "text-emerald-800" : isNoMatch ? "text-red-800" : "text-amber-800";
    const borderClass = isMatch ? "border-emerald-100" : isNoMatch ? "border-red-100" : "border-amber-100";

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-in relative border-4 ${borderClass}`}>
                
                {/* Header */}
                <div className={`${bgClass} p-6 text-center border-b ${borderClass}`}>
                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-white shadow-sm ${textClass}`}>
                        {isMatch ? <Icons.Check className="w-10 h-10" /> : isNoMatch ? <Icons.Close className="w-10 h-10" /> : <Icons.Question className="w-10 h-10" />}
                    </div>
                    <h3 className={`text-2xl font-black uppercase tracking-tight ${textClass}`}>
                        {isMatch ? "Medication Verified" : isNoMatch ? "No Match Found" : "Uncertain Result"}
                    </h3>
                    {isMatch && <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                        {/* CSS Confetti would go here, simplified as pulse */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-400/10 rounded-full animate-pulse"></div>
                    </div>}
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {result.matched_medication_name && (
                        <div className="text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identified As</p>
                            <p className="text-xl font-bold text-slate-900">{result.matched_medication_name}</p>
                        </div>
                    )}
                    
                    <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 border border-slate-100">
                        <span className="font-bold block text-slate-400 text-xs uppercase mb-1">Visual Analysis</span>
                        {result.identified_pill.likely_description}
                    </div>

                    <div className={`p-4 rounded-xl border text-sm font-medium ${isMatch ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                        <span className="font-bold block text-xs uppercase mb-1 opacity-70">Guidance</span>
                        {result.guidance}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button onClick={() => onPlayTTS(result.guidance)} className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-700 shadow-sm flex items-center justify-center gap-2">
                        <Icons.Speaker className="w-4 h-4" /> Listen
                    </button>
                    <button onClick={onClose} className="flex-1 py-3 px-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 flex items-center justify-center gap-2">
                        <Icons.Check className="w-4 h-4" /> Done
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function CareTransiaResults({ data, consistency, carePlan, onReset, simpleMode: initialSimpleMode = false, onBack, onDashboard }: CareTransiaResultsProps) {
  
  const [activeTab, setActiveTab] = useState<'plan' | 'clinical' | 'tools'>('plan');
  // Progressive Disclosure: Local toggle for simple mode
  const [isSimpleMode, setIsSimpleMode] = useState(initialSimpleMode);
  
  const hasIssues = consistency?.status === 'success' && (consistency.conflicts.length > 0 || consistency.gaps.length > 0);
  const isSafetyWarning = consistency?.status === 'warning';
  
  // Emergency Detection
  const isEmergency = consistency?.is_emergency === true;

  // Deep Safety Fallback for Plan Data with Normalization
  const rawFriendlyPlan = (carePlan?.patient_friendly_plan || {}) as any;
  const safePlan = {
    today_and_tomorrow: normalizePlanItems(rawFriendlyPlan.today_and_tomorrow),
    daily_routine: normalizePlanItems(rawFriendlyPlan.daily_routine),
    weekly_or_followup_tasks: normalizePlanItems(rawFriendlyPlan.weekly_or_followup_tasks),
    warning_signs_card: normalizePlanItems(rawFriendlyPlan.warning_signs_card),
    doctor_questions: Array.isArray(rawFriendlyPlan.doctor_questions) ? rawFriendlyPlan.doctor_questions : []
  };

  const planError = carePlan?.status === 'error' ? carePlan.error_message : null;

  // Media State
  const [mediaPrompt, setMediaPrompt] = useState('');
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("16:9");

  // Pill Identification State
  const [showPillCamera, setShowPillCamera] = useState(false);
  const [pillResult, setPillResult] = useState<PillIdentificationResult | null>(null);
  const [isAnalyzingPill, setIsAnalyzingPill] = useState(false);

  // TTS State
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'generating' | 'playing'>('idle');

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  
  // Scroll Awareness for FAB
  const [showFab, setShowFab] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowFab(false); // Hide on scroll down
      } else {
        setShowFab(true); // Show on scroll up
      }
      lastScrollY.current = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effect to reset active tab if hidden by simple mode
  useEffect(() => {
      if (isSimpleMode && activeTab === 'clinical') {
          setActiveTab('plan');
      }
  }, [isSimpleMode, activeTab]);

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

     const actions = safePlan.today_and_tomorrow.length > 0 ? safePlan.today_and_tomorrow.map(i => i.text).join(". ") : "No immediate actions listed.";
     const warnings = safePlan.warning_signs_card.length > 0 ? safePlan.warning_signs_card.map(i => i.text).join(". ") : "No specific warnings listed.";

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

  const handlePillCapture = async (dataUrl: string) => {
      setShowPillCamera(false);
      setIsAnalyzingPill(true);
      setPillResult(null);
      try {
          const result = await identifyPill(dataUrl, data.medications);
          setPillResult(result);
          // Play guidance automatically for accessibility
          playTTS(result.guidance);
      } catch (e) {
          console.error("Pill ID Error", e);
          alert("Failed to identify pill. Please try again.");
      } finally {
          setIsAnalyzingPill(false);
      }
  };

  const handleSetReminder = (appt: any) => {
      // Use Google Calendar for reliable appointment reminders
      const title = encodeURIComponent(`${appt.specialty_or_clinic || 'Doctor Appointment'} (${appt.type})`);
      const details = encodeURIComponent(`Instructions: ${appt.prep_instructions || 'None'}\n\nOriginal Text: ${appt.target_date_or_window}\n\nManaged by CareTransia`);
      const location = encodeURIComponent(appt.location || '');
      
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
      window.open(url, '_blank');
  };

  const handleShare = () => {
      if (navigator.share) {
          navigator.share({
              title: `Care Plan for ${data.patient?.name}`,
              text: 'Here is the generated care plan summary.',
              url: window.location.href
          }).catch(console.error);
      } else {
          alert("Sharing not supported on this device/browser.");
      }
  };

  // Define tabs available based on mode
  const tabs = [
      { id: 'plan', label: 'My Care Plan', icon: Icons.Clipboard },
      { id: 'clinical', label: 'Clinical Details', icon: Icons.Shield, hidden: isSimpleMode },
      { id: 'tools', label: 'Visuals & Tools', icon: Icons.Tools }
  ].filter(t => !t.hidden);

  if (isEmergency) {
      return (
          <div className="fixed inset-0 z-50 bg-red-600 flex items-center justify-center p-6 animate-pulse-slow">
              <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl animate-scale-in">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Icons.Alert className="w-12 h-12 text-red-600" />
                  </div>
                  <h1 className="text-3xl font-black text-red-700 mb-4 uppercase tracking-tight">Emergency Detected</h1>
                  <p className="text-xl font-bold text-slate-800 mb-6">
                      {consistency?.emergency_guidance || "Based on your input, this appears to be a medical emergency."}
                  </p>
                  <p className="text-slate-600 mb-8">
                      CareTransia is an administrative tool, not a medical device. Do not rely on this app for critical care.
                  </p>
                  
                  <div className="flex flex-col gap-4">
                      <a href="tel:911" className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-red-200 flex items-center justify-center gap-2 transition-transform active:scale-95">
                          <Icons.Shield className="w-6 h-6" /> Call 911 Now
                      </a>
                      <button onClick={onReset} className="text-slate-400 hover:text-slate-600 text-sm font-semibold underline mt-2">
                          I understand, go back to start
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="animate-fade-in pb-32 max-w-7xl mx-auto relative print:pb-0">
      
      {/* Result Modal for Pill Scan */}
      {pillResult && (
          <PillResultModal 
              result={pillResult} 
              onClose={() => setPillResult(null)} 
              onPlayTTS={playTTS} 
          />
      )}

      {/* Integrated Back Navigation */}
      <div className="flex items-center justify-between print:hidden mb-4">
        <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2 py-1"
        >
            <Icons.ArrowRight className="w-4 h-4 rotate-180" /> Back to Uploads
        </button>
        {/* Toggle Mode - Segmented Control */}
        <div className="ct-tabs">
            <button 
                onClick={() => setIsSimpleMode(false)}
                data-active={!isSimpleMode}
                className="ct-tab px-4 py-1.5 text-xs font-bold"
            >
                Detailed
            </button>
            <button 
                onClick={() => setIsSimpleMode(true)}
                data-active={isSimpleMode}
                className="ct-tab px-4 py-1.5 text-xs font-bold"
            >
                Simple
            </button>
        </div>
      </div>

      {/* HERO DASHBOARD HEADER - USING NEW CSS VARIABLES */}
      <div 
        className="relative overflow-hidden rounded-[2.5rem] text-white shadow-2xl mb-8 p-8 md:p-12 print:shadow-none print:text-black print:bg-white print:p-0"
        style={{
            background: 'linear-gradient(135deg, var(--ct-hero-from) 0%, var(--ct-hero-mid) 50%, var(--ct-hero-to) 100%)'
        }}
      >
          {/* Background Decorative Elements */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none print:hidden"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/30 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none print:hidden"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
              <div className="space-y-4 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3 print:hidden">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                          <Icons.Check className="w-3 h-3"/> Analysis Complete
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                          <Icons.Shield className="w-3 h-3"/> Private & Local
                      </span>
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                      Recovery Plan for <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 print:text-black">
                          {data.patient?.name || 'Patient'}
                      </span>
                  </h1>
                  
                  <p className="text-blue-200/80 text-sm md:text-base max-w-xl print:text-slate-500 font-medium">
                      Generated from your uploaded documents. No external records accessed.
                  </p>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto print:hidden">
                  <button 
                      onClick={handleMainReadAloud}
                      className={`
                          flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:scale-105 active:scale-95
                          ${ttsStatus === 'playing' 
                              ? 'bg-white text-slate-900 animate-pulse' 
                              : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'}
                      `}
                  >
                      {ttsStatus === 'playing' ? <Icons.Stop className="w-6 h-6" /> : <Icons.Speaker className="w-6 h-6" />}
                      {ttsStatus === 'playing' ? "Stop Listening" : "Listen to Plan"}
                  </button>
                  
                  <div className="flex gap-2">
                      {onDashboard && (
                          <button onClick={onDashboard} className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                              <Icons.Check className="w-4 h-4" /> Save
                          </button>
                      )}
                      <button onClick={handleShare} className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                          <Icons.Share className="w-4 h-4" /> Share
                      </button>
                  </div>
              </div>
          </div>
      </div>
      
      {planError && (
          <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-red-700 flex items-start gap-3 mb-8">
              <Icons.Alert className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                  <h3 className="font-bold text-lg">Plan Generation Issue</h3>
                  <p>{planError}</p>
                  <p className="text-sm mt-2">Some sections may be missing. Please review the clinical data directly.</p>
              </div>
          </div>
      )}

      {/* --- TABS NAVIGATION --- */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto print:hidden mb-8">
          {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              >
                 <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
          ))}
      </div>

      {/* --- TAB CONTENT: MY CARE PLAN --- */}
      {activeTab === 'plan' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Prominent Warning Card (Full Width) */}
          {safePlan.warning_signs_card.length > 0 && (
             <div className="bg-red-50 rounded-3xl p-6 md:p-8 border border-red-100 flex flex-col md:flex-row gap-6 shadow-sm">
                <div className="flex-shrink-0">
                    <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                        <Icons.Alert className="w-8 h-8" />
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-red-900 mb-2">When to Call the Doctor</h3>
                    <p className="text-red-800/80 mb-6 font-medium">Watch for these signs. If you have chest pain or severe shortness of breath, call 911 immediately.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {safePlan.warning_signs_card.map((item, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex items-start gap-3">
                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                                <span className="text-red-900 text-sm font-medium leading-relaxed">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Top Priorities (Wider) */}
            <div className="lg:col-span-2 space-y-6">
               <Card className="p-6 md:p-8 h-full border-t-4 border-t-blue-500 shadow-md">
                   <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                       <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                           <Icons.Check className="w-6 h-6" />
                       </div>
                       <div>
                           <h3 className="text-xl font-bold text-slate-900">Top Priorities</h3>
                           <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Today & Tomorrow</p>
                       </div>
                   </div>
                   <div className="space-y-4">
                       {safePlan.today_and_tomorrow.map((task, i) => (
                           <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors group">
                               <input type="checkbox" className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                               <div className="flex-1">
                                   <div className="text-slate-800 font-medium text-base leading-relaxed">{task.text}</div>
                                   {task.source && (
                                       <div className="text-xs text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                           Source: "{task.source}"
                                       </div>
                                   )}
                               </div>
                           </div>
                       ))}
                       {safePlan.today_and_tomorrow.length === 0 && (
                           <div className="text-slate-400 italic text-center py-8">No immediate tasks listed.</div>
                       )}
                   </div>
               </Card>
            </div>

            {/* Right Column: Routine & Questions (Stacked) */}
            <div className="space-y-6">
               
               {/* Daily Routine - Timeline Style */}
               <Card className="p-6 md:p-8 border-t-4 border-t-purple-500 shadow-md">
                   <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                       <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
                           <Icons.Clock className="w-6 h-6" />
                       </div>
                        <div>
                           <h3 className="text-xl font-bold text-slate-900">Daily Flow</h3>
                           <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Your Schedule</p>
                       </div>
                   </div>
                   <div className="space-y-0">
                       {safePlan.daily_routine.length > 0 ? safePlan.daily_routine.map((task, i) => (
                           <TimelineItem 
                               key={i} 
                               timeLabel={i === 0 ? "Morning" : i === safePlan.daily_routine.length - 1 ? "Evening" : "Daytime"} 
                               task={task.text} 
                           />
                       )) : (
                           <div className="text-slate-400 italic text-center py-4">No specific routine found.</div>
                       )}
                   </div>
               </Card>

               {/* Questions - Notepad Style */}
               <Card className="p-6 md:p-8 bg-amber-50 border-amber-100 border-t-4 border-t-amber-400 shadow-md">
                   <div className="flex items-center gap-3 mb-6 border-b border-amber-200/50 pb-4">
                       <div className="bg-amber-200 p-2 rounded-xl text-amber-700">
                           <Icons.Question className="w-6 h-6" />
                       </div>
                        <div>
                           <h3 className="text-xl font-bold text-amber-900">Ask Doctor</h3>
                           <p className="text-xs text-amber-700 font-bold uppercase tracking-wide">Next Visit</p>
                       </div>
                   </div>
                   <ul className="space-y-3">
                       {safePlan.doctor_questions.map((q, i) => (
                           <li key={i} className="flex gap-3 text-amber-900 text-sm font-medium bg-white/60 p-3 rounded-xl border border-amber-200/50">
                               <span className="font-bold text-amber-500 text-lg leading-none mt-0.5">?</span>
                               <span className="leading-relaxed">{q}</span>
                           </li>
                       ))}
                       {safePlan.doctor_questions.length === 0 && (
                           <li className="text-amber-700/50 italic text-center py-4">No specific questions identified.</li>
                       )}
                   </ul>
               </Card>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: CLINICAL VIEW --- */}
      {activeTab === 'clinical' && (
        <div className="space-y-8 animate-fade-in">
           
           {/* Safety Check (Warning Mode) */}
           {isSafetyWarning && (
             <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                <h3 className="font-bold text-red-800 text-lg mb-2 flex items-center gap-2">
                  <Icons.Alert className="w-6 h-6" /> Safety Check Failed
                </h3>
                <p className="text-red-700 text-sm">
                   The AI could not verify your documents for conflicts or drug interactions. 
                   <span className="font-bold"> Please manually review your original documents.</span>
                </p>
             </div>
           )}

           {/* Safety Check (Normal Results) */}
           {!isSafetyWarning && hasIssues && (
             <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                <h3 className="font-bold text-amber-800 text-lg mb-4 flex items-center gap-2">
                  <Icons.Alert className="w-5 h-5" /> Safety & Consistency Check
                  <HelpTip text="AI looks for gaps (missing info) or conflicts (different instructions) in your papers." className="text-amber-600" />
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {consistency?.conflicts.length ? (
                     <div>
                       <h4 className="font-bold text-amber-700 text-xs uppercase mb-2">Conflicts Detected</h4>
                       <ul className="space-y-2">
                         {consistency.conflicts.map((c, i) => (
                           <li key={i} className="text-sm bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                             {/* Drug Interaction Badge */}
                             {c.type?.toLowerCase().includes('drug') && (
                                 <div className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mb-1 border border-red-200">
                                     <Icons.Alert className="w-3 h-3" /> Drug Interaction
                                 </div>
                             )}
                             {/* Dosage Alert Badge */}
                             {c.type === 'Dosage Alert' && (
                                 <div className="inline-flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mb-1 shadow-sm">
                                     <Icons.Alert className="w-3 h-3" /> Verify Dosage
                                 </div>
                             )}
                             <span className="font-bold block text-slate-800">{c.summary}</span>
                             <span className="text-slate-500">{c.details}</span>
                           </li>
                         ))}
                       </ul>
                     </div>
                   ) : null}
                   {consistency?.gaps.length ? (
                     <div>
                       <h4 className="font-bold text-amber-700 text-xs uppercase mb-2">Information Gaps</h4>
                       <ul className="space-y-2">
                         {consistency.gaps.map((c, i) => (
                           <li key={i} className="text-sm bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                             <span className="font-bold block text-slate-800">{c.summary}</span>
                             <span className="text-slate-500">{c.details}</span>
                           </li>
                         ))}
                       </ul>
                     </div>
                   ) : null}
                </div>
             </div>
           )}

           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900">Extracted Medications</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                   <tr>
                     <th className="p-4 w-1/4">Drug</th>
                     <th className="p-4 w-1/6">Dose</th>
                     <th className="p-4 w-1/6">Freq</th>
                     <th className="p-4">Instructions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {data.medications.length > 0 ? data.medications.map((med, i) => (
                     <tr key={i} className="hover:bg-slate-50">
                       <td className="p-4 font-bold text-slate-900">{med.name}</td>
                       <td className="p-4 font-medium text-slate-700">{med.dose || '-'}</td>
                       <td className="p-4 text-slate-600">{med.frequency || '-'}</td>
                       <td className="p-4 text-slate-600" title={med.timing_notes}>{med.timing_notes || '-'}</td>
                     </tr>
                   )) : (
                     <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No medications found</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>

           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900">Appointments</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                   <tr>
                     <th className="p-4">Type</th>
                     <th className="p-4">Date/Window</th>
                     <th className="p-4">Location</th>
                     <th className="p-4">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {data.appointments.length > 0 ? data.appointments.map((appt, i) => (
                     <tr key={i} className="hover:bg-slate-50">
                       <td className="p-4 font-bold text-slate-900">{appt.type}</td>
                       <td className="p-4">{appt.target_date_or_window}</td>
                       <td className="p-4 text-slate-600 max-w-xs">{appt.location || 'TBD'}</td>
                       <td className="p-4">
                           <button onClick={() => handleSetReminder(appt)} className="text-blue-600 font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm flex items-center gap-1">
                               <Icons.Calendar className="w-3 h-3" /> Set Reminder
                           </button>
                       </td>
                     </tr>
                   )) : (
                     <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No appointments found</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
           
           {/* Technical Summary */}
           {carePlan?.technical_summary_for_clinicians && (
               <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 font-mono text-xs leading-relaxed overflow-x-auto">
                   <h4 className="font-bold text-slate-400 uppercase mb-2">Technical Clinical Summary</h4>
                   {carePlan.technical_summary_for_clinicians}
               </div>
           )}

        </div>
      )}

      {/* --- TAB CONTENT: VISUALS & TOOLS --- */}
      {activeTab === 'tools' && (
        <div className="space-y-8 animate-fade-in">
            
            {showPillCamera && (
                <SmartCamera 
                    onCapture={handlePillCapture} 
                    onClose={() => setShowPillCamera(false)} 
                />
            )}

            {/* Pill Identification Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>
                
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="bg-purple-50 p-2.5 rounded-xl text-purple-600">
                        <Icons.Pill className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Pill Identification</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Verify your medication</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 relative z-10">
                    <div className="flex-1 space-y-4">
                        <p className="text-slate-600 text-sm">
                            Unsure about a pill? Scan it to check if it matches your prescribed medications.
                        </p>
                        <Button onClick={() => setShowPillCamera(true)} disabled={isAnalyzingPill} className="shadow-lg shadow-purple-200/50">
                            {isAnalyzingPill ? <Icons.Spinner className="w-5 h-5" /> : <Icons.Camera className="w-5 h-5" />}
                            {isAnalyzingPill ? "Analyzing..." : "Scan Pill"}
                        </Button>
                    </div>
                    {/* Inline result removed - now handled by PillResultModal */}
                </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-pink-50 p-2.5 rounded-xl text-pink-600">
                        <Icons.Camera className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Recovery Visualization</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Visualize your healing process</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <textarea 
                            value={mediaPrompt}
                            onChange={(e) => setMediaPrompt(e.target.value)}
                            placeholder="Describe a scene (e.g., 'A peaceful garden with a comfortable chair for recovery')..."
                            className="w-full p-4 rounded-xl border border-slate-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none resize-none h-32"
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleGenerateImage} disabled={isGeneratingMedia || !mediaPrompt}>
                                {isGeneratingMedia ? <Icons.Spinner /> : "Generate Image"}
                            </Button>
                            <Button onClick={handleEditImage} disabled={isGeneratingMedia || !generatedImage} variant="secondary">
                                Edit
                            </Button>
                            <Button onClick={handleAnimateImage} disabled={isGeneratingMedia || !generatedImage} variant="secondary">
                                Animate (Video)
                            </Button>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center min-h-[300px] overflow-hidden relative group">
                        {videoUrl ? (
                            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                        ) : generatedImage ? (
                            <img src={generatedImage} alt="Generated" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : (
                            <div className="text-center p-8">
                                <Icons.Camera className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                                <p className="text-slate-400 text-sm">Generated visuals will appear here</p>
                            </div>
                        )}
                        {isGeneratingMedia && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Icons.Spinner className="w-8 h-8 text-pink-500" />
                                    <span className="font-bold text-pink-600 animate-pulse">Creating...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {!isSimpleMode && <TechnicalInsightPanel runTrace={carePlan?.runTrace} selfEvalSummary={carePlan?.selfEvalSummary} />}
      
      {/* FAB for Chat - Hide on Scroll Down, Show on Scroll Up */}
      <div className={`fixed bottom-6 right-6 z-40 transition-transform duration-300 ${showFab ? 'translate-y-0' : 'translate-y-24'} md:bottom-12 md:right-12 print:hidden`}>
          <button 
            onClick={() => setChatOpen(true)}
            className="bg-slate-900 text-white p-4 rounded-full shadow-xl hover:scale-110 transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Open AI Assistant Chat"
          >
            <Icons.Sparkle className="w-6 h-6" />
          </button>
      </div>

      {chatOpen && (
          <AssistantChat 
             isOpen={chatOpen} 
             onClose={() => setChatOpen(false)}
             carePlan={carePlan}
             patientName={data.patient?.name || 'Patient'}
          />
      )}

    </div>
  );
}
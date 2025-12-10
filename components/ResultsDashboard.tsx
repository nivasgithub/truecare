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

interface InstructionRowProps {
  item: PlanItem;
  type: 'checkbox' | 'bullet' | 'warning';
}

// Helper Component for Instructions with Citation
const InstructionRow: React.FC<InstructionRowProps> = ({ item, type }) => {
    // Recommendation: Default to showing sources for trust
    const [showSource, setShowSource] = useState(true);
    const isWarning = type === 'warning';
    
    return (
        <div className="group relative">
            <div className="flex items-start gap-3">
                {type === 'checkbox' && (
                    <input type="checkbox" className="mt-1.5 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                )}
                {type === 'bullet' && (
                     <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                )}
                {type === 'warning' && (
                     <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></span>
                )}
                
                <div className="flex-1">
                    <span className={`text-slate-700 leading-relaxed ${isWarning ? 'text-red-700 font-medium' : ''}`}>
                        {item.text}
                    </span>
                    
                    {/* Citation Toggle - Improved Visibility */}
                    {item.source && (
                        <div className="mt-1">
                             {showSource ? (
                                <div className="flex items-start gap-2 mt-1 animate-fade-in">
                                    <div className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${isWarning ? 'text-red-400' : 'text-slate-400'}`}>Source:</div>
                                    <div className={`text-xs leading-relaxed italic ${isWarning ? 'text-red-600' : 'text-slate-500'}`}>
                                        "{item.source}"
                                        <button onClick={() => setShowSource(false)} className="ml-2 underline opacity-50 hover:opacity-100">Hide</button>
                                    </div>
                                </div>
                             ) : (
                                <button 
                                    onClick={() => setShowSource(true)}
                                    className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 opacity-60 hover:opacity-100 transition-opacity"
                                >
                                    <Icons.FileText className="w-3 h-3" /> Verify Source
                                </button>
                             )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

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

  const handlePrint = () => {
      window.print();
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
    <div className="animate-fade-in space-y-6 pb-32 max-w-6xl mx-auto relative print:pb-0">
      
      {/* Result Modal for Pill Scan */}
      {pillResult && (
          <PillResultModal 
              result={pillResult} 
              onClose={() => setPillResult(null)} 
              onPlayTTS={playTTS} 
          />
      )}

      {/* Integrated Back Navigation */}
      <div className="flex items-center justify-between print:hidden">
        <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2 py-1"
        >
            <Icons.ArrowRight className="w-4 h-4 rotate-180" /> Back to Uploads
        </button>
      </div>

      {/* Dashboard Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-lg shadow-slate-100/50 flex flex-col lg:flex-row lg:items-end justify-between gap-6 print:shadow-none print:border-none print:p-0">
        <div>
           <div className="flex items-center gap-2 mb-3 print:hidden">
             <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wide flex items-center gap-2 border border-emerald-100">
               <Icons.Sparkle className="w-3 h-3"/> Analysis Complete
             </span>
             <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wide flex items-center gap-2 border border-slate-100">
               <Icons.Check className="w-3 h-3"/> Saved to Device
             </span>
           </div>
           <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
             Care Plan for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 print:text-black">{data.patient?.name || 'Patient'}</span>
           </h2>
           <p className="text-xs text-slate-400 mt-2 font-medium print:hidden">
              <span className="font-bold text-slate-500">Transparency Note:</span> This plan was generated using <u>only</u> your uploaded documents. No external records were accessed.
           </p>
        </div>
        
        <div className="flex flex-col items-end gap-4 print:hidden w-full lg:w-auto">
            <div className="flex flex-wrap gap-3 justify-end">
                {/* Done/Dashboard Button - High Priority Action */}
                {onDashboard && (
                    <button 
                        onClick={onDashboard}
                        className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-2xl transition-colors shadow-lg shadow-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 flex items-center gap-2 font-bold text-sm"
                        title="Finish and go to Dashboard"
                    >
                        <Icons.Check className="w-5 h-5" /> Done
                    </button>
                )}

                <button 
                    onClick={handleShare}
                    className="bg-white hover:bg-slate-50 text-slate-700 p-3 rounded-2xl transition-colors border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 font-bold text-sm"
                    title="Share with Family"
                >
                    <Icons.Share className="w-5 h-5" /> Share
                </button>
                
                {/* TTS Button */}
                <button 
                    onClick={handleMainReadAloud}
                    className={`p-3 rounded-2xl transition-all border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 font-bold text-sm shadow-md ${
                        ttsStatus === 'playing' 
                        ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
                        : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:shadow-lg'
                    }`}
                    title={ttsStatus === 'playing' ? "Stop Reading" : "Read Aloud Summary"}
                >
                    {ttsStatus === 'generating' ? (
                        <><Icons.Spinner className="w-5 h-5 text-white/80" /> Generating...</>
                    ) : ttsStatus === 'playing' ? (
                        <><Icons.Stop className="w-5 h-5" /> Stop Audio</>
                    ) : (
                        <><Icons.Speaker className="w-5 h-5" /> Listen to Plan</>
                    )}
                </button>
            </div>
            
            {/* View Toggle (Progressive Disclosure) */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setIsSimpleMode(false)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!isSimpleMode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Detailed
                </button>
                <button 
                    onClick={() => setIsSimpleMode(true)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${isSimpleMode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Simple
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

      {/* --- TABS NAVIGATION --- */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto print:hidden">
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
        <div className="space-y-8 animate-fade-in">
          
          {/* Prominent Warning Card (Sticky-ish logic if desired, for now top of flow) */}
          {safePlan.warning_signs_card.length > 0 && (
             <div className="bg-red-50 rounded-2xl border-2 border-red-100 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start">
                <div className="bg-red-100 p-3 rounded-xl text-red-600">
                    <Icons.Alert className="w-8 h-8" />
                </div>
                <div className="flex-1 space-y-4">
                    <div>
                        <h3 className="text-xl font-bold text-red-800">When to Call the Doctor</h3>
                        <p className="text-red-700/80 text-sm font-medium">Watch for these signs. If you have chest pain or severe shortness of breath, call 911.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {safePlan.warning_signs_card.map((warning: PlanItem, i: number) => (
                            <InstructionRow key={i} item={warning} type="warning" />
                        ))}
                    </div>
                </div>
             </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Immediate Actions */}
            <div className="space-y-4">
               <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                 <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><Icons.Check className="w-5 h-5" /></div>
                 Today & Tomorrow
               </h3>
               {safePlan.today_and_tomorrow.length > 0 ? (
                 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    {safePlan.today_and_tomorrow.map((task: PlanItem, i: number) => (
                      <InstructionRow key={i} item={task} type="checkbox" />
                    ))}
                 </div>
               ) : (
                 <div className="bg-slate-50 rounded-2xl p-6 text-slate-500 italic">No immediate tasks listed.</div>
               )}
            </div>

            {/* Daily Routine */}
            <div className="space-y-4">
               <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                 <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600"><Icons.Calendar className="w-5 h-5" /></div>
                 Daily Routine
               </h3>
               {safePlan.daily_routine.length > 0 ? (
                 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    {safePlan.daily_routine.map((task: PlanItem, i: number) => (
                      <InstructionRow key={i} item={task} type="bullet" />
                    ))}
                 </div>
               ) : (
                 <div className="bg-slate-50 rounded-2xl p-6 text-slate-500 italic">No daily routine listed.</div>
               )}
            </div>
          </div>

          {/* Questions Section */}
          <div className="space-y-4">
               <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                 <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600"><Icons.Question className="w-5 h-5" /></div>
                 Questions for Doctor
               </h3>
               {safePlan.doctor_questions.length > 0 ? (
                 <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 space-y-3">
                    <p className="font-bold text-amber-800 text-sm mb-2">Ask these at your follow-up:</p>
                    {safePlan.doctor_questions.map((q: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 text-amber-900 bg-white/50 p-3 rounded-lg border border-amber-100/50">
                         <span className="mt-0.5 font-bold text-amber-500">?</span>
                         <span>{q}</span>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="bg-slate-50 rounded-2xl p-6 text-slate-500 italic">No specific questions identified from gaps.</div>
               )}
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
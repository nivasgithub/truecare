import React, { useState, useRef, useEffect } from 'react';
import { Card, Badge, Icons, Button } from './ui';
import { ParsedEpisode, ConsistencyReport, FormattedCarePlan, ChatMessage } from '../types';
import { queryCarePlan } from '../services/planner';
import { generateRecoveryVideo } from '../services/video';
import { generateSpeech, generateImage, editImage, playRawAudio } from '../services/media';

interface CareTransiaResultsProps {
  data: ParsedEpisode;
  consistency: ConsistencyReport | null;
  carePlan: FormattedCarePlan | null;
  onReset: () => void;
}

export default function CareTransiaResults({ data, consistency, carePlan, onReset }: CareTransiaResultsProps) {
  
  const [view, setView] = useState<'playbook' | 'clinical'>('playbook'); 
  const [showDebug, setShowDebug] = useState(false);
  const hasIssues = consistency?.status === 'success' && (consistency.conflicts.length > 0 || consistency.gaps.length > 0);

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: `Hi! I've reviewed ${data.patient.name || 'the patient'}'s discharge plan. Ask me anything about medications, appointments, or what to do next.`, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Media State
  const [mediaPrompt, setMediaPrompt] = useState('');
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("16:9");

  // TTS State
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'generating' | 'playing'>('idle');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatOpen]);

  const handleSend = async () => {
    if (!input.trim() || !carePlan) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const result = await queryCarePlan(carePlan, messages, userMsg.text);
      let groundingText = "";
      if (result.groundingMetadata?.groundingChunks) {
         const chunks = result.groundingMetadata.groundingChunks;
         const links: string[] = [];
         chunks.forEach((c: any) => {
             if (c.web?.uri) links.push(`[${c.web.title || 'Source'}](${c.web.uri})`);
             if (c.maps?.uri) links.push(`[${c.maps.title || 'Map Location'}](${c.maps.uri})`);
         });
         if (links.length > 0) {
             groundingText = "\n\n**Sources:**\n" + links.join("\n");
         }
      }

      const botMsg: ChatMessage = { 
          id: (Date.now() + 1).toString(), 
          role: 'model', 
          text: result.text + groundingText, 
          timestamp: Date.now() 
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I encountered an error. Please try again.", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const playTTS = async (text: string) => {
    if (ttsStatus !== 'idle') return;
    
    setTtsStatus('generating');
    try {
         // simplistic strip: remove * and # and links for reading
         const cleanText = text.replace(/[*#]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
         
         const base64Audio = await generateSpeech(cleanText);
         
         setTtsStatus('playing');
         await playRawAudio(base64Audio);

    } catch(e) {
         console.error("TTS Error", e);
    } finally {
         setTtsStatus('idle');
    }
  };

  const handleMainReadAloud = () => {
     if (!carePlan) return;
     
     const questions = carePlan.patient_friendly_plan.doctor_questions && carePlan.patient_friendly_plan.doctor_questions.length > 0 
        ? `Questions you might want to ask your doctor: ${carePlan.patient_friendly_plan.doctor_questions.join(". ")}`
        : "";

     const textToRead = `Here is the care plan for ${data.patient.name}. 
         Today and tomorrow: ${carePlan.patient_friendly_plan.today_and_tomorrow.join(". ")}. 
         Remember: ${carePlan.patient_friendly_plan.warning_signs_card.join(". ")}.
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
    <div className="animate-fade-in space-y-8 pb-32 max-w-6xl mx-auto">
      
      {/* Dashboard Header - Unified Soothing Style */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg shadow-slate-100/50 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-3">
             <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wide flex items-center gap-2 border border-emerald-100">
               <Icons.Sparkle className="w-3 h-3"/> Analysis Complete
             </span>
           </div>
           <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
             Care Plan for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{data.patient.name || 'Patient'}</span>
           </h2>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={handleMainReadAloud}
                disabled={ttsStatus !== 'idle'}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-4 rounded-2xl transition-colors disabled:opacity-50 border border-slate-200"
                title="Read Aloud Summary"
            >
                {ttsStatus === 'generating' ? (
                     <div className="flex items-center gap-2"><Icons.Spinner className="w-6 h-6 text-blue-500" /> <span className="font-bold hidden md:inline">Generating...</span></div>
                ) : ttsStatus === 'playing' ? (
                     <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div> <span className="font-bold hidden md:inline">Speaking...</span></div>
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

      {/* --- PATIENT PLAYBOOK VIEW --- */}
      {view === 'playbook' && carePlan && (
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
                  {carePlan.patient_friendly_plan.today_and_tomorrow.map((item, i) => (
                    <li key={i} className="flex gap-5 items-start group p-4 hover:bg-blue-50/50 rounded-2xl transition-colors cursor-default">
                      <div className="w-8 h-8 rounded-full border-4 border-blue-100 bg-white group-hover:border-blue-400 transition-colors flex-shrink-0 mt-1"></div>
                      <p className="text-slate-800 font-medium text-xl leading-relaxed">{item}</p>
                    </li>
                  ))}
                  {carePlan.patient_friendly_plan.today_and_tomorrow.length === 0 && <p className="text-slate-400 italic text-lg">No immediate actions found.</p>}
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
                  {carePlan.patient_friendly_plan.daily_routine.map((item, i) => (
                    <li key={i} className="flex gap-4 items-start p-3 hover:bg-emerald-50/30 rounded-xl transition-colors">
                      <div className="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-bold shadow-sm">✓</div>
                      <p className="text-slate-700 font-medium text-lg leading-relaxed">{item}</p>
                    </li>
                  ))}
                  {carePlan.patient_friendly_plan.daily_routine.length === 0 && <p className="text-slate-400 italic text-lg">No specific daily routine found.</p>}
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
                  {carePlan.patient_friendly_plan.warning_signs_card.map((item, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <Icons.Alert className="text-red-500 w-6 h-6 flex-shrink-0 mt-0.5" />
                      <p className="text-slate-800 font-medium text-lg leading-relaxed">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* 4. Questions for Doctor (Newly Added) */}
            {carePlan.patient_friendly_plan.doctor_questions.length > 0 && (
                <Card className="overflow-hidden border-indigo-100 shadow-xl shadow-indigo-50/50 rounded-3xl">
                  <div className="bg-gradient-to-r from-indigo-50 to-white p-8 border-b border-indigo-50">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-2xl text-indigo-600 shadow-sm border border-indigo-100"><Icons.Question /></div>
                      <h3 className="text-2xl font-bold text-indigo-900">Questions for Doctor</h3>
                    </div>
                  </div>
                  <div className="p-8">
                    <ul className="space-y-4">
                      {carePlan.patient_friendly_plan.doctor_questions.map((item, i) => (
                        <li key={i} className="flex gap-4 items-start">
                           <div className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">?</div>
                           <p className="text-slate-800 font-medium text-lg leading-relaxed">{item}</p>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 pt-4 border-t border-indigo-50">
                        <Button 
                            variant="secondary" 
                            onClick={() => playTTS(`Questions you should ask your doctor: ${carePlan.patient_friendly_plan.doctor_questions.join(". ")}`)}
                            disabled={ttsStatus !== 'idle'}
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
                                onChange={(e) => setMediaPrompt(e.target.value)}
                                placeholder="Describe your recovery goal (e.g., 'Playing catch with my dog in the park')..."
                                className="w-full px-6 py-4 rounded-2xl border border-purple-200 focus:ring-4 focus:ring-purple-100 outline-none h-28 resize-none text-lg placeholder-purple-300"
                            />
                            
                            <div className="flex gap-3">
                                {generatedImage ? (
                                    <>
                                        <Button onClick={handleGenerateImage} disabled={isGeneratingMedia} variant="secondary" className="text-sm py-3">New</Button>
                                        <Button onClick={handleEditImage} disabled={isGeneratingMedia} variant="secondary" className="text-sm py-3">Edit (Flash)</Button>
                                        <Button onClick={handleAnimateImage} disabled={isGeneratingMedia} className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-3 px-6 shadow-lg shadow-purple-200">
                                            {isGeneratingMedia ? "Processing..." : "Animate (Veo)"}
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={handleGenerateImage} disabled={isGeneratingMedia || !mediaPrompt} className="bg-purple-600 hover:bg-purple-700 text-white flex-1 py-4 text-lg font-bold shadow-lg shadow-purple-200 rounded-xl">
                                        {isGeneratingMedia ? <Icons.Spinner /> : "Generate Image"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-1/3 aspect-video bg-white rounded-2xl overflow-hidden flex items-center justify-center shadow-inner border border-purple-100 relative">
                        {videoUrl ? (
                            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                        ) : generatedImage ? (
                            <img src={generatedImage} alt="Recovery Goal" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center p-6 opacity-40">
                                <Icons.Camera className="w-12 h-12 mx-auto mb-2 text-purple-300" />
                                <p className="text-purple-400 font-medium">Preview Area</p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

          </div>
          
          <div className="flex justify-center pt-10">
            <Button variant="secondary" onClick={onReset} className="text-red-500 border-red-100 hover:bg-red-50 px-8 py-4 rounded-xl text-lg">
               Start Over
            </Button>
          </div>
        </div>
      )}

      {/* --- CLINICIAN VIEW --- */}
      {view === 'clinical' && (
        <div className="space-y-8 animate-fade-in">
           {/* ... existing clinician view code ... */}
          <Card className="p-8 border-l-8 border-l-blue-600 rounded-3xl">
            <div className="flex items-center gap-4 mb-6">
                <div className="bg-blue-50 p-3 rounded-2xl text-blue-700">
                    <Icons.User className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Clinical Summary</h2>
            </div>
            {carePlan?.technical_summary_for_clinicians ? (
                <div className="prose prose-slate max-w-none prose-lg">
                    <p className="leading-relaxed text-slate-700">
                        {carePlan.technical_summary_for_clinicians}
                    </p>
                </div>
            ) : (
                <p className="text-slate-400 italic">No summary generated.</p>
            )}
          </Card>
          
          {hasIssues && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...(consistency?.conflicts || []), ...(consistency?.gaps || [])].map((issue, i) => (
                  <div key={i} className={`p-6 rounded-3xl border-l-8 shadow-sm bg-white ${issue.severity === 'critical' ? 'border-l-red-500 border-red-100' : 'border-l-amber-400 border-amber-100'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <Badge color={issue.severity === 'critical' ? 'red' : 'amber'}>{issue.type}</Badge>
                    </div>
                    <p className="font-bold text-slate-900 text-lg mb-2">{issue.summary}</p>
                    <p className="text-base text-slate-600 leading-relaxed">{issue.details}</p>
                  </div>
                ))}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="overflow-hidden rounded-3xl">
                <div className="bg-slate-50 p-6 border-b border-slate-100 font-bold text-slate-700 text-lg">Medications ({data.medications.length})</div>
                <div className="divide-y divide-slate-100">
                    {data.medications.map((m, i) => (
                        <div key={i} className="p-6 hover:bg-slate-50">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="font-bold text-slate-900 text-xl">{m.name}</span> 
                                <span className="text-base font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{m.dose}</span>
                            </div>
                            <div className="text-base text-slate-600">{m.frequency} • {m.route}</div>
                        </div>
                    ))}
                </div>
            </Card>
             <Card className="overflow-hidden rounded-3xl">
                <div className="bg-slate-50 p-6 border-b border-slate-100 font-bold text-slate-700 text-lg">Instructions & Follow-up</div>
                <div className="divide-y divide-slate-100">
                    {data.appointments.map((a, i) => (
                        <div key={i} className="p-6 hover:bg-slate-50">
                            <div className="font-bold text-blue-600 text-sm uppercase tracking-wide mb-1">{a.target_date_or_window}</div>
                            <div className="text-slate-900 font-bold text-lg">{a.specialty_or_clinic || 'Follow-up'}</div>
                        </div>
                    ))}
                </div>
            </Card>
          </div>
        </div>
      )}

      {/* --- AI ASSISTANT CHAT --- */}
      {view === 'playbook' && (
         <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4">
             {chatOpen && (
                 <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-80 md:w-96 h-[500px] flex flex-col overflow-hidden animate-fade-in-up">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2 font-bold text-lg">
                            <Icons.Sparkle className="w-5 h-5" /> CareTransia Assistant
                        </div>
                        <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><span className="text-2xl leading-none">&times;</span></button>
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto bg-slate-50 space-y-4">
                        {messages.map((m) => (
                            <div key={m.id} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {m.role === 'model' && (
                                    <div className={`max-w-[85%] p-4 rounded-2xl text-base shadow-sm bg-white border border-slate-200 text-slate-800 rounded-bl-none`}>
                                        <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>').replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="underline font-bold hover:text-blue-200">$1</a>') }} />
                                    </div>
                                )}
                                {m.role === 'model' && (
                                   <button 
                                      onClick={() => playTTS(m.text)} 
                                      disabled={ttsStatus !== 'idle'} 
                                      className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 mb-1 hover:bg-blue-50 transition-colors flex-shrink-0"
                                      title="Read Aloud"
                                   >
                                      {ttsStatus === 'generating' ? <Icons.Spinner className="w-4 h-4 text-blue-500" /> : <Icons.Speaker className="w-4 h-4" />}
                                   </button>
                                )}
                                {m.role === 'user' && (
                                    <div className={`max-w-[85%] p-4 rounded-2xl text-base shadow-sm bg-blue-600 text-white rounded-br-none`}>
                                        <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>') }} />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1.5 items-center">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about your plan..."
                            className="flex-1 bg-slate-100 rounded-full px-5 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500 border border-transparent focus:border-blue-200"
                        />
                        <button onClick={handleSend} disabled={!input.trim()} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-200">
                            <Icons.Send className="w-5 h-5" />
                        </button>
                    </div>
                 </div>
             )}
             <button 
                onClick={() => setChatOpen(!chatOpen)}
                className="bg-gradient-to-tr from-blue-600 to-purple-600 text-white p-5 rounded-full shadow-2xl shadow-blue-500/40 hover:scale-110 transition-transform font-bold flex items-center gap-3 group"
             >
                 {chatOpen ? (
                     <span className="text-3xl leading-none px-1">&times;</span>
                 ) : (
                     <><Icons.Sparkle className="w-7 h-7 group-hover:rotate-12 transition-transform" /> <span className="hidden md:inline pr-1 text-lg">Ask AI</span></>
                 )}
             </button>
         </div>
      )}

      {/* Dev Debug Toggle */}
      <div className="mt-12 pt-8 border-t border-slate-200 opacity-50 hover:opacity-100 transition-opacity">
        <button onClick={() => setShowDebug(!showDebug)} className="text-slate-400 text-xs hover:text-slate-600">
          {showDebug ? 'Hide Debug' : 'Show Debug Data'}
        </button>
        {showDebug && (
          <pre className="mt-4 p-4 bg-slate-900 text-slate-300 rounded-xl overflow-auto text-xs max-h-64">
            {JSON.stringify({ data, consistency, carePlan }, null, 2)}
          </pre>
        )}
      </div>

    </div>
  );
}
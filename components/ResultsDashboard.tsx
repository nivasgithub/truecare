import React, { useState, useRef, useEffect } from 'react';
import { Card, Badge, Icons, Button } from './ui';
import { ParsedEpisode, ConsistencyReport, FormattedCarePlan, ChatMessage } from '../types';
import { queryCarePlan, generateRecoveryVideo } from '../api';

interface TrueCareResultsProps {
  data: ParsedEpisode;
  consistency: ConsistencyReport | null;
  carePlan: FormattedCarePlan | null;
  onReset: () => void;
}

export default function TrueCareResults({ data, consistency, carePlan, onReset }: TrueCareResultsProps) {
  
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

  // Video State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

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
      // API call to Gemini
      const replyText = await queryCarePlan(carePlan, messages, userMsg.text);
      
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: replyText, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt) return;
    setGeneratingVideo(true);
    try {
        const result = await generateRecoveryVideo(`A cinematic, inspiring video of: ${videoPrompt}. Soft lighting, peaceful atmosphere, high quality.`);
        setVideoUrl(result.uri);
    } catch (e) {
        console.error("Video generation failed", e);
        alert("Sorry, we couldn't generate the video right now.");
    } finally {
        setGeneratingVideo(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pb-32">
      
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-200">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
               <Icons.Sparkle className="w-3 h-3"/> Analysis Complete
             </span>
           </div>
           <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
             Care Plan for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{data.patient.name || 'Patient'}</span>
           </h2>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('playbook')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${view === 'playbook' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icons.Clipboard className="w-4 h-4" /> Patient View
          </button>
          <button 
            onClick={() => setView('clinical')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${view === 'clinical' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icons.Shield className="w-4 h-4" /> Clinician View
          </button>
        </div>
      </div>

      {/* --- PATIENT PLAYBOOK VIEW --- */}
      {view === 'playbook' && carePlan && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 1. Immediate Actions (Hero Card) */}
            <Card className="col-span-1 lg:col-span-2 overflow-hidden border-blue-200 shadow-lg shadow-blue-100/50">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 border-b border-blue-100">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-white p-2.5 rounded-xl text-blue-600 shadow-sm"><Icons.Calendar /></div>
                  <h3 className="text-2xl font-bold text-slate-800">Today & Tomorrow</h3>
                </div>
                <p className="text-slate-600 ml-[3.25rem]">The most important things to do right now.</p>
              </div>
              <div className="p-8">
                <ul className="space-y-6">
                  {carePlan.patient_friendly_plan.today_and_tomorrow.map((item, i) => (
                    <li key={i} className="flex gap-4 items-start group">
                      <div className="w-6 h-6 rounded-full border-2 border-blue-200 group-hover:border-blue-500 group-hover:bg-blue-50 transition-colors flex-shrink-0 mt-1"></div>
                      <p className="text-slate-700 font-medium text-lg leading-relaxed">{item}</p>
                    </li>
                  ))}
                  {carePlan.patient_friendly_plan.today_and_tomorrow.length === 0 && <p className="text-slate-400 italic">No immediate actions found.</p>}
                </ul>
              </div>
            </Card>

            {/* 2. Daily Routine */}
            <Card className="overflow-hidden border-emerald-100 shadow-lg shadow-emerald-50/50">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl text-emerald-600 shadow-sm"><Icons.Check /></div>
                  <h3 className="text-xl font-bold text-slate-800">Daily Routine</h3>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  {carePlan.patient_friendly_plan.daily_routine.map((item, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <div className="bg-emerald-100 text-emerald-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                      <p className="text-slate-700 font-medium text-lg">{item}</p>
                    </li>
                  ))}
                  {carePlan.patient_friendly_plan.daily_routine.length === 0 && <p className="text-slate-400 italic">No specific daily routine found.</p>}
                </ul>
              </div>
            </Card>

            {/* 3. Warning Signs */}
            <Card className="overflow-hidden border-red-100 shadow-lg shadow-red-50/50">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 border-b border-red-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl text-red-600 shadow-sm"><Icons.Alert /></div>
                  <h3 className="text-xl font-bold text-red-900">Warning Signs</h3>
                </div>
              </div>
              <div className="p-6 bg-red-50/30 h-full">
                <p className="text-sm font-bold text-red-800 uppercase tracking-wide mb-4">Call your doctor if:</p>
                <ul className="space-y-3">
                  {carePlan.patient_friendly_plan.warning_signs_card.map((item, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <Icons.Alert className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-slate-800 font-medium">{item}</p>
                    </li>
                  ))}
                  {carePlan.patient_friendly_plan.warning_signs_card.length === 0 && <p className="text-slate-400 italic">No specific warnings found.</p>}
                </ul>
              </div>
            </Card>

            {/* 4. Upcoming / Questions */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-6 bg-slate-50 border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Icons.Calendar className="text-indigo-500"/> Before Next Visit</h4>
                    <ul className="space-y-3">
                         {carePlan.patient_friendly_plan.weekly_or_followup_tasks.length > 0 ? (
                            carePlan.patient_friendly_plan.weekly_or_followup_tasks.map((item, i) => (
                            <li key={i} className="flex gap-3 text-slate-700 font-medium">
                                <span className="text-indigo-400">•</span> {item}
                            </li>
                            ))
                        ) : <p className="text-slate-400 italic">No specific tasks.</p>}
                    </ul>
                </Card>

                <Card className="p-6 bg-amber-50 border-amber-200">
                    <h4 className="font-bold text-amber-900 mb-4 flex items-center gap-2"><Icons.Question className="text-amber-600"/> Ask Your Doctor</h4>
                     {carePlan.patient_friendly_plan.doctor_questions.length > 0 ? (
                         <ul className="space-y-3">
                          {carePlan.patient_friendly_plan.doctor_questions.map((item, i) => (
                            <li key={i} className="flex gap-3 items-start bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                              <span className="text-amber-500 font-bold select-none">Q.</span>
                              <p className="text-slate-800 font-medium text-sm">{item}</p>
                            </li>
                          ))}
                         </ul>
                       ) : (
                         <p className="text-amber-700/60 italic text-sm">No specific questions identified.</p>
                       )}
                </Card>
            </div>
            
            {/* 5. Visualize Recovery (New Feature) */}
             <Card className="col-span-1 lg:col-span-2 p-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <Icons.Sparkle className="w-6 h-6 text-purple-600" />
                            <h3 className="text-2xl font-bold text-slate-800">Visualize Your Recovery</h3>
                        </div>
                        <p className="text-slate-600 mb-6">
                            Stay motivated by visualizing your goal. Describe what a full recovery looks like for you (e.g., "Walking my dog on a sunny day"), and our AI will create a personalized video to keep you inspired.
                        </p>
                        
                        {!videoUrl && (
                             <div className="flex gap-3">
                                <input 
                                    value={videoPrompt}
                                    onChange={(e) => setVideoPrompt(e.target.value)}
                                    placeholder="E.g. Playing with grandkids in the garden..."
                                    className="flex-1 px-4 py-3 rounded-xl border border-purple-200 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                                <Button 
                                    onClick={handleGenerateVideo} 
                                    disabled={generatingVideo || !videoPrompt}
                                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200"
                                >
                                    {generatingVideo ? <Icons.Spinner /> : "Generate Video"}
                                </Button>
                            </div>
                        )}
                    </div>
                    
                    <div className="w-full md:w-1/3 aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center shadow-lg relative">
                        {videoUrl ? (
                            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center p-4">
                                {generatingVideo ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <Icons.Spinner className="w-8 h-8 text-purple-500" />
                                        <p className="text-slate-400 text-sm">Dreaming up your video...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 opacity-50">
                                        <Icons.Camera className="w-8 h-8 text-white" />
                                        <p className="text-slate-400 text-xs">Video Preview</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

          </div>
          
          <div className="flex justify-center pt-8">
            <Button variant="secondary" onClick={onReset} className="text-red-500 border-red-100 hover:bg-red-50">
               Start Over
            </Button>
          </div>
        </div>
      )}

      {/* --- CLINICIAN VIEW --- */}
      {view === 'clinical' && (
        <div className="space-y-8 animate-fade-in">

          {/* Clinical Summary */}
          <Card className="p-8 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-50 p-2.5 rounded-xl text-blue-700">
                    <Icons.User className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Clinical Summary</h2>
            </div>
            {carePlan?.technical_summary_for_clinicians ? (
                <div className="prose prose-slate max-w-none">
                    <p className="text-lg leading-relaxed text-slate-700">
                        {carePlan.technical_summary_for_clinicians}
                    </p>
                </div>
            ) : (
                <p className="text-slate-400 italic">No summary generated.</p>
            )}
          </Card>
          
          {/* Safety Alerts Grid */}
          {hasIssues && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...(consistency?.conflicts || []), ...(consistency?.gaps || [])].map((issue, i) => (
                  <div key={i} className={`p-5 rounded-2xl border border-l-4 shadow-sm bg-white ${issue.severity === 'critical' ? 'border-l-red-500 border-red-100' : 'border-l-amber-400 border-amber-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <Badge color={issue.severity === 'critical' ? 'red' : 'amber'}>{issue.type}</Badge>
                    </div>
                    <p className="font-bold text-slate-800 mb-1">{issue.summary}</p>
                    <p className="text-sm text-slate-600">{issue.details}</p>
                  </div>
                ))}
            </div>
          )}

          {/* Raw Data Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-100 font-bold text-slate-700">Medications ({data.medications.length})</div>
                <div className="divide-y divide-slate-100">
                    {data.medications.map((m, i) => (
                        <div key={i} className="p-4 hover:bg-slate-50">
                            <div className="flex justify-between"><span className="font-bold text-slate-900">{m.name}</span> <span className="text-sm text-slate-500">{m.dose}</span></div>
                            <div className="text-sm text-slate-600 mt-1">{m.frequency} • {m.route}</div>
                        </div>
                    ))}
                </div>
            </Card>
             <Card className="overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-100 font-bold text-slate-700">Instructions & Follow-up</div>
                <div className="divide-y divide-slate-100">
                    {data.appointments.map((a, i) => (
                        <div key={i} className="p-4 hover:bg-slate-50">
                            <div className="font-bold text-blue-600 text-sm mb-1">{a.target_date_or_window}</div>
                            <div className="text-slate-900">{a.specialty_or_clinic || 'Follow-up'}</div>
                        </div>
                    ))}
                    {data.activities.map((a, i) => (
                        <div key={i} className="p-4 hover:bg-slate-50">
                             <div className="text-slate-900">{a.instruction}</div>
                             <div className="text-xs font-bold text-purple-600 mt-1 uppercase">{a.category}</div>
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
                 <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-80 md:w-96 h-[500px] flex flex-col overflow-hidden animate-fade-in-up">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2 font-bold">
                            <Icons.Sparkle className="w-4 h-4" /> TrueCare Assistant
                        </div>
                        <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><span className="text-xl leading-none">&times;</span></button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about your plan..."
                            className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={handleSend} disabled={!input.trim()} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50">
                            <Icons.Send className="w-4 h-4" />
                        </button>
                    </div>
                 </div>
             )}
             <button 
                onClick={() => setChatOpen(!chatOpen)}
                className="bg-gradient-to-tr from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-xl shadow-blue-500/30 hover:scale-110 transition-transform font-bold flex items-center gap-2"
             >
                 {chatOpen ? (
                     <span className="text-2xl leading-none px-1">&times;</span>
                 ) : (
                     <><Icons.Sparkle className="w-6 h-6" /> <span className="hidden md:inline pr-1">Ask AI</span></>
                 )}
             </button>
         </div>
      )}

      {/* Dev Debug Toggle */}
      <div className="mt-12 pt-8 border-t border-slate-200">
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
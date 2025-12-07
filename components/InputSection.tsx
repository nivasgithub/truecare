import React, { useRef, useState, useEffect } from 'react';
import { Icons, Card, Button, SectionTitle } from './ui';
import { PatientInfo, UploadedFile, ChatMessage } from '../types';
import SmartCamera from './SmartCamera';
import { runIntakeAgent } from '../services/intake_agent';
import { generateSpeech, playRawAudio } from '../services/media';

interface CareTransiaIntakeProps {
  patientInfo: PatientInfo;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  notes: string;
  setNotes: (s: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  progressMsg?: string;
}

export default function CareTransiaIntake({ 
  patientInfo, setPatientInfo, 
  files, setFiles, 
  notes, setNotes, 
  onAnalyze, isLoading,
  progressMsg = "Processing..."
}: CareTransiaIntakeProps) {
  
  const [mode, setMode] = useState<'agent' | 'manual'>('agent');
  const [showCamera, setShowCamera] = useState(false);

  // --- Common Handlers ---
  const addFile = (dataUrl: string, mimeType: string) => {
    setFiles(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      data: dataUrl.split(',')[1],
      mimeType: mimeType,
      preview: dataUrl
    }]);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      
      {showCamera && (
        <SmartCamera 
          onCapture={(dataUrl) => {
            addFile(dataUrl, 'image/jpeg');
            setShowCamera(false);
          }} 
          onClose={() => setShowCamera(false)} 
        />
      )}

      {/* Mode Switcher */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm inline-flex">
          <button 
            onClick={() => setMode('agent')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'agent' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Icons.Sparkle className="w-4 h-4" /> AI Assistant
          </button>
          <button 
            onClick={() => setMode('manual')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'manual' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Icons.Note className="w-4 h-4" /> Manual Form
          </button>
        </div>
      </div>

      {mode === 'agent' ? (
        <AgentIntake 
           patientInfo={patientInfo} setPatientInfo={setPatientInfo}
           files={files} addFile={addFile}
           onCamera={() => setShowCamera(true)}
           onAnalyze={onAnalyze}
           isLoading={isLoading}
           progressMsg={progressMsg}
        />
      ) : (
        <ManualIntake 
           patientInfo={patientInfo} setPatientInfo={setPatientInfo}
           files={files} setFiles={setFiles}
           notes={notes} setNotes={setNotes}
           onAnalyze={onAnalyze}
           isLoading={isLoading}
           progressMsg={progressMsg}
           onCamera={() => setShowCamera(true)}
           addFile={addFile}
        />
      )}

    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: AGENT CHAT INTERFACE
// ----------------------------------------------------------------------

function AgentIntake({ 
    patientInfo, setPatientInfo, 
    files, addFile, 
    onCamera, onAnalyze, 
    isLoading, progressMsg 
}: {
    patientInfo: PatientInfo;
    setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
    files: UploadedFile[];
    addFile: (d: string, m: string) => void;
    onCamera: () => void;
    onAnalyze: () => void;
    isLoading: boolean;
    progressMsg: string;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { 
            id: 'welcome', 
            role: 'model', 
            text: "Hi, I'm CareTransia. I can help you build a care plan quickly. Who is this plan for?", 
            timestamp: Date.now() 
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>(["It's for me", "For my parent", "For my spouse"]);
    
    // Voice & TTS State
    const [isListening, setIsListening] = useState(false);
    const [ttsStatus, setTtsStatus] = useState<'idle' | 'generating' | 'playing'>('idle');
    const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    
    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking, ttsStatus]);

    const playTTS = async (text: string, id?: string) => {
        if (ttsStatus !== 'idle') return; // Prevent double play
        
        setTtsStatus('generating');
        if (id) setActiveAudioId(id);

        try {
             const cleanText = text.replace(/[*#]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
             const base64Audio = await generateSpeech(cleanText);
             
             setTtsStatus('playing');
             await playRawAudio(base64Audio);
        } catch(e) {
             console.error("TTS Error", e);
             alert("Could not generate audio.");
        } finally {
             setTtsStatus('idle');
             setActiveAudioId(null);
        }
    };

    const handleSend = async (text: string) => {
        if (!text.trim()) return;
        
        const autoPlayResponse = isListening;

        if (isListening) {
             if (recognitionRef.current) {
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.stop();
            }
            setIsListening(false);
        }

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);
        setSuggestions([]); 

        try {
            const response = await runIntakeAgent(patientInfo, files.length, messages, text);
            
            if (response.extracted_info) {
                setPatientInfo(prev => ({
                    ...prev,
                    ...response.extracted_info
                }));
            }

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text,
                timestamp: Date.now(),
                widget: response.widget
            };
            setMessages(prev => [...prev, botMsg]);
            setSuggestions(response.suggestions || []);

            // Auto Play Logic with Visual Feedback
            if (autoPlayResponse) {
                playTTS(response.text, botMsg.id);
            }

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I'm having a little trouble connecting. Please try again.", timestamp: Date.now() }]);
        } finally {
            setIsThinking(false);
        }
    };

    // ... (Existing handlers: handleFileSelect, toggleDictation, completionScore) ...
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if(ev.target?.result) addFile(ev.target.result as string, file.type);
                };
                reader.readAsDataURL(file);
            });
            handleSend("I've uploaded the files.");
        }
    };

    const toggleDictation = () => {
        if (isListening) {
            if (input.trim()) {
                handleSend(input);
            } else {
                recognitionRef.current?.stop();
                setIsListening(false);
            }
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice input is not supported in this browser.");
            return;
        }

        const baseText = input; 
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true; 

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => { };
        recognition.onerror = (e: any) => {
            console.error("Speech Error", e);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
             const transcript = Array.from(event.results)
                .map((result: any) => result[0].transcript)
                .join('');
             setInput(transcript);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const completionScore = calculateProgress(patientInfo, files);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px] animate-fade-in">
            
            {/* LEFT: Chat Interface */}
            <div className="lg:col-span-2 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Icons.Sparkle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">CareTransia Agent</h3>
                            <p className="text-xs text-slate-500 font-medium">Assisting with intake...</p>
                        </div>
                    </div>
                    {ttsStatus !== 'idle' && (
                        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${ttsStatus === 'generating' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                           {ttsStatus === 'generating' ? (
                               <><Icons.Spinner className="w-3 h-3" /> Generating Voice...</>
                           ) : (
                               <><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Speaking...</>
                           )}
                        </div>
                    )}
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {messages.map((m) => (
                        <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            
                            {/* Message Bubble + Actions */}
                            <div className={`flex items-end gap-2 max-w-[95%] ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                
                                {m.role === 'model' && (
                                    <>
                                        <div className={`bg-white p-5 rounded-2xl text-base leading-relaxed shadow-sm border text-slate-800 rounded-bl-none transition-colors ${activeAudioId === m.id && ttsStatus === 'playing' ? 'border-green-300 ring-2 ring-green-50' : 'border-slate-200'}`}>
                                            {m.text}
                                        </div>
                                        <button 
                                            onClick={() => playTTS(m.text, m.id)}
                                            disabled={ttsStatus !== 'idle'}
                                            className="p-2 mb-1 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-full transition-all shadow-sm flex-shrink-0"
                                            title="Read Aloud"
                                        >
                                            {activeAudioId === m.id && ttsStatus === 'generating' ? (
                                                <Icons.Spinner className="w-4 h-4 text-blue-500" />
                                            ) : (
                                                <Icons.Speaker className={`w-4 h-4 ${activeAudioId === m.id && ttsStatus === 'playing' ? 'text-green-500 animate-pulse' : ''}`} />
                                            )}
                                        </button>
                                    </>
                                )}

                                {m.role === 'user' && (
                                    <div className="bg-slate-900 text-white p-5 rounded-2xl text-base leading-relaxed shadow-sm rounded-br-none">
                                        {m.text}
                                    </div>
                                )}
                            </div>
                            
                            {/* WIDGETS */}
                            <div className="w-full">
                                {m.widget === 'upload' && (
                                    <div className="mt-3 bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex gap-3 animate-fade-in-up w-full max-w-[85%]">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 py-3 px-4 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                                            <Icons.Upload className="w-5 h-5" /> Upload
                                        </button>
                                        <button 
                                            onClick={onCamera}
                                            className="flex-1 py-3 px-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Icons.Camera className="w-5 h-5" /> Scan
                                        </button>
                                    </div>
                                )}

                                {m.widget === 'analyze' && (
                                    <div className="mt-3 animate-fade-in-up w-full max-w-[85%]">
                                        {!isLoading ? (
                                            <Button onClick={onAnalyze} className="w-full text-lg py-4 shadow-xl shadow-blue-200/50">
                                                <Icons.Sparkle className="w-5 h-5" /> Generate Care Plan
                                            </Button>
                                        ) : (
                                            <div className="bg-white p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                                                <Icons.Spinner className="w-5 h-5 text-blue-600" />
                                                <span className="text-blue-600 font-bold text-sm animate-pulse">{progressMsg}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isThinking && (
                        <div className="flex items-start">
                            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1.5 items-center">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Suggestions & Input */}
                <div className="p-4 bg-white border-t border-slate-100">
                    {suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {suggestions.map((s, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => handleSend(s)}
                                    className="px-4 py-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-full text-sm font-bold border border-slate-200 transition-all active:scale-95"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    <div className="flex gap-3 relative">
                        <div className="flex-1 relative">
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                                placeholder="Type your answer..."
                                className="w-full bg-slate-100 rounded-2xl pl-5 pr-12 py-4 text-base outline-none focus:ring-2 focus:ring-blue-500 border border-transparent focus:bg-white transition-all placeholder-slate-400"
                                disabled={isThinking || isLoading}
                            />
                            {/* Mic Button Inside Input */}
                            <button
                                onClick={toggleDictation}
                                disabled={isThinking || isLoading}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                title={isListening ? "Stop & Send" : "Dictate"}
                            >
                                {isListening ? <Icons.Stop className="w-5 h-5" /> : <Icons.Mic className="w-5 h-5" />}
                            </button>
                        </div>

                        <button 
                            onClick={() => handleSend(input)}
                            disabled={!input.trim() || isThinking || isLoading}
                            className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200"
                        >
                            <Icons.Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>

            </div>
             {/* ... Right side ... */}
             <div className="hidden lg:flex flex-col h-full animate-fade-in-right delay-100">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg h-full flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4 relative z-10">
                        <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                            <Icons.Clipboard className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg">Plan Details</h3>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Live Context Extraction</p>
                        </div>
                    </div>
                    <div className="space-y-4 flex-1 relative z-10">
                        <InfoField label="Patient Name" value={patientInfo.name} placeholder="Waiting..." />
                        <InfoField label="Age" value={patientInfo.age} placeholder="Waiting..." />
                        <InfoField label="Condition" value={patientInfo.primary_condition} placeholder="Waiting..." />
                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-bold text-slate-700">Documents</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${files.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {files.length} Uploaded
                                </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {files.map((f, i) => (
                                    <div key={i} className="aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group shadow-sm">
                                        {f.mimeType.includes('image') ? (
                                            <img src={f.preview} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold bg-white">PDF</div>
                                        )}
                                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                            <div className="bg-white rounded-full p-0.5">
                                               <Icons.Check className="w-3 h-3 text-emerald-600" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {[...Array(Math.max(0, 4 - files.length))].map((_, i) => (
                                    <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-slate-100 bg-slate-50/50 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-auto pt-6 relative z-10">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                            <span>Completeness</span>
                            <span>{completionScore}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700 ease-out" 
                                style={{ width: `${completionScore}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

// ... InfoField, calculateProgress, ManualIntake (Existing)
function InfoField({ label, value, placeholder }: { label: string, value: string, placeholder: string }) {
    const isSet = !!value && value.length > 0;
    return (
        <div className={`p-4 rounded-2xl border transition-all duration-500 group ${isSet ? 'bg-blue-50/40 border-blue-100 shadow-sm' : 'bg-slate-50/50 border-slate-100'}`}>
            <div className="flex justify-between items-start mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSet ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
                {isSet ? (
                    <div className="bg-blue-100 p-0.5 rounded-full">
                       <Icons.Check className="w-3 h-3 text-blue-600" />
                    </div>
                ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse mt-1"></div>
                )}
            </div>
            <div className={`text-base font-bold truncate ${isSet ? 'text-slate-900' : 'text-slate-400 italic font-normal text-sm'}`}>
                {value || placeholder}
            </div>
        </div>
    );
}

function calculateProgress(info: PatientInfo, files: UploadedFile[]) {
    let score = 0;
    if (info.name && info.name.length > 0) score += 25;
    if (info.age && info.age.length > 0) score += 25;
    if (info.primary_condition && info.primary_condition.length > 0) score += 25;
    if (files.length > 0) score += 25;
    return score;
}

function ManualIntake({ 
    patientInfo, setPatientInfo, 
    files, setFiles, 
    notes, setNotes, 
    onAnalyze, isLoading, progressMsg,
    onCamera, addFile
}: any) {
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const updateInfo = (key: keyof PatientInfo, val: string) => {
        setPatientInfo((prev: any) => ({ ...prev, [key]: val }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (ev.target?.result) addFile(ev.target.result as string, file.type);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!patientInfo.name?.trim()) newErrors.name = "Required";
        if (!patientInfo.age?.trim()) newErrors.age = "Required";
        if (!patientInfo.primary_condition?.trim()) newErrors.primary_condition = "Required";
        if (files.length === 0 && !notes.trim()) newErrors.general = "Upload files or add notes.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAnalyze = () => {
        setTouched({ name: true, age: true, primary_condition: true });
        if (validate()) onAnalyze();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
             {/* Left: Form */}
             <div className="lg:col-span-7 space-y-6">
                <Card className="p-8 border-t-4 border-t-slate-500">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Patient Details</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Patient Name</label>
                            <input 
                                value={patientInfo.name} 
                                onChange={e => updateInfo('name', e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Jane Doe"
                            />
                            {touched.name && errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Age</label>
                                <input 
                                    value={patientInfo.age} 
                                    onChange={e => updateInfo('age', e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. 75"
                                />
                                {touched.age && errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Condition</label>
                                <input 
                                    value={patientInfo.primary_condition} 
                                    onChange={e => updateInfo('primary_condition', e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Hip Surgery"
                                />
                                {touched.primary_condition && errors.primary_condition && <p className="text-red-500 text-xs mt-1">{errors.primary_condition}</p>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Additional Notes</label>
                            <textarea 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                                placeholder="Any allergies or specific instructions..."
                            />
                        </div>
                    </div>
                </Card>
             </div>

             {/* Right: Uploads */}
             <div className="lg:col-span-5 flex flex-col gap-6">
                <Card className="p-8 border-t-4 border-t-emerald-500 h-full flex flex-col">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Documents</h2>
                    
                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={onCamera} className="p-4 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center hover:bg-slate-800 transition-colors">
                                <Icons.Maximize className="w-6 h-6 mb-2 text-cyan-400" />
                                <span className="text-sm font-bold">Scan</span>
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center hover:bg-slate-50 transition-colors">
                                <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                                <Icons.Upload className="w-6 h-6 mb-2 text-slate-400" />
                                <span className="text-sm font-bold text-slate-700">Upload</span>
                            </button>
                        </div>

                        {files.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {files.map((f: UploadedFile) => (
                                    <div key={f.id} className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200">
                                        {f.mimeType.includes('image') ? <img src={f.preview} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-xs font-bold text-slate-400">PDF</div>}
                                        <button 
                                            onClick={() => setFiles((prev: any[]) => prev.filter((x: any) => x.id !== f.id))}
                                            className="absolute top-1 right-1 bg-white text-red-500 rounded-full p-1 shadow-sm"
                                        >
                                            <Icons.Trash className="w-3 h-3"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm">
                                No files added.
                            </div>
                        )}
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100">
                        {isLoading ? (
                            <div className="text-center">
                                <Icons.Spinner className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                <p className="text-sm text-blue-600 font-bold">{progressMsg}</p>
                            </div>
                        ) : (
                            <>
                                <Button onClick={handleAnalyze} className="w-full py-4 text-lg">Generate Plan</Button>
                                {errors.general && <p className="text-red-500 text-center text-sm mt-2">{errors.general}</p>}
                            </>
                        )}
                    </div>
                </Card>
             </div>
        </div>
    );
}
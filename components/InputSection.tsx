import React, { useRef, useState, useEffect } from 'react';
import { Icons, Card, Button, SectionTitle } from './ui';
import { PatientInfo, UploadedFile, ChatMessage } from '../types';
import SmartCamera from './SmartCamera';
import { runIntakeAgent } from '../services/intake_agent';
import { identifyPatientFromFiles } from '../api';
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
// HELPER FUNCTIONS & COMPONENTS
// ----------------------------------------------------------------------

function calculateProgress(info: PatientInfo, files: UploadedFile[]) {
    let score = 0;
    if (info.name) score += 20;
    if (info.age) score += 20;
    if (info.primary_condition) score += 20;
    if (files.length > 0) score += 40;
    return Math.min(score, 100);
}

const InfoField = ({ label, value, placeholder }: { label: string, value?: string, placeholder: string }) => (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</div>
        <div className={`font-semibold text-sm ${value ? 'text-slate-900' : 'text-slate-400 italic'}`}>
            {value || placeholder}
        </div>
    </div>
);

// ----------------------------------------------------------------------
// SUB-COMPONENT: MANUAL FORM
// ----------------------------------------------------------------------

interface ManualIntakeProps {
  patientInfo: PatientInfo;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  notes: string;
  setNotes: (s: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  progressMsg: string;
  onCamera: () => void;
  addFile: (d: string, m: string) => void;
}

function ManualIntake({ 
    patientInfo, setPatientInfo, 
    files, setFiles, 
    notes, setNotes, 
    onAnalyze, isLoading, progressMsg,
    onCamera, addFile
}: ManualIntakeProps) {

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            Array.from(e.target.files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if(ev.target?.result) {
                        addFile(ev.target.result as string, file.type);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
            {/* Left: Patient Info Form */}
            <div className="space-y-6">
                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icons.User className="text-blue-500" /> Patient Details
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input 
                                value={patientInfo.name} 
                                onChange={e => setPatientInfo({...patientInfo, name: e.target.value})}
                                placeholder="e.g. John Doe"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                                <input 
                                    value={patientInfo.age} 
                                    onChange={e => setPatientInfo({...patientInfo, age: e.target.value})}
                                    placeholder="e.g. 65"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                                <select 
                                    value={patientInfo.language_preference} 
                                    onChange={e => setPatientInfo({...patientInfo, language_preference: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                                >
                                    <option>English</option>
                                    <option>Spanish</option>
                                    <option>French</option>
                                    <option>Chinese</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Condition / Reason</label>
                            <input 
                                value={patientInfo.primary_condition} 
                                onChange={e => setPatientInfo({...patientInfo, primary_condition: e.target.value})}
                                placeholder="e.g. Hip Replacement, Pneumonia"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icons.Note className="text-amber-500" /> Additional Notes
                    </h3>
                    <textarea 
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Add any extra instructions from the nurse or questions you have..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all h-32 resize-none"
                    />
                </Card>
            </div>

            {/* Right: Files & Actions */}
            <div className="space-y-6">
                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icons.Upload className="text-purple-500" /> Upload Documents
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all text-slate-500"
                        >
                            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                            <Icons.Upload className="w-6 h-6" />
                            <span className="text-sm font-bold">Select Files</span>
                        </button>
                        <button 
                            onClick={onCamera}
                            className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all text-slate-500"
                        >
                            <Icons.Camera className="w-6 h-6" />
                            <span className="text-sm font-bold">Scan Camera</span>
                        </button>
                    </div>

                    {files.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase">Attached Files ({files.length})</p>
                            <div className="space-y-2">
                                {files.map((file, idx) => (
                                    <div key={file.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                            {file.mimeType.includes('image') ? (
                                                <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">PDF</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-700 truncate">Document {idx + 1}</p>
                                            <p className="text-xs text-slate-400 truncate">{file.mimeType}</p>
                                        </div>
                                        <button onClick={() => removeFile(file.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                            <Icons.Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                <Button 
                    onClick={onAnalyze} 
                    disabled={isLoading || files.length === 0} 
                    className="w-full py-5 text-lg shadow-xl shadow-blue-200/50"
                >
                    {isLoading ? (
                        <><Icons.Spinner className="w-5 h-5" /> {progressMsg}</>
                    ) : (
                        <><Icons.Sparkle className="w-5 h-5" /> Generate Care Plan</>
                    )}
                </Button>
            </div>
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
            text: "Welcome to CareTransia. To start, please upload your discharge papers or pill bottles. I'll automatically read them to get your details.", 
            timestamp: Date.now(),
            widget: 'upload'
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>(["I'll upload files now", "I don't have files"]);
    
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

    // Handle File Selection with Auto-Extract
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsThinking(true);
            const newFiles: UploadedFile[] = [];
            
            // Process files
            const promises = Array.from(e.target.files).map((file: File) => new Promise<void>((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if(ev.target?.result) {
                        const dataUrl = ev.target.result as string;
                        addFile(dataUrl, file.type);
                        newFiles.push({
                            id: Math.random().toString(),
                            data: dataUrl.split(',')[1],
                            mimeType: file.type,
                            preview: dataUrl
                        });
                    }
                    resolve();
                };
                reader.readAsDataURL(file);
            }));

            await Promise.all(promises);

            // Trigger Auto-Extraction
            try {
               const allFiles = [...files, ...newFiles];
               const extracted = await identifyPatientFromFiles(allFiles);
               
               if (extracted.name || extracted.primary_condition) {
                   setPatientInfo(prev => ({...prev, ...extracted}));
                   const infoStr = `Found: ${extracted.name || 'Name'}, ${extracted.age || 'Age'}, ${extracted.primary_condition || 'Condition'}.`;
                   handleSend(`I've uploaded the documents. ${infoStr}`);
               } else {
                   handleSend("I've uploaded the documents, but couldn't read the text clearly.");
               }
            } catch (err) {
               console.error("Auto-extract failed", err);
               handleSend("I've uploaded the documents.");
            }
            setIsThinking(false);
        }
    };

    const playTTS = async (text: string, id?: string) => {
        if (ttsStatus !== 'idle') return;
        
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
                            <p className="text-xs text-slate-500 font-medium">Auto-extraction active...</p>
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
                                            <Icons.Upload className="w-5 h-5" /> Upload Papers
                                        </button>
                                        <button 
                                            onClick={onCamera}
                                            className="flex-1 py-3 px-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Icons.Camera className="w-5 h-5" /> Scan Bottle
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
                                <span className="text-xs text-slate-400 font-semibold ml-2">Reading files...</span>
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
                            />
                            {/* Mic Button Inside Input */}
                            <button
                                onClick={toggleDictation}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                title={isListening ? "Stop & Send" : "Dictate"}
                            >
                                {isListening ? <Icons.Stop className="w-5 h-5" /> : <Icons.Mic className="w-5 h-5" />}
                            </button>
                        </div>

                        <button 
                            onClick={() => handleSend(input)}
                            disabled={!input.trim()}
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
                        <InfoField label="Patient Name" value={patientInfo.name} placeholder="Scanning..." />
                        <InfoField label="Age" value={patientInfo.age} placeholder="Scanning..." />
                        <InfoField label="Condition" value={patientInfo.primary_condition} placeholder="Scanning..." />
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
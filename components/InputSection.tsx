import React, { useRef, useState, useEffect } from 'react';
import { Icons, Card, Button, SectionTitle, HelpTip, Breadcrumbs } from './ui';
import { PatientInfo, UploadedFile, ChatMessage, ParsedEpisode, ConsistencyReport, AgentTrace } from '../types';
import SmartCamera from './SmartCamera';
import VoiceGuidedScanner from './VoiceGuidedScanner';
import { runIntakeAgent } from '../services/intake_agent';
import { identifyPatientFromFiles } from '../api';
import { extractPatientDetails } from '../services/extractor'; // Direct import for text extraction
import { generateSpeech, playRawAudio } from '../services/media';
import StatusMessage from './StatusMessage';

interface CareTransiaIntakeProps {
  patientInfo: PatientInfo;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  onAnalyze: () => void;
  onReview?: () => void; // Added for manual review step
  isLoading: boolean;
  progressMsg?: string;
  onLoadDemo?: () => void;
  status?: 'idle' | 'analyzing' | 'analysis_complete' | 'verifying' | 'generating' | 'done' | 'error';
  errorMsg?: string | null;
  onDismissError?: () => void;
  isOffline?: boolean;
  // NEW: Pass parsed episode for conflict detection
  parsedEpisode?: ParsedEpisode | null;
  consistencyReport?: ConsistencyReport | null;
  // NEW: Action to handle adding more files after initial analysis
  onReAnalyze?: (files: UploadedFile[]) => void;
}

type IntakeMode = 'selection' | 'agent' | 'manual';

// --- Helpers ---

const calculateProgress = (info: PatientInfo, files: UploadedFile[]) => {
    let score = 0;
    if (info.name) score += 20;
    if (info.age) score += 20;
    if (info.primary_condition) score += 20;
    if (files.length > 0) score += 40;
    return Math.min(score, 100);
};

const InfoField = ({ label, value, placeholder }: { label: string, value?: string | null, placeholder: string }) => (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className={`font-medium text-sm truncate ${value ? 'text-slate-900' : 'text-slate-400 italic'}`}>
            {value || placeholder}
        </p>
    </div>
);

// Moved DocumentCard up so it can be shared between Agent and Manual views
const DocumentCard: React.FC<{ file: UploadedFile, onRemove: () => void }> = ({ file, onRemove }) => {
    return (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 w-full animate-fade-in-up hover:border-blue-200 transition-colors">
            <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 relative group">
                {file.mimeType.includes('image') ? (
                    <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-white"><Icons.FileText className="w-6 h-6" /></div>
                )}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{file.name || 'Uploaded Document'}</p>
                <p className="text-xs text-slate-500 font-medium">{file.size || 'Scanned'} • {file.mimeType.includes('image') ? 'Image' : 'PDF'}</p>
            </div>
            <button 
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Remove Document"
            >
                <Icons.Trash className="w-5 h-5" />
            </button>
        </div>
    );
};

export default function CareTransiaIntake({ 
  patientInfo, setPatientInfo, 
  files, setFiles, 
  notes, setNotes, 
  onAnalyze, onReview, isLoading,
  progressMsg = "Processing...",
  onLoadDemo,
  status, errorMsg, onDismissError, isOffline,
  parsedEpisode, consistencyReport,
  onReAnalyze
}: CareTransiaIntakeProps) {
  
  // Default directly to 'agent' mode instead of selection
  const [mode, setMode] = useState<IntakeMode>('agent');
  
  const [showCamera, setShowCamera] = useState(false);
  const [showVoiceScanner, setShowVoiceScanner] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Check for camera availability
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                setHasCamera(videoInputs.length > 0);
            })
            .catch(e => {
                console.warn("Camera check failed", e);
                setHasCamera(false);
            });
    }
  }, []);

  // --- Common Handlers ---
  
  // Updated addFile to take full object, allowing ID control from caller if needed
  const addFile = (fileObj: UploadedFile) => {
    setFiles(prev => [...prev, fileObj]);
    
    // Trigger Success Feedback
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  // Helper for components that just want to pass data/type
  const addFileData = (dataUrl: string, mimeType: string, name = "Scanned Image") => {
      const newFile = {
          id: Math.random().toString(36).substr(2, 9),
          data: dataUrl.split(',')[1],
          mimeType: mimeType,
          preview: dataUrl,
          name: name,
          size: "Unknown"
      };
      
      addFile(newFile);
      
      if (status === 'analysis_complete' && onReAnalyze) {
          onReAnalyze([newFile]);
      }
  };

  const removeFile = (id: string) => {
      setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 relative">
      
      {/* Toast Notification */}
      {showSuccessToast && (
          <div className="fixed top-24 right-6 z-50 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-slide-in">
              <div className="bg-white/20 p-1 rounded-full"><Icons.Check className="w-4 h-4" /></div>
              <span className="font-bold text-sm">File Uploaded Successfully!</span>
          </div>
      )}

      {/* Navigation Breadcrumb - Visual Progress */}
      <Breadcrumbs steps={['Home', 'Upload & Review', 'Care Plan']} currentStep="Upload & Review" />

      {/* Enhanced Error / Status Message */}
      {(status === 'error' || isOffline) && (
          <StatusMessage
            status={status || 'idle'}
            errorMsg={errorMsg || null}
            onDismiss={onDismissError || (() => {})}
            onRetry={onAnalyze}
            isOffline={isOffline}
          />
      )}

      {/* Standard Camera */}
      {showCamera && (
        <SmartCamera 
          onCapture={(dataUrl) => {
             addFileData(dataUrl, 'image/jpeg', "Camera Capture");
             setShowCamera(false);
          }} 
          onClose={() => setShowCamera(false)} 
        />
      )}

      {/* Voice-Guided Scanner */}
      {showVoiceScanner && (
        <VoiceGuidedScanner
          onCapture={(dataUrl) => {
             addFileData(dataUrl, 'image/jpeg', "Smart Scan");
             setShowVoiceScanner(false);
          }} 
          onClose={() => setShowVoiceScanner(false)} 
        />
      )}

      {/* Mode Switcher - Modern Segmented Control */}
      <div className="flex flex-col items-center mb-8">
        <div className="ct-tabs p-1">
            <button 
                onClick={() => setMode('agent')}
                data-active={mode === 'agent'}
                className="ct-tab flex items-center gap-2 text-sm"
            >
                <Icons.Sparkle className="w-4 h-4" />
                AI Assistant
            </button>
            <button 
                onClick={() => setMode('manual')}
                data-active={mode === 'manual'}
                className="ct-tab flex items-center gap-2 text-sm"
            >
                <Icons.Note className="w-4 h-4" />
                Manual Form
            </button>
        </div>
        
        {/* Helper text for demo data loading if available */}
        {onLoadDemo && (
            <button onClick={onLoadDemo} className="mt-3 text-xs font-bold text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                <Icons.Refresh className="w-3 h-3" /> Load Demo Data
            </button>
        )}
      </div>

      {mode === 'agent' && (
        <>
            <AgentIntake 
                patientInfo={patientInfo} setPatientInfo={setPatientInfo}
                files={files} addFile={addFile} removeFile={removeFile} setFiles={setFiles}
                notes={notes} setNotes={setNotes}
                onCamera={() => setShowCamera(true)}
                onVoiceScan={() => setShowVoiceScanner(true)}
                onAnalyze={onAnalyze}
                onReview={onReview}
                onReAnalyze={onReAnalyze}
                isLoading={isLoading}
                progressMsg={progressMsg}
                hasCamera={hasCamera}
                status={status}
                errorMsg={errorMsg}
                parsedEpisode={parsedEpisode}
                consistencyReport={consistencyReport}
            />
            {files.length === 0 && (
                <div className="text-center mt-4">
                    <button 
                        onClick={() => setMode('manual')} 
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 underline"
                    >
                        Skip chat, just let me upload
                    </button>
                </div>
            )}
        </>
      )}

      {mode === 'manual' && (
        <ManualIntake 
           patientInfo={patientInfo} setPatientInfo={setPatientInfo}
           files={files} setFiles={setFiles}
           notes={notes} setNotes={setNotes}
           onAnalyze={onAnalyze}
           isLoading={isLoading}
           progressMsg={progressMsg}
           onCamera={() => setShowCamera(true)}
           onVoiceScan={() => setShowVoiceScanner(true)}
           addFile={addFile}
           removeFile={removeFile}
           hasCamera={hasCamera}
        />
      )}

    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: MANUAL INTAKE FORM (Refactored Layout & Styles)
// ----------------------------------------------------------------------

function ManualIntake({
    patientInfo, setPatientInfo,
    files, setFiles,
    notes, setNotes,
    onAnalyze,
    isLoading,
    progressMsg,
    onCamera,
    onVoiceScan,
    addFile,
    removeFile,
    hasCamera
}: {
    patientInfo: PatientInfo;
    setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
    files: UploadedFile[];
    setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
    notes: string;
    setNotes: React.Dispatch<React.SetStateAction<string>>;
    onAnalyze: () => void;
    isLoading: boolean;
    progressMsg: string;
    onCamera: () => void;
    onVoiceScan: () => void;
    addFile: (f: UploadedFile) => void;
    removeFile: (id: string) => void;
    hasCamera: boolean;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            Array.from(e.target.files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (ev.target?.result) {
                        addFile({
                            id: Math.random().toString(36).substr(2, 9),
                            data: (ev.target.result as string).split(',')[1],
                            mimeType: file.type,
                            preview: ev.target.result as string,
                            name: file.name,
                            size: (file.size / 1024 / 1024).toFixed(1) + " MB"
                        });
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    return (
        <div className="animate-fade-in pb-20">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* --- LEFT PANEL: INFO & NOTES (Spans 7 cols) --- */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Patient Info Section */}
                    <Card className="p-6 md:p-8 border-slate-200/60 shadow-sm">
                        <SectionTitle title="Patient Details" subtitle="Who is this care plan for?" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Full Name</label>
                                <input
                                    value={patientInfo.name}
                                    onChange={e => setPatientInfo(prev => ({ ...prev, name: e.target.value }))}
                                    className="ct-input bg-slate-50 border-slate-200 focus:bg-white"
                                    placeholder="e.g. Martha Stewart"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Age</label>
                                <input
                                    value={patientInfo.age}
                                    onChange={e => setPatientInfo(prev => ({ ...prev, age: e.target.value }))}
                                    className="ct-input bg-slate-50 border-slate-200 focus:bg-white"
                                    placeholder="e.g. 72"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Primary Condition / Surgery</label>
                                <input
                                    value={patientInfo.primary_condition}
                                    onChange={e => setPatientInfo(prev => ({ ...prev, primary_condition: e.target.value }))}
                                    className="ct-input bg-slate-50 border-slate-200 focus:bg-white"
                                    placeholder="e.g. Hip Replacement, Pneumonia"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Notes Section */}
                    <Card className="p-6 md:p-8 border-slate-200/60 shadow-sm">
                        <SectionTitle title="Additional Notes" subtitle="Verbal instructions or things to remember?" />
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="ct-input min-h-[140px] resize-none bg-slate-50 border-slate-200 focus:bg-white leading-relaxed"
                            placeholder="e.g. Take pain meds with food. Call if temperature > 101."
                        />
                    </Card>
                </div>

                {/* --- RIGHT PANEL: DOCUMENTS (Spans 5 cols) --- */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="p-6 md:p-8 h-full flex flex-col border-slate-200/60 shadow-sm min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Documents</h2>
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${files.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                {files.length} Added
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm mb-6">
                            Upload discharge summaries, medication lists, or pill bottle labels.
                        </p>
                        
                        {/* File List Area */}
                        <div className="flex-1 min-h-[120px] mb-6 space-y-3">
                            {files.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-100 rounded-2xl h-40 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                    <div className="p-3 bg-white rounded-full shadow-sm mb-2">
                                        <Icons.Upload className="w-5 h-5 text-slate-300" />
                                    </div>
                                    <span className="text-xs font-medium">No documents yet</span>
                                </div>
                            ) : (
                                files.map(f => (
                                    <DocumentCard key={f.id} file={f} onRemove={() => removeFile(f.id)} />
                                ))
                            )}
                        </div>

                        {/* Upload Actions - Gradients Applied Here */}
                        <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-slate-100/50">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="group relative py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm border border-blue-100 bg-gradient-to-b from-white to-blue-50 hover:from-blue-50 hover:to-blue-100 text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <div className="absolute inset-0 bg-blue-200/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                                <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                                <Icons.Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform duration-300" /> 
                                <span>Upload</span>
                            </button>
                            {hasCamera && (
                                <button
                                    onClick={onCamera}
                                    className="group relative py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm border border-indigo-100 bg-gradient-to-b from-white to-indigo-50 hover:from-indigo-50 hover:to-indigo-100 text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <div className="absolute inset-0 bg-indigo-200/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                                    <Icons.Camera className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" /> 
                                    <span>Scan</span>
                                </button>
                            )}
                        </div>
                    </Card>
                </div>

            </div>

            {/* Action Bar (Sticky Bottom) */}
            <div className="sticky bottom-6 z-30 mt-8 max-w-3xl mx-auto px-4">
                <Button 
                    onClick={onAnalyze} 
                    disabled={isLoading || (!patientInfo.name && files.length === 0)}
                    className="w-full py-4 text-lg shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-transform"
                >
                    {isLoading ? (
                        <>
                            <Icons.Spinner className="w-5 h-5" /> {progressMsg}
                        </>
                    ) : (
                        <>
                            <Icons.Sparkle className="w-5 h-5" /> Generate Care Plan
                        </>
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
    files, addFile, removeFile, setFiles,
    notes, setNotes,
    onCamera, onVoiceScan, onAnalyze, onReview, onReAnalyze,
    isLoading, progressMsg, hasCamera,
    status, errorMsg,
    parsedEpisode, consistencyReport
}: {
    patientInfo: PatientInfo;
    setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
    files: UploadedFile[];
    addFile: (f: UploadedFile) => void;
    removeFile: (id: string) => void;
    setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
    notes: string;
    setNotes: React.Dispatch<React.SetStateAction<string>>;
    onCamera: () => void;
    onVoiceScan: () => void;
    onAnalyze: () => void;
    onReview?: () => void;
    onReAnalyze?: (files: UploadedFile[]) => void;
    isLoading: boolean;
    progressMsg: string;
    hasCamera: boolean;
    status?: string;
    errorMsg?: string | null;
    parsedEpisode?: ParsedEpisode | null;
    consistencyReport?: ConsistencyReport | null;
}) {
    // Generate context-aware welcome
    const getWelcomeMsg = () => {
        // Generic welcome since we skipped selection
        return "Hi! I can help you organize your care plan. Please upload your discharge papers or medication bottles to get started.";
    };

    const getInitialWidget = () => {
        return 'upload';
    };

    const [messages, setMessages] = useState<ChatMessage[]>([
        { 
            id: 'welcome', 
            role: 'model', 
            text: getWelcomeMsg(), 
            timestamp: Date.now(),
            widget: getInitialWidget() as ChatMessage['widget']
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [traces, setTraces] = useState<AgentTrace[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    
    // Voice & TTS State
    const [isListening, setIsListening] = useState(false);
    const [ttsStatus, setTtsStatus] = useState<'idle' | 'generating' | 'playing'>('idle');
    const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const prevFileCount = useRef(files.length);
    const prevStatusRef = useRef<string | undefined>(status);
    
    // Determine Missing Info for UI Gating
    const missingFields: string[] = [];
    if (!patientInfo.name) missingFields.push("Name");
    if (!patientInfo.age) missingFields.push("Age");
    if (!patientInfo.primary_condition) missingFields.push("Condition");
    
    const isComplete = missingFields.length === 0 && files.length > 0;

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking, ttsStatus, files.length, status]); 

    // Error Handling Effect: Inject conversational error message
    useEffect(() => {
        if (status === 'error' && errorMsg) {
            setMessages(prev => {
                const last = prev[prev.length - 1];
                // Prevent duplicate error messages if component re-renders
                if (last.text.includes(errorMsg) || (last.text.includes("issue") && last.role === 'model')) return prev;
                
                return [
                    ...prev,
                    {
                        id: Date.now().toString(),
                        role: 'model',
                        text: `I encountered an issue analyzing your documents: "${errorMsg}".\n\nPlease make sure you uploaded a clear photo of a discharge summary, medication label, or doctor's note. Would you like to try uploading again?`,
                        timestamp: Date.now(),
                        widget: 'upload' as ChatMessage['widget']
                    }
                ];
            });
        }
    }, [status, errorMsg]);

    // Trace Effect: Capture Tool Execution (Background Logic)
    const traceStatusRef = useRef<string | undefined>(status);
    useEffect(() => {
        if (traceStatusRef.current !== status) {
            
            // Log Extraction Success
            if (status === 'analysis_complete' && parsedEpisode) {
                 setTraces(prev => [...prev, {
                    id: `trace-tool-${Date.now()}`,
                    step: 'Tool: Document Extraction',
                    timestamp: Date.now(),
                    input: { fileCount: files.length },
                    output: {
                        summary: "Extraction Successful",
                        patient: parsedEpisode.patient,
                        counts: {
                            medications: parsedEpisode.medications.length,
                            appointments: parsedEpisode.appointments.length,
                            warnings: parsedEpisode.warnings.length
                        },
                        confidence: parsedEpisode.extraction_confidence
                    },
                    latency: 0 // Async metric not tracked here
                }]);
                
                // AUTO-MESSAGE: Transition to Verification Phase when analysis is complete
                if (traceStatusRef.current === 'analyzing') {
                    setMessages(prev => [
                        ...prev,
                        {
                            id: `done-${Date.now()}`,
                            role: 'model',
                            text: "I've successfully extracted the details. Please review them to ensure accuracy.",
                            timestamp: Date.now(),
                            widget: 'post_analysis_options' as ChatMessage['widget']
                        }
                    ]);
                }
            }
            
            // Log Extraction Failure
            if (status === 'error' && errorMsg) {
                 setTraces(prev => [...prev, {
                    id: `trace-error-${Date.now()}`,
                    step: 'Tool: Extraction Failed',
                    timestamp: Date.now(),
                    input: { error: errorMsg },
                    output: { status: 'error' }
                }]);
            }
            
            traceStatusRef.current = status;
        }
    }, [status, parsedEpisode, errorMsg, files.length]);

    // Detect file removal state
    useEffect(() => {
        if (prevFileCount.current > 0 && files.length === 0) {
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'model',
                    text: "It looks like all documents were removed. Please upload your discharge papers or pill bottle photos to continue, or enter details manually.",
                    timestamp: Date.now(),
                    widget: 'upload' as ChatMessage['widget']
                }
            ]);
        }
        prevFileCount.current = files.length;
    }, [files.length]);

    // Handle File Selection - Staged Flow with Agentic Scan
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            
            // PREPARE FILES
            const selectedFiles = Array.from(e.target.files) as File[];
            const processedFiles: UploadedFile[] = [];

            // Helper to read file
            const readFile = (file: File): Promise<UploadedFile> => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if(ev.target?.result) {
                            const dataUrl = ev.target.result as string;
                            resolve({
                                id: Math.random().toString(36).substr(2, 9),
                                data: dataUrl.split(',')[1],
                                mimeType: file.type,
                                preview: dataUrl,
                                name: file.name,
                                size: (file.size / 1024 / 1024).toFixed(1) + " MB"
                            });
                        }
                    };
                    reader.readAsDataURL(file);
                });
            };

            // Process all selected files
            for (const fileItem of selectedFiles) {
                const fileObj = await readFile(fileItem);
                processedFiles.push(fileObj);
            }

            // ** RE-ANALYZE FLOW (Phase 6) **
            if (status === 'analysis_complete' && onReAnalyze) {
                // Trigger re-analysis with collected files
                onReAnalyze(processedFiles);
                // Add system message indicating update
                setMessages(prev => [
                    ...prev,
                    {
                        id: `reanalyze-${Date.now()}`,
                        role: 'model',
                        text: `I received ${processedFiles.length} new document(s). Updating your care plan now...`,
                        timestamp: Date.now(),
                        widget: 'analysis_progress' as any
                    }
                ]);
                return;
            }

            // ** STANDARD AGENTIC FLOW (Phase 8) **
            // 1. Add files to React State
            const newFiles = [...files, ...processedFiles];
            setFiles(newFiles); // Update global state
            
            // 2. Add visual feedback cards immediately
            setMessages(prev => [
                ...prev,
                ...processedFiles.map(f => ({
                    id: `msg-${f.id}`,
                    role: 'user' as const,
                    text: '', // Empty text, renders as card
                    timestamp: Date.now(),
                    fileId: f.id
                })),
                {
                    id: `scanning-${Date.now()}`,
                    role: 'model',
                    text: "Reading documents...", // Temporary status
                    timestamp: Date.now() + 100,
                    widget: 'none'
                }
            ]);

            setIsThinking(true);

            // 3. Run Quick Scan (Extraction of Demographics)
            // This is the "READ FIRST" logic.
            try {
                // Identify patient info from newly added files
                const extractedInfo = await identifyPatientFromFiles(processedFiles);
                
                // Merge with existing info
                const updatedInfo = {
                    ...patientInfo,
                    ...extractedInfo,
                    // Prefer new info if existing was empty, otherwise keep existing
                    name: patientInfo.name || extractedInfo.name || "",
                    age: patientInfo.age || extractedInfo.age || "",
                    primary_condition: patientInfo.primary_condition || extractedInfo.primary_condition || ""
                };
                
                setPatientInfo(updatedInfo); // Update global state

                // 4. Invoke Orchestrator Agent
                const startTime = Date.now();
                const systemTrigger = `[SYSTEM_EVENT: FILES_UPLOADED] New documents scanned. Found: Name=${updatedInfo.name || 'Unknown'}, Age=${updatedInfo.age || 'Unknown'}, Condition=${updatedInfo.primary_condition || 'Unknown'}`;
                
                const response = await runIntakeAgent(
                    updatedInfo, 
                    newFiles.length, 
                    messages, 
                    systemTrigger
                );

                // Add Trace
                setTraces(prev => [...prev, {
                    id: `trace-${Date.now()}`,
                    step: 'File Upload Trigger',
                    timestamp: Date.now(),
                    input: response._debug?.sessionState || {},
                    output: response,
                    latency: Date.now() - startTime
                }]);

                // 5. Update Chat with Agent's Reaction
                setMessages(prev => {
                    // Remove the "Reading documents..." temp message
                    const filtered = prev.filter(m => !m.text.includes("Reading documents..."));
                    return [
                        ...filtered,
                        {
                            id: (Date.now() + 1).toString(),
                            role: 'model',
                            text: response.text,
                            timestamp: Date.now(),
                            widget: response.widget as ChatMessage['widget']
                        }
                    ];
                });
                setSuggestions(response.suggestions || []);

            } catch (e) {
                console.error("Agent Scan Error", e);
                // Fallback message
                setMessages(prev => {
                    const filtered = prev.filter(m => !m.text.includes("Reading documents..."));
                    return [
                        ...filtered,
                        {
                            id: Date.now().toString(),
                            role: 'model',
                            text: "I've uploaded the files. Are you ready to create the plan?",
                            timestamp: Date.now(),
                            widget: 'upload_options' as ChatMessage['widget']
                        }
                    ];
                });
            } finally {
                setIsThinking(false);
            }
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

        // Implicitly treat text as note during collection phase
        setNotes(prev => prev ? prev + "\n" + text : text);

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);
        setSuggestions([]); 

        // Handle special responses (INTERCEPTION)
        if (text.toLowerCase().includes('continue anyway')) {
            // User acknowledged warning, proceed with analysis
            setIsThinking(false); // Clear thinking state as we are transitioning
            setMessages(prev => [
                ...prev,
                { id: 'usr-analyze', role: 'user', text: "✨ Analyze My Documents", timestamp: Date.now() },
                { id: 'bot-analyze', role: 'model', text: "Analysis started...", timestamp: Date.now() + 100, widget: 'analysis_progress' as any }
            ]);
            onAnalyze();
            return;
        }

        try {
            const startTime = Date.now();
            
            // Capture last bot message to provide context to the extractor
            const lastBotMessage = messages.length > 0 ? messages[messages.length - 1].text : "";

            // OPTIMIZATION: If we are missing critical info, try to extract specifically from this text first
            let interimInfo = { ...patientInfo };
            if (!patientInfo.name || !patientInfo.age || !patientInfo.primary_condition) {
                 try {
                     const extracted = await extractPatientDetails(text, lastBotMessage);
                     
                     if (extracted) {
                         if (extracted.name) interimInfo.name = extracted.name;
                         if (extracted.age) interimInfo.age = String(extracted.age);
                         if (extracted.primary_condition) interimInfo.primary_condition = extracted.primary_condition;
                         
                         setPatientInfo(prev => ({
                             ...prev,
                             ...(extracted.name ? { name: extracted.name } : {}),
                             ...(extracted.age ? { age: String(extracted.age) } : {}),
                             ...(extracted.primary_condition ? { primary_condition: extracted.primary_condition } : {})
                         }));
                     }
                 } catch (err) { /* ignore extraction fail */ }
            }

            // Call Agent with full context
            const response = await runIntakeAgent(
                interimInfo, 
                files.length, 
                messages, 
                text,
                status === 'analysis_complete' || status === 'verifying', // isExtractionComplete
                parsedEpisode
            );
            
            // Add Trace
            setTraces(prev => [...prev, {
                id: `trace-${Date.now()}`,
                step: 'User Message',
                timestamp: Date.now(),
                input: {
                    userMessage: text,
                    ...response._debug?.sessionState
                },
                output: response,
                latency: Date.now() - startTime
            }]);
            
            if (response.extracted_info) {
                setPatientInfo(prev => ({
                    ...prev,
                    ...(response.extracted_info.name ? { name: response.extracted_info.name } : {}),
                    ...(response.extracted_info.age ? { age: String(response.extracted_info.age) } : {}),
                    ...(response.extracted_info.primary_condition ? { primary_condition: response.extracted_info.primary_condition } : {})
                }));
            }

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text,
                timestamp: Date.now(),
                widget: response.widget as ChatMessage['widget']
            };
            setMessages(prev => [...prev, botMsg]);
            setSuggestions(response.suggestions || []);

            if (autoPlayResponse) {
                playTTS(response.text, botMsg.id);
            }

            // --- ORCHESTRATOR ACTION HANDLER ---
            if (response.action === 'extract_data') {
                // Auto-trigger extract/analyze ONLY if explicit confirmation
                handleAnalyzeClick();
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

    // Trigger explicit analyze flow with manual progress tracking
    const handleAnalyzeClick = async () => {
        let currentInfo = { ...patientInfo };
        let missing = [];
        if (!currentInfo.name) missing.push("Name");
        if (!currentInfo.age) missing.push("Age");
        if (!currentInfo.primary_condition) missing.push("Condition");

        // 1. Attempt Auto-Extraction if missing info and files exist
        if (missing.length > 0 && files.length > 0) {
            setIsThinking(true);
            setMessages(prev => [...prev, {
                id: `scan-${Date.now()}`,
                role: 'model',
                text: "Reading your documents to find patient details...",
                timestamp: Date.now()
            }]);

            try {
                const extracted = await identifyPatientFromFiles(files);
                
                // Merge new info
                currentInfo = {
                    ...currentInfo,
                    name: currentInfo.name || extracted.name || "",
                    age: currentInfo.age || extracted.age || "",
                    primary_condition: currentInfo.primary_condition || extracted.primary_condition || ""
                };
                
                setPatientInfo(currentInfo); // Update global state

                // Re-evaluate missing fields
                missing = [];
                if (!currentInfo.name) missing.push("Name");
                if (!currentInfo.age) missing.push("Age");
                if (!currentInfo.primary_condition) missing.push("Condition");

            } catch (e) {
                console.error("Auto-extraction failed", e);
            } finally {
                setIsThinking(false);
            }
        }

        // 2. Strict Validation: Cannot proceed without Name/Age/Condition
        if (missing.length > 0) {
             setMessages(prev => [
                ...prev,
                {
                    id: `req-info-${Date.now()}`,
                    role: 'model',
                    text: `I've checked the files, but I still need: **${missing.join(', ')}**. Please type them below to create a safe plan.`,
                    timestamp: Date.now(),
                    widget: 'none',
                    suggestions: ['Example: Age 72, Hip Surgery']
                }
            ]);
            return; // STOP HERE
        }

        // 3. Warnings (Non-blocking but suggested)
        if (files.length === 0) {
             setMessages(prev => [
                ...prev,
                {
                    id: `warn-files-${Date.now()}`,
                    role: 'model',
                    text: `You haven't uploaded any documents. I can create a plan from just your notes, but it's much better with discharge papers. Are you sure?`,
                    timestamp: Date.now(),
                    widget: 'none',
                    suggestions: ['Continue without files', 'Upload papers']
                }
            ]);
            return;
        }

        setMessages(prev => [
            ...prev,
            { id: 'usr-analyze', role: 'user', text: "✨ Create Care Plan", timestamp: Date.now() },
            // Add a progress widget instead of a static message
            { 
                id: 'bot-analyze', 
                role: 'model', 
                text: "Analysis started...", 
                timestamp: Date.now() + 100,
                widget: 'analysis_progress' as any // Cast to allow custom widget 
            }
        ]);
        onAnalyze();
    };

    const handleCopyTraces = () => {
        const text = JSON.stringify(traces, null, 2);
        navigator.clipboard.writeText(text);
        alert("Trace log copied to clipboard.");
    };

    const completionScore = calculateProgress(patientInfo, files);

    return (
        <div className="flex gap-6 h-[600px] animate-fade-in" id="intake-agent-container">
            
            {/* LEFT: Chat Interface */}
            <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative min-w-0">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Unified Agent Icon - Matches Navbar Blue-Indigo Theme */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Icons.Sparkle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">CareTransia Agent</h3>
                            <p className="text-xs text-slate-500 font-medium">Auto-extraction active...</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {ttsStatus !== 'idle' && (
                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${ttsStatus === 'generating' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                            {ttsStatus === 'generating' ? (
                                <><Icons.Spinner className="w-3 h-3" /> Generating Voice...</>
                            ) : (
                                <><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Speaking...</>
                            )}
                            </div>
                        )}
                        <button 
                            onClick={() => setShowDebug(!showDebug)}
                            className={`p-2 rounded-lg transition-colors ${showDebug ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            title="Toggle Debug Traces"
                        >
                            <Icons.Tools className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {messages.map((m, index) => {
                        const isLastMessage = index === messages.length - 1;

                        // Check if this message is a File Card (User message with fileId)
                        if (m.role === 'user' && m.fileId) {
                            const stagedFile = files.find(f => f.id === m.fileId);
                            // If file was deleted, we render a placeholder or nothing
                            if (!stagedFile) return (
                                <div key={m.id} className="flex justify-end">
                                    <span className="text-xs text-slate-400 italic">Document removed</span>
                                </div>
                            );
                            
                            return (
                                <div key={m.id} className="flex justify-end">
                                    <DocumentCard file={stagedFile} onRemove={() => removeFile(stagedFile.id)} />
                                </div>
                            );
                        }

                        // Special Progress Widget Message
                        if (m.widget === 'analysis_progress') {
                            const isAnalyzing = status === 'analyzing';
                            const isComplete = status === 'analysis_complete' || status === 'verifying'; // Show complete even if in verifying so history looks correct
                            
                            // Check for missing info locally to decide what to show
                            const isMissingInfo = !patientInfo.name || !patientInfo.age || !patientInfo.primary_condition;

                            return (
                                <div key={m.id} className="flex flex-col items-start w-full max-w-[90%]">
                                    {isAnalyzing && (
                                        <div className="bg-white p-5 rounded-2xl border border-teal-100 shadow-sm animate-fade-in-up w-full rounded-bl-none">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full border-4 border-teal-50 border-t-teal-500 animate-spin"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Icons.Sparkle className="w-4 h-4 text-teal-500 animate-pulse" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 text-sm">Analyzing Documents...</p>
                                                    <p className="text-xs text-slate-500 font-mono mt-1">{progressMsg}</p>
                                                </div>
                                            </div>
                                            {/* Progress Bar Animation */}
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 animate-progress-indeterminate"></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Success Card - ONLY SHOW IF COMPLETE INFO */}
                                    {isComplete && !isMissingInfo && (
                                        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm animate-scale-in w-full rounded-bl-none">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                                    <Icons.Check className="w-6 h-6 stroke-[3]" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-emerald-900 text-lg">Analysis Complete</p>
                                                    <p className="text-sm text-emerald-700">Successfully extracted care plan details.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Missing Info Warning Card - Only show if analysis is complete but blocked */}
                                    {isComplete && isMissingInfo && (
                                        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm animate-scale-in w-full rounded-bl-none">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                                                    <Icons.Alert className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-amber-900 text-lg">Details Missing</p>
                                                    <p className="text-sm text-amber-700">Please answer the questions below to continue.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Don't show technical error here, allow conversational error message to appear below */}
                                </div>
                            );
                        }

                        // Normal Text Messages
                        return (
                        <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            
                            {/* Message Bubble */}
                            <div className={`flex items-end gap-2 max-w-[95%] ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                
                                {m.role === 'model' && (
                                    <>
                                        <div className={`bg-white p-5 rounded-2xl text-base leading-relaxed shadow-sm border text-slate-800 rounded-bl-none transition-colors ${activeAudioId === m.id && ttsStatus === 'playing' ? 'border-green-300 ring-2 ring-green-50' : 'border-slate-200'}`}>
                                            {m.text}
                                        </div>
                                        {m.text && <button 
                                            onClick={() => playTTS(m.text, m.id)}
                                            disabled={ttsStatus !== 'idle'}
                                            className="p-2 mb-1 bg-white border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-200 rounded-full transition-all shadow-sm flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            title="Read Aloud"
                                            aria-label="Read message aloud"
                                        >
                                            {activeAudioId === m.id && ttsStatus === 'generating' ? (
                                                <Icons.Spinner className="w-4 h-4 text-teal-500" />
                                            ) : (
                                                <Icons.Speaker className={`w-4 h-4 ${activeAudioId === m.id && ttsStatus === 'playing' ? 'text-green-500 animate-pulse' : ''}`} />
                                            )}
                                        </button>}
                                    </>
                                )}

                                {m.role === 'user' && m.text && (
                                    <div className="bg-slate-900 text-white p-5 rounded-2xl text-base leading-relaxed shadow-sm rounded-br-none">
                                        {m.text}
                                    </div>
                                )}
                            </div>
                            
                            {/* WIDGETS & SUGGESTIONS */}
                            {/* Only render widgets for the LAST message to avoid history clutter/duplicate actions */}
                            {isLastMessage && (
                            <div className="w-full">
                                {/* Initial Upload Widget (State 1) */}
                                {(m.widget === 'upload' || m.widget === 'camera') && (
                                    <div className="mt-3 bg-white p-4 rounded-2xl border border-teal-100 shadow-sm flex gap-3 animate-fade-in-up w-full max-w-[95%]">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`flex-1 py-3 px-4 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 ${m.widget === 'upload' ? 'bg-slate-900 text-white hover:bg-slate-800 ring-slate-900' : 'bg-teal-50 text-teal-700 hover:bg-teal-100 ring-teal-500'}`}
                                        >
                                            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                                            <Icons.Upload className="w-5 h-5" /> Upload Papers
                                        </button>
                                        {hasCamera && (
                                            <>
                                            <button 
                                                onClick={onCamera}
                                                className={`flex-1 py-3 px-4 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 ${m.widget === 'camera' ? 'bg-slate-900 text-white hover:bg-slate-800 ring-slate-900' : 'bg-teal-50 text-teal-700 hover:bg-teal-100 ring-teal-500'}`}
                                            >
                                                <Icons.Camera className="w-5 h-5" /> Scan
                                            </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Collection Phase Widget (State 2) */}
                                {m.widget === 'upload_options' && (
                                    <div className="mt-3 flex flex-col gap-3 animate-fade-in-up w-full max-w-[95%]">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                                                <Icons.Upload className="w-4 h-4" /> Upload More
                                            </button>
                                            {hasCamera && (
                                                <button 
                                                    onClick={onCamera}
                                                    className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Icons.Camera className="w-4 h-4" /> Scan
                                                </button>
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={handleAnalyzeClick}
                                            className={`w-full py-4 px-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                                                isComplete 
                                                ? "bg-slate-900 text-white hover:bg-slate-800 shadow-teal-900/20" 
                                                : "bg-amber-100 text-amber-900 hover:bg-amber-200 shadow-amber-900/10"
                                            }`}
                                        >
                                            {isComplete ? (
                                                <><Icons.Sparkle className="w-5 h-5" /> I'm Done, Create Plan</>
                                            ) : (
                                                <><Icons.ArrowRight className="w-5 h-5" /> Add Missing Information</>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* Post-Analysis Options (after extraction complete) */}
                                {m.widget === 'post_analysis_options' && status === 'analysis_complete' && (
                                    <div className="mt-3 flex flex-col gap-2 animate-fade-in-up w-full max-w-[95%]">
                                        <button 
                                            onClick={onReview}
                                            className="w-full py-4 px-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Icons.Check className="w-5 h-5" /> Review & Verify Extracted Data
                                        </button>
                                        
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-3 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                                            <Icons.Upload className="w-4 h-4" /> Add More Documents
                                        </button>
                                    </div>
                                )}

                                {m.widget === 'analyze' && (
                                    <div className="mt-3 animate-fade-in-up w-full max-w-[85%]">
                                        {!isLoading ? (
                                            <Button onClick={onAnalyze} className="w-full text-lg py-4 shadow-xl shadow-teal-200/50">
                                                <Icons.Sparkle className="w-5 h-5" /> Generate Care Plan
                                            </Button>
                                        ) : (
                                            <div className="bg-white p-4 rounded-xl border border-teal-100 flex items-center gap-3">
                                                <Icons.Spinner className="w-5 h-5 text-teal-600" />
                                                <span className="text-teal-600 font-bold text-sm animate-pulse">{progressMsg}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                        );
                    })}
                    
                    {isThinking && (
                        <div className="flex items-start">
                            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1.5 items-center">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                <span className="text-xs text-slate-400 font-semibold ml-2">Processing...</span>
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
                                    className="px-4 py-2 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded-full text-sm font-bold border border-slate-200 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    <div className="flex gap-2 items-center">
                        <div className="flex-1 relative">
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                                placeholder="Type a note (e.g. 'I take Aspirin')..."
                                className="w-full bg-slate-100 rounded-2xl pl-5 pr-4 py-4 text-base outline-none focus:ring-2 focus:ring-teal-500 border border-transparent focus:bg-white transition-all placeholder-slate-400"
                            />
                        </div>

                        {/* Mic Button - Moved Outside */}
                        <button
                            onClick={toggleDictation}
                            className={`p-4 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center justify-center ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'bg-slate-100 text-slate-500 hover:text-teal-600 hover:bg-teal-50'}`}
                            title={isListening ? "Stop & Send" : "Dictate"}
                            aria-label={isListening ? "Stop recording" : "Start voice input"}
                        >
                            {isListening ? <Icons.Stop className="w-5 h-5" /> : <Icons.Mic className="w-5 h-5" />}
                        </button>

                        <button 
                            onClick={() => handleSend(input)}
                            disabled={!input.trim()}
                            className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 flex items-center justify-center"
                            aria-label="Send message"
                        >
                            <Icons.Send className="w-5 h-5 rotate-45" />
                        </button>
                    </div>
                </div>

            </div>
             
             {/* ... Right side ... */}
             
             {/* Debug Panel (Conditionally Rendered) */}
             {showDebug && (
                 <div className="hidden lg:flex flex-col h-full w-80 min-w-[320px] bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-700 animate-fade-in-right">
                     <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-white">
                             <Icons.Tools className="w-4 h-4 text-green-400" />
                             <span className="font-mono text-sm font-bold">Agent Traces</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="text-[10px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded font-mono">{traces.length} Steps</span>
                             <button 
                                onClick={handleCopyTraces}
                                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
                                title="Copy all traces to clipboard"
                             >
                                 <Icons.Clipboard className="w-4 h-4" />
                             </button>
                         </div>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                         {traces.length === 0 ? (
                             <div className="text-slate-500 text-xs text-center mt-10 italic">
                                 No traces yet. Interact with the agent to see execution steps.
                             </div>
                         ) : (
                             traces.slice().reverse().map((trace, i) => (
                                 <div key={trace.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-xs font-mono">
                                     <div className="flex justify-between items-start mb-2">
                                         <span className={`font-bold ${trace.step.includes('Tool') ? 'text-purple-300' : 'text-blue-300'}`}>{trace.step}</span>
                                         <span className="text-slate-500">{new Date(trace.timestamp).toLocaleTimeString()}</span>
                                     </div>
                                     <div className="mb-2">
                                         <span className="text-slate-400 block mb-1">Input State:</span>
                                         <div className="bg-black/30 p-2 rounded text-amber-200 overflow-x-auto whitespace-pre-wrap max-h-32 custom-scrollbar">
                                             {trace.input?.userMessage && (
                                                 <div className="mb-2 pb-2 border-b border-white/10">
                                                     <span className="text-white font-bold block mb-1">USER INPUT:</span>
                                                     "{trace.input.userMessage}"
                                                 </div>
                                             )}
                                             {JSON.stringify(trace.input, null, 2)}
                                         </div>
                                     </div>
                                     <div>
                                         <span className="text-slate-400 block mb-1">Output Action:</span>
                                         <div className="bg-black/30 p-2 rounded text-green-300 overflow-x-auto whitespace-pre-wrap">
                                             {trace.step.includes('Tool') ? (
                                                 JSON.stringify(trace.output, null, 2)
                                             ) : (
                                                 JSON.stringify({
                                                     action: trace.output.action,
                                                     reason: trace.output.action_reason,
                                                     extracted: trace.output.extracted_info
                                                 }, null, 2)
                                             )}
                                         </div>
                                     </div>
                                     {trace.latency ? (
                                         <div className="mt-2 text-right text-slate-600 italic">
                                             Latency: {trace.latency}ms
                                         </div>
                                     ) : null}
                                 </div>
                             ))
                         )}
                     </div>
                 </div>
             )}

             {/* Standard Plan Details Panel (Hidden if Debug is Active on smaller LG screens if needed, but we used flex layout to allow side-by-side if space allows) */}
             {/* Logic: If debug is open, we can keep details if space allows, or hide it. Current layout is flex row. */}
             {(!showDebug || window.innerWidth >= 1280) && (
                <div className={`hidden lg:flex flex-col h-full w-80 min-w-[320px] bg-white p-6 rounded-3xl border border-slate-200 shadow-lg relative overflow-hidden animate-fade-in-right delay-100 ${showDebug ? 'xl:block hidden' : ''}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4 relative z-10">
                        <div className="bg-teal-50 p-2.5 rounded-xl text-teal-600">
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
                                    <div key={f.id} className="aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group shadow-sm">
                                        {f.mimeType.includes('image') ? (
                                            <img src={f.preview} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold bg-white">PDF</div>
                                        )}
                                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Delete button for right panel */}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                                                className="bg-white text-red-500 rounded-full p-1.5 shadow-sm hover:bg-red-50 transition-colors"
                                                title="Remove"
                                            >
                                                <Icons.Trash className="w-4 h-4" />
                                            </button>
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
                                className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 transition-all duration-700 ease-out" 
                                style={{ width: `${completionScore}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
             )}

        </div>
    );
}
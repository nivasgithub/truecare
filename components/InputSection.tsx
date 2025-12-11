
import React, { useRef, useState, useEffect } from 'react';
import { Icons, Card, Button, SectionTitle, HelpTip, Breadcrumbs } from './ui';
import { PatientInfo, UploadedFile, ChatMessage, ParsedEpisode, ConsistencyReport } from '../types';
import SmartCamera from './SmartCamera';
import VoiceGuidedScanner from './VoiceGuidedScanner';
import { runIntakeAgent } from '../services/intake_agent';
import { identifyPatientFromFiles } from '../api';
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
  
  // Default to selection unless files already exist (returning user/state)
  const [mode, setMode] = useState<IntakeMode>(files.length > 0 ? 'agent' : 'selection');
  const [agentContext, setAgentContext] = useState<'papers' | 'bottles' | 'mixed' | null>(null);
  
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
      // Logic split: If analyzing/done, we might need to trigger re-analysis differently
      // But for simplicity, we add to state. If in re-analyze mode, we handle inside the component triggering this.
      const newFile = {
          id: Math.random().toString(36).substr(2, 9),
          data: dataUrl.split(',')[1],
          mimeType: mimeType,
          preview: dataUrl,
          name: name,
          size: "Unknown"
      };
      
      // If we are in the main view (not agent) and status is complete, we might need a button to re-analyze.
      // Current design assumes 'addFile' updates state, user hits 'Analyze' again.
      // But for Agent flow, we wire specifically.
      addFile(newFile);
      
      if (status === 'analysis_complete' && onReAnalyze) {
          // If capturing via camera in post-analysis, auto-trigger re-analyze
          onReAnalyze([newFile]);
      }
  };

  const removeFile = (id: string) => {
      setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSelection = (type: string) => {
      if (type === 'manual') {
          setMode('manual');
      } else {
          setAgentContext(type as any);
          setMode('agent');
      }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 relative">
      
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

      {/* VIEW: Selection Screen */}
      {mode === 'selection' && (
          <div className="max-w-4xl mx-auto py-8 animate-fade-in">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-900 mb-3">What do you have with you?</h2>
                <p className="text-slate-500 text-lg">Select your documents to get started.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button 
                    id="select-papers"
                    onClick={() => handleSelection('papers')}
                    className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-teal-400 transition-all text-left flex flex-col gap-6 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                    <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform relative z-10">
                        <Icons.FileText className="w-8 h-8" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-teal-700 transition-colors">Discharge Papers</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">Printed packets, summaries, or handwritten notes.</p>
                    </div>
                </button>

                <button 
                    id="select-bottles"
                    onClick={() => handleSelection('bottles')}
                    className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-400 transition-all text-left flex flex-col gap-6 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                    <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform relative z-10">
                        <Icons.Pill className="w-8 h-8" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-purple-700 transition-colors">Pill Bottles</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">Photos of medication labels or blister packs.</p>
                    </div>
                </button>

                <button 
                    id="select-manual"
                    onClick={() => handleSelection('manual')}
                    className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-400 transition-all text-left flex flex-col gap-6 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform relative z-10">
                        <Icons.Type className="w-8 h-8" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-slate-800 transition-colors">Type Manually</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">Don't have documents? Enter details yourself.</p>
                    </div>
                </button>
            </div>
            
            <div className="mt-8 text-center">
                 {onLoadDemo && (
                    <button onClick={onLoadDemo} className="text-xs font-bold text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1 mx-auto">
                        <Icons.Refresh className="w-3 h-3" /> Load Demo Data
                    </button>
                 )}
                 <button onClick={() => handleSelection('mixed')} className="text-slate-400 text-sm font-semibold hover:text-teal-600 transition-colors mt-4">
                     I have a mix of files
                 </button>
            </div>
        </div>
      )}

      {/* Mode Switcher (Visible only after selection) */}
      {mode !== 'selection' && (
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
                <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm inline-flex items-stretch">
                    <button 
                        onClick={() => setMode('agent')}
                        className={`flex flex-col items-center justify-center gap-1 px-6 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${mode === 'agent' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <Icons.Sparkle className="w-4 h-4" /> AI Assistant
                        </div>
                        <span className={`text-[10px] ${mode === 'agent' ? 'text-slate-300' : 'text-slate-400'}`}>Interactive Help</span>
                    </button>
                    <button 
                        onClick={() => setMode('manual')}
                        className={`flex flex-col items-center justify-center gap-1 px-6 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${mode === 'manual' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <Icons.Note className="w-4 h-4" /> Manual Form
                        </div>
                        <span className={`text-[10px] ${mode === 'manual' ? 'text-slate-300' : 'text-slate-400'}`}>Direct Upload</span>
                    </button>
                </div>
            </div>
            <button onClick={() => setMode('selection')} className="mt-2 text-xs text-slate-400 hover:text-slate-600 underline">
                Back to selection
            </button>
          </div>
      )}

      {mode === 'agent' && (
        <>
            <AgentIntake 
                patientInfo={patientInfo} setPatientInfo={setPatientInfo}
                files={files} addFile={addFile} removeFile={removeFile}
                onCamera={() => setShowCamera(true)}
                onVoiceScan={() => setShowVoiceScanner(true)}
                onAnalyze={onAnalyze}
                onReview={onReview}
                onReAnalyze={onReAnalyze}
                isLoading={isLoading}
                progressMsg={progressMsg}
                hasCamera={hasCamera}
                initialContext={agentContext}
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

function getCompletenessWarnings(info: PatientInfo, files: UploadedFile[]): string[] {
    const warnings: string[] = [];
    if (files.length === 0) warnings.push("No documents uploaded");
    if (!info.name) warnings.push("Patient name not provided");
    if (!info.age) warnings.push("Patient age not provided");
    if (!info.primary_condition) warnings.push("Primary condition not provided");
    return warnings;
}

function canSafelyAnalyze(info: PatientInfo, files: UploadedFile[]): boolean {
    // Require at least files + one identifying field to be considered "safe" enough to likely yield a good result without massive hallucinations about who the patient is.
    return files.length > 0 && (!!info.name || !!info.primary_condition);
}

function generateExtractionSummary(episode: ParsedEpisode, consistency: ConsistencyReport | null): string {
    const found: string[] = [];
    const missing: string[] = [];
    
    // Found counts
    if (episode.medications.length > 0) found.push(`${episode.medications.length} medication(s)`);
    if (episode.appointments.length > 0) found.push(`${episode.appointments.length} appointment(s)`);
    if (episode.activities.length > 0) found.push(`${episode.activities.length} activity instruction(s)`);
    if (episode.warnings.length > 0) found.push(`${episode.warnings.length} warning sign(s)`);
    
    // Missing items from safety gaps
    if (consistency?.gaps) {
        consistency.gaps.forEach(g => {
            if (g.severity === 'important' || g.severity === 'critical') {
                missing.push(g.summary);
            }
        });
    }
    
    let msg = `**Extraction Complete!**\n\n`;
    if (found.length > 0) msg += `✓ Found: ${found.join(', ')}\n`;
    else msg += `✓ Analysis finished, but found limited structured data.\n`;

    if (missing.length > 0) msg += `⚠️ Note: ${missing.join(', ')}\n`;
    
    const confidence = episode.extraction_confidence || 'high';
    if (confidence !== 'high') {
        msg += `\n*Note: Some text was unclear. Please verify carefully.*`;
    }
    
    return msg;
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
  onVoiceScan: () => void;
  addFile: (f: UploadedFile) => void;
  removeFile: (id: string) => void;
  hasCamera: boolean;
}

function ManualIntake({ 
    patientInfo, setPatientInfo, 
    files, setFiles, 
    notes, setNotes, 
    onAnalyze, isLoading, progressMsg,
    onCamera, onVoiceScan, addFile, removeFile, hasCamera
}: ManualIntakeProps) {

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
        }
    };

    const processFiles = (fileList: File[]) => {
        fileList.forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if(ev.target?.result) {
                    addFile({
                        id: Math.random().toString(36).substr(2, 9),
                        data: (ev.target.result as string).split(',')[1],
                        mimeType: file.type,
                        preview: ev.target.result as string,
                        name: file.name,
                        size: (file.size / 1024).toFixed(1) + " KB"
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
            {/* Left: Patient Info Form */}
            <div className="space-y-6">
                <Card className="p-6" id="intake-patient-info">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icons.User className="text-teal-500" /> Patient Details
                        <HelpTip text="These basic details help the AI verify the documents belong to the right person." />
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input 
                                value={patientInfo.name} 
                                onChange={e => setPatientInfo({...patientInfo, name: e.target.value})}
                                placeholder="e.g. John Doe"
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-slate-900"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                                <input 
                                    value={patientInfo.age} 
                                    onChange={e => setPatientInfo({...patientInfo, age: e.target.value})}
                                    placeholder="e.g. 65"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                                <select 
                                    value={patientInfo.language_preference} 
                                    onChange={e => setPatientInfo({...patientInfo, language_preference: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-slate-900"
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
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-slate-900"
                            />
                        </div>

                        {/* Merged Notes Section */}
                        <div className="pt-4 mt-2 border-t border-slate-100">
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <Icons.Note className="w-4 h-4 text-amber-500" /> Additional Notes
                                <HelpTip text="Add instructions from the nurse that weren't written down, or specific questions you have." />
                            </label>
                            <textarea 
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Add any extra instructions from the nurse or questions you have..."
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all h-32 resize-none text-slate-900"
                            />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Right: Files & Actions */}
            <div className="space-y-6">
                <Card className={`p-6 transition-all duration-200 ${isDragging ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' : ''}`} id="intake-upload-section">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icons.Upload className="text-purple-500" /> Upload Documents
                    </h3>
                    
                    {/* Drop Zone Area */}
                    <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-4 bg-slate-50/50 hover:bg-slate-50 transition-colors relative"
                    >
                        <div className="flex gap-4 w-full">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-300 hover:text-teal-600 transition-all text-slate-500 shadow-sm"
                            >
                                <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                                <Icons.Upload className="w-6 h-6" />
                                <span className="text-sm font-bold">Select Files</span>
                            </button>
                            {hasCamera && (
                                <button 
                                    onClick={onCamera}
                                    className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-300 hover:text-teal-600 transition-all text-slate-500 shadow-sm"
                                >
                                    <Icons.Camera className="w-6 h-6" />
                                    <span className="text-sm font-bold">Scan Camera</span>
                                </button>
                            )}
                        </div>
                        {hasCamera && (
                            <button 
                                onClick={onVoiceScan}
                                className="w-full flex items-center justify-center gap-3 p-3 bg-gradient-to-r from-teal-50 to-purple-50 border border-teal-200 rounded-xl hover:shadow-md transition-all text-teal-700 group"
                            >
                                <div className="bg-white p-1.5 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                    <Icons.Mic className="w-4 h-4 text-teal-600" />
                                </div>
                                <span className="text-sm font-bold">Try Voice-Guided Scanner</span>
                            </button>
                        )}
                        <p className="text-xs text-slate-400 font-medium mt-2">
                            {isDragging ? "Drop files now" : "or drag and drop images/PDFs here"}
                        </p>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="mt-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1">
                                    <Icons.Check className="w-3 h-3" /> {files.length} Files Ready
                                </p>
                            </div>
                            <div className="space-y-2">
                                {files.map((file, idx) => (
                                    <div key={file.id} className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl animate-fade-in-up">
                                        <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex-shrink-0 border border-emerald-100">
                                            {file.mimeType.includes('image') ? (
                                                <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">PDF</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{file.name || `Document ${idx + 1}`}</p>
                                            <p className="text-xs text-slate-500 truncate">{file.mimeType} • {file.size || 'Unknown size'}</p>
                                        </div>
                                        <button onClick={() => removeFile(file.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg" aria-label="Remove file">
                                            <Icons.Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                <Button 
                    id="intake-analyze-btn"
                    onClick={onAnalyze} 
                    disabled={isLoading || files.length === 0} 
                    className="w-full py-5 text-lg shadow-xl shadow-teal-200/50"
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

// New Component: Document Card for Chat
function DocumentCard({ file, onRemove }: { file: UploadedFile, onRemove: () => void }) {
    return (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 w-full max-w-sm animate-fade-in-up">
            <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                {file.mimeType.includes('image') ? (
                    <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-white"><Icons.FileText className="w-6 h-6" /></div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{file.name || 'Uploaded Document'}</p>
                <p className="text-xs text-slate-500">{file.size || '2.4 MB'} • {file.mimeType.includes('image') ? 'Image' : 'PDF'}</p>
            </div>
            <button 
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Remove Document"
            >
                <Icons.Trash className="w-5 h-5" />
            </button>
        </div>
    );
}

function AgentIntake({ 
    patientInfo, setPatientInfo, 
    files, addFile, removeFile,
    onCamera, onVoiceScan, onAnalyze, onReview, onReAnalyze,
    isLoading, progressMsg, hasCamera,
    initialContext, status, errorMsg,
    parsedEpisode, consistencyReport
}: {
    patientInfo: PatientInfo;
    setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
    files: UploadedFile[];
    addFile: (f: UploadedFile) => void;
    removeFile: (id: string) => void;
    onCamera: () => void;
    onVoiceScan: () => void;
    onAnalyze: () => void;
    onReview?: () => void;
    onReAnalyze?: (files: UploadedFile[]) => void;
    isLoading: boolean;
    progressMsg: string;
    hasCamera: boolean;
    initialContext: 'papers' | 'bottles' | 'mixed' | null;
    status?: string;
    errorMsg?: string | null;
    parsedEpisode?: ParsedEpisode | null;
    consistencyReport?: ConsistencyReport | null;
}) {
    // Generate context-aware welcome
    const getWelcomeMsg = () => {
        if (initialContext === 'papers') return "Great, let's start with your discharge papers. You can upload photos or PDFs below.";
        if (initialContext === 'bottles') return "I'll help you organize your meds. Please snap a clear photo of the pill bottles.";
        return "Hi! Upload your discharge papers or medication bottles to get started.";
    };

    const getInitialWidget = () => {
        if (initialContext === 'bottles') return 'camera';
        return 'upload';
    };

    const [messages, setMessages] = useState<ChatMessage[]>([
        { 
            id: 'welcome', 
            role: 'model', 
            text: getWelcomeMsg(), 
            timestamp: Date.now(),
            widget: getInitialWidget()
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    
    // Voice & TTS State
    const [isListening, setIsListening] = useState(false);
    const [ttsStatus, setTtsStatus] = useState<'idle' | 'generating' | 'playing'>('idle');
    const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const prevFileCount = useRef(files.length);
    const prevStatusRef = useRef<string | undefined>(status);
    
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
                        widget: 'upload' // Give them the upload button back immediately
                    }
                ];
            });
        }
    }, [status, errorMsg]);

    // ** MISSING INFO & CONFLICT CHECK EFFECT **
    // Triggers when analysis completes
    useEffect(() => {
        // Only run when transitioning INTO analysis_complete
        if (status === 'analysis_complete' && prevStatusRef.current !== 'analysis_complete') {
            
            // 1. Conflict Check: Document vs User Name
            const docName = parsedEpisode?.patient?.name;
            const userName = patientInfo.name;
            
            // Check if both exist, differ significantly (simple casing/trim check), and exclude simple substrings (e.g. "James" vs "James Mike")
            if (docName && userName && docName.toLowerCase().trim() !== userName.toLowerCase().trim()) {
                 setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last.text.includes("Doc says")) return prev;
                    
                    return [
                        ...prev,
                        {
                            id: `conflict-${Date.now()}`,
                            role: 'model',
                            text: `I noticed a small difference. The document lists the patient as **"${docName}"**, but you told me **"${userName}"**. Which one should I use for the plan?`,
                            timestamp: Date.now(),
                            suggestions: [docName, userName] // These will appear as clickable chips
                        }
                    ];
                });
                // Stop further processing so we don't ask for missing info while handling conflict
                prevStatusRef.current = status;
                return;
            }

            // 2. Missing Info Check
            const missing = [];
            if (!patientInfo.name) missing.push("patient's name");
            if (!patientInfo.age) missing.push("age");
            if (!patientInfo.primary_condition) missing.push("primary condition");

            if (missing.length > 0) {
                // Add a prompt if not already the last message to avoid loop
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    // Check to prevent duplicate asking
                    if (last.text.includes("couldn't find the") || last.text.includes("provide these details")) return prev;
                    
                    return [
                        ...prev,
                        {
                            id: `missing-info-${Date.now()}`,
                            role: 'model',
                            text: `I've analyzed the documents, but I couldn't find the ${missing.join(', ')}. Could you please provide these details so I can build a safe plan?`,
                            timestamp: Date.now(),
                            // Add contextual suggestions based on what's missing
                            suggestions: missing.includes("patient's name") 
                                ? ["The patient is...", "My name is..."]
                                : missing.includes("primary condition") 
                                    ? ["The condition is...", "Hip surgery", "Heart procedure"]
                                    : ["Let me tell you..."]
                        }
                    ];
                });
                prevStatusRef.current = status;
                return; // Stop here if basic info missing
            } 
            
            // 3. NEW: Critical Gap Check (Phase 5)
            // If there are critical gaps, ask about them
            if (consistencyReport?.gaps && consistencyReport.gaps.length > 0) {
                const criticalGaps = consistencyReport.gaps.filter(g => 
                    g.severity === 'critical' || g.severity === 'important'
                );
                
                if (criticalGaps.length > 0) {
                    // Use the suggested_question from safety check (Phase 1 result)
                    const topGap = criticalGaps[0];
                    setMessages(prev => [
                        ...prev,
                        {
                            id: `gap-question-${Date.now()}`,
                            role: 'model',
                            text: topGap.suggested_question || `I found a gap: ${topGap.summary}. Can you help clarify?`,
                            timestamp: Date.now(),
                            suggestions: ['I\'m not sure', 'Let me check the papers', 'Skip this']
                        }
                    ]);
                    prevStatusRef.current = status;
                    return; // Stop here if gap question asked
                }
            }

            // 4. Post-Extraction Summary (Phase 3)
            // If NO conflicts and NO missing info and NO critical gaps, show summary
            if (parsedEpisode) {
                setMessages(prev => {
                    const hasExistingSummary = prev.some(m => m.text.includes('Extraction Complete'));
                    if (hasExistingSummary) return prev;
                    
                    const summary = generateExtractionSummary(parsedEpisode, consistencyReport || null);
                    return [
                        ...prev,
                        {
                            id: `summary-${Date.now()}`,
                            role: 'model',
                            text: summary,
                            timestamp: Date.now(),
                            widget: 'post_analysis_options' // Show "Add More" and "Review" buttons
                        }
                    ];
                });
            }
        }
        prevStatusRef.current = status;
    }, [status, patientInfo.name, patientInfo.age, patientInfo.primary_condition, parsedEpisode, consistencyReport]);

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
                    widget: 'upload'
                }
            ]);
        }
        prevFileCount.current = files.length;
    }, [files.length]);

    // Handle File Selection - Staged Flow
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            
            // PREPARE FILES
            const selectedFiles = Array.from(e.target.files);
            const processedFiles: UploadedFile[] = [];

            for (const fileItem of selectedFiles) {
                const file = fileItem as File;
                await new Promise<void>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if(ev.target?.result) {
                            const dataUrl = ev.target.result as string;
                            const newId = Math.random().toString(36).substr(2, 9);
                            
                            // 1. Create File Object
                            const fileObj = {
                                id: newId,
                                data: dataUrl.split(',')[1],
                                mimeType: file.type,
                                preview: dataUrl,
                                name: file.name,
                                size: (file.size / 1024 / 1024).toFixed(1) + " MB"
                            };
                            processedFiles.push(fileObj);
                            
                            // 2. Add to App State (only if NOT triggering immediate re-analysis, 
                            // as reAnalyzeWithMoreFiles handles state update itself in the hook)
                            // But wait, reAnalyzeWithMoreFiles merges with EXISTING files state.
                            // If we call addFile here, we duplicate if reAnalyze also adds.
                            // However, UI needs to show it immediately.
                            // Best approach: If NOT re-analyzing, addFile. If re-analyzing, let the hook handle it.
                            if (!(status === 'analysis_complete' && onReAnalyze)) {
                                addFile(fileObj);
                                
                                // 3. Add Staged Message to Chat (Visual feedback)
                                setMessages(prev => [
                                    ...prev, 
                                    { 
                                        id: `msg-${newId}`, 
                                        role: 'user', 
                                        text: '', // Empty text, renders as card
                                        timestamp: Date.now(),
                                        fileId: newId // Links to the file
                                    }
                                ]);
                            }
                        }
                        resolve();
                    };
                    reader.readAsDataURL(file);
                });
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

            // ** STANDARD FLOW **
            setIsThinking(true);
            
            // 4. Bot Response logic based on total count (current + new)
            const newTotal = files.length + selectedFiles.length;
            const botMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                text: newTotal === 1 
                    ? "Got it! I see you uploaded a document. Would you like to add more, or shall I start analyzing?" 
                    : `Perfect! You've uploaded ${newTotal} documents. Ready to create your care plan?`,
                timestamp: Date.now() + 100,
                widget: 'upload_options' // Custom widget state for the staged buttons
            };
            setMessages(prev => [...prev, botMsg]);
            
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

    // Trigger explicit analyze flow with manual progress tracking
    const handleAnalyzeClick = () => {
        const warnings = getCompletenessWarnings(patientInfo, files);

        // If critical info missing, inject warning message first
        if (warnings.length > 0 && !canSafelyAnalyze(patientInfo, files)) {
            setMessages(prev => [
                ...prev,
                {
                    id: `warning-${Date.now()}`,
                    role: 'model',
                    text: `Before I analyze, I noticed:\n• ${warnings.join('\n• ')}\n\nThis might affect the accuracy of your care plan. Would you like to add this info first, or continue anyway?`,
                    timestamp: Date.now(),
                    widget: 'none',
                    suggestions: ['Continue anyway', 'Let me add more info']
                }
            ]);
            return; // Don't auto-proceed
        }

        setMessages(prev => [
            ...prev,
            { id: 'usr-analyze', role: 'user', text: "✨ Analyze My Documents", timestamp: Date.now() },
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

    const completionScore = calculateProgress(patientInfo, files);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px] animate-fade-in" id="intake-agent-container">
            
            {/* LEFT: Chat Interface */}
            <div className="lg:col-span-2 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-teal-200">
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

                                    {/* Success Card - ONLY SHOW IF COMPLETE INFO (legacy logic, kept for fallback) */}
                                    {isComplete && !isMissingInfo && !parsedEpisode && (
                                        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm animate-scale-in w-full rounded-bl-none">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                                    <Icons.Check className="w-6 h-6 stroke-[3]" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-emerald-900 text-lg">Analysis Complete</p>
                                                    <p className="text-sm text-emerald-700">Successfully extracted care plan details.</p>
                                                </div>
                                            </div>
                                            
                                            {onReview && (
                                                <button 
                                                    onClick={onReview}
                                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 group"
                                                >
                                                    Review Extracted Plan <Icons.ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            )}
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

                                {/* Staged Upload Widget (State 2 & 3) */}
                                {m.widget === 'upload_options' && (
                                    <div className="mt-3 flex flex-col gap-2 animate-fade-in-up w-full max-w-[95%]">
                                        <button 
                                            onClick={handleAnalyzeClick}
                                            className="w-full py-4 px-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-teal-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Icons.Sparkle className="w-5 h-5" /> ✨ Analyze My Documents
                                        </button>
                                        
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                                                <Icons.Upload className="w-4 h-4" /> Add Another
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
                    
                    <div className="flex gap-3 relative">
                        <div className="flex-1 relative">
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                                placeholder="Type your answer..."
                                className="w-full bg-slate-100 rounded-2xl pl-5 pr-12 py-4 text-base outline-none focus:ring-2 focus:ring-teal-500 border border-transparent focus:bg-white transition-all placeholder-slate-400"
                            />
                            {/* Mic Button Inside Input */}
                            <button
                                onClick={toggleDictation}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'}`}
                                title={isListening ? "Stop & Send" : "Dictate"}
                                aria-label={isListening ? "Stop recording" : "Start voice input"}
                            >
                                {isListening ? <Icons.Stop className="w-5 h-5" /> : <Icons.Mic className="w-5 h-5" />}
                            </button>
                        </div>

                        <button 
                            onClick={() => handleSend(input)}
                            disabled={!input.trim()}
                            className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                            aria-label="Send message"
                        >
                            <Icons.Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>

            </div>
             {/* ... Right side ... */}
             <div className="hidden lg:flex flex-col h-full animate-fade-in-right delay-100">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg h-full flex flex-col relative overflow-hidden">
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
            </div>

        </div>
    );
}

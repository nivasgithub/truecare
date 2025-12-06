import React, { useRef, useState, useEffect } from 'react';
import { Icons, Card, Button, SectionTitle } from './ui';
import { PatientInfo, UploadedFile } from '../types';
import SmartCamera from './SmartCamera';
import { extractPatientDetails } from '../services/extractor';

interface TrueCareIntakeProps {
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

export default function TrueCareIntake({ 
  patientInfo, setPatientInfo, 
  files, setFiles, 
  notes, setNotes, 
  onAnalyze, isLoading,
  progressMsg = "Processing..."
}: TrueCareIntakeProps) {
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showCamera, setShowCamera] = useState(false);

  // Quick Fill State
  const [quickFillText, setQuickFillText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const recognitionRef = useRef<any>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!patientInfo.name.trim()) newErrors.name = "Patient name is required";
    
    if (!patientInfo.age.trim()) {
      newErrors.age = "Age is required";
    } else if (isNaN(Number(patientInfo.age)) || Number(patientInfo.age) < 0 || Number(patientInfo.age) > 120) {
      newErrors.age = "Enter valid age";
    }

    if (!patientInfo.primary_condition.trim()) newErrors.primary_condition = "Primary condition is required";

    if (files.length === 0 && !notes.trim()) {
      newErrors.general = "Please upload a document or enter notes to proceed.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAnalyzeClick = () => {
    setTouched({
      name: true,
      age: true,
      primary_condition: true
    });

    if (validate()) {
      onAnalyze();
    }
  };

  const updateInfo = (key: keyof PatientInfo, val: string) => {
    setPatientInfo(prev => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleBlur = (key: string) => {
    setTouched(prev => ({ ...prev, [key]: true }));
    // Simple inline validation on blur
    if (key === 'name' && !patientInfo.name.trim()) {
        setErrors(prev => ({...prev, name: "Patient name is required"}));
    }
    if (key === 'age') {
        if (!patientInfo.age.trim()) {
             setErrors(prev => ({...prev, age: "Age is required"}));
        } else if (isNaN(Number(patientInfo.age))) {
             setErrors(prev => ({...prev, age: "Invalid age"}));
        }
    }
    if (key === 'primary_condition' && !patientInfo.primary_condition.trim()) {
        setErrors(prev => ({...prev, primary_condition: "Condition is required"}));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    // Clear general error if files are added
    if (errors.general) {
        setErrors(prev => {
            const next = { ...prev };
            delete next.general;
            return next;
        });
    }
  };

  const processFiles = (fileList: FileList) => {
    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        addFile(result, file.type);
      };
      reader.readAsDataURL(file);
    });
  };

  const addFile = (dataUrl: string, mimeType: string) => {
      setFiles(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        data: dataUrl.split(',')[1],
        mimeType: mimeType,
        preview: dataUrl
      }]);
      // Clear error if present
      if (errors.general) {
          setErrors(prev => {
              const next = { ...prev };
              delete next.general;
              return next;
          });
      }
  };

  const getInputClass = (key: string) => {
    const hasError = touched[key] && errors[key];
    const base = "w-full p-4 bg-slate-50 border rounded-xl outline-none transition-all focus:ring-2";
    if (hasError) return `${base} border-red-300 focus:border-red-500 focus:ring-red-200`;
    return `${base} border-slate-200 focus:border-blue-500 focus:ring-blue-500`;
  };

  // --- Voice Input Logic ---
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Please type instead.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setQuickFillText(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleAutoFill = async () => {
    if (!quickFillText.trim()) return;
    setIsAutoFilling(true);
    try {
      const extracted = await extractPatientDetails(quickFillText);
      setPatientInfo(prev => ({
        ...prev,
        name: extracted.name || prev.name,
        age: extracted.age || prev.age,
        primary_condition: extracted.primary_condition || prev.primary_condition,
        language_preference: extracted.language_preference || prev.language_preference,
        caregiver_role: extracted.caregiver_role || prev.caregiver_role
      }));
      // Clear errors if fields are filled
      setErrors({});
    } catch (e) {
      console.error("Auto fill failed", e);
    } finally {
      setIsAutoFilling(false);
    }
  };


  return (
    <div className="max-w-5xl mx-auto pb-12">
      
      {showCamera && (
        <SmartCamera 
          onCapture={(dataUrl) => {
            addFile(dataUrl, 'image/jpeg');
            setShowCamera(false);
          }} 
          onClose={() => setShowCamera(false)} 
        />
      )}

      <SectionTitle 
        title="Let's build your care plan" 
        subtitle="We just need a little information about the patient and the instructions you received." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Step 1: Patient Info */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Quick Fill Card */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
             <div className="flex items-center gap-2 mb-3">
               <Icons.Sparkle className="w-5 h-5 text-yellow-300" />
               <h3 className="font-bold text-lg">AI Quick Fill</h3>
             </div>
             <p className="text-indigo-100 text-sm mb-4">
               Don't want to type? Just describe the patient, age, and condition below, and we'll fill the form for you.
             </p>
             <div className="relative">
                <textarea 
                  value={quickFillText}
                  onChange={(e) => setQuickFillText(e.target.value)}
                  placeholder="Tap the mic and say: 'This is for my father John Smith, he is 75 and recovering from a heart attack...'"
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-indigo-200 focus:bg-white/20 outline-none h-24 resize-none pr-12"
                />
                <button 
                  onClick={toggleListening}
                  className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white/20 hover:bg-white/30'}`}
                >
                  {isListening ? <Icons.Stop className="w-5 h-5 text-white" /> : <Icons.Mic className="w-5 h-5 text-white" />}
                </button>
             </div>
             <div className="mt-3 flex justify-end">
                <button 
                  onClick={handleAutoFill}
                  disabled={!quickFillText.trim() || isAutoFilling}
                  className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                   {isAutoFilling ? <Icons.Spinner className="text-indigo-600" /> : <Icons.Sparkle className="w-4 h-4 text-indigo-600" />}
                   Auto-Fill Details
                </button>
             </div>
          </div>

          <Card className="p-8 border-t-4 border-t-blue-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-100">1</div>
              <h2 className="text-xl font-bold text-slate-900">Patient Details</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Who is this plan for? <span className="text-red-500">*</span></label>
                <input 
                  value={patientInfo.name} 
                  onChange={e => updateInfo('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="e.g. Grandma, Jane Doe"
                  className={getInputClass('name')}
                />
                {touched.name && errors.name && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1 animate-fade-in">
                        <Icons.Alert className="w-3 h-3" /> {errors.name}
                    </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Age <span className="text-red-500">*</span></label>
                  <input 
                    value={patientInfo.age} 
                    onChange={e => updateInfo('age', e.target.value)}
                    onBlur={() => handleBlur('age')}
                    placeholder="e.g. 72"
                    className={getInputClass('age')}
                  />
                  {touched.age && errors.age && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1 animate-fade-in">
                        {errors.age}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Language</label>
                  <select 
                    value={patientInfo.language_preference} 
                    onChange={e => updateInfo('language_preference', e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Tagalog">Tagalog</option>
                      <option value="Vietnamese">Vietnamese</option>
                  </select>
                </div>
              </div>

               <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-2">Primary reason for visit <span className="text-red-500">*</span></label>
                 <input 
                   value={patientInfo.primary_condition} 
                   onChange={e => updateInfo('primary_condition', e.target.value)}
                   onBlur={() => handleBlur('primary_condition')}
                   placeholder="e.g. Hip replacement, Pneumonia"
                   className={getInputClass('primary_condition')}
                 />
                 {touched.primary_condition && errors.primary_condition && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1 animate-fade-in">
                        <Icons.Alert className="w-3 h-3" /> {errors.primary_condition}
                    </p>
                 )}
               </div>

              <div className="pt-6 border-t border-slate-100">
                 <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Icons.Note className="w-4 h-4 text-slate-400" /> Additional Notes
                 </label>
                 <textarea 
                    value={notes}
                    onChange={e => {
                        setNotes(e.target.value);
                        if (errors.general) setErrors(prev => { const n = {...prev}; delete n.general; return n; });
                    }}
                    placeholder="e.g. 'Allergic to Penicillin', 'Already takes blood pressure meds'..."
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-base"
                  />
              </div>
            </div>
          </Card>
        </div>

        {/* Step 2: Uploads & Action */}
        <div className="lg:col-span-5 flex flex-col gap-6 sticky top-24">
          <Card className="p-8 border-t-4 border-t-emerald-500 flex flex-col h-full shadow-md">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-100">2</div>
                <h2 className="text-xl font-bold text-slate-900">Upload Documents</h2>
             </div>

             <div className="flex-1">
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-3 mb-4">
                    <button 
                      onClick={() => setShowCamera(true)}
                      className="flex flex-col items-center justify-center p-4 bg-slate-900 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-slate-800 transition-all hover:-translate-y-0.5"
                    >
                        <Icons.Maximize className="w-6 h-6 mb-2 text-cyan-400" />
                        <span className="text-sm font-bold">Smart Scan (AI)</span>
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all"
                    >
                        <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                        <Icons.Upload className="w-6 h-6 mb-2 text-slate-400" />
                        <span className="text-sm font-bold">Upload Files</span>
                    </button>
                 </div>

                 {files.length > 0 && (
                   <div className="space-y-4">
                     <div className="grid grid-cols-3 gap-3">
                       {files.map(f => (
                         <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-white shadow-sm">
                           {f.mimeType.includes('image') ? (
                             <img src={f.preview} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 font-bold text-xs">PDF</div>
                           )}
                           <button 
                             onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter(x => x.id !== f.id))}}
                             className="absolute top-1 right-1 bg-white p-1.5 rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                           >
                             <Icons.Trash className="w-3 h-3" />
                           </button>
                         </div>
                       ))}
                       <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all"
                       >
                          <span className="text-2xl">+</span>
                       </button>
                     </div>
                     <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-medium text-slate-500">{files.length} file{files.length !== 1 ? 's' : ''} attached</span>
                        <button onClick={() => setFiles([])} className="text-sm text-red-500 font-medium hover:text-red-700">Clear all</button>
                     </div>
                   </div>
                 )}

                 {files.length === 0 && (
                     <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                         <p className="text-sm text-slate-400">No documents added yet.</p>
                     </div>
                 )}
               </div>
             </div>

             <div className="mt-8 pt-6 border-t border-slate-100">
                <Button 
                  onClick={handleAnalyzeClick} 
                  disabled={isLoading}
                  className="w-full py-4 text-lg shadow-xl shadow-blue-200 hover:shadow-blue-300 transform active:scale-[0.98] transition-all"
                >
                   {isLoading ? <><Icons.Spinner /> Processing...</> : "Generate Care Plan"}
                </Button>
                {errors.general && (
                    <p className="mt-3 text-sm text-red-500 text-center font-medium animate-pulse">
                        {errors.general}
                    </p>
                )}
                {isLoading && (
                  <div className="text-center mt-4 space-y-2 animate-fade-in">
                    <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block animate-pulse">
                      {progressMsg}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      We are using AI to read your documents. This may take up to 30 seconds.
                    </p>
                  </div>
                )}
                {!isLoading && (
                  <p className="text-center text-xs text-slate-400 mt-4">
                    By clicking generate, you agree to our Terms of Service.
                  </p>
                )}
             </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

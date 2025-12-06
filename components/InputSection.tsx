import React, { useRef, useState } from 'react';
import { Icons, Card, Button, SectionTitle } from './ui';
import { PatientInfo, UploadedFile } from '../types';

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
        setFiles(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          data: result.split(',')[1],
          mimeType: file.type,
          preview: result
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const getInputClass = (key: string) => {
    const hasError = touched[key] && errors[key];
    const base = "w-full p-4 bg-slate-50 border rounded-xl outline-none transition-all focus:ring-2";
    if (hasError) return `${base} border-red-300 focus:border-red-500 focus:ring-red-200`;
    return `${base} border-slate-200 focus:border-blue-500 focus:ring-blue-500`;
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      
      <SectionTitle 
        title="Let's build your care plan" 
        subtitle="We just need a little information about the patient and the instructions you received." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Step 1: Patient Info */}
        <div className="lg:col-span-7 space-y-6">
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
               {files.length === 0 ? (
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="cursor-pointer h-64 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all flex flex-col items-center justify-center text-center p-6 group"
                 >
                   <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                   <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                     <Icons.Camera className="text-blue-600 w-8 h-8" />
                   </div>
                   <p className="text-slate-900 font-bold text-lg">Click to Upload</p>
                   <p className="text-slate-500 text-sm mt-1 max-w-[200px]">Photos of discharge papers, pill bottles, or PDF files.</p>
                 </div>
               ) : (
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
                        <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                     </button>
                   </div>
                   <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-medium text-slate-500">{files.length} file{files.length !== 1 ? 's' : ''} attached</span>
                      <button onClick={() => setFiles([])} className="text-sm text-red-500 font-medium hover:text-red-700">Clear all</button>
                   </div>
                 </div>
               )}
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

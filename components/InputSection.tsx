import React, { useRef, useState } from 'react';
import { Icons, Card, Button } from './ui';
import { PatientInfo, UploadedFile } from '../types';

interface InputSectionProps {
  patientInfo: PatientInfo;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  notes: string;
  setNotes: (s: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

export default function InputSection({ 
  patientInfo, setPatientInfo, 
  files, setFiles, 
  notes, setNotes, 
  onAnalyze, isLoading 
}: InputSectionProps) {
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateInfo = (key: keyof PatientInfo, val: string) => {
    setPatientInfo(prev => ({ ...prev, [key]: val }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
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

  return (
    <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
      
      {/* Step 1: Patient Context */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">1</div>
          <h2 className="text-xl font-bold text-slate-900">Tell us about this visit</h2>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Patient Name</label>
              <input 
                value={patientInfo.name} 
                onChange={e => updateInfo('name', e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Age</label>
                <input 
                  value={patientInfo.age} 
                  onChange={e => updateInfo('age', e.target.value)}
                  placeholder="e.g. 72"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Language Preference</label>
                <select 
                  value={patientInfo.language_preference} 
                  onChange={e => updateInfo('language_preference', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
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
               <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Primary Condition</label>
               <input 
                 value={patientInfo.primary_condition} 
                 onChange={e => updateInfo('primary_condition', e.target.value)}
                 placeholder="e.g. Heart Failure, Pneumonia..."
                 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
               />
             </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Caregiver Role (Optional)</label>
              <input 
                value={patientInfo.caregiver_role} 
                onChange={e => updateInfo('caregiver_role', e.target.value)}
                placeholder="e.g. Daughter, Spouse, Nurse..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
             <div className="flex items-center gap-2 mb-3">
                 <Icons.Note className="w-4 h-4 text-slate-400" />
                 <label className="block text-sm font-bold text-slate-700">Anything else we should know?</label>
             </div>
             <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. 'Patient is allergic to Penicillin', 'Already taking Metformin'..."
                className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
              />
          </div>
        </Card>
      </div>

      {/* Step 2: Uploads & Actions */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">2</div>
             <h2 className="text-xl font-bold text-slate-900">Upload your discharge paperwork and meds</h2>
        </div>

        <Card className="flex-1 p-6 border-dashed border-2 border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col">
           <div className="flex items-center justify-between mb-6">
             <h3 className="font-bold text-slate-800">Files ({files.length})</h3>
             <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:underline disabled:opacity-50" disabled={files.length === 0}>Clear All</button>
           </div>

           <div 
             onClick={() => fileInputRef.current?.click()}
             className="cursor-pointer flex-1 min-h-[160px] flex flex-col items-center justify-center text-center p-4 rounded-xl border-2 border-blue-100 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-200 transition-all group"
           >
             <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
             <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
               <Icons.Camera className="text-blue-600 w-6 h-6" />
             </div>
             <p className="text-slate-900 font-medium">Tap to Upload Documents</p>
             <p className="text-slate-400 text-sm mt-1">or drag and drop files</p>
           </div>

           {files.length > 0 && (
             <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-6">
               {files.map(f => (
                 <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group bg-white shadow-sm">
                   {f.mimeType.includes('image') ? (
                     <img src={f.preview} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-bold text-xs">PDF</div>
                   )}
                   <button 
                     onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter(x => x.id !== f.id))}}
                     className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 hover:text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <Icons.Trash className="w-3 h-3" />
                   </button>
                 </div>
               ))}
             </div>
           )}
        </Card>

        {/* Reassuring Text */}
        <div className="text-sm text-slate-600 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-800 mb-2">You can upload:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3 text-slate-500">
                <li>Photos of discharge instructions</li>
                <li>PDFs from your patient portal</li>
                <li>Pictures of pill bottles or handwritten notes</li>
            </ul>
            <div className="flex gap-2 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
                <Icons.Shield className="w-4 h-4 shrink-0 text-emerald-500" />
                <p>Private & Secure. Avoid sharing social security numbers or full insurance card photos.</p>
            </div>
        </div>

        <div className="sticky bottom-6 z-10">
          <Button 
            onClick={onAnalyze} 
            disabled={isLoading || (files.length === 0 && notes.length === 0)}
            className="w-full py-4 text-lg shadow-xl shadow-blue-200 hover:shadow-blue-300 transform active:scale-[0.98] transition-all"
          >
             {isLoading ? <><Icons.Spinner /> Analyzing...</> : "🧠 Generate My Care Plan"}
          </Button>
        </div>
      </div>

    </div>
  );
}
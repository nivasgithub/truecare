import React, { useState, useEffect } from 'react';
import { PatientInfo, UploadedFile, ParsedEpisode, ConsistencyReport, FormattedCarePlan } from '../types';
import { generateCareTransiaPlan } from '../api';
import { saveCarePlanToDb } from '../services/firebase';

// Helper for session storage persistence
function useSessionState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.sessionStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      }
    } catch (error) {
      console.warn(`Error reading ${key} from sessionStorage`, error);
    }
    return initialValue;
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, JSON.stringify(state));
      }
    } catch (error) {
      console.warn(`Error writing ${key} to sessionStorage`, error);
    }
  }, [key, state]);

  return [state, setState];
}

export function useCareTransiaFlow(userId?: string) {
  // Input State (Intake Module)
  const [patientInfo, setPatientInfo] = useSessionState<PatientInfo>('ct_patientInfo', {
    name: '', age: '', primary_condition: '', language_preference: 'English', caregiver_role: ''
  });
  
  // We do not persist files (images) due to storage quota limits (usually 5MB).
  const [files, setFiles] = useState<UploadedFile[]>([]);
  
  const [notes, setNotes] = useSessionState<string>('ct_notes', '');
  
  // Output State (Plan Module)
  const [parsedEpisode, setParsedEpisode] = useSessionState<ParsedEpisode | null>('ct_parsedEpisode', null);
  const [consistencyReport, setConsistencyReport] = useSessionState<ConsistencyReport | null>('ct_consistencyReport', null);
  const [carePlan, setCarePlan] = useSessionState<FormattedCarePlan | null>('ct_carePlan', null);
  
  // UI State
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>('Initializing...');

  const analyze = async () => {
    try {
      setStatus('analyzing');
      setErrorMsg(null);
      setProgressMsg('Starting analysis...');
      
      // Call the CareTransia Orchestration API
      const result = await generateCareTransiaPlan(files, notes, patientInfo, (msg) => setProgressMsg(msg));
      
      setParsedEpisode(result.parsedEpisode);
      setConsistencyReport(result.consistencyReport);
      setCarePlan(result.carePlan);
      
      // Save to Firebase if user is logged in
      if (userId) {
        setProgressMsg('Saving to profile...');
        await saveCarePlanToDb(userId, {
            parsedEpisode: result.parsedEpisode,
            carePlan: result.carePlan
        });
      }

      setStatus('done');
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "An unexpected error occurred during analysis.");
      setStatus('error');
    }
  };

  const reset = () => {
    setParsedEpisode(null);
    setConsistencyReport(null);
    setCarePlan(null);
    setStatus('idle');
    setFiles([]);
    setNotes('');
    setProgressMsg('');
    
    // Clear session storage for these specific keys
    sessionStorage.removeItem('ct_parsedEpisode');
    sessionStorage.removeItem('ct_consistencyReport');
    sessionStorage.removeItem('ct_carePlan');
    sessionStorage.removeItem('ct_notes');
    sessionStorage.removeItem('ct_patientInfo');
    
    // Reset inputs to default
    setPatientInfo({ name: '', age: '', primary_condition: '', language_preference: 'English', caregiver_role: '' });
  };

  const loadRecord = (episode: ParsedEpisode, report: ConsistencyReport, plan: FormattedCarePlan) => {
    setParsedEpisode(episode);
    setConsistencyReport(report);
    setCarePlan(plan);
    setStatus('done');
  };

  const dismissError = () => setStatus('idle');

  return {
    intake: { patientInfo, setPatientInfo, files, setFiles, notes, setNotes },
    results: { parsedEpisode, consistencyReport, carePlan },
    ui: { status, errorMsg, dismissError, progressMsg },
    actions: { analyze, reset, loadRecord }
  };
}
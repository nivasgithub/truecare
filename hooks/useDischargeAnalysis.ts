import { useState, useEffect } from 'react';
import { PatientInfo, UploadedFile, ParsedEpisode, ConsistencyReport, FormattedCarePlan } from '../types';
import { generateTrueCarePlan } from '../api';

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

export function useTrueCareFlow() {
  // Input State (Intake Module)
  const [patientInfo, setPatientInfo] = useSessionState<PatientInfo>('tc_patientInfo', {
    name: '', age: '', primary_condition: '', language_preference: 'English', caregiver_role: ''
  });
  
  // We do not persist files (images) due to storage quota limits (usually 5MB).
  const [files, setFiles] = useState<UploadedFile[]>([]);
  
  const [notes, setNotes] = useSessionState<string>('tc_notes', '');
  
  // Output State (Plan Module)
  const [parsedEpisode, setParsedEpisode] = useSessionState<ParsedEpisode | null>('tc_parsedEpisode', null);
  const [consistencyReport, setConsistencyReport] = useSessionState<ConsistencyReport | null>('tc_consistencyReport', null);
  const [carePlan, setCarePlan] = useSessionState<FormattedCarePlan | null>('tc_carePlan', null);
  
  // UI State
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>('Initializing...');

  const analyze = async () => {
    try {
      setStatus('analyzing');
      setErrorMsg(null);
      setProgressMsg('Starting analysis...');
      
      // Call the TrueCare Orchestration API
      const result = await generateTrueCarePlan(files, notes, patientInfo, (msg) => setProgressMsg(msg));
      
      setParsedEpisode(result.parsedEpisode);
      setConsistencyReport(result.consistencyReport);
      setCarePlan(result.carePlan);

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
    sessionStorage.removeItem('tc_parsedEpisode');
    sessionStorage.removeItem('tc_consistencyReport');
    sessionStorage.removeItem('tc_carePlan');
    sessionStorage.removeItem('tc_notes');
    sessionStorage.removeItem('tc_patientInfo');
    
    // Reset inputs to default
    setPatientInfo({ name: '', age: '', primary_condition: '', language_preference: 'English', caregiver_role: '' });
  };

  const dismissError = () => setStatus('idle');

  return {
    intake: { patientInfo, setPatientInfo, files, setFiles, notes, setNotes },
    results: { parsedEpisode, consistencyReport, carePlan },
    ui: { status, errorMsg, dismissError, progressMsg },
    actions: { analyze, reset }
  };
}


import React, { useState, useEffect } from 'react';
import { PatientInfo, UploadedFile, ParsedEpisode, ConsistencyReport, FormattedCarePlan } from '../types';
import { runExtractionPhase, runPlanningPhase } from '../api';
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
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'analysis_complete' | 'verifying' | 'generating' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>('Initializing...');
  
  // Offline State
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  const analyze = async () => {
    if (isOffline) {
        setErrorMsg("You appear to be offline. Please check your internet connection.");
        setStatus('error');
        return;
    }

    try {
      setStatus('analyzing');
      setErrorMsg(null);
      setProgressMsg('Starting analysis...');
      
      // Phase 1: Extraction & Safety Only
      const result = await runExtractionPhase(files, notes, patientInfo, (msg) => setProgressMsg(msg));
      
      setParsedEpisode(result.parsedEpisode);
      setConsistencyReport(result.consistencyReport);
      
      // Smart Merge Logic:
      // 1. If user provided info manually (prev), KEEP IT to avoid "amnesia" loop.
      // 2. Only overwrite if the extraction found something NEW and the user field was empty.
      // 3. We do NOT overwrite conflicts here automatically. We let the UI detect differences between 
      //    result.parsedEpisode.patient (Doc) and patientInfo (User) so the Agent can ask about it.
      if (result.parsedEpisode.patient) {
          setPatientInfo(prev => {
              return {
                  ...prev,
                  name: prev.name || result.parsedEpisode.patient.name || "",
                  age: prev.age || result.parsedEpisode.patient.age || "",
                  primary_condition: prev.primary_condition || result.parsedEpisode.patient.primary_condition || "",
                  // For less critical fields, we can default to doc if user is default
                  language_preference: prev.language_preference !== 'English' ? prev.language_preference : (result.parsedEpisode.patient.language_preference || 'English'),
                  caregiver_role: prev.caregiver_role || result.parsedEpisode.patient.caregiver_role || ""
              };
          });
      }
      
      // Transition to Manual Confirmation Step instead of auto-verifying
      setStatus('analysis_complete'); 
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "An unexpected error occurred during extraction.");
      setStatus('error');
    }
  };

  const startVerification = () => {
      setStatus('verifying');
  };

  const confirmAndGenerate = async (verifiedData: ParsedEpisode) => {
      try {
          setStatus('generating'); 
          setProgressMsg('Generating final plan...');
          
          // Update local state with user verified data
          setParsedEpisode(verifiedData);

          // Phase 2: Plan Generation
          const plan = await runPlanningPhase(verifiedData, consistencyReport, patientInfo, (msg) => setProgressMsg(msg));
          setCarePlan(plan);

          // Save to Firebase/LocalDB if user is logged in
          if (userId) {
            setProgressMsg('Saving to profile...');
            await saveCarePlanToDb(userId, {
                parsedEpisode: verifiedData,
                carePlan: plan
            });
          }

          setStatus('done');
      } catch (e: any) {
          console.error(e);
          setErrorMsg(e.message || "Failed to generate plan.");
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

  const loadDemoData = () => {
      setPatientInfo({
          name: "Martha Stewart",
          age: "72",
          primary_condition: "Total Hip Replacement",
          language_preference: "English",
          caregiver_role: "Daughter"
      });
      setNotes("Doctor mentioned checking the incision site daily for redness. Follow up with PT next week.");
  };

  const dismissError = () => setStatus('idle');

  return {
    intake: { patientInfo, setPatientInfo, files, setFiles, notes, setNotes },
    results: { parsedEpisode, consistencyReport, carePlan },
    ui: { status, errorMsg, dismissError, progressMsg, isOffline },
    actions: { analyze, startVerification, confirmAndGenerate, reset, loadRecord, loadDemoData }
  };
}

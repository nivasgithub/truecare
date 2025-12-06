import { useState } from 'react';
import { PatientInfo, UploadedFile, ParsedEpisode, ConsistencyReport, FormattedCarePlan } from '../types';
import { parseDischargeDocuments, checkConsistency, generateCarePlan } from '../api';

export function useDischargeAnalysis() {
  // Input State
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '', age: '', primary_condition: '', language_preference: 'English', caregiver_role: ''
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [notes, setNotes] = useState('');
  
  // Output State
  const [parsedEpisode, setParsedEpisode] = useState<ParsedEpisode | null>(null);
  const [consistencyReport, setConsistencyReport] = useState<ConsistencyReport | null>(null);
  const [carePlan, setCarePlan] = useState<FormattedCarePlan | null>(null);
  
  // UI State
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const analyze = async () => {
    try {
      setStatus('analyzing');
      setErrorMsg(null);
      setParsedEpisode(null);
      setConsistencyReport(null);
      setCarePlan(null);

      // 1. Parse & Normalize
      const episode = await parseDischargeDocuments(files, notes, patientInfo);
      
      // Check for parsing errors
      if (episode.status === 'error') {
        throw new Error(episode.error_message || "Failed to read documents. Please try clearer images.");
      }
      setParsedEpisode(episode);

      // 2. Consistency Checker
      // Initialize default success report ensures downstream steps work if this fails partially
      let consistency: ConsistencyReport = { status: 'success', error_message: '', conflicts: [], gaps: [] };
      try {
        consistency = await checkConsistency(episode);
        setConsistencyReport(consistency);
      } catch (e) {
        console.warn("Consistency check warning:", e);
      }

      // 3. Care Plan Formatter
      try {
        const plan = await generateCarePlan(episode, consistency, patientInfo);
        setCarePlan(plan);
      } catch (e) {
        console.warn("Care plan generation warning:", e);
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
  };

  const dismissError = () => setStatus('idle');

  return {
    input: { patientInfo, setPatientInfo, files, setFiles, notes, setNotes },
    results: { parsedEpisode, consistencyReport, carePlan },
    ui: { status, errorMsg, dismissError },
    actions: { analyze, reset }
  };
}
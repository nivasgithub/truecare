import { PatientInfo, UploadedFile, ParsedEpisode, ConsistencyReport, FormattedCarePlan } from "./types";
import { parseDischargeDocuments, identifyPatientFromFiles } from "./services/extractor";
import { checkConsistency } from "./services/safety";
import { generateCarePlan } from "./services/planner";

// Re-export services for consumers
export { parseDischargeDocuments, identifyPatientFromFiles } from "./services/extractor";
export { checkConsistency } from "./services/safety";
export { generateCarePlan, queryCarePlan } from "./services/planner";
export { generateRecoveryVideo } from "./services/video";
export { dbService } from "./services/db";

// --- CareTransia Orchestration API ---

// Phase 1: Extraction & Safety Check
export const runExtractionPhase = async (
  files: UploadedFile[],
  notes: string,
  patientInfo: PatientInfo,
  onProgress?: (stage: string) => void
): Promise<{ parsedEpisode: ParsedEpisode; consistencyReport: ConsistencyReport }> => {
  
  if (onProgress) onProgress("Reading documents...");
  const parsedEpisode = await parseDischargeDocuments(files, notes, patientInfo);
  if (parsedEpisode.status === 'error') throw new Error(parsedEpisode.error_message);

  if (onProgress) onProgress("Checking for safety conflicts...");
  let consistencyReport: ConsistencyReport = { status: 'success', error_message: '', conflicts: [], gaps: [] };
  try {
    consistencyReport = await checkConsistency(parsedEpisode);
  } catch (e) {
    console.warn("Consistency check warning:", e);
  }
  return { parsedEpisode, consistencyReport };
};

// Phase 2: Care Plan Generation (After Verification)
export const runPlanningPhase = async (
  parsedEpisode: ParsedEpisode,
  consistencyReport: ConsistencyReport | null,
  patientInfo: PatientInfo,
  onProgress?: (stage: string) => void
): Promise<FormattedCarePlan> => {
  
  if (onProgress) onProgress("Building your care plan...");
  
  const safeReport = consistencyReport || { status: 'success', error_message: '', conflicts: [], gaps: [] };
  
  try {
      const carePlan = await generateCarePlan(parsedEpisode, safeReport, patientInfo);
      if (carePlan.status === 'error') throw new Error(carePlan.error_message);
      return carePlan;
  } catch (e: any) {
      console.error("Care Plan Generation Failed", e);
      return {
          status: 'error',
          error_message: e.message || "Plan generation incomplete.",
          patient_friendly_plan: {
              today_and_tomorrow: [],
              daily_routine: [],
              weekly_or_followup_tasks: [],
              warning_signs_card: [],
              doctor_questions: []
          },
          technical_summary_for_clinicians: "Automatic plan generation failed. Please refer to the raw extracted data."
      };
  }
};

// Legacy/Combined function
export const generateCareTransiaPlan = async (
  files: UploadedFile[],
  notes: string,
  patientInfo: PatientInfo,
  onProgress?: (stage: string) => void
): Promise<{
  parsedEpisode: ParsedEpisode;
  consistencyReport: ConsistencyReport;
  carePlan: FormattedCarePlan;
}> => {
  const { parsedEpisode, consistencyReport } = await runExtractionPhase(files, notes, patientInfo, onProgress);
  const carePlan = await runPlanningPhase(parsedEpisode, consistencyReport, patientInfo, onProgress);
  return { parsedEpisode, consistencyReport, carePlan };
};
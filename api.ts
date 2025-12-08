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
  
  if (onProgress) onProgress("Reading documents...");
  // 1. Parse
  const parsedEpisode = await parseDischargeDocuments(files, notes, patientInfo);
  if (parsedEpisode.status === 'error') throw new Error(parsedEpisode.error_message);

  if (onProgress) onProgress("Checking for safety conflicts...");
  // 2. Consistency
  let consistencyReport: ConsistencyReport = { status: 'success', error_message: '', conflicts: [], gaps: [] };
  try {
    consistencyReport = await checkConsistency(parsedEpisode);
  } catch (e) {
    console.warn("Consistency check warning:", e);
  }

  if (onProgress) onProgress("Building your care plan...");
  // 3. Care Plan
  let carePlan: FormattedCarePlan;
  try {
      carePlan = await generateCarePlan(parsedEpisode, consistencyReport, patientInfo);
      if (carePlan.status === 'error') throw new Error(carePlan.error_message);
  } catch (e: any) {
      console.error("Care Plan Generation Failed, attempting partial return", e);
      // Fallback: If extraction worked but plan gen failed, return partial structure 
      // so user can at least see extracted meds/appointments in "Clinical View"
      carePlan = {
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

  if (onProgress) onProgress("Finalizing...");
  return { parsedEpisode, consistencyReport, carePlan };
};
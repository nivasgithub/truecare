
export interface PatientInfo {
  name: string;
  age: string;
  primary_condition: string;
  language_preference: string;
  caregiver_role: string;
}

export interface UploadedFile {
  id: string;
  data: string; // Base64
  mimeType: string;
  preview: string;
  name?: string; // Added for display
  size?: string; // Added for display
}

export interface Medication {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  timing_notes: string;
  start_date: string | null;
  end_date: string | null;
  source_snippet: string;
}

export interface Appointment {
  type: string;
  specialty_or_clinic: string | null;
  target_date_or_window: string;
  location: string | null;
  prep_instructions: string | null;
  source_snippet: string;
}

export interface Activity {
  instruction: string;
  category: string;
  frequency_or_timing: string | null;
  source_snippet: string;
}

export interface Warning {
  description: string;
  urgency: string;
  source_snippet: string;
}

export interface ParsedEpisode {
  status: 'success' | 'error';
  error_message: string;
  patient: {
    name: string | null;
    age: string | null;
    primary_condition: string | null;
    language_preference: string | null;
    caregiver_role: string | null;
  };
  medications: Medication[];
  appointments: Appointment[];
  activities: Activity[];
  warnings: Warning[];
  additional_notes: string;
  // Confidence Scoring
  extraction_confidence?: 'high' | 'medium' | 'low';
  low_confidence_items?: string[];
  // Verification Audit
  _verificationMeta?: {
      verifiedAt: string;
      changesCount: number;
      editLog: Array<{
          field: string;
          originalValue: string;
          newValue: string;
          timestamp: number;
      }>;
  };
}

export interface ConsistencyIssue {
  type: string;
  summary: string;
  details: string;
  severity: 'info' | 'important' | 'critical';
  suggested_question: string;
}

export interface ConsistencyReport {
  status: 'success' | 'error' | 'warning';
  error_message: string;
  conflicts: ConsistencyIssue[];
  gaps: ConsistencyIssue[];
  // Emergency Detection
  is_emergency?: boolean;
  emergency_guidance?: string;
}

// --- Pill Identification Types ---
export interface PillIdentificationResult {
  identified_pill: {
    shape: string;
    color: string;
    markings: string;
    likely_description: string;
  };
  match_status: 'confirmed' | 'no_match' | 'uncertain';
  matched_medication_name?: string;
  confidence: 'high' | 'medium' | 'low';
  guidance: string;
}

// --- Technical Trace Types ---

export interface RunStep {
  name: string;
  model: string;
  input_summary: string;
  output_summary: string;
  status: 'success' | 'error';
  timestamp: string;
}

export interface RunTrace {
  execution_id: string;
  timestamp: string;
  steps: RunStep[];
}

export interface SelfEvalSummary {
  score: number; // 0-100
  user_facing_message: string;
  coverage_gaps: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface PlanItem {
  text: string;
  source: string;
}

export interface FormattedCarePlan {
  status: 'success' | 'error';
  error_message: string;
  patient_friendly_plan: {
    today_and_tomorrow: PlanItem[];
    daily_routine: PlanItem[];
    weekly_or_followup_tasks: PlanItem[];
    warning_signs_card: PlanItem[];
    doctor_questions: string[]; // Questions are usually derived from gaps, so we keep them as strings for simplicity
  };
  technical_summary_for_clinicians: string;
  // Optional technical fields
  runTrace?: RunTrace;
  selfEvalSummary?: SelfEvalSummary;
}

// --- Auth & Dashboard Types ---

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface HistoricalRecord {
  id: string;
  hospitalName: string;
  dischargeDate: string;
  primaryCondition: string;
  doctorName: string;
  status: 'active' | 'archived';
  medicationCount: number;
  appointmentCount: number;
  fullData?: string; // JSON string of ParsedEpisode + CarePlan
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  // For Intake Agent
  widget?: 'upload' | 'camera' | 'analyze' | 'upload_options' | 'none' | 'analysis_progress' | 'post_analysis_options';
  extractedInfo?: Partial<PatientInfo>;
  fileId?: string; // Reference to a staged file
}

export interface GeneratedVideo {
  uri: string;
  expiresAt: string;
}

// --- Intake Agent Types ---
export interface IntakeAgentResponse {
  text: string;
  widget: 'upload' | 'camera' | 'analyze' | 'none';
  action?: 'validate_files' | 'extract_data' | 'ask_for_info' | 'confirm_summary' | 'proceed_to_verification' | 'wait';
  action_reason?: string;
  suggestions: string[];
  extracted_info: Partial<PatientInfo>;
  state_updates?: Partial<PatientInfo>;
}

// --- App Settings ---
export interface AppSettings {
  fontSize: 'normal' | 'large';
  simpleMode: boolean;
  calmMode: boolean;
}

// --- Reminders ---
export interface MedicationReminder {
  id: string;
  userId: string;
  type: 'medication';
  medicationName: string;
  dose: string;
  schedule: { hour: number; minute: number; label: string }[];
  startDate: string | null;
  endDate: string | null;
  enabled: boolean;
  createdAt: number;
}

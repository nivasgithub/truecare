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
}

export interface ConsistencyIssue {
  type: string;
  summary: string;
  details: string;
  severity: 'info' | 'important' | 'critical';
  suggested_question: string;
}

export interface ConsistencyReport {
  status: 'success' | 'error';
  error_message: string;
  conflicts: ConsistencyIssue[];
  gaps: ConsistencyIssue[];
}

export interface FormattedCarePlan {
  status: 'success' | 'error';
  error_message: string;
  patient_friendly_plan: {
    today_and_tomorrow: string[];
    daily_routine: string[];
    weekly_or_followup_tasks: string[];
    warning_signs_card: string[];
    doctor_questions: string[];
  };
  technical_summary_for_clinicians: string;
}

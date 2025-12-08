import { Type, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { ai } from "./gemini";
import { cleanAndParseJSON, runWithRetry } from "./utils";
import { AppConfig } from "../config";
import { UploadedFile, PatientInfo, ParsedEpisode } from "../types";

export async function parseDischargeDocuments(
  files: UploadedFile[],
  notes: string,
  patientInfo: PatientInfo
): Promise<ParsedEpisode> {
  
  const fileParts = files.map(f => ({
    inlineData: { data: f.data, mimeType: f.mimeType }
  }));

  const systemPrompt = `
You are "CareTransia", a specialized medical data extraction engine.
Your Goal: Extract structured data from the provided images into strict JSON.

INPUT TYPES:
The images may be:
1. **Single Pill Bottles or Medication Labels** (Photos).
2. Multi-page Discharge Summaries.
3. Handwritten Notes.

CRITICAL RULES FOR PILL BOTTLES & MED LISTS:
- **Name**: Drug name (e.g. "Lisinopril").
- **Dose**: Strength (e.g. "10mg", "500 mg"). Do NOT put "1 tablet" here; put that in Frequency.
- **Frequency**: How often (e.g. "Take 1 tablet daily", "Twice a day").
- **Timing/Instructions**: Specifics (e.g. "Take with food", "Until finished"). If none, use "-".
- If patient details are visible, extract them. If not, leave patient fields null.

GENERAL RULES:
1. Extract all sections as they appear.
2. If a section is missing, return an empty array [].
3. **JSON Only**: Output pure JSON. No markdown fences if possible, but I will parse them if you add them.
`;

  const userPrompt = `
Context:
Patient Name (from user): ${patientInfo.name}
Caregiver Notes: ${notes}

Task: Parse the attached images. 
Focus on extracting the "Dose" and "Frequency" for every medication found.
`;

  const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: AppConfig.models.extractor,
    contents: {
      role: 'user',
      parts: [...fileParts, { text: userPrompt }]
    },
    config: {
      systemInstruction: systemPrompt,
      // Relax safety filters to allow medical drug names and instructions
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["success", "error"] },
          error_message: { type: Type.STRING },
          patient: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, nullable: true },
              age: { type: Type.STRING, nullable: true },
              primary_condition: { type: Type.STRING, nullable: true },
              language_preference: { type: Type.STRING, nullable: true },
              caregiver_role: { type: Type.STRING, nullable: true }
            }
          },
          medications: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                dose: { type: Type.STRING },
                route: { type: Type.STRING },
                frequency: { type: Type.STRING },
                timing_notes: { type: Type.STRING },
                start_date: { type: Type.STRING, nullable: true },
                end_date: { type: Type.STRING, nullable: true },
                source_snippet: { type: Type.STRING }
              }
            }
          },
          appointments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                specialty_or_clinic: { type: Type.STRING, nullable: true },
                target_date_or_window: { type: Type.STRING },
                location: { type: Type.STRING, nullable: true },
                prep_instructions: { type: Type.STRING, nullable: true },
                source_snippet: { type: Type.STRING }
              }
            }
          },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                instruction: { type: Type.STRING },
                category: { type: Type.STRING },
                frequency_or_timing: { type: Type.STRING, nullable: true },
                source_snippet: { type: Type.STRING }
              }
            }
          },
          warnings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                urgency: { type: Type.STRING },
                source_snippet: { type: Type.STRING }
              }
            }
          },
          additional_notes: { type: Type.STRING }
        }
      }
    }
  }));

  if (!response.text) throw new Error("No response from AI model");
  
  // Safe parsing with default fallbacks. Guard against null returns.
  const rawParsed = cleanAndParseJSON<Partial<ParsedEpisode>>(response.text) || {};
  
  const parsedEpisode: ParsedEpisode = {
      status: rawParsed.status || 'success',
      error_message: rawParsed.error_message || '',
      patient: rawParsed.patient || { 
          name: patientInfo.name || null, 
          age: patientInfo.age || null, 
          primary_condition: patientInfo.primary_condition || null, 
          language_preference: null, 
          caregiver_role: null 
      },
      medications: Array.isArray(rawParsed.medications) ? rawParsed.medications : [],
      appointments: Array.isArray(rawParsed.appointments) ? rawParsed.appointments : [],
      activities: Array.isArray(rawParsed.activities) ? rawParsed.activities : [],
      warnings: Array.isArray(rawParsed.warnings) ? rawParsed.warnings : [],
      additional_notes: rawParsed.additional_notes || ''
  };

  return parsedEpisode;
}

/**
 * Extracts structured patient info from natural language text
 */
export async function extractPatientDetails(text: string): Promise<Partial<PatientInfo>> {
  if (!text.trim()) return {};

  const systemPrompt = `
    You are a data extraction helper. 
    Extract patient details from the provided text into JSON.
    Fields: name, age, primary_condition.
  `;

  const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: AppConfig.models.extractor,
    contents: {
      role: 'user',
      parts: [{ text: text }]
    },
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, nullable: true },
          age: { type: Type.STRING, nullable: true },
          primary_condition: { type: Type.STRING, nullable: true },
          language_preference: { type: Type.STRING, nullable: true },
          caregiver_role: { type: Type.STRING, nullable: true }
        }
      }
    }
  }));

  if (!response.text) throw new Error("Failed to extract details");
  return cleanAndParseJSON<Partial<PatientInfo>>(response.text) || {};
}

/**
 * Quick extraction of just patient demographics from files
 */
export async function identifyPatientFromFiles(files: UploadedFile[]): Promise<Partial<PatientInfo>> {
  if (files.length === 0) return {};

  const fileParts = files.map(f => ({
    inlineData: { data: f.data, mimeType: f.mimeType }
  }));

  const systemPrompt = `
    Analyze these medical documents.
    Extract ONLY: Patient Name, Age, Primary Condition.
    Return JSON.
  `;

  const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: AppConfig.models.extractor,
    contents: {
      role: 'user',
      parts: [...fileParts, { text: "Extract patient demographics." }]
    },
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, nullable: true },
          age: { type: Type.STRING, nullable: true },
          primary_condition: { type: Type.STRING, nullable: true },
        }
      }
    }
  }));

  if (!response.text) return {};
  return cleanAndParseJSON<Partial<PatientInfo>>(response.text) || {};
}
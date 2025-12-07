import { Type } from "@google/genai";
import { ai } from "./gemini";
import { cleanAndParseJSON } from "./utils";
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
You are "CareTransia", an expert medical AI assistant specialized in OCR and clinical data extraction.
Your Goal: accurately extract structured data from the provided discharge documents (images/PDFs) and notes.

Instructions:
1. READ EVERY PAGE provided in the images.
2. Extract the following sections:
   - Medications (Name, Dose, Route, Frequency, Start/End dates).
   - Appointments (Date, Clinic/Specialty, Location).
   - Activity Restrictions (e.g., "no lifting > 10lbs").
   - Warning Signs (When to call 911 vs Doctor).
3. If a medication list is present, extract it precisely.
4. If handwriting is difficult, use context to infer, but mark uncertain items in 'source_snippet'.
5. Normalize frequencies (e.g., "BID" -> "2 times a day").
6. Output STRICT JSON only.
`;

  const userPrompt = `
Patient Context:
${JSON.stringify(patientInfo)}

Caregiver Notes:
${notes}

Please parse the attached files and notes.
`;

  const response = await ai.models.generateContent({
    model: AppConfig.models.extractor,
    contents: {
      role: 'user',
      parts: [...fileParts, { text: userPrompt }]
    },
    config: {
      systemInstruction: systemPrompt,
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
  });

  if (!response.text) throw new Error("No response from AI model");
  
  // Safe parsing
  const rawParsed = cleanAndParseJSON<Partial<ParsedEpisode>>(response.text);
  
  // Ensure strict adherence to ParsedEpisode structure to prevent UI crashes
  // We provide default empty objects/arrays if the AI returns null for any section
  const parsedEpisode: ParsedEpisode = {
      status: rawParsed.status || 'success',
      error_message: rawParsed.error_message || '',
      patient: rawParsed.patient || { 
          name: null, age: null, primary_condition: null, language_preference: null, caregiver_role: null 
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
    You are an AI assistant helper. 
    Extract patient details from the provided text into a JSON object.
    Only include fields that are mentioned in the text.
    If age is mentioned as a number or a string (e.g., "eighty two"), convert to a string number (e.g., "82").
  `;

  const response = await ai.models.generateContent({
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
  });

  if (!response.text) throw new Error("Failed to extract details");
  return cleanAndParseJSON<Partial<PatientInfo>>(response.text);
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
    Analyze these medical documents/images.
    Extract ONLY the following Patient Information if available:
    1. Patient Name
    2. Patient Age (or Date of Birth converted to age if possible, otherwise just age)
    3. Primary Condition (Reason for visit/discharge diagnosis)
    
    Return strict JSON.
  `;

  const response = await ai.models.generateContent({
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
  });

  if (!response.text) return {};
  return cleanAndParseJSON<Partial<PatientInfo>>(response.text);
}
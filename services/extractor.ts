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
You are "TrueCare", an expert medical AI assistant specialized in OCR and clinical data extraction.
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
  return cleanAndParseJSON<ParsedEpisode>(response.text);
}

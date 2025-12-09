import { Type, GenerateContentResponse } from "@google/genai";
import { ai } from "./gemini";
import { AppConfig } from "../config";
import { cleanAndParseJSON } from "./utils";
import { Medication, PillIdentificationResult } from "../types";

export async function identifyPill(
  dataUrl: string,
  carePlanMedications: Medication[]
): Promise<PillIdentificationResult> {
  
  // Clean base64 string
  const cleanBase64 = dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  const systemPrompt = `
    You are an expert optical medication verification assistant.
    Your task is to visually analyze the pill in the image (shape, color, imprint codes, scoring) and compare it against the provided list of prescribed medications.

    MEDICATION CONTEXT:
    ${JSON.stringify(carePlanMedications.map(m => ({ name: m.name, dose: m.dose, form: m.route })))}

    RULES:
    1. **Visual Analysis**: Describe the pill's physical properties clearly.
    2. **Matching Logic**:
       - 'confirmed': The pill matches the visual description of a medication in the list (e.g., "White round tablet" matches "Lisinopril 10mg" description).
       - 'no_match': The pill clearly does NOT look like any medication in the list.
       - 'uncertain': The image is blurry, the pill is generic with no markings, or there are multiple similar possibilities.
    3. **Safety**: Do not provide chemical composition analysis. This is a visual check only. Always advise checking the bottle label.

    OUTPUT JSON SCHEMA:
    - identified_pill: { shape, color, markings, likely_description }
    - match_status: 'confirmed' | 'no_match' | 'uncertain'
    - matched_medication_name: string (The name from the provided list, or null)
    - confidence: 'high' | 'medium' | 'low'
    - guidance: string (Short, actionable advice for the patient)
  `;

  try {
    const response = await ai.models.generateContent({
      model: AppConfig.models.extractor, // Reusing the vision-capable extractor model
      contents: {
        role: 'user',
        parts: [
          { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
          { text: "Identify this pill and check if it is in my medication list." }
        ]
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identified_pill: {
              type: Type.OBJECT,
              properties: {
                shape: { type: Type.STRING },
                color: { type: Type.STRING },
                markings: { type: Type.STRING },
                likely_description: { type: Type.STRING }
              }
            },
            match_status: { type: Type.STRING, enum: ["confirmed", "no_match", "uncertain"] },
            matched_medication_name: { type: Type.STRING, nullable: true },
            confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
            guidance: { type: Type.STRING }
          }
        }
      }
    });

    if (!response.text) throw new Error("No response from Pill Identifier");
    return cleanAndParseJSON<PillIdentificationResult>(response.text);

  } catch (e: any) {
    console.error("Pill Identification Failed", e);
    // Return a safe fallback
    return {
        identified_pill: { shape: "Unknown", color: "Unknown", markings: "Unknown", likely_description: "Analysis Failed" },
        match_status: "uncertain",
        confidence: "low",
        guidance: "We could not identify this pill. Please verify with your pharmacist or the bottle label."
    };
  }
}

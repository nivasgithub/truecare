import { Type } from "@google/genai";
import { ai } from "./gemini";
import { cleanAndParseJSON } from "./utils";
import { AppConfig, SAFETY_GUIDELINES } from "../config";
import { PatientInfo, ParsedEpisode, ConsistencyReport, FormattedCarePlan, ChatMessage } from "../types";

export async function generateCarePlan(
  parsedEpisode: ParsedEpisode,
  consistencyReport: ConsistencyReport,
  patientInfo: PatientInfo
): Promise<FormattedCarePlan> {
  const systemPrompt = `
${SAFETY_GUIDELINES}

You are "CareTransia", a patient-facing care plan formatter.
Create a simple, plain-language care playbook.
- Tone: Encouraging, Clear, Simple (5th grade level).
- Structure:
  - "Today & Tomorrow": Immediate tasks.
  - "Daily Routine": Ongoing habits/meds.
  - "Warning Signs": Red flags.
  - "Questions for Doctor": Based on gaps/conflicts.
`;

  const userPrompt = `
Patient: ${JSON.stringify(patientInfo)}
Data: ${JSON.stringify(parsedEpisode)}
Safety Report: ${JSON.stringify(consistencyReport)}

Generate the care playbook JSON.
`;

  // Request 15: Removed thinking mode to prevent timeouts/hanging.
  // The task is primarily formatting, so standard generation is sufficient and faster.
  const response = await ai.models.generateContent({
    model: AppConfig.models.planner,
    contents: {
      role: 'user',
      parts: [{ text: userPrompt }]
    },
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["success", "error"] },
          error_message: { type: Type.STRING },
          patient_friendly_plan: {
            type: Type.OBJECT,
            properties: {
              today_and_tomorrow: { type: Type.ARRAY, items: { type: Type.STRING } },
              daily_routine: { type: Type.ARRAY, items: { type: Type.STRING } },
              weekly_or_followup_tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
              warning_signs_card: { type: Type.ARRAY, items: { type: Type.STRING } },
              doctor_questions: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          technical_summary_for_clinicians: { type: Type.STRING }
        }
      }
    }
  });

  if (!response.text) throw new Error("No response from care plan generator");
  return cleanAndParseJSON<FormattedCarePlan>(response.text);
}

export async function queryCarePlan(
  carePlanContext: FormattedCarePlan | null,
  history: ChatMessage[],
  newMessage: string,
  userLocation?: { latitude: number; longitude: number }
): Promise<{ text: string, groundingMetadata?: any }> {
  
  const systemPrompt = `
${SAFETY_GUIDELINES}

You are "CareTransia Assistant". 
If a care plan is provided, answer questions based on it.
If no care plan is provided, or if the user asks for external information (pharmacies, clinics, definitions, news), use your tools (Google Search / Maps).

IMPORTANT:
- If the user asks for "nearby" places (pharmacy, hospital, clinic), ALWAYS use the Google Maps tool.
- If the user asks for general medical definitions or news, use Google Search.
- Keep answers short, simple, and helpful.
`;

  const chatHistory = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  const contextMessage = carePlanContext 
    ? `CARE PLAN:\n${JSON.stringify(carePlanContext)}\n\nQuestion: ${newMessage}`
    : `Question: ${newMessage}`;

  const toolConfig = userLocation ? {
    retrievalConfig: {
      latLng: {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      }
    }
  } : undefined;

  // Request 4 & 6: Use Google Maps and Search Grounding
  // Must use gemini-2.5-flash for Maps/Search tools
  const response = await ai.models.generateContent({
    model: AppConfig.models.chat, 
    contents: [
      ...chatHistory,
      { role: 'user', parts: [{ text: contextMessage }] }
    ],
    config: { 
      systemInstruction: systemPrompt,
      tools: [
        { googleSearch: {} },
        { googleMaps: {} }
      ],
      toolConfig: toolConfig
    }
  });

  return {
    text: response.text || "I found some information.",
    groundingMetadata: response.candidates?.[0]?.groundingMetadata
  };
}
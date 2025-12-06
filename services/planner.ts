import { Type } from "@google/genai";
import { ai } from "./gemini";
import { cleanAndParseJSON } from "./utils";
import { AppConfig } from "../config";
import { PatientInfo, ParsedEpisode, ConsistencyReport, FormattedCarePlan, ChatMessage } from "../types";

export async function generateCarePlan(
  parsedEpisode: ParsedEpisode,
  consistencyReport: ConsistencyReport,
  patientInfo: PatientInfo
): Promise<FormattedCarePlan> {
  const systemPrompt = `
You are "TrueCare", a patient-facing care plan formatter.
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
  carePlanContext: FormattedCarePlan,
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  
  const systemPrompt = `
You are "TrueCare Assistant". Answer questions based ONLY on the provided care plan.
Keep answers short and simple.
`;

  const chatHistory = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  const contextMessage = `
CARE PLAN:
${JSON.stringify(carePlanContext)}

Question: ${newMessage}
`;

  const response = await ai.models.generateContent({
    model: AppConfig.models.planner,
    contents: [
      ...chatHistory,
      { role: 'user', parts: [{ text: contextMessage }] }
    ],
    config: { systemInstruction: systemPrompt }
  });

  return response.text || "I'm having trouble reading the plan right now. Please try again.";
}

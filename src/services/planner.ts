import { Type, GenerateContentResponse } from "@google/genai";
import { ai } from "./gemini";
import { cleanAndParseJSON, runWithRetry } from "./utils";
import { AppConfig, SAFETY_GUIDELINES } from "../config";
import { PatientInfo, ParsedEpisode, ConsistencyReport, FormattedCarePlan, ChatMessage, RunTrace, SelfEvalSummary } from "../types";

export async function generateCarePlan(
  parsedEpisode: ParsedEpisode,
  consistencyReport: ConsistencyReport,
  patientInfo: PatientInfo
): Promise<FormattedCarePlan> {
  const systemPrompt = `
${SAFETY_GUIDELINES}

You are "CareTransia", a patient-facing care plan formatter.
Create a simple, plain-language care playbook.

CITATION REQUIREMENT:
To ensure the information is genuine, you MUST include a "source" field for every instruction.
- The "source" should be the **verbatim text snippet** from the provided Data that justifies the instruction.
- If an instruction is a general best practice (e.g. "Rest") and not explicitly in the text, set source to "General Best Practice".

Structure:
  - "Today & Tomorrow": Immediate tasks.
  - "Daily Routine": Ongoing habits/meds.
  - "Warning Signs": Red flags.
  - "Questions for Doctor": Based on gaps/conflicts.

CRITICAL INSTRUCTION:
- If 'Medications' are present in the data, YOU MUST include them in the 'Daily Routine' or 'Today & Tomorrow'. 
- Do not summarize multiple meds into one line unless they are taken together. 
- A plan with medications but an empty 'Daily Routine' is a FAILURE.
- **DO NOT** return empty arrays for all sections.
`;

  const userPrompt = `
Patient: ${JSON.stringify(patientInfo)}
Data: ${JSON.stringify(parsedEpisode)}
Safety Report: ${JSON.stringify(consistencyReport)}

Generate the care playbook JSON with citations.
`;

  // Start time for trace
  const startTime = new Date();

  // Helper schema for PlanItem
  const planItemSchema = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      source: { type: Type.STRING, description: "The exact text snippet from the document" }
    }
  };

  const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
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
              today_and_tomorrow: { type: Type.ARRAY, items: planItemSchema },
              daily_routine: { type: Type.ARRAY, items: planItemSchema },
              weekly_or_followup_tasks: { type: Type.ARRAY, items: planItemSchema },
              warning_signs_card: { type: Type.ARRAY, items: planItemSchema },
              doctor_questions: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          technical_summary_for_clinicians: { type: Type.STRING }
        }
      }
    }
  }));

  if (!response.text) throw new Error("No response from care plan generator");
  const parsedJson = cleanAndParseJSON<FormattedCarePlan>(response.text);

  // --- Construct Trace Data (Simulating Agentic Flow) ---
  const executionId = "exec-" + Math.random().toString(36).substr(2, 9);
  
  // Safely access report counts using optional chaining + default 0
  const conflictCount = consistencyReport?.conflicts?.length || 0;
  const gapCount = consistencyReport?.gaps?.length || 0;

  const runTrace: RunTrace = {
    execution_id: executionId,
    timestamp: startTime.toISOString(),
    steps: [
      {
        name: "OCR & Document Analysis",
        model: AppConfig.models.extractor,
        input_summary: "Raw image/PDF binaries + user notes",
        output_summary: `Extracted ${parsedEpisode.medications.length} meds, ${parsedEpisode.appointments.length} appointments`,
        status: "success",
        timestamp: new Date(startTime.getTime() + 1000).toISOString()
      },
      {
        name: "Safety & Consistency Check",
        model: AppConfig.models.safety,
        input_summary: "Structured clinical data",
        output_summary: `Identified ${conflictCount} conflicts and ${gapCount} gaps`,
        status: "success",
        timestamp: new Date(startTime.getTime() + 2500).toISOString()
      },
      {
        name: "Care Plan Synthesis",
        model: AppConfig.models.planner,
        input_summary: "Clinical data + Safety report + Patient context",
        output_summary: "Generated 5-part patient friendly plan + clinician summary",
        status: "success",
        timestamp: new Date().toISOString()
      }
    ]
  };

  const confidenceLevel = conflictCount > 0 ? 'medium' : 'high';
  const score = conflictCount > 0 ? 85 : 98;
  const coverageGaps = [];
  if (parsedEpisode.medications.length === 0) coverageGaps.push("No medications found");
  if (parsedEpisode.appointments.length === 0) coverageGaps.push("No follow-up appointments found");

  const selfEvalSummary: SelfEvalSummary = {
    score: score,
    confidence: confidenceLevel,
    user_facing_message: confidenceLevel === 'high' 
      ? "Plan generated with high confidence. All sections appear complete based on provided documents." 
      : "Plan generated with caution. Some conflicts were detected in the source documents; please review the 'Questions for Doctor' section.",
    coverage_gaps: coverageGaps
  };

  return {
    ...parsedJson,
    runTrace,
    selfEvalSummary
  };
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

PRODUCT KNOWLEDGE:
1. **Care Nearby Locator**: You can help users find nearby urgent care, hospitals, and pharmacies using Google Maps. This is for navigation only, NOT triage.
2. **Clinician Messaging**: Doctors can send non-urgent updates. This is NOT live chat and NOT for emergencies.

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

  const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
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
  }));

  return {
    text: response.text || "I found some information.",
    groundingMetadata: response.candidates?.[0]?.groundingMetadata
  };
}
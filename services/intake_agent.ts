
import { Type } from "@google/genai";
import { ai } from "./gemini";
import { AppConfig, SAFETY_GUIDELINES } from "../config";
import { cleanAndParseJSON } from "./utils";
import { PatientInfo, ChatMessage, IntakeAgentResponse, ConsistencyIssue, ParsedEpisode } from "../types";

export async function runIntakeAgent(
  currentInfo: PatientInfo,
  fileCount: number,
  chatHistory: ChatMessage[],
  lastUserMessage: string,
  isExtractionComplete: boolean = false,
  parsedEpisode?: ParsedEpisode | null
): Promise<IntakeAgentResponse> {

  // Construct Session State Object for Prompt
  const sessionState = {
    phase: isExtractionComplete ? "review" : (fileCount > 0 ? "collection" : "onboarding"),
    files_count: fileCount,
    user_provided_info: currentInfo,
    completeness: {
      has_files: fileCount > 0,
      has_demographics: !!currentInfo.name && !!currentInfo.age,
    }
  };

  const systemPrompt = `
    ${SAFETY_GUIDELINES}

    You are "CareTransia Intake", a patient coordinator.
    
    === GOAL ===
    Collect ALL discharge documents (summaries, med lists, appointment cards) and user notes BEFORE starting analysis.
    Do NOT analyze partially. Wait for the user to confirm they are done uploading.

    === CURRENT STATE ===
    Phase: ${sessionState.phase}
    Files Uploaded: ${sessionState.files_count}
    Patient Info Known: ${JSON.stringify(sessionState.user_provided_info)}

    === BEHAVIOR RULES ===
    
    **PHASE 1: ONBOARDING (0 Files)**
    - Ask the user to upload their discharge papers or pill bottle photos.
    - Mention they can also type details if they don't have papers.
    - Widget: "upload"

    **PHASE 2: COLLECTION (Files > 0)**
    - TRIGGER: User just uploaded files.
    - ACTION: Acknowledge receipt (e.g., "Received 2 documents").
    - CRITICAL: ASK if there is more. "Do you have any other pages, separate medication lists, or handwritten notes?"
    - Do NOT offer to "Analyze" yet unless the user says "That's all" or "Done".
    - Widget: "upload_options" (This allows adding more or finishing).

    **PHASE 3: MANUAL INFO (User typing notes)**
    - If user types medical info (e.g., "I take Aspirin"), acknowledge it and save to 'state_updates'.
    - If user types missing demographics (e.g., "99, fever"), EXTRACT IT aggressively into 'extracted_info' immediately. Do NOT complain about format. Be smart.
    - Ask if they have documents to back this up.

    **PHASE 4: READY TO ANALYZE**
    - TRIGGER: User says "I'm done" or clicks done.
    - CHECK: Do we have Name, Age, Condition? If not, YOU MUST ASK FOR THEM. Do not proceed to analysis.
    - CHECK: Do we have at least 1 file?
    - IF READY: Action: "extract_data".
    - IF MISSING INFO: Ask for specific missing fields.

    === OUTPUT SCHEMA ===
    Return JSON:
    {
      "text": "Conversational response",
      "widget": "upload" | "upload_options" | "analyze" | "none",
      "action": "wait" | "extract_data" | "ask_for_info",
      "extracted_info": { "name": "...", "age": "...", "primary_condition": "..." } // Only if found in text
    }
  `;

  // Filter history to just role/parts for the API
  const historyForApi = chatHistory.map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  const response = await ai.models.generateContent({
    model: AppConfig.models.fast, // Use fast model for snappy chat
    contents: [
      ...historyForApi,
      { role: 'user', parts: [{ text: `Current Input: "${lastUserMessage}". State: ${JSON.stringify(sessionState)}` }] }
    ],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING },
            widget: { type: Type.STRING, enum: ["none", "upload", "upload_options", "analyze"] },
            action: { type: Type.STRING, enum: ["wait", "extract_data", "ask_for_info"] },
            extracted_info: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, nullable: true },
                    age: { type: Type.STRING, nullable: true },
                    primary_condition: { type: Type.STRING, nullable: true },
                }
            }
        }
      }
    }
  });

  if (!response.text) throw new Error("Agent failed to respond.");
  
  const result = cleanAndParseJSON<IntakeAgentResponse>(response.text);
  
  // Attach debug info
  result._debug = {
      userMessage: lastUserMessage,
      sessionState
  };
  
  return result;
}

export async function askGapQuestion(
  gaps: ConsistencyIssue[],
  parsedEpisode: ParsedEpisode,
  patientInfo: PatientInfo
): Promise<{ text: string; suggestions: string[] }> {
    // Find the most critical gap
    const criticalGap = gaps.find(g => g.severity === 'critical') || gaps[0];
    if (!criticalGap) return { text: '', suggestions: [] };

    const systemPrompt = `
    ${SAFETY_GUIDELINES}
    
    You are CareTransia Agent. A safety gap was detected in the patient's discharge papers.
    
    Gap: ${criticalGap.summary}
    Details: ${criticalGap.details}
    Suggested Question: ${criticalGap.suggested_question}
    
    Patient: ${patientInfo.name}, ${patientInfo.age}, ${patientInfo.primary_condition}
    
    Task:
    Rewrite the "Suggested Question" to be friendly, clear, and empathetic for a layperson caregiver.
    Keep it under 2 sentences. Be specific.
    Also provide 2-3 helpful suggestion buttons that might be the answer.
    
    Return JSON: { "text": "...", "suggestions": ["...", "..."] }
    `;

    const response = await ai.models.generateContent({
        model: AppConfig.models.fast,
        contents: [{ role: 'user', parts: [{ text: "Generate gap question." }] }],
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });

    if (!response.text) return { text: criticalGap.suggested_question, suggestions: ["I don't know"] };
    return cleanAndParseJSON<{ text: string; suggestions: string[] }>(response.text);
}

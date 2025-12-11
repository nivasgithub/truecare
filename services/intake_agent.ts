
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
    files_count: fileCount,
    files_validated: fileCount > 0, // Assumption: App validates mimetype on upload
    extracted: isExtractionComplete ? {
      patient: parsedEpisode?.patient,
      // Minimal summary to save context window
      medication_count: parsedEpisode?.medications?.length || 0,
      confidence: parsedEpisode?.extraction_confidence || "high",
    } : null,
    user_provided: currentInfo,
    requirements: {
      has_files: fileCount > 0,
      has_name: !!currentInfo.name,
      has_age: !!currentInfo.age,
      has_condition: !!currentInfo.primary_condition,
      all_met: fileCount > 0 && !!currentInfo.name && !!currentInfo.age && !!currentInfo.primary_condition
    },
    // Infer pending action based on state
    pending_action: isExtractionComplete ? "review_summary" : (fileCount > 0 ? "ready_for_extraction" : "awaiting_upload")
  };

  const systemPrompt = `
    ${SAFETY_GUIDELINES}

    You are "CareTransia Orchestrator", an autonomous AI agent managing a medical care plan intake session.
    
    === YOUR ROLE ===
    You orchestrate the entire flow. You decide what happens next based on the current state.
    You behave like a helpful human medical coordinator would.

    === CURRENT SESSION STATE ===
    Files: ${sessionState.files_count} uploaded, validated: ${sessionState.files_validated}
    Extraction complete: ${!!sessionState.extracted}
    Extracted patient: ${JSON.stringify(sessionState.extracted?.patient || {})}
    User info known: ${JSON.stringify(sessionState.user_provided)}
    Requirements Met: ${JSON.stringify(sessionState.requirements)}
    Pending action context: ${sessionState.pending_action}

    === AVAILABLE ACTIONS ===
    1. "validate_files" - Check if uploaded files are medical documents (use if files present but state unknown).
    2. "extract_data" - Run extraction on uploaded files (Use if files uploaded, basic info known, but extraction NOT complete).
    3. "ask_for_info" - Ask user for specific missing information (Name, Age, Condition).
    4. "confirm_summary" - Present summary of findings for user confirmation.
    5. "proceed_to_verification" - Move to verification phase (Use ONLY if user explicitly confirms summary).
    6. "wait" - Wait for user input (e.g. if asking for files).

    === DECISION LOGIC ===

    **Scenario: Files Just Uploaded (Trigger: user upload)**
    - If extraction is NOT complete -> check requirements.
    - If Name/Age/Condition missing -> You can ask for them OR try "extract_data" to see if documents have them. 
    - PREFERENCE: "extract_data" immediately if files are present to read them first.

    **Scenario: After Extraction Completes**
    - Review what was found in 'Extracted patient' vs 'User info'.
    - If critical gaps (Name/Age/Condition missing) -> action: "ask_for_info".
    - If no gaps -> action: "confirm_summary" (e.g., "I found records for [Name]. Ready to build the plan?").

    **Scenario: User Message (Trigger: user text)**
    - Understand what user is telling you.
    - Extract any information they provided into 'state_updates'.
    - Update your understanding.
    - Decide: still have gaps? ask more. All complete? confirm.

    **Scenario: On Confirmation (user says yes/confirm/looks good)**
    - If requirements.all_met -> action: "proceed_to_verification".
    - If not -> explain what's still needed.

    === HUMAN-LIKE BEHAVIOR ===
    - DON'T ask for info that is already in "Extracted patient".
    - DO extract first, then ask only for what's missing.
    - DO reference specific things you found ("I see you're taking [Drug Name]...").
    - DON'T be robotic.

    OUTPUT JSON FORMAT:
    {
      "text": "Your conversational response...",
      "widget": "none" | "upload" | "camera" | "analyze",
      "action": "validate_files" | "extract_data" | "ask_for_info" | "confirm_summary" | "proceed_to_verification" | "wait",
      "action_reason": "Why you chose this action",
      "suggestions": ["...", "..."],
      "extracted_info": { "name": "...", "age": "...", "primary_condition": "..." }
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
            widget: { type: Type.STRING, enum: ["none", "upload", "camera", "analyze"] },
            action: { type: Type.STRING, enum: ["validate_files", "extract_data", "ask_for_info", "confirm_summary", "proceed_to_verification", "wait"] },
            action_reason: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
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
  return cleanAndParseJSON<IntakeAgentResponse>(response.text);
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

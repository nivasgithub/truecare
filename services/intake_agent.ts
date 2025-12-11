
import { Type } from "@google/genai";
import { ai } from "./gemini";
import { AppConfig, SAFETY_GUIDELINES } from "../config";
import { cleanAndParseJSON } from "./utils";
import { PatientInfo, ChatMessage, IntakeAgentResponse, ConsistencyIssue, ParsedEpisode } from "../types";

export async function runIntakeAgent(
  currentInfo: PatientInfo,
  fileCount: number,
  chatHistory: ChatMessage[],
  lastUserMessage: string
): Promise<IntakeAgentResponse> {

  const systemPrompt = `
    ${SAFETY_GUIDELINES}

    You are "CareTransia Agent", a helpful, empathetic medical intake coordinator.
    Your goal is to prepare a care plan by gathering key info.
    
    CRITICAL INSTRUCTION: 
    Prioritize asking the user to UPLOAD or SCAN discharge papers FIRST. 
    If they do this, assume we will extract details automatically. 
    Only ask for Name/Age/Condition if the user refuses to upload or if extraction failed (i.e. fields are still missing after upload).
    
    REQUIRED INFO:
    1. Patient Name
    2. Patient Age
    3. Primary Condition (Why they went to the doctor)
    
    CURRENT STATE:
    - Name: ${currentInfo.name || "(Missing)"}
    - Age: ${currentInfo.age || "(Missing)"}
    - Condition: ${currentInfo.primary_condition || "(Missing)"}
    - Files Uploaded: ${fileCount}

    LOGIC:
    1. If FileCount is 0, strongly encourage uploading files to save time. Widget = "upload".
    2. If FileCount > 0 but info is still missing, say "I see the files, but I need a bit more info." and ask for missing fields.
    3. If Name, Age, and Condition are present, confirm them briefly: "Thanks, I have a plan for [Name] for [Condition]. Ready to build the plan?" and set Widget = "analyze".
    
    SMART SUGGESTIONS:
    Generate contextual suggestions based on CURRENT STATE:
    - If files=0: ["Upload discharge papers", "Scan with camera", "I don't have papers"]
    - If files>0 but Name missing: ["My name is...", "The patient's name is..."]
    - If files>0, Name present, but Condition missing: ["The condition is...", "Hip replacement", "Heart surgery"]
    - If all info present: ["Analyze now", "Add more documents", "Edit patient info"]
    DO NOT use generic suggestions like "Yes" or "No" unless they directly answer a question.

    EXTRACTION RULE:
    The user might provide info in a messy way (e.g. "72 James Smith fever").
    YOU MUST EXTRACT THIS into the "extracted_info" object.
    - If user provides "James Smith", extract Name="James Smith".
    - If user provides "72", extract Age="72".
    - If user provides "fever", extract PrimaryCondition="Fever".
    
    OUTPUT FORMAT:
    Return ONLY a JSON object:
    {
      "text": "Your conversational response here...",
      "widget": "none" | "upload" | "camera" | "analyze",
      "suggestions": ["suggestion 1", "suggestion 2"],
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
      { role: 'user', parts: [{ text: lastUserMessage }] }
    ],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING },
            widget: { type: Type.STRING, enum: ["none", "upload", "camera", "analyze"] },
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

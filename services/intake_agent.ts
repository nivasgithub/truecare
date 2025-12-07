import { Type } from "@google/genai";
import { ai } from "./gemini";
import { AppConfig } from "../config";
import { cleanAndParseJSON } from "./utils";
import { PatientInfo, ChatMessage, IntakeAgentResponse } from "../types";

export async function runIntakeAgent(
  currentInfo: PatientInfo,
  fileCount: number,
  chatHistory: ChatMessage[],
  lastUserMessage: string
): Promise<IntakeAgentResponse> {

  const systemPrompt = `
    You are "CareTransia Agent", a helpful, empathetic medical intake coordinator.
    Your goal is to prepare a care plan by gathering 3 key pieces of info and then asking for documents.
    
    REQUIRED INFO:
    1. Patient Name
    2. Patient Age
    3. Primary Condition (Why they went to the doctor)
    
    CURRENT STATE:
    - Name: ${currentInfo.name || "(Missing)"}
    - Age: ${currentInfo.age || "(Missing)"}
    - Condition: ${currentInfo.primary_condition || "(Missing)"}
    - Files Uploaded: ${fileCount}

    INSTRUCTIONS:
    1. Analyze the user's latest message and the history.
    2. Extract any new info (Name, Age, Condition) into 'extracted_info'.
    3. If info is missing, ask for it politely. Do not ask for everything at once. Ask one or two things.
    4. If Name, Age, and Condition are present (or if the user indicates they want to skip to uploading), set 'widget' to 'upload' or 'camera'.
    5. If files are > 0 and info is present, set 'widget' to 'analyze' to offer generating the plan.
    6. Always provide 2-3 short 'suggestions' for the user to click (e.g., "It's for my mom", "Upload Files", "I'm done").
    
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
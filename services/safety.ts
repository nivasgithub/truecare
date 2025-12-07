import { Type } from "@google/genai";
import { ai } from "./gemini";
import { cleanAndParseJSON } from "./utils";
import { AppConfig } from "../config";
import { ParsedEpisode, ConsistencyReport } from "../types";

export async function checkConsistency(episodeData: ParsedEpisode): Promise<ConsistencyReport> {
  const systemPrompt = `
You are a medical safety checker for CareTransia. Analyze the parsed discharge instructions.
1. Identify internal conflicts (e.g., meds list says "stop X", notes say "continue X").
2. Identify critical gaps (e.g., "follow up in 1 week" but no appointment/clinic listed).
3. If everything looks safe, return empty arrays.
`;

  const response = await ai.models.generateContent({
    model: AppConfig.models.safety,
    contents: {
      role: 'user',
      parts: [{ text: `Data: ${JSON.stringify(episodeData)}\nAnalyze for conflicts and gaps.` }]
    },
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["success", "error"] },
          error_message: { type: Type.STRING },
          conflicts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                summary: { type: Type.STRING },
                details: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["info", "important", "critical"] },
                suggested_question: { type: Type.STRING }
              }
            }
          },
          gaps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                summary: { type: Type.STRING },
                details: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["info", "important", "critical"] },
                suggested_question: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  if (!response.text) throw new Error("No response from consistency checker");
  return cleanAndParseJSON<ConsistencyReport>(response.text);
}
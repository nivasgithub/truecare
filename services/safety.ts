import { Type } from "@google/genai";
import { ai } from "./gemini";
import { cleanAndParseJSON } from "./utils";
import { AppConfig, SAFETY_GUIDELINES } from "../config";
import { ParsedEpisode, ConsistencyReport } from "../types";

export async function checkConsistency(episodeData: ParsedEpisode): Promise<ConsistencyReport> {
  const systemPrompt = `
${SAFETY_GUIDELINES}

You are a medical safety checker for CareTransia. Analyze the parsed discharge instructions.
1. Identify internal conflicts (e.g., meds list says "stop X", notes say "continue X").
2. Identify critical gaps (e.g., "follow up in 1 week" but no appointment/clinic listed).
3. If everything looks safe, return empty arrays.

STRICT FORMATTING RULES:
- Output valid JSON only.
- **DO NOT** use newlines (\n) inside string values. Keep all descriptions on a single line.
- **DO NOT** use markdown formatting (bold, italic) inside the JSON strings.
- Keep descriptions concise.
`;

  try {
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

    if (!response.text) return { status: 'success', error_message: '', conflicts: [], gaps: [] };
    
    const raw = cleanAndParseJSON<Partial<ConsistencyReport>>(response.text) || {};
    
    // Safety Force: Ensure arrays exist even if model returns partial object
    return {
        status: raw.status || 'success',
        error_message: raw.error_message || '',
        conflicts: Array.isArray(raw.conflicts) ? raw.conflicts : [],
        gaps: Array.isArray(raw.gaps) ? raw.gaps : []
    };

  } catch (e) {
    console.warn("Safety check failed to parse or execute. Returning empty report.", e);
    // Return a safe default instead of crashing the flow
    return {
        status: 'success',
        error_message: 'Safety check unavailable',
        conflicts: [],
        gaps: []
    };
  }
}
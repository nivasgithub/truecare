import { Type, GenerateContentResponse } from "@google/genai";
import { ai } from "./gemini";
import { cleanAndParseJSON, runWithRetry } from "./utils";
import { AppConfig, SAFETY_GUIDELINES } from "../config";
import { ParsedEpisode, ConsistencyReport } from "../types";

export async function checkConsistency(episodeData: ParsedEpisode): Promise<ConsistencyReport> {
  const systemPrompt = `
${SAFETY_GUIDELINES}

You are a medical safety checker for CareTransia. 
Your task is to validate the parsed discharge data for safety, consistency, drug interactions, dosage plausibility, and **active emergencies**.

Analyze the data for these specific issues:

1. **Active Emergency Detection (HIGHEST PRIORITY)**:
   - Scan 'additional_notes' and user-provided text for keywords indicating an ACTIVE, LIFE-THREATENING emergency (e.g., "chest pain now", "can't breathe", "bleeding heavily", "stroke symptoms").
   - If detected: Set \`is_emergency\` to **true**.
   - Provide clear \`emergency_guidance\` (e.g., "User reported active chest pain. Call 911 immediately.").

2. **Internal Conflicts**:
   - Contradictions within the documents (e.g., meds list says "stop X", notes say "continue X").
   - Type: "Internal Conflict"

3. **Critical Gaps**:
   - Missing vital information (e.g., "follow up in 1 week" but no clinic listed).
   - Type: "Information Gap"

4. **Drug Interactions (CRITICAL)**:
   - Review the 'medications' list.
   - Screen for HIGH-RISK drug-drug interactions using standard pharmacological knowledge.
   - Type: "Drug Interaction"
   - Severity: "critical" or "important".

5. **Dosage Sanity Check (CRITICAL)**:
   - Review the "dose" field for every medication.
   - Flag dosages that appear to be **OCR errors** or **physically impossible/lethal**.
   - Type: "Dosage Alert"
   - Severity: "critical"

STRICT FORMATTING RULES:
- Output valid JSON only.
- **DO NOT** use newlines (\n) inside string values. Keep all descriptions on a single line.
- **DO NOT** use markdown formatting (bold, italic) inside the JSON strings.
- Keep descriptions concise.
`;

  try {
    const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: AppConfig.models.safety,
        contents: {
        role: 'user',
        parts: [{ text: `Data: ${JSON.stringify(episodeData)}\nAnalyze for conflicts, gaps, drug interactions, dosage anomalies, and emergencies.` }]
        },
        config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
            status: { type: Type.STRING, enum: ["success", "error"] },
            error_message: { type: Type.STRING },
            // New Emergency Fields
            is_emergency: { type: Type.BOOLEAN },
            emergency_guidance: { type: Type.STRING },
            // Existing Arrays
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
    }));

    if (!response.text) return { status: 'success', error_message: '', conflicts: [], gaps: [] };
    
    const raw = cleanAndParseJSON<Partial<ConsistencyReport>>(response.text) || {};
    
    // Safety Force: Ensure arrays exist even if model returns partial object
    return {
        status: raw.status || 'success',
        error_message: raw.error_message || '',
        conflicts: Array.isArray(raw.conflicts) ? raw.conflicts : [],
        gaps: Array.isArray(raw.gaps) ? raw.gaps : [],
        is_emergency: raw.is_emergency || false,
        emergency_guidance: raw.emergency_guidance || ''
    };

  } catch (e: any) {
    console.warn("Safety check failed to parse or execute.", e);
    // CRITICAL: Return a 'warning' status so the UI knows safety checks were NOT performed.
    // Do NOT return 'success' which falsely implies no issues found.
    return {
        status: 'warning',
        error_message: 'Safety check unavailable: ' + (e.message || 'Unknown error'),
        conflicts: [],
        gaps: []
    };
  }
}
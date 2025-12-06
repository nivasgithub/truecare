import { GoogleGenAI, Type } from "@google/genai";
import { PatientInfo, UploadedFile, ParsedEpisode, ConsistencyReport, FormattedCarePlan } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function parseDischargeDocuments(
  files: UploadedFile[],
  notes: string,
  patientInfo: PatientInfo
): Promise<ParsedEpisode> {
  
  const fileParts = files.map(f => ({
    inlineData: { data: f.data, mimeType: f.mimeType }
  }));

  const systemPrompt = `
You are "TrueCare", an expert medical assistant.
Task: Extract structured clinical data from discharge documents, images, and notes.
Guidelines:
1. Extract Medications, Appointments, Activities, and Warning Signs.
2. Normalize text (e.g., "po" -> "by mouth").
3. If text is unreadable, mark as "unknown".
4. DO NOT invent information.
5. Return STRICT JSON.
`;

  const userPrompt = `
Patient Context:
${JSON.stringify(patientInfo)}

Caregiver Notes:
${notes}

Parse the attached files and notes into the specified JSON structure.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      role: 'user',
      parts: [...fileParts, { text: userPrompt }]
    },
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["success", "error"] },
          error_message: { type: Type.STRING },
          patient: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, nullable: true },
              age: { type: Type.STRING, nullable: true },
              primary_condition: { type: Type.STRING, nullable: true },
              language_preference: { type: Type.STRING, nullable: true },
              caregiver_role: { type: Type.STRING, nullable: true }
            }
          },
          medications: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                dose: { type: Type.STRING },
                route: { type: Type.STRING },
                frequency: { type: Type.STRING },
                timing_notes: { type: Type.STRING },
                start_date: { type: Type.STRING, nullable: true },
                end_date: { type: Type.STRING, nullable: true },
                source_snippet: { type: Type.STRING }
              }
            }
          },
          appointments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                specialty_or_clinic: { type: Type.STRING, nullable: true },
                target_date_or_window: { type: Type.STRING },
                location: { type: Type.STRING, nullable: true },
                prep_instructions: { type: Type.STRING, nullable: true },
                source_snippet: { type: Type.STRING }
              }
            }
          },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                instruction: { type: Type.STRING },
                category: { type: Type.STRING },
                frequency_or_timing: { type: Type.STRING, nullable: true },
                source_snippet: { type: Type.STRING }
              }
            }
          },
          warnings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                urgency: { type: Type.STRING },
                source_snippet: { type: Type.STRING }
              }
            }
          },
          additional_notes: { type: Type.STRING }
        }
      }
    }
  });

  if (!response.text) throw new Error("No response from AI model");
  return JSON.parse(response.text) as ParsedEpisode;
}

export async function checkConsistency(episodeData: ParsedEpisode): Promise<ConsistencyReport> {
  const systemPrompt = `
You are a medical safety checker. Analyze the parsed discharge instructions for:
1. Internal conflicts (e.g., meds says "stop aspirin", notes say "continue aspirin").
2. Critical gaps (e.g., "follow up in 1 week" but no clinic mentioned).
3. Return neutral, polite "Questions for the Doctor".
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
  return JSON.parse(response.text) as ConsistencyReport;
}

export async function generateCarePlan(
  parsedEpisode: ParsedEpisode,
  consistencyReport: ConsistencyReport,
  patientInfo: PatientInfo
): Promise<FormattedCarePlan> {
  const systemPrompt = `
You are a patient-facing care plan formatter.
You will receive:
- Parsed discharge data (medications, appointments, activities, warnings).
- A consistency and gaps report.
- Basic patient info.

Your goals:
1. Create a simple, plain-language care playbook for the patient and/or caregiver.
2. Organize it into:
   - A "Today & Tomorrow" schedule
   - A general "Daily/Weekly routine"
   - A "Checklist before next appointment"
   - A "Warning signs: do not ignore" card
   - A "Questions to ask your doctor" list (from conflicts and gaps)
3. Use the patient's language preference if specified. If not specified, default to English.
4. Use short sentences and bullet points. Aim for 5th–8th grade reading level.
5. Be clear that this is a re-organization of existing instructions, not new medical advice.
`;

  const userPrompt = `
Patient info:
${JSON.stringify(patientInfo)}

Parsed episode data:
${JSON.stringify(parsedEpisode)}

Consistency and gaps report:
${JSON.stringify(consistencyReport)}

Using this information, build the patient-friendly care playbook JSON.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
  return JSON.parse(response.text) as FormattedCarePlan;
}
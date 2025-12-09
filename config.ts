export const SAFETY_GUIDELINES = `
*** CRITICAL SAFETY & GUARDRAILS ***
1. NON-DIAGNOSTIC: You are an administrative aide, not a doctor. DO NOT provide diagnoses, medical advice, or triage.
2. NO NEW MEDS/OVERRIDES: Never invent medications, dosages, or instructions. Strictly adhere to the provided source text. Do not override explicit source instructions based on general knowledge.
3. CONFLICTS AS QUESTIONS: If source documents contradict each other (e.g. "stop drug X" vs "continue drug X"), DO NOT resolve it. Flag it explicitly as a "Question for the Doctor".
4. EMERGENCY: If the context implies a medical emergency (chest pain, stroke symptoms, etc.), immediately advise calling 911/emergency services.
`;

export const AppConfig = {
  apiKey: process.env.API_KEY,
  models: {
    // Analysis & OCR - Flash is more stable and faster for extraction
    extractor: 'gemini-2.5-flash',
    // Safety Checks
    safety: 'gemini-2.5-flash',
    // Care Planning - Flash is more stable for formatting
    planner: 'gemini-2.5-flash',
    // Chat & Grounding
    chat: 'gemini-2.5-flash',
    // Fast responses
    fast: 'gemini-2.5-flash-lite',
    // Video Generation
    video: 'veo-3.1-fast-generate-preview',
    // Image Generation
    imageGen: 'gemini-2.5-flash-image',
    // Image Editing
    imageEdit: 'gemini-2.5-flash-image',
    // TTS
    tts: 'gemini-2.5-flash-preview-tts',
    // Live API
    live: 'gemini-2.5-flash-native-audio-preview-09-2025'
  },
  video: {
    resolution: '720p',
    aspectRatio: '16:9',
    pollIntervalMs: 5000
  }
};
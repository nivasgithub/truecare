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
    // Analysis & OCR (Request 11: Use Gemini 3 Pro Preview)
    extractor: 'gemini-3-pro-preview',
    // Safety Checks
    safety: 'gemini-2.5-flash',
    // Care Planning - Switched to Flash for speed
    planner: 'gemini-2.5-flash',
    // Chat & Grounding (Maps/Search requires Flash currently)
    chat: 'gemini-2.5-flash',
    // Fast responses (Request 12)
    fast: 'gemini-2.5-flash-lite',
    // Video Generation (Request 3, 9)
    video: 'veo-3.1-fast-generate-preview',
    // Image Generation (Request 5)
    imageGen: 'gemini-3-pro-image-preview',
    // Image Editing (Request 1)
    imageEdit: 'gemini-2.5-flash-image',
    // TTS (Request 16)
    tts: 'gemini-2.5-flash-preview-tts',
    // Live API (Request 2)
    live: 'gemini-2.5-flash-native-audio-preview-09-2025'
  },
  video: {
    resolution: '720p',
    aspectRatio: '16:9',
    pollIntervalMs: 5000
  }
};
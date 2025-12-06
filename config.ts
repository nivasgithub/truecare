export const AppConfig = {
  apiKey: process.env.API_KEY,
  models: {
    // Default model used for extracting data from documents (OCR/Multimodal)
    extractor: process.env.MODEL_EXTRACTOR || 'gemini-2.5-flash',
    // Model used for checking safety/consistency
    safety: process.env.MODEL_SAFETY || 'gemini-2.5-flash',
    // Model used for generating the care plan and chat
    planner: process.env.MODEL_PLANNER || 'gemini-2.5-flash',
    // Model used for video generation
    video: process.env.MODEL_VIDEO || 'veo-3.1-fast-generate-preview'
  },
  video: {
    resolution: '720p',
    aspectRatio: '16:9',
    pollIntervalMs: 5000
  }
};

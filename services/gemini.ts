import { GoogleGenAI } from "@google/genai";
import { AppConfig } from "../config";

// Initialize the core GoogleGenAI client
// Note: Video generation requires a fresh instance per call to handle dynamic key selection,
// so it is handled separately in services/video.ts.
export const ai = new GoogleGenAI({ apiKey: AppConfig.apiKey });

import { GoogleGenAI } from "@google/genai";
import { AppConfig } from "../config";
import { GeneratedVideo } from "../types";

export async function generateRecoveryVideo(prompt: string): Promise<GeneratedVideo> {
  // Check for API key selection for Veo (Paid feature)
  if (typeof window !== 'undefined' && window.aistudio && window.aistudio.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
          await window.aistudio.openSelectKey();
      }
  }

  // We re-instantiate specifically for Veo to ensure we catch any key updates if possible
  // Use the API key from config, which maps to process.env.API_KEY
  const veoAi = new GoogleGenAI({ apiKey: AppConfig.apiKey });

  let operation = await veoAi.models.generateVideos({
    model: AppConfig.models.video,
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: AppConfig.video.resolution as any,
      aspectRatio: AppConfig.video.aspectRatio as any
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, AppConfig.video.pollIntervalMs));
    operation = await veoAi.operations.getVideosOperation({operation: operation});
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Failed to generate video");

  return {
    uri: `${videoUri}&key=${AppConfig.apiKey}`,
    expiresAt: '1 hour'
  };
}

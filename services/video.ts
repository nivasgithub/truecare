import { GoogleGenAI } from "@google/genai";
import { AppConfig } from "../config";
import { GeneratedVideo } from "../types";

export async function generateRecoveryVideo(prompt: string, startImageBase64?: string): Promise<GeneratedVideo> {
  // Check for API key selection for Veo (Paid feature)
  if (typeof window !== 'undefined' && window.aistudio && window.aistudio.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
          await window.aistudio.openSelectKey();
      }
  }

  const veoAi = new GoogleGenAI({ apiKey: AppConfig.apiKey });

  let operation;

  if (startImageBase64) {
    // Image-to-Video
    const cleanBase64 = startImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    operation = await veoAi.models.generateVideos({
      model: AppConfig.models.video,
      prompt: prompt, // Prompt is optional but recommended
      image: {
        imageBytes: cleanBase64,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9' // Match the image gen default
      }
    });
  } else {
    // Text-to-Video
    operation = await veoAi.models.generateVideos({
      model: AppConfig.models.video,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: AppConfig.video.resolution as any,
        aspectRatio: AppConfig.video.aspectRatio as any
      }
    });
  }

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

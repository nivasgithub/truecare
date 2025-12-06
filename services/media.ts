import { GoogleGenAI, Modality } from "@google/genai";
import { AppConfig } from "../config";
import { ai } from "./gemini";

// --- Text to Speech ---
export async function generateSpeech(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: AppConfig.models.tts,
    contents: { parts: [{ text: text }] },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Failed to generate speech");
  return base64Audio;
}

// --- Image Generation ---
export async function generateImage(prompt: string, aspectRatio: string = "16:9"): Promise<string> {
  // Image Gen requires Gemini 3 Pro Image Preview
  // Note: Aspect ratios allowed: "1:1", "3:4", "4:3", "9:16", "16:9"
  const response = await ai.models.generateContent({
    model: AppConfig.models.imageGen,
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any, 
        imageSize: "1K" // Defaulting to 1K for speed/compatibility
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

// --- Image Editing ---
export async function editImage(imageBase64: string, editInstruction: string): Promise<string> {
  // Image Edit requires Gemini 2.5 Flash Image
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  
  const response = await ai.models.generateContent({
    model: AppConfig.models.imageEdit,
    contents: {
      parts: [
        { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
        { text: editInstruction }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to edit image");
}

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

export async function playRawAudio(base64String: string, sampleRate = 24000): Promise<void> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });

  // Decode Base64 to binary
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Convert Raw PCM (Int16) to AudioBuffer (Float32)
  // Gemini TTS returns 16-bit PCM, usually 24kHz
  const dataInt16 = new Int16Array(bytes.buffer);
  
  const buffer = audioContext.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
      // Normalize Int16 to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i] / 32768.0;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);

  return new Promise((resolve) => {
    source.onended = () => {
        resolve();
        // Clean up context to release hardware resources
        setTimeout(() => audioContext.close(), 100); 
    };
  });
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

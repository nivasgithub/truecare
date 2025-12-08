import React, { useEffect, useRef, useState } from 'react';
import { ai } from '../services/gemini';
import { AppConfig } from '../config';
import { Modality } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { Icons } from './ui';

interface LiveAssistantProps {
  onClose: () => void;
  isOpen: boolean;
}

export default function LiveAssistant({ onClose, isOpen }: LiveAssistantProps) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [volume, setVolume] = useState(0);
  
  // Audio Contexts
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  
  // State for session
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const startSession = async () => {
      try {
        setStatus('connecting');

        // 1. Setup Audio Input
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        
        audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });

        inputSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        // Using ScriptProcessor for raw PCM access (Worklet is better but this is simpler for single file)
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        // 2. Connect to Live API
        const sessionPromise = ai.live.connect({
          model: AppConfig.models.live,
          callbacks: {
            onopen: () => {
              if (mounted) setStatus('connected');
              console.log("Live API Connected");
            },
            onmessage: async (message: LiveServerMessage) => {
              // Handle Audio Output
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio && outputContextRef.current) {
                try {
                  const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    outputContextRef.current,
                    24000,
                    1
                  );
                  playAudioBuffer(audioBuffer);
                } catch (e) {
                  console.error("Audio decode error", e);
                }
              }

              // Handle Interruption
              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(source => source.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onclose: () => {
              if (mounted) onClose();
            },
            onerror: (err) => {
              console.error("Live API Error", err);
              if (mounted) setStatus('error');
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: `You are CareTransia Live, a helpful medical assistant. Be concise, empathetic, and clear.

You are grounded in the following product features:

1. **Care Nearby Locator**:
   - I can help find nearby urgent care, hospitals, pharmacies, and clinics.
   - NOTE: This is for navigation only. It DOES NOT provide triage or decide if a situation is an emergency.
   - SAFETY: If you suspect a medical emergency, call 911 immediately.

2. **Clinician Messaging**:
   - Your care team can send non-urgent updates, clarifications, or reminders.
   - NOTE: This is NOT live chat. Messages are asynchronous. 
   - You generally cannot reply directly here; please call the clinic or use their official portal.
   - SAFETY: Do not use messaging for emergencies.

General Safety: CareTransia organizes discharge papers but does not provide medical diagnosis.`,
            speechConfig: {
               voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            }
          }
        });

        // 3. Process Input Audio
        processorRef.current.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Calculate volume for visualizer
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
          const rms = Math.sqrt(sum / inputData.length);
          if (mounted) setVolume(Math.min(rms * 5, 1)); // Scale for UI

          // Convert to PCM 16-bit
          const pcmData = floatTo16BitPCM(inputData);
          const base64Data = arrayBufferToBase64(pcmData);

          sessionPromise.then(session => {
            sessionRef.current = session;
            session.sendRealtimeInput({
              media: {
                mimeType: "audio/pcm;rate=16000",
                data: base64Data
              }
            });
          });
        };

        inputSourceRef.current.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);

      } catch (err) {
        console.error("Failed to start Live session", err);
        setStatus('error');
      }
    };

    startSession();

    return () => {
      mounted = false;
      // Cleanup
      if (sessionRef.current) {
          // No explicit close method exposed on the session object wrapper in some versions, 
          // but dropping reference usually enough. If available: sessionRef.current.close();
      }
      inputSourceRef.current?.disconnect();
      processorRef.current?.disconnect();
      audioContextRef.current?.close();
      outputContextRef.current?.close();
      sourcesRef.current.forEach(s => s.stop());
    };
  }, [isOpen]);

  // --- Audio Helpers ---
  
  function playAudioBuffer(buffer: AudioBuffer) {
    if (!outputContextRef.current) return;
    const ctx = outputContextRef.current;
    
    // Ensure we don't schedule in the past
    const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(startTime);
    
    nextStartTimeRef.current = startTime + buffer.duration;
    
    sourcesRef.current.add(source);
    source.onended = () => sourcesRef.current.delete(source);
  }

  function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
     const dataInt16 = new Int16Array(data.buffer);
     const frameCount = dataInt16.length / numChannels;
     const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
     for (let channel = 0; channel < numChannels; channel++) {
       const channelData = buffer.getChannelData(channel);
       for (let i = 0; i < frameCount; i++) {
         channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
       }
     }
     return buffer;
  }

  function floatTo16BitPCM(input: Float32Array) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output.buffer;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in">
       
       <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-white rounded-full p-1" aria-label="Close Live Assistant">
         <span className="text-4xl">&times;</span>
       </button>

       <div className="flex flex-col items-center gap-8 max-w-md text-center p-6">
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${status === 'connected' ? 'bg-gradient-to-tr from-blue-500 to-purple-600 shadow-[0_0_60px_rgba(59,130,246,0.5)]' : 'bg-slate-800'}`}>
             {status === 'connecting' && <Icons.Spinner className="w-10 h-10 text-white" />}
             {status === 'connected' && (
                <div 
                  className="w-full h-full rounded-full absolute bg-white/20 animate-pulse" 
                  style={{ transform: `scale(${1 + volume})` }} 
                />
             )}
             {status === 'connected' && <Icons.Mic className="w-12 h-12 text-white relative z-10" />}
             {status === 'error' && <Icons.Alert className="w-12 h-12 text-red-400" />}
          </div>

          <div>
             <h2 className="text-3xl font-bold text-white mb-2">
               {status === 'connecting' && 'Connecting...'}
               {status === 'connected' && 'Listening...'}
               {status === 'error' && 'Connection Failed'}
             </h2>
             <p className="text-slate-400">
               {status === 'connected' 
                 ? "Go ahead, ask me anything about your care plan."
                 : "Please check your microphone permissions."}
             </p>
          </div>
       </div>

       {/* Waveform Visualizer Mock */}
       {status === 'connected' && (
         <div className="flex items-center justify-center gap-1 h-12 mt-8">
            {[...Array(5)].map((_, i) => (
               <div 
                 key={i} 
                 className="w-2 bg-blue-500 rounded-full transition-all duration-75"
                 style={{ height: `${20 + Math.random() * volume * 100}px`, opacity: 0.5 + volume }}
               ></div>
            ))}
         </div>
       )}
    </div>
  );
}
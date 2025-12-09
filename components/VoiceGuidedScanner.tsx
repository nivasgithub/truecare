
import React, { useEffect, useRef, useState } from 'react';
import { ai } from '../services/gemini';
import { AppConfig } from '../config';
import { Modality, type LiveServerMessage } from '@google/genai';
import { Icons } from './ui';

interface VoiceGuidedScannerProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

type ScanStatus = 'initializing' | 'connecting' | 'scanning' | 'ready' | 'captured' | 'error';

export default function VoiceGuidedScanner({ onCapture, onClose }: VoiceGuidedScannerProps) {
  // Status State
  const [status, setStatus] = useState<ScanStatus>('initializing');
  const [guidanceText, setGuidanceText] = useState<string>('Initializing camera...');
  const [qualityScore, setQualityScore] = useState<number>(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null); // Holds the actual session object
  const sessionPromiseRef = useRef<Promise<any> | null>(null); // Holds the connection promise
  const frameIntervalRef = useRef<number | null>(null);
  
  // Audio Output Context
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Flag to prevent multiple captures
  const capturedRef = useRef<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // 1. Start Camera
        setStatus('initializing');
        setGuidanceText('Starting camera...');
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // 2. Setup Audio Output
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });

        // 3. Connect to Live API
        setStatus('connecting');
        setGuidanceText('Connecting to AI assistant...');

        const sessionPromise = ai.live.connect({
          model: AppConfig.models.live,
          callbacks: {
            onopen: () => {
              console.log("Live API Connected");
              if (mounted) {
                setStatus('scanning');
                setGuidanceText('Point your camera at the document');
                startFrameCapture();
              }
            },
            onmessage: (message: LiveServerMessage) => {
              if (mounted) handleLiveMessage(message);
            },
            onclose: () => {
              console.log("Live session closed");
            },
            onerror: (err) => {
              console.error("Live API Error:", err);
              if (mounted) {
                setStatus('error');
                setGuidanceText('Connection failed. Please try again.');
              }
            }
          },
          config: {
            // Use Modality enum to avoid potential issues
            responseModalities: [Modality.AUDIO],
            outputAudioTranscription: {}, 
            systemInstruction: SCANNER_SYSTEM_PROMPT,
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            }
          }
        });

        sessionPromiseRef.current = sessionPromise;

        // Wait for connection with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Connection timed out")), 10000)
        );

        try {
            const session = await Promise.race([sessionPromise, timeoutPromise]);
            sessionRef.current = session;
        } catch (connErr: any) {
            console.error("Connection Timeout or Error:", connErr);
            if (mounted) {
                setStatus('error');
                setGuidanceText(connErr.message || 'Connection timeout');
            }
        }

      } catch (err: any) {
        console.error("Failed to initialize scanner", err);
        if (mounted) {
          setStatus('error');
          setGuidanceText(`Error: ${err.message || 'Camera access failed'}`);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  // --- Live API Message Handler ---
  const handleLiveMessage = (message: LiveServerMessage) => {
    // Handle Audio Output
    const audioPart = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData?.mimeType?.startsWith('audio'));
    if (audioPart?.inlineData?.data && outputContextRef.current) {
      playAudioResponse(audioPart.inlineData.data);
    }

    // Handle Text Response (from transcription) for quality assessment
    const transcription = message.serverContent?.outputTranscription;
    if (transcription?.text) {
      const text = transcription.text.trim();
      if (text.length > 0) {
        setGuidanceText(text); // Show what AI is saying

        // Parse quality indicators from AI response
        const lowerText = text.toLowerCase();
        if (lowerText.includes('perfect') || lowerText.includes('excellent') || lowerText.includes('capturing')) {
          setQualityScore(100);
          triggerAutoCapture();
        } else if (lowerText.includes('good') || lowerText.includes('clear')) {
          setQualityScore(80);
        } else if (lowerText.includes('better') || lowerText.includes('almost')) {
          setQualityScore(60);
        } else if (lowerText.includes('blurry') || lowerText.includes('dark') || lowerText.includes('move')) {
          setQualityScore(30);
        }
      }
    }
  };

  // --- Frame Capture Loop ---
  const startFrameCapture = () => {
    // Send frames every 800ms
    frameIntervalRef.current = window.setInterval(() => {
      if (capturedRef.current) return;
      sendVideoFrame();
    }, 800);
  };

  const sendVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Always use the promise to ensure we have a valid session before sending
    if (!sessionPromiseRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Set canvas size to video size
    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
    
    // Draw current frame
    ctx.drawImage(video, 0, 0);
    
    // Convert to base64 JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5); // Lower quality/res for speed
    const base64Data = dataUrl.split(',')[1];

    // Send to Live API via Promise to ensure session is ready
    sessionPromiseRef.current.then(session => {
        try {
            session.sendRealtimeInput({
                media: {
                    mimeType: 'image/jpeg',
                    data: base64Data
                }
            });
        } catch (e) {
            console.warn("Failed to send frame:", e);
        }
    });
  };

  // --- Auto Capture ---
  const triggerAutoCapture = () => {
    if (capturedRef.current) return;
    capturedRef.current = true;

    setStatus('ready');
    
    // Small delay to let user hear "capturing" before we close
    setTimeout(() => {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          const highQualityDataUrl = canvas.toDataURL('image/jpeg', 0.95); // Max quality for final capture
          setStatus('captured');
          onCapture(highQualityDataUrl);
        }
      }
    }, 1500);
  };

  // --- Manual Capture (fallback) ---
  const handleManualCapture = () => {
    if (capturedRef.current) return;
    capturedRef.current = true;

    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setStatus('captured');
        onCapture(dataUrl);
      }
    }
  };

  // --- Audio Playback ---
  const playAudioResponse = async (base64Audio: string) => {
    if (!outputContextRef.current) return;
    
    // Ensure Context is running (browsers suspend auto-created contexts)
    if (outputContextRef.current.state === 'suspended') {
        try {
            await outputContextRef.current.resume();
        } catch (e) {
            console.warn("Audio resume failed", e);
        }
    }

    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = outputContextRef.current.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }

      const source = outputContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(outputContextRef.current.destination);
      
      const startTime = Math.max(nextStartTimeRef.current, outputContextRef.current.currentTime);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;
      
      sourcesRef.current.add(source);
      source.onended = () => sourcesRef.current.delete(source);
    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  const toggleAudio = async () => {
      if (outputContextRef.current) {
          if (outputContextRef.current.state === 'suspended') {
              await outputContextRef.current.resume();
          }
      }
      setIsAudioEnabled(!isAudioEnabled);
  };

  // --- Cleanup ---
  const cleanup = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    // Cleanup session properly using close method if available or just dereferencing
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
            if (session && typeof session.close === 'function') {
                session.close();
            }
        }).catch(() => {}); // Ignore errors on close
    }
    
    if (outputContextRef.current && outputContextRef.current.state !== 'closed') {
        outputContextRef.current.close();
    }
    sourcesRef.current.forEach(s => {
        try { s.stop(); } catch {}
    });
  };

  // --- Quality Indicator Color ---
  const getQualityColor = () => {
    if (qualityScore >= 80) return 'bg-emerald-500';
    if (qualityScore >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col animate-fade-in">
      
      {/* Header */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${status === 'scanning' ? 'bg-blue-500 animate-pulse' : status === 'ready' ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
          <span className="text-white font-bold text-sm shadow-black drop-shadow-md">
            {status === 'initializing' && 'Starting Camera...'}
            {status === 'connecting' && 'Connecting to AI...'}
            {status === 'scanning' && 'Scanning...'}
            {status === 'ready' && 'Capturing...'}
            {status === 'captured' && 'Done!'}
            {status === 'error' && 'Error'}
          </span>
        </div>
        <div className="flex gap-4">
            {/* Audio Toggle (Forces Resume) */}
            <button 
                onClick={toggleAudio}
                className="bg-white/20 p-2 rounded-full text-white backdrop-blur-sm hover:bg-white/30"
            >
                {isAudioEnabled ? <Icons.Speaker className="w-6 h-6" /> : <Icons.Stop className="w-6 h-6" />}
            </button>
            <button 
                onClick={onClose} 
                className="bg-white/20 p-2 rounded-full text-white backdrop-blur-sm hover:bg-white/30"
                aria-label="Close"
            >
                <span className="text-2xl leading-none">&times;</span>
            </button>
        </div>
      </div>

      {/* Video Feed */}
      <div className="relative flex-1 flex items-center justify-center">
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover"
          muted 
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Status Error Display */}
        {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
                <div className="bg-red-600 text-white p-6 rounded-xl max-w-sm text-center">
                    <Icons.Alert className="w-10 h-10 mx-auto mb-2" />
                    <p className="font-bold">{guidanceText}</p>
                    <button onClick={onClose} className="mt-4 bg-white text-red-600 px-4 py-2 rounded-full font-bold text-sm">Close</button>
                </div>
            </div>
        )}

        {/* Document Frame Guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`border-4 rounded-2xl w-[85%] max-w-md aspect-[3/4] transition-colors duration-300 ${
            qualityScore >= 80 ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.4)]' : 
            qualityScore >= 50 ? 'border-amber-400' : 
            'border-white/40'
          }`}>
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl"></div>
          </div>
        </div>

        {/* Quality Progress Bar */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-48 h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className={`h-full transition-all duration-300 ${getQualityColor()}`}
            style={{ width: `${qualityScore}%` }}
          ></div>
        </div>
      </div>

      {/* Guidance Panel */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-16 pb-8 px-6">
        
        {/* Voice Guidance Text */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-3">
            <Icons.Mic className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="text-xs text-white/70 font-bold uppercase tracking-wider">AI Guide</span>
          </div>
          <p className="text-white text-lg font-medium max-w-md mx-auto leading-relaxed drop-shadow-md">
            "{guidanceText}"
          </p>
        </div>

        {/* Manual Capture Button */}
        <div className="flex justify-center">
          <button 
            onClick={handleManualCapture}
            className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${
              status === 'scanning' || status === 'ready'
                ? 'bg-white/20 hover:bg-white/40 active:scale-95' 
                : 'bg-white/10 opacity-50 cursor-not-allowed'
            }`}
            aria-label="Capture manually"
          >
            <div className="w-16 h-16 bg-white rounded-full"></div>
          </button>
        </div>
        
        <p className="text-center text-white/50 text-xs mt-4">
          AI will auto-capture when image is clear
        </p>
      </div>
    </div>
  );
}

// --- System Prompt ---
const SCANNER_SYSTEM_PROMPT = `You are a real-time document scanning assistant for CareTransia.

YOUR TASK:
Analyze video frames and provide SHORT, HELPFUL voice guidance to help the user capture a clear photo of medical documents or pill bottles.

GUIDANCE RULES:
1. **Be concise** - Max 10-15 words per response.
2. **Be encouraging** - Use a calm tone.
3. **Focus on**: Visibility, Lighting, Focus, and Framing.

RESPONSE EXAMPLES:
- "Move the document into the center."
- "Too dark. Turn on a light."
- "Hold steady, it is a bit blurry."
- "Move closer to read the text."
- "Excellent! Hold still, capturing now."

CAPTURE TRIGGER:
When the image is clear enough to read (good focus, lighting, full document visible), say exactly:
"Perfect! Hold steady, capturing now."

This phrase triggers the app to take the photo. Do NOT provide medical advice.`;

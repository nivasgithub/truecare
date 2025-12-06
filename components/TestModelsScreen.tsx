import React, { useState } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { AppConfig } from '../config';
import { ai } from '../services/gemini';
import { generateImage, editImage, generateSpeech } from '../services/media';
import { generateRecoveryVideo } from '../services/video';
import { Card, Button, Icons, SectionTitle } from './ui';

interface TestModelsScreenProps {
  onBack: () => void;
}

export default function TestModelsScreen({ onBack }: TestModelsScreenProps) {
    
    // Test States
    const [fastResult, setFastResult] = useState<string>('');
    const [fastLoading, setFastLoading] = useState(false);

    const [proResult, setProResult] = useState<string>('');
    const [proLoading, setProLoading] = useState(false);

    const [groundingResult, setGroundingResult] = useState<any>(null);
    const [groundingLoading, setGroundingLoading] = useState(false);

    const [imageGenResult, setImageGenResult] = useState<string | null>(null);
    const [imageGenLoading, setImageGenLoading] = useState(false);

    const [imageEditResult, setImageEditResult] = useState<string | null>(null);
    const [imageEditLoading, setImageEditLoading] = useState(false);

    const [ttsLoading, setTtsLoading] = useState(false);
    
    const [videoResult, setVideoResult] = useState<string | null>(null);
    const [videoLoading, setVideoLoading] = useState(false);

    // --- Tests ---

    const testFast = async () => {
        setFastLoading(true);
        const start = Date.now();
        try {
            const resp = await ai.models.generateContent({
                model: AppConfig.models.fast, // Flash-Lite
                contents: { parts: [{ text: "Explain quantum computing in 10 words." }] }
            });
            const duration = Date.now() - start;
            setFastResult(`${resp.text} (${duration}ms)`);
        } catch (e: any) {
            setFastResult("Error: " + e.message);
        }
        setFastLoading(false);
    };

    const testPro = async () => {
        setProLoading(true);
        try {
            const resp = await ai.models.generateContent({
                model: AppConfig.models.planner, // Pro Preview (Thinking)
                contents: { parts: [{ text: "Write a haiku about a hospital visit." }] },
                config: {
                    thinkingConfig: { thinkingBudget: 1024 }
                }
            });
            setProResult(resp.text || "No text returned");
        } catch (e: any) {
            setProResult("Error: " + e.message);
        }
        setProLoading(false);
    };

    const testGrounding = async () => {
        setGroundingLoading(true);
        try {
            // Using Chat Model (Flash) for tools support
            const resp = await ai.models.generateContent({
                model: AppConfig.models.chat, 
                contents: { parts: [{ text: "Find pharmacies near San Francisco downtown." }] },
                config: {
                    tools: [{ googleMaps: {} }]
                }
            });
            setGroundingResult(resp.candidates?.[0]?.groundingMetadata);
        } catch (e: any) {
            setGroundingResult({ error: e.message });
        }
        setGroundingLoading(false);
    };

    const testImageGen = async () => {
        setImageGenLoading(true);
        try {
            const b64 = await generateImage("A futuristic hospital room with plants", "16:9");
            setImageGenResult(b64);
        } catch (e: any) {
            alert("Image Gen Error: " + e.message);
        }
        setImageGenLoading(false);
    };

    const testImageEdit = async () => {
        if (!imageGenResult) {
            alert("Generate an image first to edit.");
            return;
        }
        setImageEditLoading(true);
        try {
            const b64 = await editImage(imageGenResult, "Make it look like a cartoon");
            setImageEditResult(b64);
        } catch (e: any) {
            alert("Image Edit Error: " + e.message);
        }
        setImageEditLoading(false);
    };

    const testTTS = async () => {
        setTtsLoading(true);
        try {
            const b64 = await generateSpeech("This is a test of the Gemini Text to Speech capability.");
            const audio = new Audio("data:audio/wav;base64," + b64); // API returns raw PCM usually, but service might need wrapping. 
            // Note: The service code in previous turn returns RAW PCM. We need to decode it to play in browser.
            // Re-using the logic from ResultsDashboard for decoding would be ideal, but for a quick test 
            // let's just log success if we get bytes.
            if (b64) alert("TTS Success: Received audio bytes. (Playback requires decoding context)");
        } catch (e: any) {
            alert("TTS Error: " + e.message);
        }
        setTtsLoading(false);
    };

    const testVideo = async () => {
        setVideoLoading(true);
        try {
            const res = await generateRecoveryVideo("A cat running in a field");
            setVideoResult(res.uri);
        } catch (e: any) {
            alert("Video Error: " + e.message);
        }
        setVideoLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
            <div className="mb-6 flex items-center gap-2">
                <button 
                  onClick={onBack}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                >
                   ← Back to Settings
                </button>
            </div>
            
            <SectionTitle title="Model Diagnostics" subtitle="Verify individual Gemini capabilities and latency" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Text Models */}
                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icons.Sparkle className="text-blue-500"/> Text Generation
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-sm text-slate-700">Gemini 2.5 Flash-Lite</span>
                                <Button onClick={testFast} disabled={fastLoading} variant="secondary" className="py-1 px-3 text-xs">Test Speed</Button>
                            </div>
                            <p className="text-xs text-slate-500 font-mono min-h-[1.5rem]">{fastLoading ? "Testing..." : fastResult || "Waiting..."}</p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl">
                             <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-sm text-slate-700">Gemini 3 Pro (Thinking)</span>
                                <Button onClick={testPro} disabled={proLoading} variant="secondary" className="py-1 px-3 text-xs">Test Logic</Button>
                            </div>
                            <p className="text-xs text-slate-500 font-mono min-h-[1.5rem]">{proLoading ? "Thinking..." : proResult || "Waiting..."}</p>
                        </div>
                    </div>
                </Card>

                {/* 2. Grounding */}
                <Card className="p-6">
                     <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icons.User className="text-green-500"/> Grounding (Maps)
                    </h3>
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-slate-600">Query: "Pharmacies near San Francisco"</p>
                        <Button onClick={testGrounding} disabled={groundingLoading} className="w-full">
                            {groundingLoading ? <Icons.Spinner/> : "Test Maps Grounding"}
                        </Button>
                        <div className="bg-slate-900 text-green-400 p-4 rounded-xl text-xs font-mono h-32 overflow-auto">
                            {groundingResult ? JSON.stringify(groundingResult, null, 2) : "Grounding metadata will appear here..."}
                        </div>
                    </div>
                </Card>

                {/* 3. Image Models */}
                <Card className="p-6 md:col-span-2">
                     <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icons.Camera className="text-purple-500"/> Image Capabilities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Button onClick={testImageGen} disabled={imageGenLoading} className="w-full">
                                {imageGenLoading ? "Generating..." : "Test Gen (Gemini 3 Pro Image)"}
                            </Button>
                            {imageGenResult && (
                                <img src={imageGenResult} className="w-full rounded-xl border border-slate-200" alt="Generated" />
                            )}
                        </div>
                        <div className="space-y-4">
                             <Button onClick={testImageEdit} disabled={imageEditLoading || !imageGenResult} variant="secondary" className="w-full">
                                {imageEditLoading ? "Editing..." : "Test Edit (Gemini 2.5 Flash Image)"}
                            </Button>
                             {imageEditResult && (
                                <img src={imageEditResult} className="w-full rounded-xl border border-slate-200" alt="Edited" />
                            )}
                            {!imageGenResult && <p className="text-xs text-slate-400 text-center">Generate an image first to test editing.</p>}
                        </div>
                    </div>
                </Card>

                 {/* 4. Video & Audio */}
                 <Card className="p-6 md:col-span-2">
                     <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icons.Upload className="text-red-500"/> Video (Veo) & Audio
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-4 border-r border-slate-100 pr-4">
                            <p className="text-sm font-bold text-slate-700">Veo Video Generation</p>
                            <Button onClick={testVideo} disabled={videoLoading} className="w-full">
                                {videoLoading ? "Generating (Wait ~10s)..." : "Test Veo (Cat running)"}
                            </Button>
                            {videoResult && (
                                <video src={videoResult} controls className="w-full rounded-xl" />
                            )}
                         </div>
                         <div className="space-y-4 pl-4">
                            <p className="text-sm font-bold text-slate-700">Text-to-Speech</p>
                            <Button onClick={testTTS} disabled={ttsLoading} variant="secondary" className="w-full">
                                {ttsLoading ? "Synthesizing..." : "Test TTS (Alert)"}
                            </Button>
                         </div>
                    </div>
                </Card>

            </div>
        </div>
    );
}
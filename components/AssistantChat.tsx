import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './ui';
import { ChatMessage, FormattedCarePlan } from '../types';
import { queryCarePlan } from '../services/planner';
import { generateSpeech, playRawAudio, stopAudio } from '../services/media';

interface AssistantChatProps {
    isOpen: boolean;
    onClose: () => void;
    carePlan: FormattedCarePlan | null;
    patientName?: string;
}

export default function AssistantChat({ isOpen, onClose, carePlan, patientName }: AssistantChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [ttsStatus, setTtsStatus] = useState<'idle' | 'generating' | 'playing'>('idle');
    const [isListening, setIsListening] = useState(false);
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Initialize greeting when opened or plan changes
    useEffect(() => {
        if (carePlan && messages.length === 0) {
             setMessages([{ 
                 id: 'init', 
                 role: 'model', 
                 text: `Hi! I have the care plan for ${patientName || 'the patient'}. Ask me anything about medications, appointments, or what to do next.`, 
                 timestamp: Date.now() 
             }]);
        } else if (!carePlan && messages.length === 0) {
             setMessages([{ 
                 id: 'init', 
                 role: 'model', 
                 text: `Hi! I don't see an active care plan right now. Please select a record or scan new documents so I can help you.`, 
                 timestamp: Date.now() 
             }]);
        }
    }, [carePlan, patientName, isOpen]);

    useEffect(() => {
        if (isOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleSend = async (text: string = input) => {
        if (!text.trim()) return;
        
        // Stop any active TTS
        stopPlaying();

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        if (!carePlan) {
            setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Please open a care plan first so I can answer your questions.", timestamp: Date.now() }]);
                setIsTyping(false);
            }, 1000);
            return;
        }

        try {
            const result = await queryCarePlan(carePlan, messages, userMsg.text);
            let groundingText = "";
            if (result.groundingMetadata?.groundingChunks) {
                const chunks = result.groundingMetadata.groundingChunks;
                const links: string[] = [];
                chunks.forEach((c: any) => {
                    if (c.web?.uri) links.push(`[${c.web.title || 'Source'}](${c.web.uri})`);
                    if (c.maps?.uri) links.push(`[${c.maps.title || 'Map Location'}](${c.maps.uri})`);
                });
                if (links.length > 0) {
                    groundingText = "\n\n**Sources:**\n" + links.join("\n");
                }
            }

            const botMsg: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'model', 
                text: result.text + groundingText, 
                timestamp: Date.now() 
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I encountered an error. Please try again.", timestamp: Date.now() }]);
        } finally {
            setIsTyping(false);
        }
    };

    const playTTS = async (text: string) => {
        if (ttsStatus !== 'idle') {
            stopPlaying();
            return;
        }
        
        setTtsStatus('generating');
        try {
             const cleanText = text.replace(/[*#]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
             const base64Audio = await generateSpeech(cleanText);
             
             setTtsStatus('playing');
             await playRawAudio(base64Audio);
             setTtsStatus('idle'); // playRawAudio promise resolves when done
        } catch(e) {
             console.error("TTS Error", e);
             setTtsStatus('idle');
        }
    };

    const stopPlaying = () => {
        stopAudio();
        setTtsStatus('idle');
    };

    const toggleDictation = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice input is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.onresult = (event: any) => {
             const transcript = event.results[0][0].transcript;
             if (transcript) {
                 handleSend(transcript);
             }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-4 animate-fade-in-up">
             <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-80 md:w-96 h-[500px] flex flex-col overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <Icons.Sparkle className="w-5 h-5" /> CareTransia Assistant
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><span className="text-2xl leading-none">&times;</span></button>
                </div>
                
                <div className="flex-1 p-5 overflow-y-auto bg-slate-50 space-y-4">
                    {messages.map((m) => (
                        <div key={m.id} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {m.role === 'model' && (
                                <div className={`max-w-[85%] p-4 rounded-2xl text-base shadow-sm bg-white border border-slate-200 text-slate-800 rounded-bl-none`}>
                                    <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>').replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="underline font-bold hover:text-blue-200">$1</a>') }} />
                                </div>
                            )}
                            {m.role === 'model' && (
                               <button 
                                  onClick={() => playTTS(m.text)} 
                                  className={`p-2 bg-slate-100 rounded-full hover:bg-blue-50 transition-colors flex-shrink-0 ${ttsStatus === 'playing' ? 'text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-blue-600'}`}
                                  title={ttsStatus === 'playing' ? "Stop" : "Read Aloud"}
                               >
                                  {ttsStatus === 'generating' ? (
                                      <Icons.Spinner className="w-4 h-4 text-blue-500" />
                                  ) : ttsStatus === 'playing' ? (
                                      <Icons.Stop className="w-4 h-4" />
                                  ) : (
                                      <Icons.Speaker className="w-4 h-4" />
                                  )}
                               </button>
                            )}
                            {m.role === 'user' && (
                                <div className={`max-w-[85%] p-4 rounded-2xl text-base shadow-sm bg-blue-600 text-white rounded-br-none`}>
                                    <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>') }} />
                                </div>
                            )}
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1.5 items-center">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                    <div className="flex-1 relative">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about your plan..."
                            className="w-full bg-slate-100 rounded-full pl-5 pr-12 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500 border border-transparent focus:border-blue-200"
                        />
                         <button 
                            onClick={toggleDictation}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                            title={isListening ? "Listening..." : "Use Microphone"}
                        >
                            <Icons.Mic className="w-5 h-5" />
                        </button>
                    </div>
                    <button onClick={() => handleSend()} disabled={!input.trim()} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-200">
                        <Icons.Send className="w-5 h-5" />
                    </button>
                </div>
             </div>
        </div>
    );
}
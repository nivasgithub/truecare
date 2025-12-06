import React from 'react';
import { Icons, Card } from './ui';

interface TrueCareLandingPageProps {
  onGetStarted: () => void;
}

export default function TrueCareLandingPage({ onGetStarted }: TrueCareLandingPageProps) {
  return (
    <section className="flex flex-col w-full bg-slate-50 pt-10 pb-24 animate-fade-in relative overflow-hidden">
      
      {/* --- BACKGROUND FX --- */}
      <div className="absolute top-0 left-0 w-full h-[800px] overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] animate-pulse-slow"></div>
         <div className="absolute top-[10%] right-[-10%] w-[50%] h-[60%] bg-purple-400/20 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
         <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-cyan-400/20 rounded-full blur-[100px] animate-pulse-slow delay-2000"></div>
      </div>

      {/* --- HERO SECTION --- */}
      <div className="max-w-7xl px-4 relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24 mx-auto pt-12">
        
        {/* Left: Text Content */}
        <div className="text-left space-y-8">
          <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 text-slate-600 px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Operational
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.05]">
            Medical clarity, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">fully activated.</span>
          </h1>

          <p className="text-xl text-slate-600 max-w-lg leading-relaxed font-medium">
            Activate TrueCare to transform chaotic discharge papers into a structured, safety-checked recovery plan.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4 pt-2">
            <button 
              onClick={onGetStarted}
              className="group relative px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-1 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative flex items-center gap-3">
                Initialize Plan <Icons.ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-colors">
                View Demo
            </button>
          </div>
        </div>

        {/* Right: Abstract UI Representation */}
        <div className="relative h-[500px] w-full flex items-center justify-center perspective-[2000px]">
            <HeroDashboardUI />
        </div>
      </div>

      {/* --- CAPABILITIES BENTO GRID --- */}
      <div className="max-w-7xl mx-auto px-4 w-full mb-32 relative z-10">
          <div className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Active Capabilities</h2>
                <p className="text-slate-500">Real-time modules powering your recovery.</p>
              </div>
              <div className="hidden md:flex gap-2">
                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold">GEMINI 2.5</span>
                  <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-bold">VEO</span>
                  <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">LIVE</span>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 grid-rows-2 gap-5 h-auto lg:h-[500px]">
              
              {/* Tile 1: Vision (Large) */}
              <div className="md:col-span-2 row-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 p-6 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Icons.Maximize className="w-12 h-12 text-blue-400" />
                  </div>
                  <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                          <div className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/30 px-2 py-1 rounded text-[10px] font-bold tracking-wider mb-4 text-blue-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span> VISION ENGINE
                          </div>
                          <h3 className="text-3xl font-bold mb-2">Clinical OCR</h3>
                          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                              Advanced computer vision instantly digitizes handwritten notes, pill bottles, and discharge summaries with 99% accuracy.
                          </p>
                      </div>
                      
                      {/* Visual Graphic */}
                      <div className="w-full h-32 bg-slate-800/50 rounded-xl border border-white/10 relative overflow-hidden flex items-center gap-2 px-4 mt-6">
                          <div className="h-20 w-16 bg-white/10 rounded-md animate-pulse"></div>
                          <div className="flex-1 space-y-2">
                              <div className="h-2 w-3/4 bg-blue-500/50 rounded-full animate-scan"></div>
                              <div className="h-2 w-1/2 bg-white/20 rounded-full"></div>
                              <div className="h-2 w-2/3 bg-white/20 rounded-full"></div>
                          </div>
                          <div className="absolute right-4 bottom-4 text-xs font-mono text-green-400">MATCH_FOUND</div>
                      </div>
                  </div>
              </div>

              {/* Tile 2: Safety (Tall) */}
              <div className="md:col-span-1 row-span-2 bg-white border border-slate-200 rounded-[2rem] p-6 relative overflow-hidden group hover:border-blue-300 transition-colors shadow-lg">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100 transition-colors"></div>
                  <div className="relative z-10 flex flex-col h-full">
                      <div className="mb-auto">
                        <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-bold tracking-wider mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> SAFETY GUARD
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Conflict Detection</h3>
                        <p className="text-slate-500 text-sm">Automatically flags drug interactions and missing instructions.</p>
                      </div>
                      
                      <div className="mt-6 space-y-3">
                          <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex gap-3 items-center">
                              <Icons.Alert className="w-5 h-5 text-red-500" />
                              <div className="flex-1">
                                  <div className="h-1.5 w-12 bg-red-200 rounded mb-1"></div>
                                  <div className="h-1.5 w-full bg-red-100 rounded"></div>
                              </div>
                          </div>
                          <div className="p-3 bg-green-50 rounded-xl border border-green-100 flex gap-3 items-center opacity-50">
                              <Icons.Check className="w-5 h-5 text-green-500" />
                              <div className="flex-1">
                                  <div className="h-1.5 w-12 bg-green-200 rounded mb-1"></div>
                                  <div className="h-1.5 w-20 bg-green-100 rounded"></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Tile 3: Veo (Wide/Standard) */}
              <div className="md:col-span-1 lg:col-span-1 bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-[2rem] p-6 relative group overflow-hidden shadow-lg">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-pink-400"></div>
                   <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                             <h3 className="text-lg font-bold text-slate-900">Veo Video</h3>
                             <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">BETA</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">Visualize recovery goals with AI video.</p>
                        <div className="w-full aspect-video bg-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-pink-500/20"></div>
                             <Icons.Sparkle className="text-white w-6 h-6 animate-spin-slow" />
                        </div>
                   </div>
              </div>

              {/* Tile 4: Live (Standard) */}
              <div className="md:col-span-1 lg:col-span-1 bg-blue-50 border border-blue-100 rounded-[2rem] p-6 relative group hover:bg-blue-100/50 transition-colors shadow-lg">
                   <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-blue-900">Live Voice</h3>
                            <Icons.Mic className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-xs text-blue-700/70 mb-2">Real-time conversational agent.</p>
                        <div className="flex gap-1 items-end h-8">
                             <div className="w-1.5 bg-blue-400 rounded-full h-4 animate-bounce"></div>
                             <div className="w-1.5 bg-blue-500 rounded-full h-6 animate-bounce delay-75"></div>
                             <div className="w-1.5 bg-blue-400 rounded-full h-3 animate-bounce delay-150"></div>
                             <div className="w-1.5 bg-blue-500 rounded-full h-5 animate-bounce delay-300"></div>
                        </div>
                   </div>
              </div>

          </div>
      </div>

    </section>
  );
}

// --- VISUAL COMPONENTS ---

function HeroDashboardUI() {
    return (
        <div className="relative w-full max-w-[420px] aspect-[4/5] mx-auto rotate-[-5deg] hover:rotate-0 transition-transform duration-700 ease-out">
             {/* Main Card */}
             <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
                 
                 {/* Header */}
                 <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50">
                     <div className="flex gap-2">
                         <div className="w-3 h-3 rounded-full bg-red-400"></div>
                         <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                         <div className="w-3 h-3 rounded-full bg-green-400"></div>
                     </div>
                     <div className="text-xs font-bold text-slate-400 tracking-wider">TRUECARE.AI</div>
                 </div>

                 {/* Content */}
                 <div className="flex-1 p-6 space-y-6 bg-white">
                     
                     {/* Status Tile */}
                     <div className="bg-blue-50 rounded-2xl p-4 flex items-center gap-4">
                         <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                             <Icons.Sparkle className="w-6 h-6" />
                         </div>
                         <div>
                             <div className="text-xs font-bold text-blue-400 uppercase">Analysis Status</div>
                             <div className="text-lg font-bold text-slate-800">Processing Complete</div>
                         </div>
                         <div className="ml-auto w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                     </div>

                     {/* Stats Grid */}
                     <div className="grid grid-cols-2 gap-4">
                         <div className="bg-slate-50 rounded-2xl p-4">
                             <div className="text-2xl font-bold text-slate-900">4</div>
                             <div className="text-xs text-slate-500 font-medium mt-1">Medications Detected</div>
                         </div>
                         <div className="bg-slate-50 rounded-2xl p-4">
                             <div className="text-2xl font-bold text-slate-900">2</div>
                             <div className="text-xs text-slate-500 font-medium mt-1">Warnings Found</div>
                         </div>
                     </div>

                     {/* Plan Preview */}
                     <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
                         <div className="flex items-center gap-3">
                             <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>
                             <div className="h-2 w-32 bg-slate-100 rounded-full"></div>
                         </div>
                         <div className="flex items-center gap-3">
                             <div className="w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                                 <Icons.Check className="w-3 h-3 text-white" />
                             </div>
                             <div className="h-2 w-24 bg-slate-200 rounded-full"></div>
                         </div>
                         <div className="flex items-center gap-3">
                             <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>
                             <div className="h-2 w-40 bg-slate-100 rounded-full"></div>
                         </div>
                     </div>

                 </div>
             </div>

             {/* Floating Elements */}
             <div className="absolute -right-12 top-24 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-float">
                 <div className="flex items-center gap-3 mb-2">
                     <Icons.Pill className="w-5 h-5 text-orange-500" />
                     <span className="font-bold text-sm text-slate-700">Rx Found</span>
                 </div>
                 <div className="text-xs text-slate-500">Lisinopril 10mg</div>
             </div>

             <div className="absolute -left-8 bottom-32 bg-slate-800 p-4 rounded-2xl shadow-xl text-white animate-float delay-1000">
                 <div className="flex items-center gap-3">
                     <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                     <span className="font-bold text-sm">Safety Check Passed</span>
                 </div>
             </div>
        </div>
    );
}

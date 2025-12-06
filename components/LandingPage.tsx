import React from 'react';
import { Icons, Card } from './ui';

interface TrueCareLandingPageProps {
  onGetStarted: () => void;
}

export default function TrueCareLandingPage({ onGetStarted }: TrueCareLandingPageProps) {
  return (
    <section className="flex flex-col justify-center items-center text-center w-full bg-slate-50 pt-16 pb-24 animate-fade-in-up relative overflow-hidden">
      
      {/* Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-blue-100 via-cyan-50 to-white rounded-full blur-3xl opacity-60 -z-10 pointer-events-none"></div>

      {/* --- HERO SECTION --- */}
      <div className="max-w-7xl px-4 relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-32 mx-auto">
        
        {/* Left: Text Content */}
        <div className="text-left">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 shadow-sm transition-transform hover:scale-105">
            <Icons.Sparkle className="w-4 h-4 text-purple-600" /> 
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI-Powered Discharge Companion</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-[1.1]">
            Turn medical jargon into a <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500">clear plan.</span>
          </h1>

          <p className="text-xl text-slate-600 mb-8 max-w-lg leading-relaxed font-medium">
            Upload photos of your hospital paperwork. Our AI organizes it into a simple daily checklist and safety plan instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg shadow-2xl shadow-blue-500/20 hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
            >
              Generate My Plan <Icons.ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right: Concept Animation */}
        <div className="relative h-[500px] w-full flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white rounded-full blur-3xl opacity-50"></div>
            <ConceptAnimation />
        </div>
      </div>

      {/* --- FEATURES GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-4 text-left mb-32 max-w-6xl mx-auto relative z-10">
        <ModernFeatureCard 
          icon={<Icons.Sparkle className="w-6 h-6 text-white" />}
          gradient="from-blue-500 to-cyan-500"
          title="Instant Analysis"
          desc="Gemini AI reads complex medical notes and handwriting in seconds."
        />
        <ModernFeatureCard 
          icon={<Icons.Shield className="w-6 h-6 text-white" />}
          gradient="from-purple-500 to-pink-500"
          title="Safety Checks"
          desc="We automatically flag conflicting medications and missing instructions."
        />
        <ModernFeatureCard 
          icon={<Icons.User className="w-6 h-6 text-white" />}
          gradient="from-emerald-500 to-teal-500"
          title="Caregiver Ready"
          desc="Share a simple, plain-language checklist with family members."
        />
      </div>

      {/* --- NEW: INPUT VERSATILITY SECTION --- */}
      <div className="w-full bg-white py-24 border-y border-slate-100 mb-24 relative overflow-hidden">
        <div className="absolute left-0 top-0 w-full h-full bg-slate-50 opacity-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-7xl px-4 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
            <div className="order-2 lg:order-1 relative h-[400px] flex items-center justify-center">
                {/* Visual Composition of Docs/Meds */}
                <InputVisuals />
            </div>
            
            <div className="order-1 lg:order-2 text-left">
                <div className="mb-4 inline-block p-2 bg-blue-50 rounded-lg text-blue-600"><Icons.Camera className="w-6 h-6" /></div>
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                Works with everything <br/>
                <span className="text-blue-600">you bring home.</span>
                </h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Don't worry about typing out complicated drug names or deciphering doctor's handwriting. 
                TrueCare's vision AI accepts photos of:
                </p>
                <ul className="space-y-4">
                {[
                    "Multi-page discharge packets",
                    "Prescription bottle labels",
                    "Handwritten instructions from nurses",
                    "Clinical summaries and charts"
                ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Icons.Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-slate-800 font-medium">{item}</span>
                    </li>
                ))}
                </ul>
            </div>
        </div>
      </div>

      {/* --- NEW: CAREGIVER WORKFLOW SECTION --- */}
      <div className="max-w-7xl px-4 mx-auto mb-32 w-full">
         <div className="text-center mb-16">
             <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Designed for Caregivers</h2>
             <p className="text-slate-500 text-lg max-w-2xl mx-auto">Focus on your loved one, not the paperwork. We handle the organization.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* Step 1 */}
             <div className="bg-white rounded-3xl p-2 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden group">
                 <div className="bg-slate-50 rounded-2xl h-48 flex items-center justify-center relative overflow-hidden">
                     {/* Simulated Phone taking photo */}
                     <div className="w-32 h-56 bg-slate-800 rounded-3xl border-4 border-slate-700 shadow-2xl transform rotate-12 translate-y-10 group-hover:translate-y-5 transition-transform duration-500">
                         <div className="bg-slate-700 w-full h-8 rounded-t-2xl flex justify-center pt-2"><div className="w-10 h-1 bg-slate-600 rounded-full"></div></div>
                         <div className="w-full h-full bg-slate-900 relative">
                             {/* Camera Viewfinder UI */}
                             <div className="absolute inset-4 border-2 border-white/30 rounded-lg">
                                 <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                                 <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                                 <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                                 <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                             </div>
                             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-4 border-white"></div>
                             
                             {/* Hint Text in Camera */}
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/50 px-2 py-1 rounded">
                                 Align Document
                             </div>
                         </div>
                     </div>
                 </div>
                 <div className="p-6 text-left">
                     <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-4">1</div>
                     <h3 className="text-xl font-bold text-slate-900 mb-2">Snap & Upload</h3>
                     <p className="text-slate-500 text-sm">Just take a quick picture of documents or pill bottles right from your phone.</p>
                 </div>
             </div>

             {/* Step 2 */}
             <div className="bg-white rounded-3xl p-2 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden group">
                 <div className="bg-slate-50 rounded-2xl h-48 flex items-center justify-center relative overflow-hidden">
                      {/* Processing Animation */}
                      <div className="relative w-32 h-40 bg-white shadow-lg rounded-lg border border-slate-200 flex flex-col p-3 gap-2 transform group-hover:scale-105 transition-transform duration-500">
                           {/* Skeleton Lines */}
                           <div className="flex gap-2 mb-1">
                               <div className="h-2 w-8 bg-slate-200 rounded"></div>
                               <div className="h-2 w-full bg-slate-100 rounded"></div>
                           </div>
                           <div className="h-2 w-full bg-slate-100 rounded"></div>
                           <div className="h-2 w-3/4 bg-slate-100 rounded mb-2"></div>
                           
                           {/* Extracted Item Highlight */}
                           <div className="bg-blue-50 border border-blue-100 p-1.5 rounded flex items-center gap-1.5 animate-pulse">
                               <div className="w-3 h-3 rounded-full bg-blue-200"></div>
                               <div className="h-1.5 w-16 bg-blue-200 rounded"></div>
                           </div>

                           <div className="h-2 w-full bg-slate-100 rounded mt-2"></div>
                           
                           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/10 to-transparent h-full w-full animate-scan"></div>
                           <div className="absolute -right-4 top-10 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">Reading...</div>
                      </div>
                 </div>
                 <div className="p-6 text-left">
                     <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold mb-4">2</div>
                     <h3 className="text-xl font-bold text-slate-900 mb-2">AI Analyzes Everything</h3>
                     <p className="text-slate-500 text-sm">We extract medications, dosages, and warnings, cross-checking for safety conflicts.</p>
                 </div>
             </div>

             {/* Step 3 */}
             <div className="bg-white rounded-3xl p-2 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden group">
                 <div className="bg-slate-50 rounded-2xl h-48 flex items-center justify-center relative overflow-hidden">
                      {/* Result UI */}
                      <div className="w-full max-w-[80%] bg-white rounded-xl shadow-md border border-slate-200 p-4 transform translate-y-4 group-hover:translate-y-2 transition-transform duration-500">
                           <div className="flex items-center gap-2 mb-3">
                               <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</div>
                               <span className="font-bold text-sm text-slate-800">Plan Ready!</span>
                           </div>
                           <div className="space-y-2">
                               <div className="h-8 bg-blue-50 rounded-lg w-full flex items-center px-3 gap-2">
                                   <div className="w-4 h-4 rounded-full border border-blue-200 bg-white"></div>
                                   <div className="h-2 w-20 bg-blue-200 rounded"></div>
                               </div>
                               <div className="h-8 bg-slate-50 rounded-lg w-full flex items-center px-3 gap-2">
                                   <div className="w-4 h-4 rounded-full border border-slate-200 bg-white"></div>
                                   <div className="h-2 w-16 bg-slate-200 rounded"></div>
                               </div>
                           </div>
                      </div>
                 </div>
                 <div className="p-6 text-left">
                     <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mb-4">3</div>
                     <h3 className="text-xl font-bold text-slate-900 mb-2">Get Your Daily Plan</h3>
                     <p className="text-slate-500 text-sm">Receive a simple checklist for today and tomorrow. Share it with family instantly.</p>
                 </div>
             </div>
         </div>
      </div>

      {/* Trust Footer */}
      <div id="safety" className="mt-8 text-center scroll-mt-24 pb-8">
         <p className="text-sm text-slate-400 max-w-2xl mx-auto flex items-center justify-center gap-2">
            <Icons.Shield className="w-4 h-4" />
            <span>Private & Secure. Your data is processed only to generate your plan.</span>
         </p>
      </div>

    </section>
  );
}

// --- VISUAL COMPONENTS ---

function InputVisuals() {
    return (
        <div className="relative w-full aspect-square max-w-[400px] mx-auto perspective-[1000px]">
             
             {/* Background Blob */}
             <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-50"></div>

             {/* Document Layer - Discharge Summary */}
             <div className="absolute top-10 left-0 right-10 bottom-20 bg-white rounded-xl shadow-xl border border-slate-100 p-6 transform rotate-[-6deg] transition-transform hover:rotate-0 duration-700 z-10 flex flex-col">
                <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-2">
                    <div>
                        <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Discharge Summary</div>
                        <div className="text-sm font-bold text-slate-900">Mercy General Hospital</div>
                    </div>
                    <div className="w-8 h-8 rounded bg-slate-100"></div>
                </div>
                
                <div className="space-y-2 flex-1 overflow-hidden relative">
                    <div className="text-[10px] text-slate-500 font-medium">Patient: <span className="text-slate-900">Jane Doe</span></div>
                    <div className="text-[10px] text-slate-500 font-medium mb-2">DOB: <span className="text-slate-900">01/12/1954</span></div>
                    
                    <div className="mt-3">
                        <div className="text-[9px] font-bold text-slate-700 uppercase mb-1">Medications</div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-600 bg-slate-50 p-1 rounded">
                            <span className="font-bold">Lisinopril</span> 10mg Daily
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-600 bg-slate-50 p-1 rounded mt-1">
                            <span className="font-bold">Metformin</span> 500mg w/ meals
                        </div>
                    </div>
                     <div className="mt-2">
                        <div className="text-[9px] font-bold text-slate-700 uppercase mb-1">Instructions</div>
                         <div className="text-[8px] text-slate-500 leading-tight">
                            Rest for 2 days. Avoid heavy lifting. Call if fever > 101.
                        </div>
                    </div>
                    
                    {/* Fade out at bottom */}
                    <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent"></div>
                </div>
             </div>

             {/* Pill Bottle Layer */}
             <div className="absolute bottom-24 -right-2 bg-white p-2 rounded-2xl shadow-2xl border border-slate-100 transform rotate-[12deg] hover:rotate-[6deg] transition-transform duration-500 z-20 w-32">
                <div className="w-full h-36 bg-amber-500/10 rounded-xl border border-amber-200 relative overflow-hidden flex flex-col items-center pt-2 backdrop-blur-sm">
                    {/* Cap */}
                    <div className="w-16 h-4 bg-white border border-slate-200 rounded-sm mb-1 shadow-sm"></div>
                    
                    {/* Label */}
                    <div className="w-full flex-1 bg-white mx-1 mt-1 rounded-t-lg p-2 shadow-sm border-t border-slate-100 flex flex-col">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-1">
                             <div className="text-[6px] font-bold text-slate-400">RX# 49201</div>
                             <Icons.Pill className="w-3 h-3 text-amber-500"/>
                        </div>
                        <div className="text-[9px] font-bold text-slate-900 leading-tight">Amoxicillin</div>
                        <div className="text-[8px] font-medium text-slate-600">500 MG</div>
                        <div className="mt-1 text-[7px] text-slate-500 leading-tight">
                            Take 1 capsule by mouth every 8 hours.
                        </div>
                        <div className="mt-auto pt-1 text-[6px] text-slate-400 font-mono text-center">QTY: 30</div>
                    </div>
                </div>
             </div>

             {/* Handwritten Note */}
             <div className="absolute -top-2 right-12 bg-yellow-50 p-3 shadow-lg transform rotate-[4deg] w-36 border border-yellow-200 z-30 font-serif leading-tight rounded-sm">
                 <div className="text-red-500 font-bold text-[8px] mb-1">IMPORTANT!</div>
                 <p className="text-slate-800 text-[9px] italic">
                    "Dr. Smith said to stop taking Ibuprofen for now."
                 </p>
             </div>
        </div>
    );
}

function ConceptAnimation() {
  return (
    <div className="relative w-full max-w-md aspect-square">
        {/* Central Shield/Phone Hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-80 bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl z-20 flex flex-col overflow-hidden animate-float">
             {/* Notch */}
             <div className="w-20 h-6 bg-slate-800 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-30"></div>
             {/* Screen Content */}
             <div className="flex-1 bg-slate-50 p-4 pt-10 flex flex-col gap-3 relative">
                 {/* Header */}
                 <div className="flex justify-between items-center mb-2">
                     <div className="text-[10px] text-slate-400 font-bold">TODAY'S PLAN</div>
                     <div className="w-4 h-4 rounded-full bg-slate-200"></div>
                 </div>
                 
                 {/* List Items appearing */}
                 <div className="h-14 w-full bg-white rounded-xl shadow-sm border border-slate-100 flex items-center px-3 gap-3 animate-fade-in-up delay-700">
                     <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold">8<span className="text-[8px]">AM</span></div>
                     <div className="flex-1">
                         <div className="text-[10px] font-bold text-slate-900">Take Lisinopril</div>
                         <div className="text-[8px] text-slate-500">10mg • with food</div>
                     </div>
                     <div className="w-4 h-4 rounded-full border border-slate-200"></div>
                 </div>

                 <div className="h-14 w-full bg-white rounded-xl shadow-sm border border-slate-100 flex items-center px-3 gap-3 animate-fade-in-up delay-1000">
                     <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2<span className="text-[8px]">PM</span></div>
                     <div className="flex-1">
                         <div className="text-[10px] font-bold text-slate-900">Physio Exercises</div>
                         <div className="text-[8px] text-slate-500">15 mins • Leg lifts</div>
                     </div>
                     <div className="w-4 h-4 rounded-full border border-slate-200"></div>
                 </div>
                 
                 {/* Warning Card */}
                 <div className="h-16 w-full bg-red-50 rounded-xl shadow-sm border border-red-100 flex flex-col justify-center px-3 gap-1 animate-fade-in-up delay-1300">
                     <div className="flex items-center gap-2 text-red-700 text-[10px] font-bold">
                         <Icons.Alert className="w-3 h-3"/> Warning Sign
                     </div>
                     <div className="text-[9px] text-slate-700 leading-tight">
                         Call doctor if fever > 101°F or leg swelling increases.
                     </div>
                 </div>
                 
                 {/* Scanning Bar Overlay */}
                 <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-scan opacity-30 pointer-events-none"></div>
             </div>
        </div>

        {/* Floating Input Docs */}
        <div className="absolute top-10 left-0 bg-white p-2 rounded-xl shadow-lg border border-slate-100 rotate-[-12deg] animate-pulse-slow z-10 w-24">
            <div className="flex gap-2 items-center mb-1">
               <Icons.Note className="w-4 h-4 text-slate-400" />
               <div className="h-1.5 w-10 bg-slate-200 rounded"></div>
            </div>
            <div className="space-y-1">
               <div className="h-1 w-full bg-slate-100 rounded"></div>
               <div className="h-1 w-3/4 bg-slate-100 rounded"></div>
            </div>
        </div>
        <div className="absolute bottom-20 right-0 bg-white p-2 rounded-xl shadow-lg border border-slate-100 rotate-[12deg] animate-pulse-slow delay-500 z-10 w-24">
             <div className="flex gap-2 items-center mb-1">
               <Icons.Pill className="w-4 h-4 text-orange-400" />
               <div className="h-1.5 w-8 bg-slate-200 rounded"></div>
            </div>
            <div className="space-y-1">
               <div className="h-1 w-full bg-slate-100 rounded"></div>
            </div>
        </div>
        
        {/* Connection Lines (Simulated with simple divs) */}
        <div className="absolute inset-0 pointer-events-none">
             {/* Particles */}
             <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
             <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-purple-500 rounded-full animate-ping delay-700"></div>
        </div>
    </div>
  );
}

// Sub-components
function ModernFeatureCard({ icon, gradient, title, desc }: { icon: React.ReactNode, gradient: string, title: string, desc: string }) {
    return (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default relative overflow-hidden">
             <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-opacity group-hover:opacity-20`}></div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 shadow-md`}>
                {icon}
            </div>
            <h3 className="font-bold text-xl text-slate-900 mb-3">{title}</h3>
            <p className="text-slate-500 leading-relaxed">{desc}</p>
        </div>
    );
}

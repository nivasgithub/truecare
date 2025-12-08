import React from 'react';
import { Icons, Card } from './ui';

interface CareTransiaLandingPageProps {
  onGetStarted: () => void;
}

export default function CareTransiaLandingPage({ onGetStarted }: CareTransiaLandingPageProps) {
  
  const scrollToHowItWorks = () => {
      const element = document.getElementById('how-it-works');
      if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
      }
  };

  return (
    <div className="flex flex-col w-full bg-slate-50 relative overflow-hidden">
      
      {/* --- BACKGROUND FX --- */}
      <div className="absolute top-0 left-0 w-full h-[1200px] overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] animate-pulse-slow"></div>
         <div className="absolute top-[10%] right-[-10%] w-[50%] h-[60%] bg-purple-400/20 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
         <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-cyan-400/20 rounded-full blur-[100px] animate-pulse-slow delay-2000"></div>
      </div>

      {/* --- 1. HERO SECTION --- */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-24 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        <div className="text-left space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
            <Icons.Sparkle className="w-3 h-3 text-blue-500" />
            Smarter recovery, less overwhelm
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
            Turn Discharge Paperwork Into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Clear Care Plan.</span>
          </h1>

          <p className="text-xl text-slate-600 max-w-lg leading-relaxed font-medium">
            CareTransia reads your hospital documents, medications, and notes, then turns them into a simple, step-by-step care plan you and your family can actually follow.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4 pt-4">
            <button 
              onClick={onGetStarted}
              className="group relative px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-1 transition-all overflow-hidden w-full sm:w-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative flex items-center justify-center gap-3">
                Start organizing my papers <Icons.ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button onClick={scrollToHowItWorks} className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-colors w-full sm:w-auto">
                See how it works
            </button>
          </div>

          <div className="pt-6 flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-t border-slate-200/50">
             <span>Powered by Multimodal AI</span> • <span>For Patients & Clinicians</span>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="relative w-full flex items-center justify-center perspective-[2000px] animate-fade-in-right delay-200 py-10 md:py-0 md:h-[500px]">
            {/* Added max-w-full to prevent overflow on very small devices */}
            <div className="w-full max-w-[320px] xs:max-w-[380px] sm:max-w-[420px]">
                <HeroDashboardUI />
            </div>
        </div>
      </section>

      {/* --- 2. KEY BENEFITS --- */}
      <section className="max-w-7xl mx-auto px-4 py-20 relative z-10">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why people rely on CareTransia</h2>
            <p className="text-lg text-slate-600">One place to understand what to do next after leaving the hospital.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <BenefitCard 
                  icon={<Icons.Clipboard className="w-6 h-6 text-blue-600" />}
                  color="blue"
                  title="Unified Care Plan"
                  body="CareTransia pulls meds, follow-ups, and activity limits from scattered papers into a single, easy-to-read plan."
              />
              <BenefitCard 
                  icon={<Icons.Shield className="w-6 h-6 text-amber-600" />}
                  color="amber"
                  title="Conflict Checker"
                  body="If your paperwork contradicts itself, we flag it as a question to ask your doctor—not a guess you have to make."
              />
              <BenefitCard 
                  icon={<Icons.Home className="w-6 h-6 text-emerald-600" />}
                  color="green"
                  title="Built for Families"
                  body="Instructions are rewritten into calm, everyday language with simple checklists anyone can help with."
              />
              <BenefitCard 
                  icon={<Icons.Note className="w-6 h-6 text-purple-600" />}
                  color="purple"
                  title="Doctor Summary"
                  body="Creates a concise 'For Your Clinician' summary you can show at your next visit to align on your care."
              />
          </div>
      </section>

      {/* --- 3. HOW IT WORKS --- */}
      <section id="how-it-works" className="bg-white py-24 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4">
             <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900">How CareTransia works</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                 {/* Connector Line (Desktop) */}
                 <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-100 -z-0"></div>

                 <StepCard 
                    number="1"
                    title="Upload"
                    desc="Securely upload photos of discharge papers, pill bottles, and notes."
                    icon={<Icons.Upload className="w-8 h-8 text-blue-600" />}
                 />
                 <StepCard 
                    number="2"
                    title="AI Understanding"
                    desc="Our AI extracts details and checks for conflicting instructions."
                    icon={<Icons.Sparkle className="w-8 h-8 text-purple-600" />}
                 />
                 <StepCard 
                    number="3"
                    title="Your Care Plan"
                    desc="Get a daily schedule, priorities, and a clear list of doctor questions."
                    icon={<Icons.Check className="w-8 h-8 text-emerald-600" />}
                 />
             </div>
          </div>
      </section>

      {/* --- 4. WHO IT'S FOR --- */}
      <section className="max-w-7xl mx-auto px-4 py-24">
         <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Made for the people who carry the load</h2>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PersonaCard 
               title="Family Caregivers"
               desc="Juggling work, kids, and a loved one’s recovery? Get a straightforward plan so you’re not guessing."
               emoji="🏡"
            />
            <PersonaCard 
               title="Patients w/ Chronic Conditions"
               desc="When you’re discharged with multiple meds, see everything in one place instead of drowning in paper."
               emoji="❤️"
            />
            <PersonaCard 
               title="Clinicians & Care Teams"
               desc="Use it as a conversation tool to make sure your patient truly understands their next steps."
               emoji="🩺"
            />
         </div>
      </section>

      {/* --- 5. CORE HIGHLIGHTS --- */}
      <section className="bg-slate-900 text-white py-24 rounded-[3rem] mx-4 md:mx-8 mb-24 relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="max-w-5xl mx-auto px-4 relative z-10">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                 <div>
                    <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">What CareTransia <br/>does for you</h2>
                    <p className="text-lg text-slate-400 mb-8">
                       We translate clinical complexity into daily simplicity.
                    </p>
                    <button onClick={onGetStarted} className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold hover:bg-blue-50 transition-colors">
                       Generate my plan
                    </button>
                 </div>
                 
                 <div className="space-y-6">
                    <FeatureItem title="Today & Tomorrow Priorities" desc="Know exactly what needs to happen immediately after discharge." />
                    <FeatureItem title="Daily & Weekly Routines" desc="Medication timing, wound care, and prep for follow-up visits." />
                    <FeatureItem title="Warning Sign Cards" desc="A clear list of red flags: when to call the doctor vs. 911." />
                    <FeatureItem title="Doctor Question List" desc="Auto-generated questions based on missing info in your papers." />
                 </div>
             </div>
          </div>
      </section>

      {/* --- 6. TESTIMONIALS (NEW) --- */}
      <section className="max-w-7xl mx-auto px-4 pb-24">
          <div className="text-center mb-16">
             <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4">
                <Icons.User className="w-3 h-3" /> Trusted by Families
             </div>
             <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Real stories from recovery</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <TestimonialCard 
                  quote="The discharge instructions were 20 pages long and overwhelming. CareTransia turned it into a single-page checklist I could actually use."
                  author="Sarah J."
                  role="Daughter & Caregiver"
              />
              <TestimonialCard 
                  quote="I was so confused about which meds to stop and which to continue. The app flagged the conflict instantly so I could ask my doctor."
                  author="Michael T."
                  role="Heart Surgery Patient"
              />
              <TestimonialCard 
                  quote="Finally, a tool that helps me coordinate with my siblings. We all look at the same plan now instead of arguing over notes."
                  author="Elena R."
                  role="Managing Mom's Care"
              />
          </div>
      </section>

      {/* --- 7. SAFETY & TRUST --- */}
      <section id="safety" className="max-w-4xl mx-auto px-4 pb-24 text-center">
          <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-8 md:p-12">
             <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icons.Shield className="w-8 h-8" />
             </div>
             <h2 className="text-3xl font-bold text-slate-900 mb-6">Safe by design</h2>
             <p className="text-slate-600 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                CareTransia is built to clarify what your care team has already told you — not to replace them.
             </p>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-8">
                <TrustPoint title="No New Rx" desc="We organize existing instructions, never inventing new meds." />
                <TrustPoint title="Transparent" desc="Every recommendation traces back to your original document." />
                <TrustPoint title="AI as Guide" desc="Conflicts are surfaced as questions, not automated decisions." />
             </div>

             <div className="text-xs text-slate-400 max-w-lg mx-auto border-t border-blue-100 pt-6">
                ⚕️ CareTransia is an informational tool and does not provide medical advice, diagnosis, or treatment. Always consult a licensed clinician for medical decisions or emergencies.
             </div>
          </div>
      </section>

      {/* --- 8. FOOTER CTA --- */}
      <section className="bg-white border-t border-slate-100 py-24">
         <div className="max-w-3xl mx-auto px-4 text-center space-y-8">
            <h2 className="text-4xl font-bold text-slate-900">Ready to see your care plan in one place?</h2>
            <p className="text-xl text-slate-500">
               Upload your discharge documents and let CareTransia turn them into a clear, step-by-step plan you can share with your family.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
               <button 
                  onClick={onGetStarted}
                  className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-bold rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
               >
                  Get started with CareTransia
               </button>
            </div>
            <p onClick={scrollToHowItWorks} className="text-sm font-bold text-blue-600 hover:underline cursor-pointer">Learn more about how it works</p>
         </div>
      </section>

    </div>
  );
}

// --- SUB-COMPONENTS ---

function TestimonialCard({ quote, author, role }: { quote: string, author: string, role: string }) {
    return (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative">
            <div className="text-4xl text-blue-200 font-serif absolute top-6 left-6">“</div>
            <p className="text-slate-600 italic mb-6 relative z-10 pt-4 leading-relaxed">
                {quote}
            </p>
            <div>
                <div className="font-bold text-slate-900">{author}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{role}</div>
            </div>
        </div>
    );
}

function BenefitCard({ icon, title, body, color }: { icon: React.ReactNode, title: string, body: string, color: string }) {
   const colors: any = {
      blue: "bg-blue-50 border-blue-100 group-hover:border-blue-300",
      amber: "bg-amber-50 border-amber-100 group-hover:border-amber-300",
      green: "bg-emerald-50 border-emerald-100 group-hover:border-emerald-300",
      purple: "bg-purple-50 border-purple-100 group-hover:border-purple-300",
   };

   return (
      <div className={`p-8 rounded-3xl border transition-all hover:shadow-lg group bg-white ${colors[color].replace('bg-', 'border-')}`}>
         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${colors[color]}`}>
            {icon}
         </div>
         <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
         <p className="text-slate-600 leading-relaxed text-sm">{body}</p>
      </div>
   );
}

function StepCard({ number, title, desc, icon }: { number: string, title: string, desc: string, icon: React.ReactNode }) {
   return (
      <div className="relative flex flex-col items-center text-center z-10">
         <div className="w-20 h-20 bg-white rounded-full border-4 border-slate-50 shadow-xl flex items-center justify-center mb-6 relative">
             <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-white">
                {number}
             </div>
             {icon}
         </div>
         <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
         <p className="text-slate-500 max-w-xs">{desc}</p>
      </div>
   );
}

function PersonaCard({ title, desc, emoji }: { title: string, desc: string, emoji: string }) {
    return (
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">{emoji}</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}

function FeatureItem({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="flex gap-4 items-start">
            <div className="bg-green-500/20 p-1 rounded-full mt-1">
                <Icons.Check className="w-4 h-4 text-green-400" />
            </div>
            <div>
                <h4 className="font-bold text-white text-lg">{title}</h4>
                <p className="text-slate-400 text-sm">{desc}</p>
            </div>
        </div>
    );
}

function TrustPoint({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
            <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
            <p className="text-xs text-slate-500">{desc}</p>
        </div>
    );
}

// --- HERO VISUAL UI ---

function HeroDashboardUI() {
    return (
        <div className="relative w-full aspect-[4/5] mx-auto rotate-[-5deg] hover:rotate-0 transition-transform duration-700 ease-out">
             {/* Main Card */}
             <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
                 
                 {/* Header */}
                 <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50">
                     <div className="flex gap-2">
                         <div className="w-3 h-3 rounded-full bg-red-400"></div>
                         <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                         <div className="w-3 h-3 rounded-full bg-green-400"></div>
                     </div>
                     <div className="text-xs font-bold text-slate-400 tracking-wider">CARETRANSIA.AI</div>
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
             <div className="absolute -right-12 top-24 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-float hidden sm:block">
                 <div className="flex items-center gap-3 mb-2">
                     <Icons.Pill className="w-5 h-5 text-orange-500" />
                     <span className="font-bold text-sm text-slate-700">Rx Found</span>
                 </div>
                 <div className="text-xs text-slate-500">Lisinopril 10mg</div>
             </div>

             <div className="absolute -left-8 bottom-32 bg-slate-800 p-4 rounded-2xl shadow-xl text-white animate-float delay-1000 hidden sm:block">
                 <div className="flex items-center gap-3">
                     <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                     <span className="font-bold text-sm">Safety Check Passed</span>
                 </div>
             </div>
        </div>
    );
}
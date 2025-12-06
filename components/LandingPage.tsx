import React from 'react';
import { Icons } from './ui';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <section className="min-h-[80vh] flex flex-col justify-center items-center text-center max-w-5xl mx-auto pt-8 pb-16 animate-fade-in-up">
      
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 border border-blue-100 shadow-sm">
        <Icons.Shield className="w-4 h-4" /> 
        <span>Secure Patient Assistant</span>
      </div>

      {/* Hero Title */}
      <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
        Turn Confusing Discharge Papers <br className="hidden md:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Into a Clear Daily Plan</span>
      </h1>

      {/* Subtitle */}
      <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl leading-relaxed">
        Upload your hospital discharge paperwork and get a simple, patient-friendly care plan you can actually follow – meds, follow-ups, warning signs, all in one place.
      </p>

      {/* Get Started Button */}
      <button 
        onClick={onGetStarted}
        className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:bg-slate-800 transform hover:-translate-y-1 transition-all flex items-center gap-3 mb-16"
      >
        Start Your Free Scan <Icons.ArrowRight className="w-5 h-5" />
      </button>

      {/* Benefit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-4 text-left mb-20">
        <BenefitCard 
          icon={<Icons.Clipboard className="w-6 h-6" />}
          color="blue"
          title="All your instructions in one view"
          desc="No more flipping between portals, printouts, and pill bottles."
        />
        <BenefitCard 
          icon={<Icons.Alert className="w-6 h-6" />}
          color="red"
          title="Spots conflicts & missing info"
          desc="Flags confusing doses, inconsistent instructions, and missing follow-ups as questions to ask your doctor."
        />
        <BenefitCard 
          icon={<Icons.User className="w-6 h-6" />}
          color="emerald"
          title="Built for real caregivers"
          desc="Plain language, checklists, and timelines designed for families, not clinicians."
        />
      </div>

      {/* How it works */}
      <div className="w-full max-w-4xl px-4 text-left mb-16 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
        <h3 className="text-2xl font-bold text-slate-900 mb-10 text-center">How TrueCare works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line for desktop */}
            <div className="hidden md:block absolute top-5 left-[16%] right-[16%] h-0.5 bg-slate-200 -z-10"></div>
            
            <Step number={1} title="Upload your paperwork" desc="Photos, PDFs, or screenshots of discharge instructions and meds." />
            <Step number={2} title="We organize everything" desc="Our AI reads, extracts, and checks for conflicts or gaps." />
            <Step number={3} title="You get a care playbook" desc="A simple daily schedule, warning-signs card, and questions to ask your doctor." />
        </div>
      </div>

      {/* CTA before form */}
      <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl max-w-2xl w-full mb-12 hover:bg-blue-100/50 transition-colors cursor-pointer" onClick={onGetStarted}>
        <p className="text-blue-900 font-semibold text-lg flex items-center justify-center gap-2">
          👉 Ready to see your plan? Scroll down to Step 1 – Add your info & upload documents.
        </p>
      </div>

      {/* Safety Disclaimer */}
      <p className="text-xs text-slate-400 max-w-2xl">
        <strong>⚕️ Disclaimer:</strong> TrueCare helps you understand and organize the instructions you already received. It does not replace professional medical advice or emergency care.
      </p>

    </section>
  );
}

// Helper components for LandingPage
function BenefitCard({ icon, color, title, desc }: { icon: React.ReactNode, color: string, title: string, desc: string }) {
    const bgColors: {[key: string]: string} = {
        blue: "bg-blue-100 text-blue-600",
        red: "bg-red-100 text-red-600",
        emerald: "bg-emerald-100 text-emerald-600"
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow h-full">
            <div className={`${bgColors[color] || bgColors.blue} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <h3 className="font-bold text-xl text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-600 leading-relaxed">{desc}</p>
        </div>
    );
}

function Step({ number, title, desc }: { number: number, title: string, desc: string }) {
    return (
        <div className="flex flex-col items-center text-center">
             <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg mb-4 shadow-lg shadow-slate-200 z-10">
                 {number}
             </div>
             <h4 className="font-bold text-lg text-slate-900 mb-2">{title}</h4>
             <p className="text-slate-600 text-sm leading-relaxed max-w-xs">{desc}</p>
        </div>
    );
}
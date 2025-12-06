import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useDischargeAnalysis } from './hooks/useDischargeAnalysis';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import InputSection from './components/InputSection';
import StatusMessage from './components/StatusMessage';
import ResultsDashboard from './components/ResultsDashboard';

export default function TrueCare() {
  // Use custom hook for logic and state
  const { input, results, ui, actions } = useDischargeAnalysis();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results when analysis is done
  useEffect(() => {
    if (ui.status === 'done' && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [ui.status]);

  const handleReset = () => {
    actions.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        
        {/* Screen 1: Home / Marketing */}
        <LandingPage onGetStarted={() => document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' })} />

        {/* Screen 2: Get Started */}
        <section id="get-started" className="scroll-mt-24 pt-8">
          <InputSection 
              patientInfo={input.patientInfo} setPatientInfo={input.setPatientInfo}
              files={input.files} setFiles={input.setFiles}
              notes={input.notes} setNotes={input.setNotes}
              onAnalyze={actions.analyze}
              isLoading={ui.status === 'analyzing'}
            />
        </section>

        {/* Status Messages */}
        <StatusMessage status={ui.status} errorMsg={ui.errorMsg} onDismiss={ui.dismissError} />

        {/* Screens 3 & 4: Results */}
        {results.parsedEpisode && (
          <div ref={resultsRef} className="pt-8 border-t border-slate-200 scroll-mt-24">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
                <h2 className="text-2xl font-bold text-slate-900">Your Results</h2>
             </div>
            <ResultsDashboard 
              data={results.parsedEpisode} 
              consistency={results.consistencyReport} 
              carePlan={results.carePlan}
              onReset={handleReset} 
            />
          </div>
        )}

      </main>

    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<TrueCare />);
}
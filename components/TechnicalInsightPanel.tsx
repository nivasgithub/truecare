
import React, { useState } from 'react';
import { Icons, Card } from './ui';
import { RunTrace, SelfEvalSummary } from '../types';

interface TechnicalInsightPanelProps {
  runTrace?: RunTrace;
  selfEvalSummary?: SelfEvalSummary;
}

export default function TechnicalInsightPanel({ runTrace, selfEvalSummary }: TechnicalInsightPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  if (!runTrace && !selfEvalSummary) return null;

  return (
    <div className="max-w-4xl mx-auto mt-12 animate-fade-in border-t border-slate-200 pt-8">
      
      {/* Toggle Button */}
      <div className="flex justify-center mb-6">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors flex items-center gap-2"
        >
          {isOpen ? <Icons.ChevronDown className="rotate-180 w-4 h-4" /> : <Icons.Settings className="w-4 h-4" />}
          {isOpen ? "Hide Technical Details" : "Show Technical Details (For Reviewers)"}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold text-slate-700">Agentic Workflow Insight</h3>
                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-mono">
                    ID: {runTrace?.execution_id || 'N/A'}
                </span>
            </div>

            {/* 1. Self Eval Banner */}
            {selfEvalSummary && (
                <div className={`
                    p-4 rounded-xl border flex items-start gap-4
                    ${selfEvalSummary.confidence === 'high' ? 'bg-emerald-50 border-emerald-100' : 
                      selfEvalSummary.confidence === 'medium' ? 'bg-amber-50 border-amber-100' : 
                      'bg-red-50 border-red-100'}
                `}>
                    <div className={`
                        p-2 rounded-full
                        ${selfEvalSummary.confidence === 'high' ? 'bg-emerald-100 text-emerald-600' : 
                          selfEvalSummary.confidence === 'medium' ? 'bg-amber-100 text-amber-600' : 
                          'bg-red-100 text-red-600'}
                    `}>
                        <Icons.Shield className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h4 className={`font-bold text-sm uppercase tracking-wide mb-1 ${
                                selfEvalSummary.confidence === 'high' ? 'text-emerald-700' : 
                                selfEvalSummary.confidence === 'medium' ? 'text-amber-700' : 
                                'text-red-700'
                            }`}>
                                Agent Self-Evaluation
                            </h4>
                            <span className="text-xs font-bold bg-white/50 px-2 py-1 rounded">
                                Score: {selfEvalSummary.score}/100
                            </span>
                        </div>
                        <p className="text-slate-800 font-medium text-sm mb-2">
                            {selfEvalSummary.user_facing_message}
                        </p>
                        {selfEvalSummary.coverage_gaps.length > 0 && (
                            <div className="text-xs text-slate-500 mt-2">
                                <span className="font-bold">Noted Gaps:</span> {selfEvalSummary.coverage_gaps.join(", ")}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 2. Step Timeline */}
            {runTrace && runTrace.steps.length > 0 && (
                <Card className="p-6 bg-slate-50 border-slate-200">
                    <h4 className="font-bold text-slate-700 mb-4 text-sm flex items-center gap-2">
                        <Icons.Refresh className="w-4 h-4" /> Execution Timeline
                    </h4>
                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                        {runTrace.steps.map((step, idx) => (
                            <div key={idx} className="relative pl-8">
                                <div className={`
                                    absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white
                                    ${step.status === 'success' ? 'bg-blue-500' : 'bg-red-500'}
                                `}></div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                                    <span className="font-bold text-sm text-slate-800">{step.name}</span>
                                    <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">
                                        {step.model}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 bg-white p-3 rounded-lg border border-slate-100">
                                    <div>
                                        <span className="font-bold text-slate-400 block mb-0.5">Input Context</span>
                                        {step.input_summary}
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-400 block mb-0.5">Output Result</span>
                                        {step.output_summary}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* 3. Raw JSON Toggle */}
            <div className="border-t border-slate-100 pt-4">
                <button 
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                >
                    {showRawJson ? "Hide Raw Trace JSON" : "View Full Trace JSON"}
                </button>
                
                {showRawJson && runTrace && (
                    <div className="mt-4 bg-slate-900 rounded-xl p-4 overflow-hidden">
                        <pre className="text-[10px] text-green-400 font-mono overflow-auto max-h-96 custom-scrollbar">
                            {JSON.stringify(runTrace, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}

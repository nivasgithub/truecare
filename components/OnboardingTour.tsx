import React, { useEffect, useState, useRef } from 'react';
import { Button, Icons } from './ui';

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
}

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ steps, isOpen, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  
  const currentStep = steps[currentStepIndex];

  // Helper to get element position
  const updatePosition = () => {
    if (!currentStep) return;
    const element = document.getElementById(currentStep.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
      // Scroll into view if needed with a buffer
      const offset = 100; 
      const isOutOfView = rect.top < offset || rect.bottom > window.innerHeight - offset;
      if (isOutOfView) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // If target not found, auto-skip to next valid or finish if strictly sequential logic desired
      // For now, let's just stay put or reset coords so we don't show a ghost box
      setCoords(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      // Small delay to ensure rendering is complete (e.g. navigation animations)
      const timer = setTimeout(updatePosition, 500); 
      return () => {
          window.removeEventListener('resize', updatePosition);
          clearTimeout(timer);
      };
    }
  }, [isOpen, currentStepIndex, currentStep]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* 
         We use a clever CSS trick for the spotlight effect:
         A huge border around the highlighted area.
      */}
      {coords && (
        <div 
          className="absolute transition-all duration-500 ease-in-out pointer-events-auto shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
            height: coords.height,
            borderRadius: '12px', // Approximate rounded corners of UI elements
          }}
        >
            {/* Pulsing ring to draw attention */}
            <div className="absolute inset-0 rounded-xl border-2 border-blue-400 animate-pulse box-border"></div>
        </div>
      )}

      {/* Tooltip Card */}
      {coords && (
        <div 
          className="absolute transition-all duration-500 ease-in-out pointer-events-auto w-full max-w-xs md:max-w-sm px-4"
          style={{
            // Position below the element by default, flip if too close to bottom (simplified here: always below or fixed offset)
            // A robust positioning library like floating-ui is better, but manual is fine for fixed flows.
            top: coords.top + coords.height + 20, 
            left: Math.max(16, Math.min(coords.left, window.innerWidth - 340)), // Ensure it stays on screen horizontally
          }}
        >
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 animate-fade-in-up">
             <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    Step {currentStepIndex + 1} of {steps.length}
                 </span>
                 <button onClick={onSkip} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Skip tour">
                    <Icons.Close className="w-4 h-4" />
                 </button>
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-2">{currentStep.title}</h3>
             <p className="text-slate-600 text-sm mb-6 leading-relaxed">{currentStep.description}</p>
             
             <div className="flex justify-between items-center">
                 <button 
                    onClick={handleBack} 
                    disabled={currentStepIndex === 0}
                    className="text-sm font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1"
                 >
                    Back
                 </button>
                 <Button onClick={handleNext} className="py-2 px-6 text-sm min-h-[40px]">
                    {currentStepIndex === steps.length - 1 ? "Finish" : "Next"}
                 </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
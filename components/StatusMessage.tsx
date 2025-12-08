import React from 'react';
import { Icons } from './ui';

interface StatusMessageProps {
  status: 'idle' | 'analyzing' | 'done' | 'error';
  errorMsg: string | null;
  onDismiss: () => void;
  onRetry?: () => void;
  isOffline?: boolean;
}

export default function StatusMessage({ status, errorMsg, onDismiss, onRetry, isOffline }: StatusMessageProps) {
  
  // 1. Offline Notification (Persistent if offline)
  if (isOffline) {
      return (
        <div className="p-4 bg-slate-800 text-white rounded-xl flex items-center gap-3 animate-fade-in shadow-lg mb-6 border border-slate-700">
            <div className="bg-white/10 p-2 rounded-full"><Icons.Shield className="w-5 h-5" /></div>
            <div className="flex-1">
                <p className="font-bold text-sm">You are currently offline</p>
                <p className="text-xs text-slate-300 mt-0.5">Don't worry, your data is saved locally on this device. Connectivity will resume when available.</p>
            </div>
        </div>
      );
  }

  // 2. Error Message
  if (status !== 'error') return null;

  // Heuristic for actionable advice
  let advice = "Please try again or contact support.";
  let showRetry = true;
  const msgLower = errorMsg?.toLowerCase() || "";

  if (msgLower.includes('image') || msgLower.includes('blur') || msgLower.includes('readable')) {
      advice = "Try uploading a clearer photo with better lighting. Ensure text is visible.";
  } else if (msgLower.includes('network') || msgLower.includes('connection') || msgLower.includes('offline')) {
      advice = "Check your internet connection. We'll save your progress locally.";
  } else if (msgLower.includes('quota') || msgLower.includes('limit') || msgLower.includes('503') || msgLower.includes('429')) {
      advice = "The system is experiencing high traffic. Please wait a moment before retrying.";
  } else if (msgLower.includes('safety') || msgLower.includes('harm')) {
      advice = "The document was flagged by safety filters. Please ensure it is a valid medical document.";
      showRetry = false; // Usually not retriable without changing input
  }

  return (
    <div className="p-5 bg-red-50 border border-red-200 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 text-red-700 animate-fade-in shadow-sm mb-6 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-red-100 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

      <div className="flex items-start gap-4 w-full md:w-auto relative z-10">
          <div className="bg-white p-2.5 rounded-full shadow-sm text-red-500 mt-1"><Icons.Alert className="w-6 h-6" /></div>
          <div className="flex-1 md:flex-none max-w-xl">
            <p className="font-bold text-lg text-red-800">Analysis Issue</p>
            <p className="text-sm font-medium text-red-700/90 mt-1">{errorMsg}</p>
            <div className="mt-2 text-xs text-red-800 bg-red-100/50 p-2 rounded-lg border border-red-100/50 inline-flex items-center gap-2">
               <Icons.Info className="w-3 h-3" />
               <span><span className="font-bold">Recommendation:</span> {advice}</span>
            </div>
          </div>
      </div>
      
      <div className="flex items-center gap-3 ml-auto w-full md:w-auto mt-2 md:mt-0 relative z-10">
          {onRetry && showRetry && (
              <button 
                onClick={onRetry} 
                className="flex-1 md:flex-none px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                  Try Again
              </button>
          )}
          <button 
            onClick={onDismiss} 
            className="flex-1 md:flex-none px-5 py-2.5 bg-white rounded-xl text-sm font-bold hover:bg-red-50 transition-colors border border-red-100 text-red-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200"
          >
              Dismiss
          </button>
      </div>
    </div>
  );
}
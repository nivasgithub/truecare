import React from 'react';
import { Icons } from './ui';

interface StatusMessageProps {
  status: 'idle' | 'analyzing' | 'done' | 'error';
  errorMsg: string | null;
  onDismiss: () => void;
}

export default function StatusMessage({ status, errorMsg, onDismiss }: StatusMessageProps) {
  if (status !== 'error') return null;

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-fade-in shadow-sm">
      <div className="bg-white p-2 rounded-full shadow-sm"><Icons.Alert /></div>
      <div>
        <p className="font-bold text-lg">Analysis Failed</p>
        <p className="text-sm opacity-90">{errorMsg}</p>
      </div>
      <button onClick={onDismiss} className="ml-auto px-4 py-2 bg-white rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors border border-red-100 shadow-sm">Dismiss</button>
    </div>
  );
}
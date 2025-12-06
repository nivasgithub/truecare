import React from 'react';

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 rounded-lg p-1.5 text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/></svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">True<span className="text-blue-600">Care</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-500">Beta Preview</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
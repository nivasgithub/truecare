import React, { useState } from 'react';
import { Icons, Card, Button } from './ui';
import { 
    loginWithEmail, 
    registerWithEmail
} from '../services/firebase';

interface SignInScreenProps {
  onSignIn: () => void;
}

export default function SignInScreen({ onSignIn }: SignInScreenProps) {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email State - Default Demo Credentials
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('demo@techiesmarvel.com');
  const [password, setPassword] = useState('testdemoapp');
  const [name, setName] = useState('Demo User');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
        setError("Please enter email and password.");
        return;
    }
    if (isSignUp && !name) {
        setError("Please enter your name.");
        return;
    }

    setIsLoading(true);
    try {
        if (isSignUp) {
            await registerWithEmail(name, email, password);
        } else {
            try {
                await loginWithEmail(email, password);
            } catch (loginErr: any) {
                // Auto-create demo user if not found and credentials match default
                if (loginErr.code === 'auth/user-not-found' && email === 'demo@techiesmarvel.com') {
                     await registerWithEmail('Demo User', email, password);
                } else {
                    throw loginErr;
                }
            }
        }
        onSignIn();
    } catch (e: any) {
        let msg = "Authentication failed.";
        if (e.code === 'auth/email-already-in-use') msg = "Email already registered.";
        if (e.code === 'auth/user-not-found') msg = "Invalid email or password.";
        if (e.message) msg = e.message;
        setError(msg);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 animate-fade-in">
      <div className="max-w-md w-full">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-200 mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/></svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-500">Sign in to access your care plans.</p>
        </div>

        <Card className="p-8 shadow-xl shadow-slate-200/50 border-slate-100 overflow-visible">
          
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400">Login Method</span>
            </div>
          </div>

          {/* Method Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button 
                onClick={() => { setMethod('email'); setError(null); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${method === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Demo / Email
              </button>
              <button 
                disabled={true}
                className="flex-1 py-2 text-sm font-bold rounded-lg text-slate-300 cursor-not-allowed"
                title="Disabled in this demo version"
              >
                  Phone (Off)
              </button>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-2 animate-fade-in break-words">
              <Icons.Alert className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* EMAIL FORM */}
          <form onSubmit={handleEmailAuth} className="space-y-4 animate-fade-in">
              {isSignUp && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Smith"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-blue-200 focus:ring-2 outline-none transition-all text-slate-900 bg-white placeholder-slate-400"
                    />
                  </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-blue-200 focus:ring-2 outline-none transition-all text-slate-900 bg-white placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-blue-200 focus:ring-2 outline-none transition-all text-slate-900 bg-white placeholder-slate-400"
                />
              </div>
              
              <Button className="w-full py-4 text-base" disabled={isLoading}>
                {isLoading ? <Icons.Spinner /> : (isSignUp ? "Create Account" : "Sign In")}
              </Button>

              <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); }} 
                    className="text-sm text-blue-600 font-bold hover:underline"
                  >
                      {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                  </button>
              </div>
          </form>

        </Card>
        
        <p className="text-center text-slate-400 text-sm mt-8">
           Note: Passwords are stored in Firestore for this demo.<br/>
           Do not use real passwords.
        </p>

      </div>
    </div>
  );
}
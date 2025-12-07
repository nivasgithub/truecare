import React, { useState, useEffect, useRef } from 'react';
import { Icons, Card, Button } from './ui';
import { 
    auth,
    signInWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    startPhoneLogin, 
    RecaptchaVerifier, 
    ConfirmationResult 
} from '../services/firebase';

interface SignInScreenProps {
  onSignIn: () => void;
}

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default function SignInScreen({ onSignIn }: SignInScreenProps) {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Phone State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState<ConfirmationResult | null>(null);
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);
  
  // Refs
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Clean up existing verifiers on mount/unmount to prevent "re-initialization" errors
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch (e) {
          console.warn("Recaptcha cleanup error", e);
        }
      }
    };
  }, []);

  // Initialize Recaptcha when switching to phone mode
  useEffect(() => {
    if (method === 'phone' && recaptchaContainerRef.current) {
        // Clear previous instance if it exists
        if (window.recaptchaVerifier) {
             try { window.recaptchaVerifier.clear(); } catch(e) {}
             window.recaptchaVerifier = null;
        }

        try {
            // Note: RecaptchaVerifier is attached to the auth instance
            const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                'size': 'invisible',
                'callback': () => setIsRecaptchaReady(true),
                'expired-callback': () => setIsRecaptchaReady(false)
            });
            window.recaptchaVerifier = verifier;
            verifier.render().then(() => setIsRecaptchaReady(true));
        } catch (e) {
            console.error("Recaptcha init error", e);
            setError("Failed to initialize security check. Please refresh the page.");
        }
    }
  }, [method]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onSignIn(); 
    } catch (e: any) {
      setError(e.message || "Failed to sign in with Google.");
    } finally {
        setIsLoading(false);
    }
  };

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
            await loginWithEmail(email, password);
        }
        onSignIn();
    } catch (e: any) {
        let msg = "Authentication failed.";
        if (e.code === 'auth/email-already-in-use') msg = "Email already registered.";
        if (e.code === 'auth/wrong-password') msg = "Invalid password.";
        if (e.code === 'auth/user-not-found') msg = "No account found with this email.";
        if (e.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
        setError(msg);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
      if (!phoneNumber || phoneNumber.length < 10) {
          setError("Please enter a valid phone number with country code (e.g., +15550000000).");
          return;
      }
      if (!window.recaptchaVerifier) {
          setError("Security check not ready. Please wait a moment or refresh.");
          return;
      }

      setIsLoading(true);
      setError(null);
      try {
          const confirmation = await startPhoneLogin(phoneNumber, window.recaptchaVerifier);
          setVerificationId(confirmation);
      } catch (e: any) {
          console.error(e);
          let msg = "Failed to send code.";
          if (e.code === 'auth/internal-error') {
             // Specific message for the common preview environment issue
             msg = "Configuration Error: This domain may not be authorized for Phone Auth in the Firebase Console. Please add this preview URL to 'Authorized Domains' in Firebase Authentication settings.";
          } else if (e.code === 'auth/invalid-phone-number') {
             msg = "Invalid phone number format.";
          } else if (e.message) {
             msg = e.message;
          }
          setError(msg);
          
          // Reset Recaptcha on error so user can try again
          if (window.recaptchaVerifier) {
             try {
                // We re-render/reset to ensure it's fresh
                window.recaptchaVerifier.render().then((widgetId: any) => {
                    // grecaptcha is globally available when RecaptchaVerifier is used
                    if ((window as any).grecaptcha) {
                        (window as any).grecaptcha.reset(widgetId);
                    }
                });
             } catch (resetErr) {
                 console.warn("Failed to reset recaptcha", resetErr);
             }
          }
      } finally {
          setIsLoading(false);
      }
  };

  const handleVerifyOtp = async () => {
      if (!otp || !verificationId) return;
      setIsLoading(true);
      setError(null);
      try {
          await verificationId.confirm(otp);
          onSignIn();
      } catch (e: any) {
          setError("Invalid code. Please try again.");
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
          
          {/* Google Button (Always available) */}
          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md group relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed mb-6"
          >
            {isLoading && !method ? (
               <Icons.Spinner className="w-5 h-5 text-blue-600" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400">or use</span>
            </div>
          </div>

          {/* Method Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button 
                onClick={() => { setMethod('email'); setError(null); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${method === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Email
              </button>
              <button 
                onClick={() => { setMethod('phone'); setError(null); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${method === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Phone
              </button>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-2 animate-fade-in break-words">
              <Icons.Alert className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* EMAIL FORM */}
          {method === 'email' && (
              <form onSubmit={handleEmailAuth} className="space-y-4 animate-fade-in">
                  {isSignUp && (
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Alex Smith"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-blue-200 focus:ring-2 outline-none transition-all"
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
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-blue-200 focus:ring-2 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-blue-200 focus:ring-2 outline-none transition-all"
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
          )}

          {/* PHONE FORM */}
          {method === 'phone' && (
              <div className="space-y-4 animate-fade-in">
                 {/* Invisible Recaptcha Container */}
                 <div ref={recaptchaContainerRef}></div>

                 {!verificationId ? (
                     <>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                            <input 
                                type="tel" 
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+1 555 555 5555"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-blue-200 focus:ring-2 outline-none transition-all"
                            />
                            <p className="text-xs text-slate-400 mt-2">Include country code (e.g. +1)</p>
                        </div>
                        <Button onClick={handleSendCode} className="w-full py-4 text-base" disabled={isLoading}>
                             {isLoading ? <Icons.Spinner /> : "Send Code"}
                        </Button>
                     </>
                 ) : (
                     <>
                        <div className="text-center mb-2">
                             <p className="text-slate-600 text-sm">Enter code sent to {phoneNumber}</p>
                             <button onClick={() => { setVerificationId(null); setOtp(''); }} className="text-xs text-blue-600 font-bold mt-1 hover:underline">Change Number</button>
                        </div>
                        <div className="flex justify-center">
                            <input 
                                type="text" 
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="123456"
                                className="w-full text-center text-2xl tracking-widest px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-blue-200 focus:ring-2 outline-none transition-all"
                                maxLength={6}
                            />
                        </div>
                        <Button onClick={handleVerifyOtp} className="w-full py-4 text-base" disabled={isLoading || otp.length < 6}>
                             {isLoading ? <Icons.Spinner /> : "Verify & Sign In"}
                        </Button>
                     </>
                 )}
              </div>
          )}

        </Card>
        
        <p className="text-center text-slate-400 text-sm mt-8">
           Protected by CareTransia Secure. <br/> By signing in, you agree to our Terms and Privacy Policy.
        </p>

      </div>
    </div>
  );
}
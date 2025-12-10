
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
// import { onAuthStateChanged } from 'firebase/auth'; // Removed

import { useCareTransiaFlow } from './hooks/useDischargeAnalysis';
import type {
  UserProfile,
  ConsistencyReport,
  AppSettings,
} from './types';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import LiveAssistant from './components/LiveAssistant';
import CareTransiaLandingPage from './components/LandingPage';
import CareTransiaIntake from './components/InputSection';
import VerificationView from './components/VerificationView'; // Imported
// import StatusMessage from './components/StatusMessage'; // Removed from here, moved into InputSection for tighter integration
import CareTransiaResults from './components/ResultsDashboard';
import SignInScreen from './components/SignInScreen';
import DashboardScreen from './components/DashboardScreen';
import TestModelsScreen from './components/TestModelsScreen';
import SettingsScreen from './components/SettingsScreen';
import FAQScreen from './components/FAQScreen';
import OnboardingTour, { TourStep } from './components/OnboardingTour';
import { logoutUser, getCurrentUser } from './services/firebase'; // Updated imports
import { notificationScheduler } from './services/notificationScheduler';

// Helpful for Firebase Authorized Domains config
console.log('App Origin:', window.location.origin);

// Start background services
try {
  notificationScheduler.start();
} catch (e) {
  console.error("Failed to start notification scheduler", e);
}

// --- Router Helpers ---
const getHashPath = () => {
  const hash = window.location.hash.slice(2); // remove '#/'
  return hash || 'landing';
};

const navigate = (path: string) => {
  window.location.hash = `#/${path}`;
};

function CareTransiaApp() {
  // App State
  const [currentView, setCurrentView] = useState<string>(getHashPath());
  const [showLiveAssistant, setShowLiveAssistant] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Session Management for Intake Reset
  const [intakeSessionId, setIntakeSessionId] = useState(0);
  
  // Accessibility Settings
  const [appSettings, setAppSettings] = useState<AppSettings>({
    fontSize: 'normal',
    simpleMode: false,
    calmMode: false
  });

  // Onboarding State
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ct_app_settings');
    if (saved) {
      try {
        setAppSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  // Apply Calm Mode Class
  useEffect(() => {
      if (appSettings.calmMode) {
          document.body.classList.add('calm-mode');
      } else {
          document.body.classList.remove('calm-mode');
      }
  }, [appSettings.calmMode]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...appSettings, ...newSettings };
    setAppSettings(updated);
    localStorage.setItem('ct_app_settings', JSON.stringify(updated));
  };

  // Initialize hooks with userId (if logged in) for auto-saving
  const { intake, results, ui, actions } = useCareTransiaFlow(user?.id);

  // Handle Routing (Hash Change)
  useEffect(() => {
    const onHashChange = () => setCurrentView(getHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Listen for Auth Changes (Custom Custom Event)
  useEffect(() => {
    const checkAuth = () => {
        const storedUser = getCurrentUser();
        if (storedUser) {
            setUser({
                id: storedUser.uid,
                name: storedUser.displayName || 'User',
                email: storedUser.email || '',
                avatarUrl: storedUser.photoURL || undefined
            });
            // If on landing or signin page, redirect to dashboard
            // We use a small timeout to ensure state settles
            if (window.location.hash === '#/landing' || window.location.hash === '#/signin' || !window.location.hash) {
                 navigate('dashboard');
            }
        } else {
            setUser(null);
        }
        setAuthLoading(false);
    };

    // Check on mount
    checkAuth();

    // Listen for login/logout events from services/firebase.ts
    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
  }, []);

  // Auto-navigate to results when analysis is done
  useEffect(() => {
    if (ui.status === 'done') {
      navigate('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [ui.status]);

  // Check for First Time User when entering Intake
  useEffect(() => {
      if (currentView === 'intake' && !localStorage.getItem('ct_hasSeenTour')) {
          // Small delay to ensure elements are mounted
          setTimeout(() => setShowTour(true), 1000);
      }
  }, [currentView]);

  // Handlers
  const handleStart = () => {
    // Crucial: Reset state to ensure no old data (files/info) persists when starting a new plan
    actions.reset();
    // Increment session ID to force Intake component remount (clearing local UI state like chat history)
    setIntakeSessionId(prev => prev + 1);
    navigate('intake');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    actions.reset();
    navigate('landing');
  };

  // Custom Navigation Handler for Menu Items
  const handleMenuNavigate = (path: string) => {
      if (path === 'intake') {
          handleStart();
      } else {
          navigate(path);
      }
  };

  const hasActivePlan = !!results.carePlan;
  const isLiveActive = showLiveAssistant;

  // Render View based on Router
  const renderView = () => {
      if (authLoading) return <div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;

      switch(currentView) {
          case 'landing':
              return <CareTransiaLandingPage onGetStarted={handleStart} />;
          case 'intake':
              return (
                <React.Fragment key={intakeSessionId}>
                  <CareTransiaIntake 
                      patientInfo={intake.patientInfo} setPatientInfo={intake.setPatientInfo}
                      files={intake.files} setFiles={intake.setFiles}
                      notes={intake.notes} setNotes={intake.setNotes}
                      onAnalyze={actions.analyze}
                      onReview={actions.startVerification}
                      isLoading={ui.status === 'analyzing'}
                      progressMsg={ui.progressMsg}
                      onLoadDemo={actions.loadDemoData}
                      status={ui.status}
                      errorMsg={ui.errorMsg}
                      onDismissError={ui.dismissError}
                      isOffline={ui.isOffline}
                  />
                  {/* Verification Overlay Modal - Structure updated for fixed positioning context */}
                  {(ui.status === 'verifying' || ui.status === 'generating') && results.parsedEpisode && (
                      <div className="fixed inset-0 z-50 flex flex-col">
                          {/* Animated Backdrop */}
                          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm animate-fade-in" />
                          
                          {/* Scrollable Content - z-index ensures it sits above backdrop */}
                          <div className="relative z-10 overflow-y-auto flex-1 w-full h-full">
                              <div className="p-4 pt-20 max-w-5xl mx-auto pb-32">
                                  <VerificationView 
                                      data={results.parsedEpisode}
                                      consistency={results.consistencyReport}
                                      onConfirm={actions.confirmAndGenerate}
                                      isLoading={ui.status === 'generating'}
                                      progressMsg={ui.progressMsg}
                                      onBack={ui.dismissError} // Pass dismissError to return to intake (sets status to idle)
                                  />
                              </div>
                          </div>
                      </div>
                  )}
                </React.Fragment>
              );
          case 'results':
               if (!results.parsedEpisode) return <div className="text-center py-20">No plan loaded. <button onClick={() => navigate('intake')} className="text-blue-600 underline">Start New</button></div>;
               return <CareTransiaResults 
                        data={results.parsedEpisode} 
                        consistency={results.consistencyReport}
                        carePlan={results.carePlan}
                        onReset={handleStart}
                        simpleMode={appSettings.simpleMode}
                        onBack={() => navigate('intake')}
                        onDashboard={() => navigate('dashboard')}
                      />;
          case 'signin':
               return <SignInScreen onSignIn={() => navigate('dashboard')} onBack={() => navigate('landing')} />;
          case 'dashboard':
               if (!user) return <SignInScreen onSignIn={() => navigate('dashboard')} onBack={() => navigate('landing')} />;
               return <DashboardScreen 
                        user={user} 
                        onViewRecord={(id, fullData) => {
                             if (fullData) {
                                 const parsed = JSON.parse(fullData);
                                 actions.loadRecord(parsed.parsed, null, parsed.plan); // Safety report not stored in historic summary for simplicity, but could be added
                                 navigate('results');
                             }
                        }} 
                        onNewPlan={handleStart}
                        simpleMode={appSettings.simpleMode}
                      />;
          case 'settings':
               if (!user) return <SignInScreen onSignIn={() => navigate('dashboard')} onBack={() => navigate('landing')} />;
               return <SettingsScreen 
                        user={user} 
                        onNavigate={navigate} 
                        onLogout={handleLogout}
                        settings={appSettings}
                        onUpdateSettings={updateSettings}
                      />;
          case 'faq':
               return <FAQScreen onBack={() => navigate('settings')} />;
          case 'test':
               return <TestModelsScreen onBack={() => navigate('settings')} />;
          default:
               return <CareTransiaLandingPage onGetStarted={handleStart} />;
      }
  };

  return (
    <div className={`min-h-screen pb-20 md:pb-0 font-sans text-slate-900 ${appSettings.fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
      <Navbar 
        onHomeClick={() => navigate(user ? 'dashboard' : 'landing')} 
        currentView={currentView}
        user={user}
        onSignIn={() => navigate('signin')}
        onLogout={handleLogout}
        onSettingsClick={() => navigate('settings')}
        onLiveClick={() => setShowLiveAssistant(true)}
        onNavigate={handleMenuNavigate}
        hasActivePlan={hasActivePlan}
      />
      
      <main className="pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {renderView()}
      </main>

      <BottomNav 
        currentView={currentView} 
        onNavigate={handleMenuNavigate} 
        onLiveClick={() => setShowLiveAssistant(true)}
        hasActivePlan={hasActivePlan}
        isLiveActive={isLiveActive}
      />

      <LiveAssistant 
        isOpen={showLiveAssistant} 
        onClose={() => setShowLiveAssistant(false)} 
      />

      {/* Onboarding Tour */}
      <OnboardingTour 
          isOpen={showTour} 
          onComplete={() => { setShowTour(false); localStorage.setItem('ct_hasSeenTour', 'true'); }}
          onSkip={() => { setShowTour(false); localStorage.setItem('ct_hasSeenTour', 'true'); }}
          steps={[
              { targetId: 'intake-patient-info', title: "Patient Details", description: "Start by entering basic info about who the care plan is for." },
              { targetId: 'intake-upload-section', title: "Upload Documents", description: "Take photos of discharge papers or pill bottles here. The AI will read them automatically." },
              { targetId: 'intake-agent-container', title: "AI Assistant", description: "Or just talk to the assistant! It can guide you through the whole process." },
              { targetId: 'intake-analyze-btn', title: "Generate Plan", description: "When ready, click here to build your personalized care plan." }
          ]}
      />

    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<CareTransiaApp />);

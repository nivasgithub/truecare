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
// import StatusMessage from './components/StatusMessage'; // Removed from here, moved into InputSection for tighter integration
import CareTransiaResults from './components/ResultsDashboard';
import SignInScreen from './components/SignInScreen';
import DashboardScreen from './components/DashboardScreen';
import TestModelsScreen from './components/TestModelsScreen';
import SettingsScreen from './components/SettingsScreen';
import FAQScreen from './components/FAQScreen';
import OnboardingTour, { TourStep } from './components/OnboardingTour';
import { logoutUser, getCurrentUser } from './services/firebase'; // Updated imports

// Helpful for Firebase Authorized Domains config
console.log('App Origin:', window.location.origin);

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
    navigate('intake');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHome = () => {
    if (user) {
      navigate('dashboard');
    } else {
      navigate('landing');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    actions.reset();
    navigate('intake');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignIn = () => {
    navigate('signin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await logoutUser();
    // User state set to null by event listener
    navigate('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSettings = () => {
    navigate('settings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewRecord = (id: string, fullData?: string) => {
    if (fullData) {
      try {
        const parsed = JSON.parse(fullData);
        if (parsed.parsed && parsed.plan) {
          // Empty report for historical data as it's not stored yet in mock, but useful for structure
          const mockReport: ConsistencyReport = {
            status: 'success',
            error_message: '',
            conflicts: [],
            gaps: [],
          };
          actions.loadRecord(parsed.parsed, mockReport, parsed.plan);
        }
      } catch (e) {
        console.error('Failed to parse historical record', e);
      }
    }
  };

  const closeTour = () => {
      setShowTour(false);
      localStorage.setItem('ct_hasSeenTour', 'true');
  };

  // Define Tour Steps - Updated for "Recommended Journey" Selection Flow
  const tourSteps: TourStep[] = [
      {
          targetId: 'select-papers',
          title: 'What do you have?',
          description: 'Start by selecting the type of information you want to organize. Most people start with Discharge Papers.'
      },
      {
          targetId: 'select-bottles',
          title: 'Quick Scan',
          description: 'You can also simply snap photos of pill bottles to get a medication schedule.'
      }
  ];

  // Route Guards / Logic
  const activeView = currentView;

  // Redirect to landing if results accessed without data (optional, but good UX)
  useEffect(() => {
    if (
      activeView === 'results' &&
      !results.parsedEpisode &&
      ui.status !== 'analyzing'
    ) {
      if (!sessionStorage.getItem('ct_parsedEpisode')) {
        navigate('landing');
      }
    }
  }, [activeView, results.parsedEpisode, ui.status]);

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Calculate Base Font Class
  const baseFontClass = appSettings.fontSize === 'large' ? 'text-lg' : 'text-base';

  return (
    <div className={`min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col ${baseFontClass}`}>
      {/* Calm Mode Styles Injection */}
      {appSettings.calmMode && (
          <style>{`
            .calm-mode *, .calm-mode ::before, .calm-mode ::after {
                animation-duration: 2s !important; /* Slow down general animations */
                transition-duration: 0.5s !important;
            }
            .calm-mode .animate-pulse, 
            .calm-mode .animate-bounce,
            .calm-mode .animate-float {
                animation: none !important; /* Disable active movement */
            }
          `}</style>
      )}

      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[100] px-6 py-3 bg-white text-blue-700 font-bold rounded-lg shadow-xl border-2 border-blue-600 outline-none focus:ring-4 focus:ring-blue-300 transition-all min-h-[44px] flex items-center"
      >
        Skip to main content
      </a>

      <OnboardingTour 
         steps={tourSteps} 
         isOpen={showTour && activeView === 'intake'} 
         onComplete={closeTour}
         onSkip={closeTour}
      />

      <LiveAssistant
        isOpen={showLiveAssistant}
        onClose={() => setShowLiveAssistant(false)}
      />

      <Navbar
        onHomeClick={handleHome}
        currentView={activeView}
        user={user}
        onSignIn={handleSignIn}
        onLogout={handleLogout}
        onSettingsClick={handleSettings}
        onLiveClick={() => setShowLiveAssistant(true)}
        onNavigate={(path) => {
            navigate(path);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        hasActivePlan={!!results.parsedEpisode}
      />

      <main id="main-content" className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative focus:outline-none" tabIndex={-1}>
        {/* VIEW: Landing */}
        {activeView === 'landing' && (
          <div className="animate-fade-in">
            <CareTransiaLandingPage onGetStarted={handleStart} />
          </div>
        )}

        {/* VIEW: Sign In */}
        {activeView === 'signin' && (
          <SignInScreen onSignIn={() => {}} />
          /* Navigation handled by auth listener, no-op passed */
        )}

        {/* VIEW: Dashboard */}
        {activeView === 'dashboard' && user && (
          <DashboardScreen
            user={user}
            onViewRecord={handleViewRecord}
            onNewPlan={handleStart}
            simpleMode={appSettings.simpleMode}
          />
        )}

        {/* Fallback if on dashboard but not logged in */}
        {activeView === 'dashboard' && !user && (
          <div className="text-center py-20">
            <p className="text-slate-500 mb-4">
              Please sign in to view your dashboard.
            </p>
            <button
              onClick={handleSignIn}
              className="text-blue-600 font-bold underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm min-h-[44px] min-w-[44px]"
            >
              Sign In
            </button>
          </div>
        )}

        {/* VIEW: Intake */}
        {activeView === 'intake' && (
          <div className="animate-fade-in-up pb-24">
            <CareTransiaIntake
              patientInfo={intake.patientInfo}
              setPatientInfo={intake.setPatientInfo}
              files={intake.files}
              setFiles={intake.setFiles}
              notes={intake.notes}
              setNotes={intake.setNotes}
              onAnalyze={actions.analyze}
              isLoading={ui.status === 'analyzing'}
              progressMsg={ui.progressMsg}
              onLoadDemo={actions.loadDemoData}
              // Pass enhanced error handling props
              status={ui.status}
              errorMsg={ui.errorMsg}
              onDismissError={ui.dismissError}
              isOffline={ui.isOffline}
            />
          </div>
        )}

        {/* VIEW: Results */}
        {activeView === 'results' && results.parsedEpisode && (
          <div className="animate-fade-in pb-24">
            <CareTransiaResults
              data={results.parsedEpisode}
              consistency={results.consistencyReport}
              carePlan={results.carePlan}
              onReset={handleReset}
              simpleMode={appSettings.simpleMode}
              onBack={() => navigate('intake')}
              onDashboard={user ? () => navigate('dashboard') : undefined}
            />
          </div>
        )}

        {/* VIEW: Settings Hub */}
        {activeView === 'settings' && user && (
          <SettingsScreen
            user={user}
            onNavigate={navigate}
            onLogout={handleLogout}
            settings={appSettings}
            onUpdateSettings={updateSettings}
          />
        )}

        {/* VIEW: Test Models (Sub-view of Settings) */}
        {activeView === 'test' && user && (
          <TestModelsScreen onBack={handleSettings} />
        )}

        {/* VIEW: FAQ / Support */}
        {activeView === 'faq' && user && (
          <FAQScreen onBack={handleSettings} />
        )}
      </main>

      {user && (
        <BottomNav
          currentView={activeView}
          onNavigate={(path) => {
            navigate(path);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onLiveClick={() => setShowLiveAssistant(true)}
          hasActivePlan={!!results.parsedEpisode}
          isLiveActive={showLiveAssistant}
        />
      )}

      {/* Hide footer on authenticated screens to avoid clutter with bottom nav */}
      {!user && (
        <footer className="bg-white border-t border-slate-100 py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
            <p>
              © {new Date().getFullYear()} CareTransia. A prototype for
              demonstration purposes.
            </p>
            <p className="mt-2 text-sm">
              Not for medical emergencies. Always consult your doctor.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<CareTransiaApp />);
}
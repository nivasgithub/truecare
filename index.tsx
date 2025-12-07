import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useCareTransiaFlow } from './hooks/useDischargeAnalysis';
import type { UserProfile, ParsedEpisode, ConsistencyReport, FormattedCarePlan } from './types';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import LiveAssistant from './components/LiveAssistant';
import CareTransiaLandingPage from './components/LandingPage';
import CareTransiaIntake from './components/InputSection';
import StatusMessage from './components/StatusMessage';
import CareTransiaResults from './components/ResultsDashboard';
import SignInScreen from './components/SignInScreen';
import DashboardScreen from './components/DashboardScreen';
import TestModelsScreen from './components/TestModelsScreen';
import SettingsScreen from './components/SettingsScreen';
import { auth, logoutUser } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// --- Router Helpers ---
const getHashPath = () => {
  const hash = window.location.hash.slice(2); // remove '#/'
  return hash || 'landing';
};

const navigate = (path: string) => {
  window.location.hash = `#/${path}`;
};

export default function CareTransiaApp() {
  // App State
  const [currentView, setCurrentView] = useState<string>(getHashPath());
  const [showLiveAssistant, setShowLiveAssistant] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize hooks with userId (if logged in) for auto-saving
  const { intake, results, ui, actions } = useCareTransiaFlow(user?.id);

  // Handle Routing (Hash Change)
  useEffect(() => {
    const onHashChange = () => setCurrentView(getHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Listen for Auth Changes (Firebase)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          avatarUrl: firebaseUser.photoURL || undefined
        });
        // If on landing or signin page, redirect to dashboard
        if (currentView === 'landing' || currentView === 'signin') {
           navigate('dashboard');
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []); // Only run once on mount

  // Auto-navigate to results when analysis is done
  useEffect(() => {
    if (ui.status === 'done') {
      navigate('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [ui.status]);

  // Handlers
  const handleStart = () => {
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
    setUser(null);
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
                const mockReport: ConsistencyReport = { status: 'success', error_message: '', conflicts: [], gaps: [] };
                actions.loadRecord(parsed.parsed, mockReport, parsed.plan);
            }
        } catch (e) {
            console.error("Failed to parse historical record", e);
        }
    }
  };

  // Route Guards / Logic
  const activeView = currentView;
  
  // Redirect to landing if results accessed without data (optional, but good UX)
  useEffect(() => {
    if (activeView === 'results' && !results.parsedEpisode && ui.status !== 'analyzing') {
       if (!sessionStorage.getItem('ct_parsedEpisode')) {
         navigate('landing');
       }
    }
  }, [activeView, results.parsedEpisode, ui.status]);

  if (authLoading) {
     return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      <LiveAssistant isOpen={showLiveAssistant} onClose={() => setShowLiveAssistant(false)} />

      <Navbar 
        onHomeClick={handleHome} 
        currentView={activeView} 
        user={user}
        onSignIn={handleSignIn}
        onLogout={handleLogout}
        onSettingsClick={handleSettings}
        onLiveClick={() => setShowLiveAssistant(true)}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        
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
           />
        )}
        {/* Fallback if on dashboard but not logged in */}
        {activeView === 'dashboard' && !user && (
           <div className="text-center py-20">
             <p className="text-slate-500 mb-4">Please sign in to view your dashboard.</p>
             <button onClick={handleSignIn} className="text-blue-600 font-bold underline">Sign In</button>
           </div>
        )}

        {/* VIEW: Intake */}
        {activeView === 'intake' && (
          <div className="animate-fade-in-up pb-24">
            <CareTransiaIntake 
                patientInfo={intake.patientInfo} setPatientInfo={intake.setPatientInfo}
                files={intake.files} setFiles={intake.setFiles}
                notes={intake.notes} setNotes={intake.setNotes}
                onAnalyze={actions.analyze}
                isLoading={ui.status === 'analyzing'}
                progressMsg={ui.progressMsg}
              />
              <StatusMessage status={ui.status} errorMsg={ui.errorMsg} onDismiss={ui.dismissError} />
          </div>
        )}

        {/* VIEW: Results */}
        {activeView === 'results' && results.parsedEpisode && (
          <div className="animate-fade-in pb-24">
             <div className="mb-6 flex items-center justify-between">
                <button onClick={() => navigate('intake')} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
                  ← Back to Uploads
                </button>
                {user && (
                   <button onClick={() => navigate('dashboard')} className="text-sm font-bold text-blue-600 hover:text-blue-800">
                     Go to Dashboard
                   </button>
                )}
             </div>
            <CareTransiaResults 
              data={results.parsedEpisode} 
              consistency={results.consistencyReport} 
              carePlan={results.carePlan}
              onReset={handleReset} 
            />
          </div>
        )}

        {/* VIEW: Settings Hub */}
        {activeView === 'settings' && user && (
           <SettingsScreen 
             user={user}
             onNavigate={navigate}
             onLogout={handleLogout}
           />
        )}

        {/* VIEW: Test Models (Sub-view of Settings) */}
        {activeView === 'test' && user && (
          <TestModelsScreen onBack={handleSettings} />
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
            <p>© {new Date().getFullYear()} CareTransia. A prototype for demonstration purposes.</p>
            <p className="mt-2 text-xs">Not for medical emergencies. Always consult your doctor.</p>
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
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useTrueCareFlow } from './hooks/useDischargeAnalysis';
import { UserProfile } from './types';
import Navbar from './components/Navbar';
import TrueCareLandingPage from './components/LandingPage';
import TrueCareIntake from './components/InputSection';
import StatusMessage from './components/StatusMessage';
import TrueCareResults from './components/ResultsDashboard';
import SignInScreen from './components/SignInScreen';
import DashboardScreen from './components/DashboardScreen';
import TestModelsScreen from './components/TestModelsScreen';
import SettingsScreen from './components/SettingsScreen';

// --- Router Helpers ---
const getHashPath = () => {
  const hash = window.location.hash.slice(2); // remove '#/'
  return hash || 'landing';
};

const navigate = (path: string) => {
  window.location.hash = `#/${path}`;
};

export default function TrueCareApp() {
  const { intake, results, ui, actions } = useTrueCareFlow();
  
  // App State
  const [currentView, setCurrentView] = useState<string>(getHashPath());
  
  // User Persistence
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('truecare_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Handle Routing (Hash Change)
  useEffect(() => {
    const onHashChange = () => setCurrentView(getHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Sync User to Storage
  useEffect(() => {
    if (user) {
      localStorage.setItem('truecare_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('truecare_user');
    }
  }, [user]);

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

  const performLogin = () => {
    // Simulate successful login
    const newUser = {
      id: 'usr_123',
      name: 'Alex Johnson',
      email: 'alex.j@example.com'
    };
    setUser(newUser);
    navigate('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setUser(null);
    navigate('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSettings = () => {
    navigate('settings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route Guards / Logic
  const activeView = currentView;
  
  // Redirect to landing if results accessed without data (optional, but good UX)
  useEffect(() => {
    if (activeView === 'results' && !results.parsedEpisode && ui.status !== 'analyzing') {
       if (!sessionStorage.getItem('tc_parsedEpisode')) {
         navigate('landing');
       }
    }
  }, [activeView, results.parsedEpisode, ui.status]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      <Navbar 
        onHomeClick={handleHome} 
        currentView={activeView} 
        user={user}
        onSignIn={handleSignIn}
        onLogout={handleLogout}
        onSettingsClick={handleSettings}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW: Landing */}
        {activeView === 'landing' && (
          <div className="animate-fade-in">
            <TrueCareLandingPage onGetStarted={handleStart} />
          </div>
        )}

        {/* VIEW: Sign In */}
        {activeView === 'signin' && (
          <SignInScreen onSignIn={performLogin} />
        )}

        {/* VIEW: Dashboard */}
        {activeView === 'dashboard' && user && (
           <DashboardScreen 
             user={user} 
             onViewRecord={(id) => console.log('View record', id)}
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
          <div className="animate-fade-in-up">
            <TrueCareIntake 
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
          <div className="animate-fade-in">
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
            <TrueCareResults 
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

      <footer className="bg-white border-t border-slate-100 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} TrueCare. A prototype for demonstration purposes.</p>
          <p className="mt-2 text-xs">Not for medical emergencies. Always consult your doctor.</p>
        </div>
      </footer>

    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<TrueCareApp />);
}
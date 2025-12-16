import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProcessingLoader } from './components/features/ProcessingLoader';
import { AuthForm } from './components/features/AuthForm';
import { LandingPage } from './pages/LandingPage';
import { supabase } from './services/supabase';
import type { Session } from '@supabase/supabase-js';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setShowAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoadingSession) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><ProcessingLoader /></div>;
  }

  if (!session) {
    if (showAuth) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 relative">
          <button
            onClick={() => setShowAuth(false)}
            className="absolute top-4 left-4 text-slate-500 hover:text-slate-900 font-medium"
          >
            ← Back to Home
          </button>
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">Loantractor</h1>
              <p className="text-slate-500 mt-2">Sign in to your dashboard</p>
            </div>
            <AuthForm onSuccess={() => { }} />
          </div>
        </div>
      );
    }
    return <LandingPage onLogin={() => setShowAuth(true)} />;
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

export default App;

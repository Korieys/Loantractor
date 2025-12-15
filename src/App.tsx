import { useState, useEffect } from 'react';
import { DashboardLayout } from './layouts/DashboardLayout';
import { FileUploader } from './components/features/FileUploader';
import { DocTypeSelector } from './components/features/DocTypeSelector';
import type { LoanDocType } from './components/features/DocTypeSelector';
import { MOCK_EXTRACTION_DATA } from './data/mockExtraction';
import { extractLoanData } from './services/openai';
import { ExtractionViewer } from './components/features/ExtractionViewer';
import { ProcessingLoader } from './components/features/ProcessingLoader';
import { AuthForm } from './components/features/AuthForm';
import { LandingPage } from './pages/LandingPage';
import { supabase } from './services/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import type { Session } from '@supabase/supabase-js';

type AppState = 'IDLE' | 'SELECT_TYPE' | 'PROCESSING' | 'REVIEW' | 'ERROR';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  const [status, setStatus] = useState<AppState>('IDLE');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<LoanDocType | null>(null);
  const [extractedData, setExtractedData] = useState(MOCK_EXTRACTION_DATA);
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleFileUpload = (files: File[]) => {
    if (files.length === 0) return;
    setCurrentFile(files[0]);
    setStatus('SELECT_TYPE');
  };

  const handleTypeSelect = async (type: LoanDocType) => {
    setDocType(type);
    setStatus('PROCESSING');

    if (!currentFile) return;

    try {
      const data = await extractLoanData(currentFile, type);
      setExtractedData(data);
      setStatus('REVIEW');
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to process document. Please try again.");
      setStatus('ERROR');
    }
  };

  const handleSave = (data: typeof MOCK_EXTRACTION_DATA) => {
    console.log("Saved data:", data);
    // TODO: Save to Supabase DB here in the future
    alert("Data saved successfully! (Console log)");
    reset();
  };

  const reset = () => {
    setStatus('IDLE');
    setCurrentFile(null);
    setDocType(null);
    setExtractedData(MOCK_EXTRACTION_DATA);
    setErrorMsg("");
  };

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
      <div className="space-y-6">
        <header className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {status === 'IDLE' && "New Extraction"}
              {status === 'SELECT_TYPE' && "Classify Document"}
              {status === 'PROCESSING' && "Processing Document"}
              {status === 'REVIEW' && (docType ? `Review ${docType} Data` : "Review Data")}
              {status === 'ERROR' && "Processing Error"}
            </h2>
            <p className="text-slate-500">
              {status === 'IDLE' && "Upload a borrower document to automatically extract data."}
              {status === 'SELECT_TYPE' && "Select the type of document you uploaded."}
              {status === 'PROCESSING' && "Please wait while our AI analyzes your document..."}
              {status === 'REVIEW' && "Verify the extracted information against the document."}
              {status === 'ERROR' && "Something went wrong during extraction."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{session.user.email}</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-slate-500 hover:text-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {status === 'IDLE' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FileUploader onFileUpload={handleFileUpload} />
            </motion.div>
          )}

          {status === 'SELECT_TYPE' && (
            <motion.div
              key="select-type"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DocTypeSelector onSelect={handleTypeSelect} onCancel={reset} />
            </motion.div>
          )}

          {status === 'PROCESSING' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProcessingLoader />
            </motion.div>
          )}

          {status === 'REVIEW' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ExtractionViewer
                data={extractedData}
                file={currentFile}
                onSave={handleSave}
                onCancel={reset}
              />
            </motion.div>
          )}

          {status === 'ERROR' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center p-10 space-y-4"
            >
              <div className="bg-red-50 text-red-600 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <span className="text-2xl">!</span>
              </div>
              <p className="text-red-500 font-semibold">{errorMsg}</p>
              <button onClick={reset} className="text-primary hover:underline font-medium">Try Again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

export default App;

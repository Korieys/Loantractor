import { useState } from 'react';
import { FileUploader } from '../components/features/FileUploader';
import { DocTypeSelector } from '../components/features/DocTypeSelector';
import type { LoanDocType } from '../components/features/DocTypeSelector';
import { MOCK_EXTRACTION_DATA } from '../data/mockExtraction';
import { extractLoanData } from '../services/openai';
import { ExtractionViewer } from '../components/features/ExtractionViewer';
import { ProcessingLoader } from '../components/features/ProcessingLoader';
import { AnimatePresence, motion } from 'framer-motion';
import { logger } from '../services/logger';
import { supabase } from '../services/supabase';

type AppState = 'IDLE' | 'SELECT_TYPE' | 'PROCESSING' | 'SAVING' | 'REVIEW' | 'ERROR';

export function DashboardPage() {
    const [status, setStatus] = useState<AppState>('IDLE');
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<LoanDocType | null>(null);
    const [extractedData, setExtractedData] = useState(MOCK_EXTRACTION_DATA);
    const [errorMsg, setErrorMsg] = useState("");

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
            logger.error(err);
            setErrorMsg("Failed to process document. Please try again.");
            setStatus('ERROR');
        }
    };

    const handleSave = async (data: typeof MOCK_EXTRACTION_DATA) => {
        // Need user session for upload
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user || !currentFile || !docType) {
            logger.error("Missing session or file data for save");
            return;
        }

        try {
            setStatus('SAVING');

            const { uploadDocument } = await import('../services/supabase');
            await uploadDocument(currentFile, docType, data, session.user.id);

            alert("Document saved successfully!");
            reset();
        } catch (err) {
            logger.error("Save failed:", err);
            setErrorMsg("Failed to save document to Supabase.");
            setStatus('ERROR');
        }
    };

    const reset = () => {
        setStatus('IDLE');
        setCurrentFile(null);
        setDocType(null);
        setExtractedData(MOCK_EXTRACTION_DATA);
        setErrorMsg("");
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {status === 'IDLE' && "New Extraction"}
                        {status === 'SELECT_TYPE' && "Classify Document"}
                        {status === 'PROCESSING' && "Processing Document"}
                        {status === 'SAVING' && "Saving Data"}
                        {status === 'REVIEW' && (docType ? `Review ${docType} Data` : "Review Data")}
                        {status === 'ERROR' && "Processing Error"}
                    </h2>
                    <p className="text-slate-500">
                        {status === 'IDLE' && "Upload a borrower document to automatically extract data."}
                        {status === 'SELECT_TYPE' && "Select the type of document you uploaded."}
                        {status === 'PROCESSING' && "Please wait while our AI analyzes your document..."}
                        {status === 'SAVING' && "Securing your data in the database..."}
                        {status === 'REVIEW' && "Verify the extracted information against the document."}
                        {status === 'ERROR' && "Something went wrong during extraction."}
                    </p>
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

                {(status === 'PROCESSING' || status === 'SAVING') && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <ProcessingLoader mode={status === 'SAVING' ? 'saving' : 'analyzing'} />
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
    );
}

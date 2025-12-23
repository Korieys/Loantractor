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

import { BatchQueue } from '../components/features/BatchQueue';
import type { QueueItem } from '../components/features/BatchQueue';
import { Button } from '../components/ui/Button';

type AppState = 'IDLE' | 'SELECT_TYPE' | 'PROCESSING' | 'SAVING' | 'REVIEW' | 'ERROR' | 'BATCH_PREPARE' | 'BATCH_PROCESSING' | 'BATCH_COMPLETE';

export function DashboardPage() {
    const [status, setStatus] = useState<AppState>('IDLE');
    // Single file flow state
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<LoanDocType | null>(null);
    const [extractedData, setExtractedData] = useState(MOCK_EXTRACTION_DATA);
    const [isReanalyzing, setIsReanalyzing] = useState(false);

    // Batch flow state
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [batchDocType, setBatchDocType] = useState<LoanDocType | null>(null);

    const [errorMsg, setErrorMsg] = useState("");

    const handleFileUpload = (files: File[]) => {
        if (files.length === 0) return;

        if (files.length === 1) {
            setCurrentFile(files[0]);
            setStatus('SELECT_TYPE');
        } else {
            // Initialize queue
            const newQueue = files.map(f => ({
                id: crypto.randomUUID(),
                file: f,
                status: 'PENDING'
            } as QueueItem));
            setQueue(newQueue);
            setStatus('BATCH_PREPARE');
        }
    };

    // Single file flow handlers
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

    // Batch flow handlers
    const startBatchProcessing = async () => {
        // Validate
        if (queue.some(i => !i.docType)) {
            alert("Please select a document type for all files.");
            return;
        }

        setStatus('BATCH_PROCESSING');

        // We need to process sequentially to not hit rate limits and for better UX
        // Note: In a real app we might do small chunks of concurrency

        let currentQueue = [...queue];

        for (let i = 0; i < currentQueue.length; i++) {
            if (currentQueue[i].status === 'COMPLETED') continue;

            // Re-check updated state in case user modified something while loop was running? 
            // In React state snapshot, 'queue' inside this function is stale. 
            // We should trust 'currentQueue' derived from start but 'docType' must be captured.
            // Ideally we'd use a reducer or careful effect, but for now we assume types are set.
            const item = currentQueue[i];
            const type = item.docType!;

            // Update status to processing
            updateQueueItem(item.id, { status: 'PROCESSING' });

            try {
                // 1. Extract
                const data = await extractLoanData(item.file, type);

                // 2. Auto-save (Batch mode = Auto-save for now)
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { uploadDocument } = await import('../services/supabase');
                    await uploadDocument(item.file, type, data, session.user.id);
                }

                updateQueueItem(item.id, {
                    status: 'COMPLETED',
                    result: data
                });

            } catch (err) {
                console.error(err);
                updateQueueItem(item.id, {
                    status: 'ERROR',
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }

            // Refresh local queue ref for next iteration in case of UI updates (though we use functional updates typically, 
            // here we are in a loop. Better to just continue with our local copy logic but we need to ensure state is synced if user cancels)
            // For simplicity in this loop, we just proceed.
        }

        setStatus('BATCH_COMPLETE');
    };

    const handleViewQueueResult = (item: QueueItem) => {
        if (!item.result || !item.docType) return;

        setCurrentFile(item.file);
        setDocType(item.docType as LoanDocType);
        setExtractedData(item.result);
        setStatus('REVIEW');
    };

    const updateQueueItem = (id: string, updates: Partial<QueueItem>) => {
        setQueue(prev => prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
    };

    const removeFromQueue = (id: string) => {
        setQueue(prev => prev.filter(i => i.id !== id));
        if (queue.length <= 1) reset(); // Go back if empty
    };

    const reset = () => {
        setStatus('IDLE');
        setCurrentFile(null);
        setDocType(null);
        setExtractedData(MOCK_EXTRACTION_DATA);
        setQueue([]);
        setBatchDocType(null);
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
                        {(status === 'BATCH_PREPARE' || status === 'BATCH_PROCESSING' || status === 'BATCH_COMPLETE') && "Batch Processing"}
                    </h2>
                    <p className="text-slate-500">
                        {status === 'IDLE' && "Upload borrower documents to automatically extract data."}
                        {status === 'SELECT_TYPE' && "Select the type of document you uploaded."}
                        {status === 'BATCH_PREPARE' && "Configure your batch upload."}
                        {status === 'BATCH_PROCESSING' && `Processing your ${batchDocType} queue...`}
                        {status === 'BATCH_COMPLETE' && "Batch processing complete."}
                        {(status === 'PROCESSING' || status === 'SAVING') && "Please wait while we process your request..."}
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

                {(status === 'BATCH_PREPARE' || status === 'BATCH_PROCESSING' || status === 'BATCH_COMPLETE') && (
                    <motion.div
                        key="batch-queue"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-6"
                    >
                        {status === 'BATCH_PREPARE' && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div>
                                    <h4 className="font-semibold text-slate-900">Configure Batch Upload</h4>
                                    <p className="text-sm text-slate-500">Assign a document type to each file before processing.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={startBatchProcessing}
                                        disabled={queue.some(i => !i.docType)}
                                        className="w-full sm:w-auto"
                                    >
                                        Process All Files
                                    </Button>
                                </div>
                            </div>
                        )}

                        <BatchQueue
                            items={queue}
                            onRemove={removeFromQueue}
                            onRetry={(id) => updateQueueItem(id, { status: 'PENDING', error: undefined })}
                            onClearCompleted={() => setQueue(prev => prev.filter(i => i.status !== 'COMPLETED'))}
                            onTypeSelect={(id, type) => updateQueueItem(id, { docType: type })}
                            onViewResult={handleViewQueueResult}
                            isProcessing={status === 'BATCH_PROCESSING'}
                        />

                        {status === 'BATCH_COMPLETE' && (
                            <div className="flex justify-center pt-4">
                                <Button onClick={reset} size="lg">Start New Upload</Button>
                            </div>
                        )}
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
                            onCancel={() => {
                                // If we came from batch, go back to batch complete/prepare screen?
                                // Simplified: Just reset for now, OR if queue has items, go back to batch screen?
                                if (queue.length > 0) {
                                    // If all complete, go to BATCH_COMPLETE, else BATCH_PREPARE/PROCESSING?
                                    // The logic is a bit state-dependent.
                                    // Simplest approach: if queue items exist, return to BATCH_COMPLETE state if we reviewed a result.
                                    setStatus('BATCH_COMPLETE'); // Or determine state based on queue
                                } else {
                                    reset();
                                }
                            }}
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

import { useState, useRef, useEffect } from 'react';
import { FileUploader } from '../components/features/FileUploader';
import { DocTypeSelector } from '../components/features/DocTypeSelector';
import type { LoanDocType } from '../components/features/DocTypeSelector';
import { extractLoanData, type ExtractedData } from '../services/openai';
import { ExtractionViewer } from '../components/features/ExtractionViewer';
import { ProcessingLoader } from '../components/features/ProcessingLoader';
import { AnimatePresence, motion } from 'framer-motion';
import { logger } from '../services/logger';
import { supabase, uploadDocument, updateDocument } from '../services/supabase';

import { BatchQueue } from '../components/features/BatchQueue';
import type { QueueItem } from '../components/features/BatchQueue';
import { Button } from '../components/ui/Button';

type AppState = 'IDLE' | 'SELECT_TYPE' | 'PROCESSING' | 'REVIEW' | 'ERROR' | 'BATCH_PREPARE' | 'BATCH_PROCESSING' | 'BATCH_COMPLETE';

export function DashboardPage() {
    const [status, setStatus] = useState<AppState>('IDLE');
    // Single file flow state
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<LoanDocType | null>(null);
    const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Batch flow state
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [reviewQueueId, setReviewQueueId] = useState<string | null>(null);
    const mounted = useRef(true);
    const busy = useRef(false);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const [errorMsg, setErrorMsg] = useState("");

    const handleFileUpload = (files: File[]) => {
        if (files.length === 0) return;
        setReviewQueueId(null);
        setErrorMsg('');

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
        if (busy.current || !currentFile) return;
        busy.current = true;
        setDocType(type);
        setStatus('PROCESSING');

        try {
            const data = await extractLoanData(currentFile, type);
            if (!mounted.current) return;
            setExtractedData(data);
            setStatus('REVIEW');
        } catch (err) {
            if (!mounted.current) return;
            logger.error(err);
            setErrorMsg(err instanceof Error ? err.message : 'Failed to process document. Please try again.');
            setStatus('ERROR');
        } finally {
            busy.current = false;
        }
    };

    const handleSave = async (data: ExtractedData[]) => {
        if (busy.current) return;
        busy.current = true;
        setIsSaving(true);
        setErrorMsg('');
        try {
            if (!supabase) throw new Error('Saving is unavailable. Your edits are still here.');
            const { data: { session } } = await supabase.auth.getSession();
            if (!mounted.current) return;
            if (!session?.user) throw new Error('Please sign in again before saving. Your edits are still here.');
            if (!currentFile || !docType) throw new Error('The source document is unavailable. Your edits have not been saved.');
            const savedItem = reviewQueueId ? queue.find(item => item.id === reviewQueueId) : null;
            if (reviewQueueId && !savedItem?.documentId) throw new Error('The saved document is unavailable. Please reopen it from Documents.');
            if (savedItem?.documentId) {
                await updateDocument(savedItem.documentId, data, docType);
                if (!mounted.current) return;
                updateQueueItem(savedItem.id, { result: data, docType });
                setReviewQueueId(null);
                setStatus('BATCH_COMPLETE');
            } else {
                await uploadDocument(currentFile, docType, data, session.user.id);
                if (!mounted.current) return;
                alert('Document saved successfully!');
                reset();
            }
        } catch (err) {
            if (!mounted.current) return;
            logger.error("Save failed:", err);
            setErrorMsg(err instanceof Error ? err.message : 'Your document was not saved. Your edits are still here; please retry.');
        } finally {
            busy.current = false;
            if (mounted.current) setIsSaving(false);
        }
    };

    // Batch flow handlers
    const startBatchProcessing = async (onlyId?: string) => {
        if (busy.current) return;
        const currentQueue = queue.filter(item => item.status !== 'COMPLETED' && (!onlyId || item.id === onlyId));
        if (!currentQueue.length) return;
        if (currentQueue.some(i => !i.docType)) {
            alert("Please select a document type for all files.");
            return;
        }
        busy.current = true;
        setStatus('BATCH_PROCESSING');
        for (const item of currentQueue) {
            if (!mounted.current) break;
            const type = item.docType!;
            updateQueueItem(item.id, { status: 'PROCESSING', error: undefined });

            try {
                // A failed save can reuse its successful extraction instead of charging for it again.
                const data = item.result ?? await extractLoanData(item.file, type);
                if (!mounted.current) break;
                updateQueueItem(item.id, { result: data });
                if (!supabase) throw new Error('Saving is unavailable. Your document has not been saved.');
                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted.current) break;
                if (!session?.user) throw new Error('Sign in again before saving. This document has not been saved.');
                const saved = await uploadDocument(item.file, type, data, session.user.id);
                if (!mounted.current) break;

                updateQueueItem(item.id, {
                    status: 'COMPLETED',
                    result: data,
                    documentId: saved.id
                });

            } catch (err) {
                if (!mounted.current) break;
                logger.error('Batch document failed:', err);
                updateQueueItem(item.id, {
                    status: 'ERROR',
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }

        }
        busy.current = false;
        if (mounted.current) setStatus('BATCH_COMPLETE');
    };

    const handleViewQueueResult = (item: QueueItem) => {
        if (busy.current || !item.result || !item.docType || !item.documentId) return;

        setReviewQueueId(item.id);
        setErrorMsg('');
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
        setExtractedData([]);
        setQueue([]);
        setReviewQueueId(null);
        setErrorMsg("");
    };

    const handleReanalyze = async (newType: LoanDocType) => {
        if (!currentFile || busy.current) return;

        busy.current = true;
        setErrorMsg('');
        setIsReanalyzing(true);
        try {
            // Re-extract data with new type
            const data = await extractLoanData(currentFile, newType);
            if (!mounted.current) return;

            // Update local state
            setExtractedData(data);
            setDocType(newType);

            // A batch item keeps its last saved values until Save confirms the update.
        } catch (error) {
            if (!mounted.current) return;
            logger.error('Reanalysis failed:', error);
            setErrorMsg('Reanalysis failed. Your previous fields are still here; please retry.');
        } finally {
            busy.current = false;
            if (mounted.current) setIsReanalyzing(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {status === 'IDLE' && "New Extraction"}
                        {status === 'SELECT_TYPE' && "Classify Document"}
                        {status === 'PROCESSING' && "Processing Document"}
                        {status === 'REVIEW' && (docType ? `Review ${docType} Data` : "Review Data")}
                        {status === 'ERROR' && "Processing Error"}
                        {(status === 'BATCH_PREPARE' || status === 'BATCH_PROCESSING' || status === 'BATCH_COMPLETE') && "Batch Processing"}
                    </h2>
                    <p className="text-slate-500">
                        {status === 'IDLE' && "Upload borrower documents to automatically extract data."}
                        {status === 'SELECT_TYPE' && "Select the type of document you uploaded."}
                        {status === 'BATCH_PREPARE' && "Configure your batch upload."}
                        {status === 'BATCH_PROCESSING' && 'Processing your document queue…'}
                        {status === 'BATCH_COMPLETE' && (queue.some(item => item.status === 'ERROR') ? 'Processing finished with failed documents. Retry them below.' : 'Documents saved. Review the extracted values before use.')}
                        {status === 'PROCESSING' && 'Please wait while we process your request…'}
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
                                    <p className="text-sm text-slate-500">Assign a type to each file. Batch processing automatically saves draft fields for your review.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => startBatchProcessing()}
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
                            onRetry={id => startBatchProcessing(id)}
                            onClearCompleted={() => setQueue(prev => prev.filter(i => i.status !== 'COMPLETED'))}
                            onTypeSelect={(id, type) => updateQueueItem(id, { docType: type, result: undefined })}
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

                {status === 'PROCESSING' && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <ProcessingLoader mode="analyzing" />
                    </motion.div>
                )}

                {status === 'REVIEW' && (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="h-full"
                    >
                        {errorMsg && <p role="alert" className="mb-4 text-red-700">{errorMsg}</p>}
                        <ExtractionViewer
                            data={extractedData}
                            file={currentFile}
                            onSave={handleSave}
                            onReanalyze={handleReanalyze}
                            isProcessing={isReanalyzing}
                            isSaving={isSaving}
                            onCancel={() => {
                                // If we came from batch, return to batch view if items remain
                                if (queue.length > 0) {
                                    // Simplified: return to batch complete/review list
                                    setStatus('BATCH_COMPLETE');
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

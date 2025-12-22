import { CheckCircle, Loader2, XCircle, FileText, AlertCircle } from 'lucide-react'
import { Card } from '../ui/Card'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/Button'

export interface QueueItem {
    id: string
    file: File
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
    result?: any
    error?: string
    docType?: string
}

interface BatchQueueProps {
    items: QueueItem[]
    onRemove: (id: string) => void
    onRetry: (id: string) => void
    onClearCompleted: () => void
    isProcessing: boolean
}

export function BatchQueue({ items, onRemove, onRetry, onClearCompleted, isProcessing }: BatchQueueProps) {
    const pendingCount = items.filter(i => i.status === 'PENDING').length
    const completedCount = items.filter(i => i.status === 'COMPLETED').length
    const errorCount = items.filter(i => i.status === 'ERROR').length

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Processing Queue</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-3">
                        <span>{isProcessing ? 'Processing documents...' : 'Ready to process'}</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs font-mono">
                            {completedCount} Done
                        </span>
                        {pendingCount > 0 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-mono">
                                {pendingCount} Pending
                            </span>
                        )}
                        {errorCount > 0 && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-mono">
                                {errorCount} Failed
                            </span>
                        )}
                    </p>
                </div>
                {completedCount > 0 && !isProcessing && (
                    <Button variant="outline" size="sm" onClick={onClearCompleted}>
                        Clear Completed
                    </Button>
                )}
            </div>

            <div className="grid gap-3">
                <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <Card className="p-3 flex items-center gap-4 bg-white border-slate-200 shadow-sm relative overflow-hidden">
                                {/* Status Indicator */}
                                <div className="flex-shrink-0 w-8 flex justify-center">
                                    {item.status === 'PENDING' && <div className="w-3 h-3 rounded-full bg-slate-300" />}
                                    {item.status === 'PROCESSING' && <Loader2 className="animate-spin text-primary" size={20} />}
                                    {item.status === 'COMPLETED' && <CheckCircle className="text-green-500" size={20} />}
                                    {item.status === 'ERROR' && <XCircle className="text-red-500" size={20} />}
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <FileText size={16} className="text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700 truncate">{item.file.name}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                        <span>{(item.file.size / 1024).toFixed(1)} KB</span>
                                        {item.status === 'ERROR' && (
                                            <span className="text-red-500 flex items-center gap-1">
                                                <AlertCircle size={12} />
                                                {item.error || 'Extraction failed'}
                                            </span>
                                        )}
                                        {item.status === 'COMPLETED' && (
                                            <span className="text-green-600 bg-green-50 px-1.5 rounded">
                                                {item.docType || 'Processed'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex-shrink-0 flex items-center gap-2">
                                    {item.status === 'ERROR' && !isProcessing && (
                                        <Button variant="ghost" size="sm" onClick={() => onRetry(item.id)} className="h-8 text-slate-500 hover:text-primary">
                                            Retry
                                        </Button>
                                    )}
                                    {item.status !== 'PROCESSING' && (
                                        <button
                                            onClick={() => onRemove(item.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                            disabled={isProcessing}
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    )}
                                </div>

                                {/* Progress Bar (for Processing state) */}
                                {item.status === 'PROCESSING' && (
                                    <motion.div
                                        className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full"
                                        initial={{ scaleX: 0, originX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                )}
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {items.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 text-slate-400">
                    Queue is empty
                </div>
            )}
        </div>
    )
}

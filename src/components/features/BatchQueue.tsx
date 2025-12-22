import { CheckCircle, Loader2, XCircle, FileText, AlertCircle, Eye, ChevronDown } from 'lucide-react'
import { Card } from '../ui/Card'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/Button'
import type { LoanDocType } from './DocTypeSelector'

export interface QueueItem {
    id: string
    file: File
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
    result?: any
    error?: string
    docType?: LoanDocType
}

interface BatchQueueProps {
    items: QueueItem[]
    onRemove: (id: string) => void
    onRetry: (id: string) => void
    onClearCompleted: () => void
    onTypeSelect: (id: string, type: LoanDocType) => void
    onViewResult: (item: QueueItem) => void
    isProcessing: boolean
}

const DOC_TYPES: LoanDocType[] = ['Pay Stub', 'Bank Statement', 'Tax Return', 'Loan Application', 'Other'];

export function BatchQueue({ items, onRemove, onRetry, onClearCompleted, onTypeSelect, onViewResult, isProcessing }: BatchQueueProps) {
    const pendingCount = items.filter(i => i.status === 'PENDING').length
    const completedCount = items.filter(i => i.status === 'COMPLETED').length
    const errorCount = items.filter(i => i.status === 'ERROR').length

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Processing Queue</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-3">
                        <span>{isProcessing ? 'Processing documents...' : 'Configure and process'}</span>
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
                            <Card className={
                                `p-3 flex flex-col sm:flex-row sm:items-center gap-4 bg-white border-slate-200 shadow-sm relative overflow-hidden ${item.status === 'COMPLETED' ? 'hover:border-green-200 cursor-pointer transition-colors' : ''}`
                            }
                                onClick={() => item.status === 'COMPLETED' && onViewResult(item)}
                            >
                                {/* Loading Bar */}
                                {item.status === 'PROCESSING' && (
                                    <motion.div
                                        className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full"
                                        initial={{ scaleX: 0, originX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                )}

                                <div className="flex items-center gap-4 flex-1 min-w-0">
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
                                        <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                                            <span>{(item.file.size / 1024).toFixed(1)} KB</span>
                                            {item.status === 'ERROR' && (
                                                <span className="text-red-500 flex items-center gap-1">
                                                    <AlertCircle size={12} />
                                                    {item.error || 'Extraction failed'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-end" onClick={(e) => e.stopPropagation()}>
                                    {/* Type Selector (Only for Pending/Error) */}
                                    {(item.status === 'PENDING' || item.status === 'ERROR') && (
                                        <div className="relative">
                                            <select
                                                value={item.docType || ''}
                                                onChange={(e) => onTypeSelect(item.id, e.target.value as LoanDocType)}
                                                disabled={isProcessing}
                                                className={`
                                                    appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-md pl-3 pr-8 py-1.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer
                                                    ${!item.docType ? 'text-slate-400 border-orange-200 bg-orange-50' : ''}
                                                `}
                                            >
                                                <option value="" disabled>Select Type...</option>
                                                {DOC_TYPES.map(type => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    )}

                                    {/* Completed Doc Type Display */}
                                    {item.status === 'COMPLETED' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium px-2 py-1 bg-green-50 text-green-700 rounded-md border border-green-100">
                                                {item.docType}
                                            </span>
                                            <Button variant="ghost" size="sm" onClick={() => onViewResult(item)} className="h-8 text-slate-500 hover:text-primary gap-1">
                                                <Eye size={14} /> Review
                                            </Button>
                                        </div>
                                    )}

                                    {/* Actions */}
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
                                            title="Remove from queue"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    )}
                                </div>
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

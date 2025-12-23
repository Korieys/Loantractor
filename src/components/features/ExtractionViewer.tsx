
import { useState, useRef, useMemo } from 'react'
import { Edit2, AlertCircle, Copy, Check, ZoomIn, ZoomOut, RotateCcw, FileCode, FileText, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Input } from '../ui/Input'
import { validateExtraction } from '../../services/validation'
import type { LoanDocType } from './DocTypeSelector'

// Mock interface for extraction data
interface ExtractedData {
    field: string
    value: string
    confidence: number
}

interface ExtractionViewerProps {
    data: ExtractedData[]
    file: File | null
    onSave: (data: ExtractedData[]) => void
    onCancel: () => void
    onReanalyze?: (newType: LoanDocType) => void
    isProcessing?: boolean
}

const DOC_TYPES: LoanDocType[] = ['Pay Stub', 'Bank Statement', 'Tax Return', 'Loan Application', 'Other'];

export function ExtractionViewer({ data: initialData, file, onSave, onCancel, onReanalyze, isProcessing = false }: ExtractionViewerProps) {
    const [data, setData] = useState(initialData)
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
    const [showReanalyze, setShowReanalyze] = useState(false)
    const [selectedType, setSelectedType] = useState<LoanDocType>('Other')

    const imageRef = useRef<HTMLDivElement>(null)

    // Sync data if props change (e.g. after re-analysis)
    useMemo(() => {
        setData(initialData);
    }, [initialData]);

    // Run validation on data change
    const validationResult = useMemo(() => validateExtraction(data), [data])

    const handleFieldChange = (index: number, newValue: string) => {
        const newData = [...data]
        newData[index] = { ...newData[index], value: newValue }
        setData(newData)
    }

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
    }

    const handleExport = (type: 'json' | 'csv') => {
        let content = ''
        let mimeType = ''
        let extension = ''

        if (type === 'json') {
            const cleanData = data.reduce((acc, item) => ({ ...acc, [item.field]: item.value }), {})
            content = JSON.stringify(cleanData, null, 2)
            mimeType = 'application/json'
            extension = 'json'
        } else {
            const headers = ['Field', 'Value', 'Confidence']
            const rows = data.map(item => `"${item.field}","${item.value}","${item.confidence}"`)
            content = [headers.join(','), ...rows].join('\n')
            mimeType = 'text/csv'
            extension = 'csv'
        }

        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `extracted_data.${extension}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Zoom/Pan logic
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }

    const handleMouseUp = () => setIsDragging(false)

    const resetZoom = () => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }

    // Simple placeholder for PDF viewer - using object URL for images or basic embed for PDF
    const fileUrl = file ? URL.createObjectURL(file) : null;

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:h-[calc(100vh-140px)] relative">
            {/* Document View */}
            <Card className="h-[50vh] lg:h-full flex flex-col overflow-hidden bg-slate-800 border-slate-700 relative group flex-shrink-0">
                <CardHeader className="bg-slate-900/50 py-3 px-4 border-b border-slate-700 flex-shrink-0 z-10 w-full">
                    <CardTitle className="text-slate-200 text-sm flex items-center justify-between w-full">
                        <span className="truncate mr-2">{file?.name || "Document Preview"}</span>
                        <div className="flex items-center gap-1 bg-slate-800/80 rounded-md p-0.5">
                            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Zoom Out"><ZoomOut size={16} /></button>
                            <span className="text-xs text-slate-400 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Zoom In"><ZoomIn size={16} /></button>
                            <div className="w-px h-4 bg-slate-700 mx-1"></div>
                            <button onClick={resetZoom} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Reset View"><RotateCcw size={16} /></button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <div
                    className="flex-1 bg-slate-900 relative overflow-hidden cursor-move"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    ref={imageRef}
                >
                    {file && file.type.startsWith('image/') ? (
                        <div
                            className="w-full h-full flex items-center justify-center pointer-events-none"
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                            }}
                        >
                            <img src={fileUrl!} alt="Doc" className="max-w-none shadow-lg" />
                        </div>
                    ) : (
                        <div className="text-slate-500 flex flex-col items-center justify-center h-full">
                            <AlertCircle size={48} className="mb-2 opacity-50" />
                            <p>Preview not available</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Data View */}
            <Card className="flex-1 lg:h-full flex flex-col overflow-hidden min-h-[500px]">
                <CardHeader className="py-4 border-b">
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span>Extracted Data</span>
                            {!validationResult.isValid && (
                                <span className="text-xs font-normal text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    {validationResult.errors.length} Issues
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            {onReanalyze && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowReanalyze(!showReanalyze)}
                                    className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 relative"
                                    disabled={isProcessing}
                                >
                                    <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                                    {isProcessing ? 'Processing...' : 'Reanalyze'}

                                    {showReanalyze && (
                                        <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-lg p-3 w-64 z-50 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
                                            <p className="text-xs font-semibold text-slate-500 mb-2">Select Correct Document Type:</p>
                                            <div className="space-y-1">
                                                {DOC_TYPES.map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            onReanalyze(type)
                                                            setSelectedType(type)
                                                            setShowReanalyze(false)
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 text-slate-700 hover:text-primary transition-colors"
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </Button>
                            )}

                            <div className="flex bg-slate-100 rounded-lg p-1 mr-2">
                                <button onClick={() => {
                                    const allText = data.map(i => `${i.field}: ${i.value}`).join('\n')
                                    navigator.clipboard.writeText(allText)
                                    alert("All extracted data copied to clipboard!")
                                }} className="p-1.5 hover:bg-white rounded-md text-slate-500 hover:text-slate-700 shadow-sm transition-all" title="Copy All to Clipboard">
                                    <Copy size={16} />
                                </button>
                                <button onClick={() => handleExport('csv')} className="p-1.5 hover:bg-white rounded-md text-slate-500 hover:text-slate-700 shadow-sm transition-all" title="Export to CSV">
                                    <FileText size={16} />
                                </button>
                                <button onClick={() => handleExport('json')} className="p-1.5 hover:bg-white rounded-md text-slate-500 hover:text-slate-700 shadow-sm transition-all" title="Export to JSON">
                                    <FileCode size={16} />
                                </button>
                            </div>
                            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
                            <Button size="sm" onClick={() => onSave(data)} className="gap-2">
                                Save
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0 relative">
                    {isProcessing && (
                        <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                            <RefreshCw size={48} className="text-primary animate-spin mb-4" />
                            <p className="text-lg font-semibold text-slate-800">Reanalyzing Document...</p>
                            <p className="text-slate-500">Extracting data as {selectedType}</p>
                        </div>
                    )}

                    <div className="divide-y divide-slate-100 h-full">
                        {data.map((item, index) => {
                            const fieldError = validationResult.errors.find(e => e.field === item.field)
                            const isError = fieldError?.severity === 'ERROR'
                            const isWarning = fieldError?.severity === 'WARNING'

                            return (
                                <div key={index} className={cn(
                                    "p-4 transition-colors group border-l-4",
                                    isError ? "bg-red-50/50 border-red-500" :
                                        isWarning ? "bg-yellow-50/50 border-yellow-500" :
                                            "hover:bg-slate-50 border-transparent"
                                )}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.field}</label>
                                            {fieldError && (
                                                <span className={cn(
                                                    "text-[10px] flex items-center gap-1",
                                                    isError ? "text-red-600" : "text-yellow-600"
                                                )}>
                                                    {isError ? <AlertCircle size={10} /> : <AlertTriangle size={10} />}
                                                    {fieldError.message}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.confidence > 0.9 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {Math.round(item.confidence * 100)}% Match
                                        </span>
                                    </div>

                                    <div className="relative flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                value={item.value}
                                                onChange={(e) => handleFieldChange(index, e.target.value)}
                                                className={cn(
                                                    "transition-all font-medium text-slate-900 pr-8",
                                                    "bg-transparent border-transparent hover:border-slate-300 focus:bg-white",
                                                    isError && "text-red-900 placeholder:text-red-300"
                                                )}
                                            />
                                            <div className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 pointer-events-none text-slate-400">
                                                <Edit2 size={14} />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleCopy(item.value, index)}
                                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                            title="Copy value"
                                        >
                                            {copiedIndex === index ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ')
}

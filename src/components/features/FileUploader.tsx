import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Upload, File, X, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { MAX_FILE_BYTES } from '../../services/openai'

interface FileUploaderProps {
    onFileUpload: (files: File[]) => void
}

export function FileUploader({ onFileUpload }: FileUploaderProps) {
    const [files, setFiles] = useState<File[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState('')

    const onDrop = useCallback((acceptedFiles: File[], rejections: FileRejection[]) => {
        setIsDragging(false)
        setError('')
        if (rejections.length) {
            setError('Choose up to 10 PDF, PNG, JPG or WebP files, no larger than 2 MB each.')
            return
        }
        if (files.length + acceptedFiles.length > 10) {
            setError('Keep the queue to 10 documents at a time.')
            return
        }
        setFiles(prev => [...prev, ...acceptedFiles])
    }, [files.length])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/webp': ['.webp']
        },
        maxSize: MAX_FILE_BYTES,
        minSize: 1,
        maxFiles: 10,
        onDragEnter: () => setIsDragging(true),
        onDragLeave: () => setIsDragging(false)
    })

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleProcess = () => {
        if (files.length > 0) {
            onFileUpload(files)
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <Card
                {...getRootProps()}
                className={cn(
                    "p-6 sm:p-10 border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 bg-white/50",
                    isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-300 hover:border-primary/50",
                    isDragging && "ring-4 ring-primary/20"
                )}
            >
                <input {...getInputProps()} />
                <div className={cn(
                    "p-4 rounded-full bg-slate-100 transition-colors",
                    isDragActive && "bg-primary/10 text-primary"
                )}>
                    <Upload size={32} className={isDragActive ? "text-primary" : "text-slate-400"} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                        {isDragActive ? "Drop files here" : "Upload Borrower Documents (Batch Supported)"}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        PDF, PNG, JPG or WebP · Up to 2 MB each · 10 files per queue
                    </p>
                </div>
            </Card>
            <p className="text-sm text-slate-600">Processing sends the selected document to OpenAI to prepare draft fields. Saved documents are stored in your account. Use only documents you are authorized to process, and check every value against the original before use.</p>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                    >
                        {files.map((file, idx) => (
                            <motion.div
                                key={`${file.name}-${idx}`}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-blue-50 rounded-md text-blue-600">
                                        <File size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                        <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <button
                                    aria-label={`Remove ${file.name}`}
                                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </motion.div>
                        ))}

                        <div className="pt-4 flex justify-end">
                            <Button onClick={handleProcess} className="w-full sm:w-auto gap-2">
                                <CheckCircle size={18} />
                                Process {files.length} Document{files.length !== 1 ? 's' : ''}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

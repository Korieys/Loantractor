import { motion } from 'framer-motion'
import { Scan, FileText, Loader2, Save } from 'lucide-react'

interface ProcessingLoaderProps {
    mode?: 'analyzing' | 'saving';
}

export function ProcessingLoader({ mode = 'analyzing' }: ProcessingLoaderProps) {
    const isSaving = mode === 'saving';

    return (
        <div className="flex flex-col items-center justify-center h-64 space-y-8">
            <div className="relative">
                {/* Animated background effect */}
                <motion.div
                    className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                <div className="relative bg-white p-6 rounded-full shadow-xl border border-slate-100">
                    <FileText size={48} className="text-slate-300" />
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center text-primary"
                        animate={isSaving ? { opacity: 1 } : { opacity: [0, 1, 0, 1] }}
                        transition={isSaving ? {} : { duration: 3, repeat: Infinity, times: [0, 0.2, 0.8, 1] }}
                    >
                        {isSaving ? (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                            >
                                <Save size={32} />
                            </motion.div>
                        ) : (
                            <Scan size={48} />
                        )}
                    </motion.div>
                </div>
            </div>

            <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2 justify-center">
                    <Loader2 className="animate-spin" size={20} />
                    {isSaving ? "Saving to Database" : "Analyzing Document"}
                </h3>
                <p className="text-slate-500 max-w-xs mx-auto">
                    {isSaving
                        ? "Encrypting and storing your extraction results..."
                        : "Extracting key loan information, names, amounts, and dates..."}
                </p>
            </div>

            <div className="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: isSaving ? 1.5 : 2.5, ease: "easeInOut" }}
                />
            </div>
        </div>
    )
}

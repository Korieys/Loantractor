import { motion } from 'framer-motion'
import { Scan, FileText, Loader2 } from 'lucide-react'

export function ProcessingLoader() {
    return (
        <div className="flex flex-col items-center justify-center h-64 space-y-8">
            <div className="relative">
                {/* Animated scanning effect */}
                <motion.div
                    className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                <div className="relative bg-white p-6 rounded-full shadow-xl border border-slate-100">
                    <FileText size={48} className="text-slate-300" />
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center text-primary"
                        animate={{ opacity: [0, 1, 0, 1] }}
                        transition={{ duration: 3, repeat: Infinity, times: [0, 0.2, 0.8, 1] }}
                    >
                        <Scan size={48} />
                    </motion.div>
                </div>
            </div>

            <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2 justify-center">
                    <Loader2 className="animate-spin" size={20} />
                    Analyzing Document
                </h3>
                <p className="text-slate-500 max-w-xs mx-auto">
                    Extracting key loan information, names, amounts, and dates...
                </p>
            </div>

            <div className="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                />
            </div>
        </div>
    )
}

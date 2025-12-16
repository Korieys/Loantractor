import { Button } from "../components/ui/Button";
import { ArrowRight, Shield, Zap, FileText, Sparkles, BrainCircuit } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from "react";

interface LandingPageProps {
    onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
    const targetRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ["start start", "end start"]
    });

    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);

    return (
        <div className="min-h-screen bg-[#020617] font-sans text-slate-100 overflow-x-hidden selection:bg-primary/30">
            {/* Navbar */}
            <nav className="fixed w-full top-0 z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-violet-500/20">
                            <BrainCircuit className="text-white w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">Parseon</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={onLogin} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                            Log in
                        </button>
                        <Button onClick={onLogin} size="sm" className="bg-white text-slate-900 hover:bg-slate-200 border-none">
                            Get Started
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div ref={targetRef} className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 overflow-hidden pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        transition={{ duration: 1.5 }}
                        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]"
                    />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="absolute bottom-[0%] right-[-5%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]"
                    />
                </div>

                <motion.div
                    style={{ opacity, scale }}
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center"
                >
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8 backdrop-blur-sm"
                    >
                        <Sparkles size={14} className="text-amber-400" />
                        <span>Powered by GPT-4o Vision</span>
                    </motion.div>

                    <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8">
                        <span className="block text-white mb-2">Extract Data</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400">
                            The Intelligent Way
                        </span>
                    </h1>

                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed"
                    >
                        Parseon turns messy documents into structured data instantly.
                        No templates, no training—just upload and get pure JSON.
                    </motion.p>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Button
                            onClick={onLogin}
                            size="lg"
                            className="h-14 px-8 text-lg bg-violet-600 hover:bg-violet-700 shadow-xl shadow-violet-500/20 border-none ring-offset-2 ring-offset-[#020617] transition-all hover:scale-105"
                        >
                            Start Extraction
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <button onClick={onLogin} className="group flex items-center gap-2 text-slate-400 hover:text-white px-6 py-3 transition-colors">
                            <span className="border-b border-transparent group-hover:border-white transition-all">View Output Sample</span>
                        </button>
                    </motion.div>
                </motion.div>

                {/* Floating UI Mockup */}
                <motion.div
                    initial={{ y: 100, opacity: 0, rotateX: 20 }}
                    animate={{ y: 0, opacity: 1, rotateX: 10 }}
                    transition={{ duration: 1, delay: 0.6, type: "spring" }}
                    className="mt-20 max-w-5xl mx-auto px-4 perspective-1000"
                >
                    <div className="relative rounded-xl border border-white/10 bg-[#0f172a]/50 backdrop-blur-xl shadow-2xl p-2 select-none transform transition-transform hover:rotate-x-0 duration-700">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-xl pointer-events-none" />
                        <div className="bg-[#020617] rounded-lg border border-white/5 overflow-hidden grid grid-cols-12 h-[400px]">
                            {/* Fake Sidebar */}
                            <div className="col-span-3 border-r border-white/5 p-4 space-y-3 hidden md:block">
                                <div className="h-2 w-20 bg-white/10 rounded mb-6" />
                                <div className="h-8 w-full bg-violet-500/20 rounded border border-violet-500/30" />
                                <div className="h-8 w-full bg-white/5 rounded" />
                                <div className="h-8 w-full bg-white/5 rounded" />
                            </div>
                            {/* Fake Content */}
                            <div className="col-span-12 md:col-span-9 p-6 relative">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="h-6 w-32 bg-white/10 rounded" />
                                    <div className="h-8 w-24 bg-indigo-500 rounded" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-40 bg-white/5 rounded border border-white/5 flex items-center justify-center">
                                        <FileText className="text-slate-600 w-12 h-12" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="h-4 w-full bg-white/10 rounded" />
                                        <div className="h-4 w-3/4 bg-white/10 rounded" />
                                        <div className="h-20 w-full bg-green-500/10 rounded border border-green-500/20 p-3">
                                            <div className="h-2 w-16 bg-green-500/40 rounded mb-2" />
                                            <div className="h-2 w-full bg-green-500/20 rounded" />
                                        </div>
                                    </div>
                                </div>
                                {/* Scanning Line Animation */}
                                <motion.div
                                    animate={{ top: ["10%", "90%", "10%"] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent shadow-[0_0_15px_rgba(139,92,246,0.5)] z-20"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Features Grid */}
            <section className="py-24 bg-[#0B1121] relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Why Parseon?</h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">Built for heavy-duty financial processing with a level of precision typical OCR can't match.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-amber-400" />}
                            title="Zero-Shot Extraction"
                            desc="No training required. Provide any document type, and our semantic engine understands the context immediately."
                        />
                        <FeatureCard
                            icon={<Shield className="w-6 h-6 text-emerald-400" />}
                            title="SOC2 Ready Security"
                            desc="Your data is encrypted, processed in a secure enclave, and wiped after processing unless saved by you."
                        />
                        <FeatureCard
                            icon={<BrainCircuit className="w-6 h-6 text-violet-400" />}
                            title="Reasoning Engine"
                            desc="Parseon doesn't just read text; it understands it. It corrects OCR errors using financial context."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#020617] py-12 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
                    <p>&copy; 2025 Parseon Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="p-8 rounded-3xl bg-[#0f172a] border border-white/5 hover:border-violet-500/30 transition-colors group"
        >
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-violet-500/10 transition-colors">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
            <p className="text-slate-400 leading-relaxed">{desc}</p>
        </motion.div>
    )
}

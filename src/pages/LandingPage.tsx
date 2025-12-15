import { Button } from "../components/ui/Button";
import { ArrowRight, CheckCircle2, Shield, Zap } from 'lucide-react';

interface LandingPageProps {
    onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Navbar */}
            <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Zap className="text-primary w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold text-slate-900 tracking-tight">Loantractor</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onLogin} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                            Log in
                        </button>
                        <Button onClick={onLogin} size="sm">
                            Get Started
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Now with OpenAI GPT-4o Vision
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">
                        Automate Loan Data <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            Extraction in Seconds
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Stop manual data entry. Upload PDFs, pay stubs, and tax returns to instantly extract structured data with 99.9% accuracy.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button onClick={onLogin} size="lg" className="h-14 px-8 text-lg shadow-xl shadow-blue-500/20">
                            Start Free Trial
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <button onClick={onLogin} className="text-slate-600 font-medium hover:text-slate-900 px-6 py-3">
                            View Demo
                        </button>
                    </div>
                </div>

                {/* Background Decor */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-12">
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-amber-500" />}
                            title="Flash Speed"
                            desc="Process generic loan documents in under 5 seconds using advanced parallel processing."
                        />
                        <FeatureCard
                            icon={<Shield className="w-6 h-6 text-green-500" />}
                            title="Bank-Grade Security"
                            desc="SOC2 compliant data handling. Your borrower data is encrypted at rest and in transit."
                        />
                        <FeatureCard
                            icon={<CheckCircle2 className="w-6 h-6 text-blue-500" />}
                            title="99% Accuracy"
                            desc="Powered by the latest LLMs to understand semantic context even in blurry scans."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-50 py-12 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
                    <p>&copy; 2025 Loantractor Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-600 leading-relaxed">{desc}</p>
        </div>
    )
}

import React, { useState } from 'react';
import { LayoutDashboard, FileText, Settings, LogOut, BrainCircuit, Menu, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabase';
import { AnimatePresence, motion } from 'framer-motion';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

import { useLocation } from 'react-router-dom';

// ... imports remain the same

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/': return 'Dashboard';
            case '/documents': return 'Documents';
            case '/settings': return 'Settings';
            default: return 'Overview';
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col text-slate-300 shadow-xl z-20 relative overflow-hidden">
                {/* Gradient background effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/20 pointer-events-none"></div>

                <div className="p-6 relative z-10">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
                        <BrainCircuit className="text-violet-500" size={28} />
                        Parseon
                    </h2>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4 relative z-10">
                    <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" to="/" />
                    <NavItem icon={<FileText size={20} />} label="Documents" to="/documents" />
                    <NavItem icon={<Settings size={20} />} label="Settings" to="/settings" />
                </nav>

                <div className="p-4 border-t border-slate-800 relative z-10">
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    >
                        <LogOut size={18} className="mr-2" />
                        Log Out
                    </Button>
                </div>
            </aside>

            {/* Mobile Navigation Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 md:hidden"
                        />

                        {/* Drawer */}
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col text-slate-300 shadow-2xl z-50 md:hidden"
                        >
                            <div className="p-6 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
                                    <BrainCircuit className="text-violet-500" size={28} />
                                    Parseon
                                </h2>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <nav className="flex-1 px-4 space-y-2 mt-4">
                                <NavItem
                                    icon={<LayoutDashboard size={20} />}
                                    label="Dashboard"
                                    to="/"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                />
                                <NavItem
                                    icon={<FileText size={20} />}
                                    label="Documents"
                                    to="/documents"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                />
                                <NavItem
                                    icon={<Settings size={20} />}
                                    label="Settings"
                                    to="/settings"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                />
                            </nav>

                            <div className="p-4 border-t border-slate-800">
                                <Button
                                    variant="ghost"
                                    onClick={handleLogout}
                                    className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                                >
                                    <LogOut size={18} className="mr-2" />
                                    Log Out
                                </Button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {/* Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 md:px-8 sticky top-0 z-10 transition-all">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="mr-4 p-2 -ml-2 rounded-md text-slate-500 hover:bg-slate-100 md:hidden"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex-1">
                        <h1 className="text-xl font-semibold text-slate-800">{getPageTitle()}</h1>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50/50 bg-grid-pattern relative">
                    {/* Fade overlay for grid at bottom if desired, but let's keep it simple for now */}
                    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, to, onClick }: { icon: React.ReactNode, label: string, to: string, onClick?: () => void }) {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) => cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
        >
            {({ isActive }) => (
                <>
                    <span className={cn("transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-violet-400")}>
                        {icon}
                    </span>
                    {label}
                </>
            )}
        </NavLink>
    )
}

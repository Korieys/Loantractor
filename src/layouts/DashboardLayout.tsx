import React from 'react';
import { LayoutDashboard, FileText, Settings, LogOut, BrainCircuit } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabase';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col text-slate-300 shadow-xl z-10">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
                        <BrainCircuit className="text-violet-500" size={28} />
                        Parseon
                    </h2>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" to="/" />
                    <NavItem icon={<FileText size={20} />} label="Documents" to="/documents" />
                    <NavItem icon={<Settings size={20} />} label="Settings" to="/settings" />
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
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {/* Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-6 md:px-8 sticky top-0 z-10">
                    <div className="flex-1">
                        <h1 className="text-xl font-semibold text-slate-800">Overview</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Add User Avatar or extra controls here later */}
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-6 md:p-8 bg-slate-50/50">
                    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, to }: { icon: React.ReactNode, label: string, to: string }) {
    return (
        <NavLink
            to={to}
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

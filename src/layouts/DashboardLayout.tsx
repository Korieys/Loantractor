import React from 'react';
import { LayoutDashboard, FileText, Settings, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                        Loantractor
                    </h2>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" to="/" />
                    <NavItem icon={<FileText size={20} />} label="Documents" to="/documents" />
                    <NavItem icon={<Settings size={20} />} label="Settings" to="/settings" />
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                        <LogOut size={18} className="mr-2" />
                        Log Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 md:px-8">
                    <h1 className="text-xl font-semibold text-slate-800">Overview</h1>
                </header>

                <div className="flex-1 overflow-auto p-6 md:p-8">
                    <div className="max-w-6xl mx-auto">
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
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
        >
            {icon}
            {label}
        </NavLink>
    )
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Users,
    Database,
    LogOut,
    Settings,
    CalendarDays,
    Cpu,
    BarChart2
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const sidebarItems = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Database", href: "/database", icon: Database },
    { title: "Algorithms", href: "/algorithms", icon: Cpu },
    { title: "Timetables", href: "/timetable", icon: CalendarDays },
    { title: "Reports", href: "/reports", icon: BarChart2 },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar - Ported from Frontend design */}
            <aside className="w-64 bg-black/40 backdrop-blur-3xl border-r border-white/10 h-screen fixed left-0 top-0 flex flex-col z-50 overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/5 -z-10 blur-3xl rounded-full translate-x-[-50%] translate-y-[-50%]" />

                <div className="p-8">
                    <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-indigo-200 to-purple-400 tracking-tighter">
                        MST <span className="text-white/20">|</span> PFE
                    </h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1 ml-0.5">Control Panel</p>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 mt-4">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative",
                                    isActive
                                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "w-5 h-5 transition-colors",
                                        isActive ? "text-indigo-400" : "text-gray-500 group-hover:text-white"
                                    )}
                                />
                                <span className="font-bold text-sm tracking-tight">{item.title}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-white/10 space-y-2 mt-auto">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 group">
                        <Settings className="w-5 h-5 text-gray-500 group-hover:text-white" />
                        <span className="font-bold text-sm">Settings</span>
                    </button>

                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 group">
                        <LogOut className="w-5 h-5 text-rose-500/70 group-hover:text-rose-400" />
                        <span className="font-bold text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 ml-64 min-h-screen">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}

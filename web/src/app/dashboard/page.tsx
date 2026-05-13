"use client";

import Header from "@/components/admin/Header";
import HeroFeaturedStat from "@/components/admin/HeroFeaturedStat";
import QuickActions from "@/components/admin/QuickActions";
import SidebarMiniStats from "@/components/admin/SidebarMiniStats";
import RecentActivity from "@/components/admin/RecentActivity";
import StatisticsChart from "@/components/admin/StatisticsChart";
import { motion } from "framer-motion";

export default function DashboardPage() {
    // Stats adjusted for Timetabling
    const stats = {
        totalTeachers: 231,
        newTeachers: 12,
        roomsCount: 115,
        sectionsCount: 42,
        modulesCount: 840,
        assignmentsCount: 1540
    };

    const activities = [
        {
            type: "db",
            title: "GI S4 Sync",
            desc: "22 assignments correctly linked via API",
            date: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
        },
        {
            type: "solver",
            title: "ILS-ALNS Stabilization",
            desc: "Optimal solution found with 0 hard violations",
            date: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        },
        {
            type: "export",
            title: "Excel Generation",
            desc: "Premium Timetable v2.4 successfully exported",
            date: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
        },
        {
            type: "db",
            title: "Data Backup",
            desc: "Manual export to CSV completed",
            date: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        }
    ];

    return (
        <div className="space-y-8 pb-20 max-w-6xl mx-auto">
            {/* Header - Ported Style */}
            <Header
                title="Dashboard Overview"
                description={`FST Marrakech Timetabling v2.4.0 — Welcome back to the orchestrator.`}
            />

            {/* Quick Actions - Ported Style */}
            <QuickActions />

            {/* Stats Grid - Ported Identical Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Hero Stat - Ported Style */}
                    <HeroFeaturedStat
                        count={stats.totalTeachers}
                        increase={stats.newTeachers}
                        label="Total Teachers"
                    />

                    {/* Recent Activity - Ported Style */}
                    <RecentActivity activities={activities} />
                </div>

                <div className="space-y-6">
                    {/* Sidebar Mini Stats - Ported Style */}
                    <SidebarMiniStats
                        roomsCount={stats.roomsCount}
                        sectionsCount={stats.sectionsCount}
                        modulesCount={stats.modulesCount}
                    />

                    {/* Chart Dynamique - Ported Style */}
                    <StatisticsChart
                        teachersCount={stats.totalTeachers}
                        roomsCount={stats.roomsCount}
                        sectionsCount={stats.sectionsCount}
                        assignmentsCount={stats.assignmentsCount}
                    />

                    {/* Algorithm Indicator Card */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl group-hover:blur-3xl transition-all" />
                        <h4 className="text-sm font-black uppercase tracking-[0.1em] text-indigo-300 mb-2">SBHH Optimization</h4>
                        <p className="text-xs text-white/70 leading-relaxed font-bold tracking-tight">
                            The RL Controller is actively monitoring pedagogical comfort.
                            Wednesday blocks are optimized at 98.4%.
                        </p>
                        <button className="mt-4 w-full py-2.5 rounded-xl bg-white text-indigo-900 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-white/10">
                            Trigger Optimization
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

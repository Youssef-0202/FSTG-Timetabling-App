"use client";

import { Briefcase, CheckCircle, FileText, XCircle } from "lucide-react";

type JobStats = {
    total: number;
    active: number;
    draft: number;
    closed: number;
};

type JobsStatsCardsProps = {
    stats: JobStats;
};

export function JobsStatsCards({ stats }: JobsStatsCardsProps) {
    const cards = [
        {
            title: "Total Jobs",
            value: stats.total,
            icon: Briefcase,
            gradient: "from-purple-500 to-purple-600",
            bgGlow: "bg-purple-500/20",
            iconBg: "bg-purple-500/20",
            iconColor: "text-purple-400",
        },
        {
            title: "Active",
            value: stats.active,
            icon: CheckCircle,
            gradient: "from-emerald-500 to-emerald-600",
            bgGlow: "bg-emerald-500/20",
            iconBg: "bg-emerald-500/20",
            iconColor: "text-emerald-400",
        },
        {
            title: "Draft",
            value: stats.draft,
            icon: FileText,
            gradient: "from-amber-500 to-amber-600",
            bgGlow: "bg-amber-500/20",
            iconBg: "bg-amber-500/20",
            iconColor: "text-amber-400",
        },
        {
            title: "Closed",
            value: stats.closed,
            icon: XCircle,
            gradient: "from-gray-500 to-gray-600",
            bgGlow: "bg-gray-500/20",
            iconBg: "bg-gray-500/20",
            iconColor: "text-gray-400",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-all duration-300"
                >
                    {/* Glow Effect */}
                    <div
                        className={`absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 ${card.bgGlow} rounded-full blur-2xl group-hover:scale-110 transition-transform`}
                    />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${card.iconBg}`}>
                                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-gray-400">{card.title}</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{card.value}</h3>
                    </div>
                </div>
            ))}
        </div>
    );
}

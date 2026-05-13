"use client";

import React from "react";

interface ActivityItem {
    type: "db" | "solver" | "export" | string;
    title: string;
    desc: string;
    date: Date | string;
}

interface RecentActivityProps {
    activities?: ActivityItem[];
}

export default function RecentActivity({
    activities = [],
}: RecentActivityProps) {
    const timeAgo = (dateInput: Date | string) => {
        const date = new Date(dateInput);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " min ago";
        return "Just now";
    };

    const getVisuals = (type: string) => {
        switch (type) {
            case "db":
                return { icon: "🗄️", bg: "bg-indigo-500/20" };
            case "solver":
                return { icon: "🧠", bg: "bg-purple-500/20" };
            case "export":
                return { icon: "📋", bg: "bg-emerald-500/20" };
            default:
                return { icon: "🔔", bg: "bg-white/10" };
        }
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />
            <h3 className="text-lg font-bold text-white mb-4 tracking-tight underline decoration-indigo-400/30 underline-offset-8">Recent System Logs</h3>

            <div className="space-y-3 relative z-10">
                {activities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm italic font-medium">
                        No system activity logs found.
                    </div>
                ) : (
                    activities.map((item, index) => {
                        const visual = getVisuals(item.type);

                        return (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${visual.bg} group-hover:scale-110 transition-transform`}>
                                        <span className="text-lg">{visual.icon}</span>
                                    </div>

                                    <div>
                                        <p className="text-sm text-white font-bold tracking-tight">
                                            {item.title}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{item.desc}</p>
                                    </div>
                                </div>

                                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded">
                                    {timeAgo(item.date)}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

"use client";

import Link from "next/link";
import { Users } from "lucide-react";

export default function HeroFeaturedStat({
    count = 0,
    increase = 0,
    label = "Total Teachers",
    href = "/database?tab=teachers"
}: {
    count: number;
    increase: number;
    label?: string;
    href?: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 backdrop-blur-xl p-8 h-[290px]">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <Users className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 font-medium">{label}</p>
                            <h3 className="text-4xl font-bold text-white tracking-tight">{count}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-sm text-emerald-400 flex items-center gap-1 font-bold">
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                                />
                            </svg>
                            +{increase} this week
                        </span>
                    </div>
                </div>

                <Link
                    href={href}
                    className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-bold transition-all inline-block w-fit"
                >
                    Manage Data →
                </Link>
            </div>
        </div>
    );
}

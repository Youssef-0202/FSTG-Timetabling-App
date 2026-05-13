"use client";

import { DoorOpen, GraduationCap, BookOpen } from "lucide-react";

export default function SidebarMiniStats({
    roomsCount = 0,
    sectionsCount = 0,
    modulesCount = 0,
}) {
    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400 mb-1 font-bold">Total Rooms</p>
                        <h4 className="text-2xl font-bold text-white tracking-tight">{roomsCount}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <DoorOpen className="text-purple-400 w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400 mb-1 font-bold">Sections (CM)</p>
                        <h4 className="text-2xl font-bold text-white tracking-tight">{sectionsCount}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <GraduationCap className="text-blue-400 w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400 mb-1 font-bold">Modules</p>
                        <h4 className="text-2xl font-bold text-white tracking-tight">{modulesCount}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <BookOpen className="text-emerald-400 w-5 h-5" />
                    </div>
                </div>
            </div>
        </div>
    );
}

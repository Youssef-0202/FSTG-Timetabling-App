"use client";

import { Database, Cpu, CalendarDays, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QuickActions() {
    const router = useRouter();

    const actions = [
        {
            icon: <Database className="w-5 h-5" />,
            title: "Base de Données",
            description: "Gérer Salles/Profs",
            color: "indigo",
            onClick: () => router.push("/database"),
        },
        {
            icon: <Cpu className="w-5 h-5" />,
            title: "Lancer Solveur",
            description: "Optimiser ILS-ALNS",
            color: "purple",
            onClick: () => router.push("/algorithms"),
        },
        {
            icon: <CalendarDays className="w-5 h-5" />,
            title: "Emploi du Temps",
            description: "Vue Interactive",
            color: "blue",
            onClick: () => router.push("/timetable"),
        },
        {
            icon: <BarChart3 className="w-5 h-5" />,
            title: "Rapports PFE",
            description: "Confort Pédagogique",
            color: "emerald",
            onClick: () => router.push("/reports"),
        },
    ];

    const getColorClasses = (color: string) => {
        const colors: any = {
            indigo: {
                bg: "bg-indigo-500/20",
                text: "text-indigo-400",
                hover: "hover:bg-indigo-500/30",
            },
            purple: {
                bg: "bg-purple-500/20",
                text: "text-purple-400",
                hover: "hover:bg-purple-500/30",
            },
            blue: {
                bg: "bg-blue-500/20",
                text: "text-blue-400",
                hover: "hover:bg-blue-500/30",
            },
            emerald: {
                bg: "bg-emerald-500/20",
                text: "text-emerald-400",
                hover: "hover:bg-emerald-500/30",
            },
        };
        return colors[color] || colors.indigo;
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />
            <h3 className="text-lg font-bold text-white mb-4 tracking-tight">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {actions.map((action, index) => {
                    const colors = getColorClasses(action.color);
                    return (
                        <button
                            key={index}
                            onClick={action.onClick}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 group text-left shadow-lg overflow-hidden relative"
                        >
                            <div className={`absolute top-0 right-0 w-16 h-16 ${colors.bg} blur-2xl opacity-0 group-hover:opacity-40 transition-opacity`} />
                            <div
                                className={`w-10 h-10 rounded-lg ${colors.bg} ${colors.hover} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform relative z-10`}
                            >
                                <div className={colors.text}>{action.icon}</div>
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1 tracking-tight">
                                {action.title}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest leading-none">{action.description}</p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

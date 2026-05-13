"use client";

export default function StatisticsChart({
    teachersCount = 0,
    roomsCount = 0,
    sectionsCount = 0,
    assignmentsCount = 0,
}) {
    const total = teachersCount + roomsCount + sectionsCount + assignmentsCount || 1;
    const getPercent = (val: number) => Math.round((val / total) * 100);

    const stats = [
        {
            label: "Teachers Registered",
            value: getPercent(teachersCount),
            count: `${teachersCount}`,
            color: "bg-indigo-500",
            lightColor: "bg-indigo-500/20",
        },
        {
            label: "Assignments (Total)",
            value: getPercent(assignmentsCount),
            count: `${assignmentsCount}`,
            color: "bg-purple-500",
            lightColor: "bg-purple-500/20",
        },
        {
            label: "Rooms Available",
            value: getPercent(roomsCount),
            count: `${roomsCount}`,
            color: "bg-blue-500",
            lightColor: "bg-blue-500/20",
        },
        {
            label: "Sections (CM/TD)",
            value: getPercent(sectionsCount),
            count: `${sectionsCount}`,
            color: "bg-emerald-500",
            lightColor: "bg-emerald-500/20",
        },
    ];

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />
            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-lg font-bold text-white tracking-tight">
                    📊 Platform Distribution
                </h3>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Resource Split</span>
            </div>
            <div className="space-y-5 relative z-10">
                {stats.map((stat, index) => (
                    <div key={index} className="group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-300 font-medium group-hover:text-white transition-colors">{stat.label}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-gray-500 font-bold tracking-tight">{stat.count}</span>
                                <span className="text-sm font-black text-white px-2 py-0.5 rounded bg-white/5">
                                    {stat.value}%
                                </span>
                            </div>
                        </div>
                        <div className={`w-full h-1.5 rounded-full ${stat.lightColor} overflow-hidden`}>
                            <div
                                className={`h-full rounded-full ${stat.color} transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(255,255,255,0.1)]`}
                                style={{ width: `${stat.value}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

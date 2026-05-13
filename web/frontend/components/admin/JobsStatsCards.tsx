type JobsStatsCardsProps = {
  activeCount: number;
  draftCount: number;
  closedCount: number;
};

export default function JobsStatsCards({
  activeCount,
  draftCount,
  closedCount,
}: JobsStatsCardsProps) {
  const stats = [
    {
      label: "Active Jobs",
      count: activeCount,
      icon: "📋",
      color: "emerald",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-400",
      borderColor: "border-emerald-500/20",
    },
    {
      label: "Draft Jobs",
      count: draftCount,
      icon: "📝",
      color: "amber",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-400",
      borderColor: "border-amber-500/20",
    },
    {
      label: "Closed Jobs",
      count: closedCount,
      icon: "🔒",
      color: "gray",
      bgColor: "bg-gray-500/10",
      textColor: "text-gray-400",
      borderColor: "border-gray-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`rounded-xl border ${stat.borderColor} ${stat.bgColor} backdrop-blur-sm p-4 hover:scale-105 transition-transform`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
              <h3 className={`text-3xl font-bold ${stat.textColor}`}>
                {stat.count}
              </h3>
            </div>
            <div className="text-4xl">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
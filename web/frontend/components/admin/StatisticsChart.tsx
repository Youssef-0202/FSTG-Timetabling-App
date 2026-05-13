export default function StatisticsChart({
  jobsCount = 0,
  companiesCount = 0,
  rhCount = 0,
  candidatesCount = 0,
}) {
  const total = jobsCount + companiesCount + rhCount + candidatesCount || 1;
  const getPercent = (val: number) => Math.round((val / total) * 100);

  const stats = [
    {
      label: "Jobs Posted",
      value: getPercent(jobsCount),
      count: `${jobsCount}`,
      color: "bg-indigo-500",
      lightColor: "bg-indigo-500/20",
    },
    {
      label: "Applications",
      value: 0,
      count: "N/A",
      color: "bg-purple-500",
      lightColor: "bg-purple-500/20",
    }, // Pas encore connecté
    {
      label: "Companies",
      value: getPercent(companiesCount),
      count: `${companiesCount}`,
      color: "bg-blue-500",
      lightColor: "bg-blue-500/20",
    },
    {
      label: "RH Users",
      value: getPercent(rhCount),
      count: `${rhCount}`,
      color: "bg-green-500",
      lightColor: "bg-green-500/20",
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          📊 Platform Overview
        </h3>
        <span className="text-xs text-gray-400">Total Distribution</span>
      </div>
      <div className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">{stat.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{stat.count}</span>
                <span className="text-sm font-semibold text-white">
                  {stat.value}%
                </span>
              </div>
            </div>
            <div className={`w-full h-2 rounded-full ${stat.lightColor}`}>
              <div
                className={`h-2 rounded-full ${stat.color} transition-all duration-500`}
                style={{ width: `${stat.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

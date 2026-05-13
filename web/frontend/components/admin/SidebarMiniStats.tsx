export default function SidebarMiniStats({
  rhCount = 0,
  candidatesCount = 0,
  openJobsCount = 0,
}) {
  return (
    <>
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">RH Users</p>
            <h4 className="text-2xl font-bold text-white">{rhCount}</h4>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <span className="text-purple-400 text-xl">👥</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Candidates</p>
            <h4 className="text-2xl font-bold text-white">{candidatesCount}</h4>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="text-blue-400 text-xl">🎓</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Open Jobs</p>
            <h4 className="text-2xl font-bold text-white">{openJobsCount}</h4>
          </div>
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <span className="text-green-400 text-xl">💼</span>
          </div>
        </div>
      </div>
    </>
  );
}

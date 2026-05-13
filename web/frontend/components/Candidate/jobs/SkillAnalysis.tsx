import { CheckCircle, XCircle, Star, AlertCircle } from "lucide-react";

export function SkillAnalysis({
  matchedSkills,
  missingSkills,
  matchScore,
}: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Star className="w-6 h-6 text-indigo-400" />
        AI Match Analysis
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Matched */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Matched Skills ({matchedSkills.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {matchedSkills.map((skill: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400 flex items-center gap-1.5"
              >
                <CheckCircle className="w-3 h-3" />
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Missing */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-orange-400" />
            Missing Skills ({missingSkills.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {missingSkills.length > 0 ? (
              missingSkills.map((skill: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-sm text-orange-400"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-sm text-green-400">
                All required skills matched!
              </span>
            )}
          </div>
        </div>
      </div>

      {matchScore < 70 && (
        <div className="mt-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-yellow-200">
            Your match score is below 70%. We recommend customizing your cover
            letter to highlight transferable skills.
          </p>
        </div>
      )}
    </div>
  );
}

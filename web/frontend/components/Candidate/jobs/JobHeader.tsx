import {
  MapPin,
  Building2,
  Briefcase,
  DollarSign,
  Clock,
  Users,
  Star,
} from "lucide-react";

export function JobHeader({ job, hasCV }: { job: any; hasCV: boolean }) {
  const formatDate = (date: Date) => {
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days < 7 ? `${days} days ago` : new Date(date).toLocaleDateString();
  };

  // CORRECTION ICI : On extrait le nom de l'entreprise proprement
  const companyName =
    typeof job.company === "object" ? job.company.name : job.company;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold text-white">{job.title}</h1>

          <div className="flex flex-wrap items-center gap-6 text-gray-400">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              {/* Utilisation de la variable corrigée companyName */}
              <span className="text-white font-medium">{companyName}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              <span>{job.jobType}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
            {job.salary && (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span>{job.salary}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Posted {formatDate(job.postedAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Users className="w-4 h-4 text-purple-400" />
              <span>{job.applicants} applicants</span>
            </div>
          </div>
        </div>

        {hasCV && (
          <div className="w-full md:w-auto bg-white/5 border border-white/10 rounded-xl p-6 text-center backdrop-blur-sm">
            <p className="text-sm text-gray-400 mb-2">Match Score</p>
            <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
              {job.matchScore}%
            </div>
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(job.matchScore / 20)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Job } from "@/types/job";
import {
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Users,
  Clock,
  Building2,
} from "lucide-react";
import { useState } from "react";

type JobCardProps = {
  job: Job;
  onView?: (job: Job) => void;
  onEdit?: (job: Job) => void;
  onDelete?: (jobId: string) => void;
};

export function JobCard({ job, onView, onEdit, onDelete }: JobCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Helper: Salary Formatting (k notation)
  // CORRECTION ICI : Ajout de "| undefined" pour accepter les propriétés optionnelles
  const formatSalary = (
    min: string | number | null | undefined,
    max: string | number | null | undefined
  ) => {
    if (!min && !max) return "Not specified"; // Vérification simplifiée pour null/undefined/0/""

    // Conversion sécurisée
    const minVal = typeof min === "string" ? parseFloat(min) : min || 0;
    const maxVal = typeof max === "string" ? parseFloat(max) : max || 0;

    // English locale formatting for currency
    return `${(minVal / 1000).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    })}k - ${(maxVal / 1000).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    })}k`;
  };

  // Helper: Status Styles & Labels (English)
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          label: "Active",
          classes:
            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
          dot: "bg-emerald-400",
        };
      case "draft":
        return {
          label: "Draft",
          classes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          dot: "bg-amber-400",
        };
      case "closed":
        return {
          label: "Closed",
          classes: "bg-slate-500/10 text-slate-400 border-slate-500/20",
          dot: "bg-slate-400",
        };
      default:
        return {
          label: status,
          classes: "bg-gray-500/10 text-gray-400 border-gray-500/20",
          dot: "bg-gray-400",
        };
    }
  };

  const statusConfig = getStatusConfig(job.status);
  // Safety check for skills array
  const skillsList = job.required_skills || [];

  // Date formatting for English
  const formattedDate = new Date(job.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="group relative flex flex-col justify-between bg-gradient-to-br from-[#121212] to-[#0a0a0a] border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-transparent hover:ring-2 hover:ring-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1 overflow-hidden">
      {/* Subtle background glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-violet-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* --- HEADER --- */}
      <div className="relative flex justify-between items-start mb-6">
        <div className="flex gap-4 max-w-[85%]">
          {/* Company Logo / Placeholder */}
          <div className="relative flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
            {job.company_logo ? (
              <img
                src={job.company_logo}
                alt={job.company_name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <span className="text-xl font-bold text-white">
                {(job.company_name || "Co").substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="overflow-hidden">
            <h3 className="font-bold text-white text-xl leading-tight truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-violet-400 transition-all">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-400">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{job.company_name}</span>
            </div>
          </div>
        </div>

        {/* Action Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 -mr-2 -mt-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Job actions"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-xl shadow-black/50 z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => {
                    onView?.(job);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <Eye className="w-4 h-4 text-indigo-400" /> View Details
                </button>
                <button
                  onClick={() => {
                    onEdit?.(job);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <Edit className="w-4 h-4 text-blue-400" /> Edit Job
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button
                  onClick={() => {
                    onDelete?.(job.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-3 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete Job
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- INFO GRID (Colored Metrics) --- */}
      <div className="relative grid grid-cols-2 gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-300 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
          <Briefcase className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="truncate">{job.job_type}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300 bg-pink-500/5 p-3 rounded-xl border border-pink-500/10 hover:bg-pink-500/10 transition-colors">
          <MapPin className="w-4 h-4 text-pink-400 flex-shrink-0" />
          <span className="truncate">{job.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors">
          <DollarSign className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="truncate">
            {formatSalary(job.salary_min, job.salary_max)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 hover:bg-amber-500/10 transition-colors">
          <Users className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="truncate">
            {job.total_applications || 0} Candidates
          </span>
        </div>
      </div>

      {/* --- SKILLS --- */}
      <div className="relative mb-6 flex-grow">
        <div className="flex flex-wrap gap-2">
          {skillsList.length > 0 ? (
            skillsList.slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-gray-300 hover:bg-white/10 hover:border-white/20 transition-colors cursor-default"
              >
                {/* Gestion mixte string/objet pour compatibilité */}
                {typeof skill === "string" ? skill : (skill as any).name}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-500 italic">
              No specific skills required
            </span>
          )}
          {skillsList.length > 3 && (
            <span className="px-3 py-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300">
              +{skillsList.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="relative flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-4">
          {/* Status Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${statusConfig.classes}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${statusConfig.dot} animate-pulse shadow-sm`}
            />
            {statusConfig.label}
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Posted {formattedDate}</span>
          </div>
        </div>

        <button
          onClick={() => onView?.(job)}
          className="group/btn flex items-center gap-1 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          View Details
          <span className="inline-block transition-transform group-hover/btn:translate-x-1">
            &rarr;
          </span>
        </button>
      </div>
    </div>
  );
}

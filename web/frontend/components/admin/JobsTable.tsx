"use client";

import { Fragment, useState } from "react";
import {
  Building,
  MapPin,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
} from "lucide-react";
// On utilise 'any' pour accepter les données enrichies (skills) venant de la page Admin
import { Job } from "@/types/job";

type JobsTableProps = {
  jobs: any[];
  onEdit?: (job: any) => void;
  onView?: (job: any) => void;
  onDelete?: (jobId: string) => void;
};

export default function JobsTable({
  jobs,
  onEdit,
  onView,
  onDelete,
}: JobsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const getStatusStyles = (status: string) => {
    const s = status ? status.toLowerCase() : "";
    switch (s) {
      case "active":
        return {
          bg: "bg-emerald-500/10",
          text: "text-emerald-400",
          border: "border-emerald-500/20",
          dot: "bg-emerald-500",
        };
      case "draft":
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/20",
          dot: "bg-amber-500",
        };
      case "closed":
        return {
          bg: "bg-gray-500/10",
          text: "text-gray-400",
          border: "border-gray-500/20",
          dot: "bg-gray-500",
        };
      default:
        return {
          bg: "bg-gray-500/10",
          text: "text-gray-400",
          border: "border-gray-500/20",
          dot: "bg-gray-500",
        };
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Not specified";
    if (min && !max) return `>${(min / 1000).toFixed(0)}k`;
    if (!min && max) return `<${(max / 1000).toFixed(0)}k`;
    return `$${(min! / 1000).toFixed(0)}k - $${(max! / 1000).toFixed(0)}k`;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                Job Title
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                Company
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                Location
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                Status
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                Salary
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                Type
              </th>
              <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {jobs.map((job) => {
              const statusStyle = getStatusStyles(job.status);
              const isExpanded = expandedRow === job.id;

              return (
                <Fragment key={job.id}>
                  <tr
                    className="group hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setExpandedRow(isExpanded ? null : job.id)}
                  >
                    {/* Job Title & Skills */}
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-white">
                          {job.title}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {job.skills
                            ?.slice(0, 2)
                            .map((skill: any) => skill.name)
                            .join(", ")}
                          {job.skills &&
                            job.skills.length > 2 &&
                            ` +${job.skills.length - 2}`}
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Building className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm truncate max-w-[120px]">
                          {job.company_name || job.company_id || "N/A"}
                        </span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-300">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm truncate max-w-[100px]">
                          {job.location}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                        />
                        {job.status}
                      </span>
                    </td>

                    {/* Salary */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-300">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-sm">
                          {formatSalary(job.salary_min, job.salary_max)}
                        </span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-300 capitalize">
                        {job.job_type?.replace("_", " ")}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()} // Empêche l'ouverture de la ligne
                      >
                        {onView && (
                          <button
                            onClick={() => onView(job)}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(job)}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                            title="Edit Job"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            // ICI : On délègue la suppression au parent (AdminJobsPage)
                            // Le parent se chargera d'ouvrir la Modale de Confirmation
                            onClick={() => onDelete(job.id)}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete Job"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row - Skills Details */}
                  {isExpanded && (
                    <tr className="bg-white/5 border-b border-white/5 animate-in fade-in duration-200">
                      <td colSpan={7} className="py-4 px-6">
                        <div className="space-y-3 pl-4 border-l-2 border-indigo-500/50">
                          {/* Skills List */}
                          <div>
                            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                              Required Skills
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {job.skills && job.skills.length > 0 ? (
                                job.skills.map((skill: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 flex items-center gap-1"
                                  >
                                    {skill.name}
                                    {skill.level && skill.level !== "N/A" && (
                                      <span className="text-[10px] opacity-60 ml-1">
                                        ({skill.level})
                                      </span>
                                    )}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-500 italic">
                                  No specific skills listed.
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          {job.description && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                Description
                              </h4>
                              <p className="text-sm text-gray-300 line-clamp-3">
                                {job.description}
                              </p>
                            </div>
                          )}

                          {/* Footer Info */}
                          <div className="flex gap-4 text-xs text-gray-500 pt-2">
                            <span>
                              Created:{" "}
                              {new Date(job.created_at).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span>
                              {job.total_applications || 0} Applicants
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {jobs.length === 0 && (
        <div className="text-center py-12 text-gray-400 flex flex-col items-center">
          <div className="bg-white/5 p-4 rounded-full mb-3">
            <AlertCircle className="w-6 h-6 text-gray-500" />
          </div>
          <p className="font-medium">No jobs found.</p>
          <p className="text-sm mt-1 text-gray-500">
            Try adjusting your filters or create a new job.
          </p>
        </div>
      )}
    </div>
  );
}

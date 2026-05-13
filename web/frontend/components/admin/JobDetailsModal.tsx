"use client";

import { useState } from "react";
import {
  X,
  Building,
  MapPin,
  DollarSign,
  Briefcase,
  Calendar,
  Users,
  AlertTriangle,
  Archive,
  Trash2,
} from "lucide-react";
// On garde 'any' pour la flexibilité (accepte les objets enrichis du tableau ou bruts de l'API)

import { Job } from "@/types/job";

type JobDetailsModalProps = {
  job: any | null;
  isOpen: boolean;
  onClose: () => void;
  // Callback qui accepte l'ID et le booléen 'permanent'
  onDelete?: (jobId: string, permanent: boolean) => void;
};

export default function JobDetailsModal({
  job,
  isOpen,
  onClose,
  onDelete,
}: JobDetailsModalProps) {
  // États pour l'interface de suppression
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPermanent, setIsPermanent] = useState(false);

  if (!isOpen || !job) return null;

  const handleClose = () => {
    setIsDeleting(false);
    setIsPermanent(false);
    onClose();
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Not specified";
    if (min && !max) return `From $${(min / 1000).toFixed(0)}k`;
    if (!min && max) return `Up to $${(max / 1000).toFixed(0)}k`;
    return `$${(min! / 1000).toFixed(0)}k - $${(max! / 1000).toFixed(0)}k`;
  };

  const getStatusStyles = (status: string) => {
    const s = status ? status.toLowerCase() : "";
    switch (s) {
      case "active":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "draft":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "closed":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      // On passe l'état de la checkbox au parent
      onDelete(job.id, isPermanent);
      handleClose();
    }
  };

  // Logique pour normaliser l'affichage des compétences
  // Gère le cas où l'objet vient du tableau (objets) ou de l'API brute (strings)
  const displaySkills =
    job.skills && job.skills.length > 0
      ? job.skills
      : job.required_skills?.map((s: string) => ({
          name: s,
          level: "N/A",
          mandatory: false,
        })) || [];

  return (
    <>
      {/* Backdrop (Fond flouté) */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="custom-scrollbar bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-in zoom-in-95 duration-200 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-white/10 p-6 flex items-start justify-between z-20">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">{job.title}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyles(
                    job.status
                  )}`}
                >
                  {job.status}
                </span>
              </div>
              <p className="text-gray-400 text-sm">Job Details & Information</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content (Scrollable) */}
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Grid Informations */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Building className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">
                    Company
                  </span>
                </div>
                <p className="text-white font-medium">
                  {job.company_name || job.company_id || "N/A"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">
                    Salary
                  </span>
                </div>
                <p className="text-white font-medium">
                  {formatSalary(job.salary_min, job.salary_max)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">
                    Location
                  </span>
                </div>
                <p className="text-white font-medium">{job.location}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="w-5 h-5 text-purple-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">
                    Type
                  </span>
                </div>
                <p className="text-white font-medium capitalize">
                  {job.job_type}
                </p>
              </div>
            </div>

            {/* Description */}
            {job.description && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">
                  Description
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>
            )}

            {/* Skills */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {displaySkills.map((s: any, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-white/10 rounded-lg text-sm text-gray-300 flex items-center gap-2"
                  >
                    {s.name}
                    {s.mandatory && (
                      <span className="text-red-400 font-bold">*</span>
                    )}
                    {s.level && s.level !== "N/A" && (
                      <span className="text-xs text-gray-500 opacity-60">
                        ({s.level})
                      </span>
                    )}
                  </span>
                ))}
                {displaySkills.length === 0 && (
                  <span className="text-gray-500 text-sm italic">
                    No skills specified
                  </span>
                )}
              </div>
            </div>

            {/* Dates & Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">
                    Posted
                  </span>
                </div>
                <p className="text-white font-medium">
                  {job.created_at
                    ? new Date(job.created_at).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-pink-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">
                    Applicants
                  </span>
                </div>
                <p className="text-white font-medium">
                  {job.total_applications || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Footer (Zone d'action dynamique) */}
          <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur border-t border-white/10 p-6 z-20">
            {!isDeleting ? (
              // --- MODE NORMAL ---
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors"
                >
                  Close
                </button>
                {onDelete && (
                  <button
                    onClick={() => setIsDeleting(true)}
                    className="px-6 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Job
                  </button>
                )}
              </div>
            ) : (
              // --- MODE CONFIRMATION ---
              <div className="flex flex-col gap-4 bg-red-500/5 rounded-xl p-4 border border-red-500/10 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-white font-medium">Delete this job?</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      {isPermanent
                        ? "This action is irreversible. The job and all related data (applications, skills) will be destroyed."
                        : "The job will be archived (Soft Delete). It will be hidden but can be restored by an admin."}
                    </p>
                  </div>
                </div>

                {/* Checkbox Permanent */}
                <div className="ml-8">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={isPermanent}
                        onChange={(e) => setIsPermanent(e.target.checked)}
                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-500 bg-gray-800 checked:border-red-500 checked:bg-red-500 transition-all"
                      />
                      <svg
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-sm text-gray-400 group-hover:text-red-300 transition-colors">
                      Permanently delete from database
                    </span>
                  </label>
                </div>

                {/* Boutons de confirmation */}
                <div className="flex items-center justify-end gap-3 mt-2">
                  <button
                    onClick={() => {
                      setIsDeleting(false);
                      setIsPermanent(false);
                    }}
                    className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className={`px-6 py-2 rounded-lg text-white font-medium shadow-lg transition-all flex items-center gap-2 ${
                      isPermanent
                        ? "bg-red-600 hover:bg-red-700 shadow-red-900/20"
                        : "bg-orange-600 hover:bg-orange-700 shadow-orange-900/20"
                    }`}
                  >
                    {isPermanent ? (
                      <Trash2 className="w-4 h-4" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                    {isPermanent ? "Confirm Permanent Delete" : "Archive Job"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

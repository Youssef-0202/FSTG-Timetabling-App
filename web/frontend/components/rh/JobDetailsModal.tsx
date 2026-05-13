"use client";


import { Candidate, getCandidatesForJob } from "@/lib/mockData/candidates";


import { Job } from "@/types/job";     
import { jobsApi } from "@/lib/api/jobs"; 

import {
  X,
  MapPin,
  DollarSign,
  Briefcase,
  Calendar,
  Users,
  Award,
  TrendingUp,
  Eye,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ApplicationReviewModal } from "./ApplicationReviewModal";
// import { addToQueue } from "@/lib/candidateQueue"; // Pas utilisé dans ce code, mais je le laisse si besoin

type JobDetailsModalProps = {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
};

export function JobDetailsModal({
  job,
  isOpen,
  onClose,
}: JobDetailsModalProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // On continue d'utiliser le mock pour les candidats
      const jobCandidates = getCandidatesForJob(job.id);
      setCandidates(jobCandidates);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, job.id]);

  if (!isOpen) return null;

  const getStatusStyles = (status: string) => {
    // Normalisation au cas où le backend renvoie des majuscules (ex: "ACTIVE")
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case "active":
        return {
          bg: "bg-emerald-500/10",
          text: "text-emerald-400",
          border: "border-emerald-500/20",
        };
      case "draft":
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/20",
        };
      case "closed":
        return {
          bg: "bg-gray-500/10",
          text: "text-gray-400",
          border: "border-gray-500/20",
        };
      default:
        return {
          bg: "bg-gray-500/10",
          text: "text-gray-400",
          border: "border-gray-500/20",
        };
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 80) return "text-blue-400";
    if (score >= 70) return "text-amber-400";
    return "text-gray-400";
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 90) return "bg-emerald-500/20";
    if (score >= 80) return "bg-blue-500/20";
    if (score >= 70) return "bg-amber-500/20";
    return "bg-gray-500/20";
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min || !max) return "Not specified";
    return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
  };

  const statusStyle = getStatusStyles(job.status);

  if (typeof document === "undefined") return null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-7xl h-[90vh] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {/* Utilisation de company_name si disponible, sinon les 2 premières lettres de company_id */}
                  {job.company_name
                    ? job.company_name.substring(0, 2).toUpperCase()
                    : job.company_id.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{job.title}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-400">
                      {job.company_name || job.company_id}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      {job.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content - Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 h-[calc(90vh-88px)]">
              {/* Left Column - Job Details */}
              <div className="p-6 overflow-y-auto border-r border-white/10 bg-white/[0.02]">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-medium">Location</span>
                      </div>
                      <p className="text-white font-semibold">{job.location}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Briefcase className="w-4 h-4" />
                        <span className="text-xs font-medium">Type</span>
                      </div>
                      <p className="text-white font-semibold">{job.job_type}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-medium">Salary</span>
                      </div>
                      <p className="text-white font-semibold">
                        {formatSalary(job.salary_min, job.salary_max)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-medium">Applicants</span>
                      </div>
                      <p className="text-white font-semibold">
                        {candidates.length}
                        {/* Optionnel : Utiliser job.total_applications du backend si vous préférez */}
                      </p>
                    </div>
                  </div>

                  {/* ... après la grid des détails (salary, location...) ... */}

                  {/* SECTION DESCRIPTION */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-purple-400" />
                      Job Description
                    </h3>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                        {job.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  {/* ... avant la section Required Skills ... */}

                  {/* Skills Section - ADAPTÉ POUR STRING ARRAY */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      Required Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {job.required_skills && job.required_skills.length > 0 ? (
                        job.required_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-2 rounded-lg border text-sm font-medium bg-white/5 border-white/10 text-gray-300"
                          >
                            {/* Le backend renvoie juste un string, plus d'objet complexe pour l'instant */}
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">
                          No specific skills listed.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Posted on{" "}
                      {new Date(job.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column - Candidates List (RESTE EN MOCK DATA) */}
              <div className="p-6 overflow-y-auto bg-white/[0.01]">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Candidates ({candidates.length})
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Sorted by AI match score (highest to lowest)
                  </p>
                </div>

                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {candidate.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                              {candidate.name}
                            </h4>
                            <p className="text-sm text-gray-400 truncate">
                              {candidate.currentRole}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {candidate.experience} exp
                              </span>
                              <span className="text-gray-600">•</span>
                              <span className="text-xs text-gray-500">
                                {candidate.location}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {candidate.skills
                                .slice(0, 3)
                                .map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              {candidate.skills.length > 3 && (
                                <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400 text-xs">
                                  +{candidate.skills.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${getMatchScoreBg(
                              candidate.matchScore
                            )}`}
                          >
                            <TrendingUp
                              className={`w-4 h-4 ${getMatchScoreColor(candidate.matchScore)}`}
                            />
                            <span
                              className={`font-bold text-lg ${getMatchScoreColor(candidate.matchScore)}`}
                            >
                              {candidate.matchScore}%
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCandidate(candidate);
                              setIsReviewModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/30 text-xs font-medium transition-all"
                          >
                            <Eye className="w-3 h-3 inline-block mr-1" />
                            Review
                          </button>
                          <span className="text-xs text-gray-500">
                            {new Date(
                              candidate.appliedDate
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {candidates.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No candidates yet</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Applications will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Application Review Modal */}
      {selectedCandidate && (
        <ApplicationReviewModal
          candidate={selectedCandidate}
          jobId={job.id}
          jobTitle={job.title}
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedCandidate(null);
          }}
          onAccept={(candidateId) => {
            console.log("Accepted candidate:", candidateId);
            const updatedCandidates = getCandidatesForJob(job.id);
            setCandidates(updatedCandidates);
          }}
          onReject={(candidateId) => {
            console.log("Rejected candidate:", candidateId);
            const updatedCandidates = getCandidatesForJob(job.id);
            setCandidates(updatedCandidates);
          }}
          onShortlist={(candidateId) => {
            console.log("Added to shortlist:", candidateId);
          }}
        />
      )}
    </>
  );
}

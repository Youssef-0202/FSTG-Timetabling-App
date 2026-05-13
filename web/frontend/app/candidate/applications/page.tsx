"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Briefcase,
  MapPin,
  Clock,
  Building2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  Sparkles,
} from "lucide-react";

import { useApplications } from "@/lib/hooks/useAPI";

// =====================================
// CONFIGURATION DES STATUS AMÉLIORÉE
// =====================================
const statusConfig: Record<string, any> = {
  pending: {
    label: "Pending",
    icon: Clock,
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    textColor: "text-yellow-400",
    glowColor: "shadow-yellow-500/20",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle,
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    textColor: "text-green-400",
    glowColor: "shadow-green-500/20",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    textColor: "text-red-400",
    glowColor: "shadow-red-500/20",
  },
};

export default function ApplicationsPage() {
  const { data: applications, loading, error, refetch } = useApplications();

  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("date");

  // NOTE: J'ai retiré le bloc "const stats = useMemo..." ici car il n'est plus utilisé.

  const filteredApplications = useMemo(() => {
    let filtered =
      applications?.filter(
        (app) => !statusFilter || app.status === statusFilter
      ) || [];

    if (sortBy === "date") {
      filtered.sort(
        (a, b) =>
          new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
      );
    } else if (sortBy === "score") {
      filtered.sort(
        (a, b) =>
          (b.matchScore?.overall_score || 0) -
          (a.matchScore?.overall_score || 0)
      );
    }

    return filtered;
  }, [applications, statusFilter, sortBy]);

  const formatDate = (date: Date | string) => {
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center animate-fadeIn">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse" />
            <Loader2 className="w-12 h-12 text-white animate-spin absolute top-2 left-1/2 -translate-x-1/2" />
          </div>
          <p className="text-gray-400">Loading your applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto animate-fadeIn">
        <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-orange-500/10 p-8 text-center backdrop-blur-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-white mb-2">
            Unable to Load Applications
          </h3>
          <p className="text-gray-400 mb-6">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header et Filtres */}
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-200">
              My Applications
            </h2>
            <p className="text-gray-400 mt-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Track your job application journey
            </p>
          </div>
        </div>

        {/* NOTE: J'ai retiré la section <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> ici */}

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 [&>option]:bg-gray-900 transition-all"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 [&>option]:bg-gray-900 transition-all"
          >
            <option value="date">Sort by Date</option>
            <option value="score">Sort by Score</option>
          </select>

          {(statusFilter || sortBy !== "date") && (
            <button
              onClick={() => {
                setStatusFilter("");
                setSortBy("date");
              }}
              className="ml-auto px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Liste des candidatures */}
      {!filteredApplications || filteredApplications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-16 text-center backdrop-blur-sm animate-fadeIn">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            No Applications Found
          </h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            {(applications?.length || 0) > 0
              ? "No applications match your current filters. Try adjusting them."
              : "Start your journey by applying to jobs that match your profile"}
          </p>
          {(applications?.length || 0) === 0 && (
            <Link
              href="/candidate/jobs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
            >
              <Briefcase className="w-5 h-5" />
              Browse Jobs
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application, index) => {
            const statusInfo = statusConfig[application.status];
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={application.id}
                className="group relative animate-slideUp"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-purple-500/0 to-indigo-500/0 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-all duration-500" />

                <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 backdrop-blur-sm hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/candidate/applications/${application.id}`}
                          className="group/link"
                        >
                          <h3 className="text-xl font-semibold text-white group-hover/link:text-indigo-400 transition-colors flex items-center gap-2 mb-2">
                            <span className="truncate">
                              {application.job.title}
                            </span>
                            <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </h3>
                        </Link>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                          <div className="flex items-center gap-1.5 group-hover:text-gray-300 transition-colors">
                            <Building2 className="w-4 h-4" />
                            <span className="font-medium">
                              {application.job.company.name}
                            </span>
                          </div>
                          <span className="text-gray-600">•</span>
                          <div className="flex items-center gap-1.5 group-hover:text-gray-300 transition-colors">
                            <MapPin className="w-4 h-4" />
                            <span>{application.job.location}</span>
                          </div>
                        </div>
                      </div>

                      {application.matchScore && (
                        <div className="relative group/score">
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg blur-lg opacity-0 group-hover/score:opacity-100 transition-all duration-300" />
                          <div className="relative text-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20 px-4 py-3 rounded-lg border border-indigo-500/30 flex-shrink-0 backdrop-blur-sm">
                            <div className="text-2xl font-bold text-indigo-400 mb-1">
                              {Math.round(application.matchScore.overall_score)}
                              %
                            </div>
                            <p className="text-xs text-gray-400">Match</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                          <Clock className="w-4 h-4" />
                          <span>
                            Applied {formatDate(application.applied_at)}
                          </span>
                        </div>

                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.textColor} border flex items-center gap-1.5 ${statusInfo.glowColor} shadow-lg transition-all duration-300 hover:scale-105`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>

                        <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all duration-300">
                          {application.job.job_type}
                        </span>
                      </div>

                      <Link
                        href={`/candidate/applications/${application.id}`}
                        className="text-indigo-400 hover:text-indigo-300 font-medium text-sm flex items-center gap-1 transition-all hover:gap-2"
                      >
                        View Details
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

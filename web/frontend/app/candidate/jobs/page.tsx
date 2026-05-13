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
  Search,
  Filter,
  Sparkles,
  Zap,
  X,
} from "lucide-react";

import { useJobs } from "@/lib/hooks/useAPI";

export default function JobsListPage() {
  const { data: jobs, loading, error, refetch } = useJobs();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filteredJobs = useMemo(() => {
    return (
      jobs?.filter((job) => {
        const matchesSearch =
          !searchQuery ||
          job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.skills?.some((s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
          );

        const matchesType = !typeFilter || job.job_type === typeFilter;

        return matchesSearch && matchesType;
      }) || []
    );
  }, [jobs, searchQuery, typeFilter]);

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
          <p className="text-gray-400">Finding the best opportunities...</p>
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
            Unable to Load Jobs
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
      {/* Header */}
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-200">
            Explore Jobs
          </h2>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            {filteredJobs.length} opportunities waiting for you
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs, skills, companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />

          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 [&>option]:bg-gray-900 transition-all"
          >
            <option value="">All Job Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>

          {(searchQuery || typeFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("");
              }}
              className="ml-auto px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Liste des Jobs */}
      {!filteredJobs || filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-16 text-center backdrop-blur-sm animate-fadeIn">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No Jobs Found</h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Try adjusting your search or filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setTypeFilter("");
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all hover:scale-105 active:scale-95"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job, index) => {
            return (
              <div
                key={job.id}
                className="group relative animate-slideUp"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-purple-500/0 to-indigo-500/0 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-all duration-500" />

                <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 backdrop-blur-sm hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/candidate/jobs/${job.id}`}
                          className="group/link"
                        >
                          <h3 className="text-xl font-semibold text-white group-hover/link:text-indigo-400 transition-colors flex items-center gap-2 mb-2">
                            <span className="truncate">{job.title}</span>
                            <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </h3>
                        </Link>

                        {/* =================================================== */}
                        {/* INFORMATIONS COLORÉES (BADGES) SANS LE SCORE       */}
                        {/* =================================================== */}
                        <div className="flex flex-wrap items-center gap-2 text-sm mt-3">
                          {/* Entreprise - Violet */}
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                            <Building2 className="w-3.5 h-3.5" />
                            <span className="font-medium">
                              {job.company.name}
                            </span>
                          </div>

                          {/* Lieu - Vert Émeraude */}
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{job.location}</span>
                          </div>

                          {/* Type - Bleu */}
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>{job.job_type}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section Skills */}
                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {job.skills.slice(0, 5).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs rounded-md bg-white/5 text-gray-400 border border-white/5 group-hover:bg-white/10 transition-all"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-3">
                        {/* Date - Orange/Ambre */}
                        <div className="flex items-center gap-2 text-sm px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300/90">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Posted {formatDate(job.created_at)}</span>
                        </div>

                        {/* Badge New */}
                        {new Date(job.created_at) >
                          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-medium">
                            <Zap className="w-3 h-3" />
                            New
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/candidate/jobs/${job.id}`}
                        className="text-indigo-400 hover:text-indigo-300 font-medium text-sm flex items-center gap-1 transition-all hover:gap-2 group-hover:translate-x-1"
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

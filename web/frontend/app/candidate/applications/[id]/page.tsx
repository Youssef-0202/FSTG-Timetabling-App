"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Calendar,
  Star,
  Clock,
  Building2,
  DollarSign,
  CheckCircle,
  XCircle,
  MessageSquare,
  ExternalLink,
  Download,
  Mail,
  Phone,
  AlertCircle,
  Trash2,
  Loader2,
} from "lucide-react";

import { useApplication } from "@/lib/hooks/useAPI";

// Configuration visuelle des statuts
const statusConfig: Record<string, any> = {
  pending: {
    label: "Pending Review",
    icon: Clock,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    description: "Your application is waiting to be reviewed",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    description: "Congratulations! Your application has been accepted",
  },
  rejected: {
    label: "Not Selected",
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    description: "Unfortunately, you were not selected for this position",
  },
  reviewed: {
    label: "Reviewed",
    icon: Star,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    description: "Your application has been reviewed by the hiring team",
  },
  interview: {
    label: "Interview Scheduled",
    icon: Calendar,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    description: "An interview has been scheduled",
  },
};

const timelineStatusIcons: Record<string, any> = {
  submitted: CheckCircle,
  received: Mail,
  reviewed: Star,
  interview: Calendar,
  rejected: XCircle,
  accepted: CheckCircle,
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const { data: application, loading, error } = useApplication(applicationId);

  // Format dates
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleWithdraw = () => {
    if (confirm("Are you sure you want to withdraw this application?")) {
      // TODO: Implement API call to withdraw application
      alert("Application withdrawn successfully");
      router.push("/candidate/applications");
    }
  };

  // État de chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading application details...</p>
        </div>
      </div>
    );
  }

  // État d'erreur ou application non trouvée
  if (error || !application) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Application Not Found
          </h2>
          <p className="text-gray-400 mb-6">
            {error?.message ||
              "This application may have been removed or does not exist."}
          </p>
          <button
            onClick={() => router.push("/candidate/applications")}
            className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[application.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  // Calcul des compétences matchées et manquantes
  const candidateSkills = application.resume?.parsed_text
    ? JSON.parse(application.resume.parsed_text).skills || []
    : [];
  const jobSkills = application.job.skills?.map((s: any) => s.name) || [];
  const matchedSkills = candidateSkills.filter((s: string) =>
    jobSkills.includes(s)
  );
  const missingSkills = jobSkills.filter(
    (s: string) => !candidateSkills.includes(s)
  );

  // Timeline par défaut si non fournie
  const timeline = application.timeline || [
    {
      status: "submitted",
      title: "Application Submitted",
      description: "Your application has been successfully submitted",
      date: application.applied_at,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Applications
      </button>

      {/* Header Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="space-y-6">
          {/* Title & Status */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h1 className="text-3xl font-bold text-white">
                  {application.job.title}
                </h1>
                <span
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.bg} ${statusInfo.border} ${statusInfo.color}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusInfo.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-gray-400">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-500" />
                  <span className="font-semibold text-lg text-gray-200">
                    {application.job.company.name}
                  </span>
                </div>
                <span className="text-gray-600">•</span>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <span>{application.job.location}</span>
                </div>
              </div>
            </div>

            {/* Match Score */}
            {application.matchScore && (
              <div className="text-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-6 rounded-xl border border-indigo-500/30">
                <p className="text-sm text-gray-400 mb-1">Match Score</p>
                <div className="text-4xl font-bold text-indigo-400 mb-2">
                  {Math.round(application.matchScore?.overall_score || 0)}%
                </div>
                <div className="flex justify-center text-yellow-400 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i <
                          Math.round((application.matchScore?.overall_score || 0) / 20)
                          ? "fill-current"
                          : "opacity-30"
                        }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">AI Match</p>
              </div>
            )}
          </div>

          {/* Job Details Footer */}
          <div className="flex flex-wrap gap-4 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-gray-300">
              <Briefcase className="w-5 h-5 text-gray-500" />
              <span className="font-medium">{application.job.job_type}</span>
            </div>
            {application.job.salary_range && (
              <div className="flex items-center gap-2 text-gray-300">
                <DollarSign className="w-5 h-5 text-gray-500" />
                <span className="font-medium">
                  {application.job.salary_range}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span>Applied {formatDate(application.applied_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-2xl border p-6 ${statusInfo.bg} ${statusInfo.border}`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${statusInfo.bg} border ${statusInfo.border}`}
          >
            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
          </div>
          <div>
            <h3 className={`font-semibold mb-1 ${statusInfo.color}`}>
              {statusInfo.label}
            </h3>
            <p className="text-sm text-gray-300">{statusInfo.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Timeline */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-indigo-400" />
              Application Timeline
            </h2>
            <div className="space-y-0">
              {timeline.map((event: any, index: number) => {
                const EventIcon =
                  timelineStatusIcons[event.status] || CheckCircle;
                const isLast = index === timeline.length - 1;

                return (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30 z-10">
                        <EventIcon className="w-4 h-4 text-indigo-400" />
                      </div>
                      {!isLast && (
                        <div className="w-0.5 flex-1 bg-white/10 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-white">
                          {event.title}
                        </h3>
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(event.date)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {event.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills Match Analysis */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-indigo-400" />
              Skills Match Analysis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matched Skills */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Matched Skills ({matchedSkills.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {matchedSkills.length > 0 ? (
                    matchedSkills.map((skill: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400 flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No matched skills found
                    </p>
                  )}
                </div>
              </div>

              {/* Missing Skills */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-orange-400" />
                  Skills to Develop ({missingSkills.length})
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
                    <p className="text-sm text-green-400 font-medium">
                      ✅ You have all required skills!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cover Letter Section */}
          {application.cover_letter && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-indigo-400" />
                Cover Letter
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 whitespace-pre-line leading-relaxed">
                  {application.cover_letter}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href={`/candidate/jobs/${application.job.id}`}
                className="block"
              >
                <button className="w-full px-4 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3">
                  <ExternalLink className="w-4 h-4" />
                  View Job Posting
                </button>
              </Link>
              {application.resume && (
                <a
                  href={application.resume.file_url}
                  download
                  className="block"
                >
                  <button className="w-full px-4 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-lg hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3">
                    <Download className="w-4 h-4" />
                    Download CV
                  </button>
                </a>
              )}
              <button
                onClick={handleWithdraw}
                className="w-full px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-3"
              >
                <Trash2 className="w-4 h-4" />
                Withdraw Application
              </button>
            </div>
          </div>

          {/* Company Contact Info */}
          {application.job.company && (
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6">
              <h3 className="font-semibold text-white mb-4">Company Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Company Name</p>
                  <p className="font-medium text-white">
                    {application.job.company.name}
                  </p>
                </div>
                {application.job.company.email && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Email</p>
                    <a
                      href={`mailto:${application.job.company.email}`}
                      className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span className="text-sm truncate">
                        {application.job.company.email}
                      </span>
                    </a>
                  </div>
                )}
                {application.job.company.phone && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Phone</p>
                    <a
                      href={`tel:${application.job.company.phone}`}
                      className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">
                        {application.job.company.phone}
                      </span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Application Details */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-semibold text-white mb-4">
              Application Details
            </h3>
            <div className="space-y-3 text-sm">
              {application.resume && (
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-gray-400">CV Version</span>
                  <span className="font-medium text-white">
                    {application.resume.filename || "Default CV"}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-gray-400">Cover Letter</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${application.cover_letter
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-500/20 text-gray-400"
                    }`}
                >
                  {application.cover_letter ? "Included" : "Not Included"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Application ID</span>
                <span className="font-mono text-xs text-gray-500">
                  #{application.id}
                </span>
              </div>
            </div>
          </div>

          {/* Tips Card */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-400">
                <span className="text-lg">💡</span>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1 text-sm">
                  Pro Tip
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Keep track of your application progress. This helps you
                  prepare better for interviews!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

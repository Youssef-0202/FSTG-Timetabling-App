"use client";

import { useState, useEffect } from "react";
import {
    Users,
    Star,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Filter,
    Download
} from "lucide-react";
import {
    getQueuedCandidates,
    updateQueueStatus,
    removeFromQueue,
    QueueStatus,
    EnrichedQueuedCandidate
} from "@/lib/candidateQueue";
import { ApplicationReviewModal } from "@/components/rh";
import { seedCandidateQueue } from "@/lib/mockData/seedQueue";

export default function CvAnalysisPage() {
    const [queuedCandidates, setQueuedCandidates] = useState<EnrichedQueuedCandidate[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<EnrichedQueuedCandidate | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterJob, setFilterJob] = useState<string>("all");

    // Load queued candidates and seed if empty
    useEffect(() => {
        // Seed the queue if it's empty (only on first load)
        seedCandidateQueue(false);

        // Load candidates
        loadCandidates();
    }, []);

    const loadCandidates = () => {
        const allStatuses: QueueStatus[] = ["to_review", "shortlisted", "accepted", "rejected"];
        const candidates: EnrichedQueuedCandidate[] = [];

        allStatuses.forEach((status) => {
            const statusCandidates = getQueuedCandidates(status);
            candidates.push(...statusCandidates);
        });

        setQueuedCandidates(candidates);
    };

    const handleStatusChange = (candidateId: string, jobId: string, newStatus: QueueStatus) => {
        updateQueueStatus(candidateId, jobId, newStatus);
        loadCandidates();
    };

    const handleRemoveFromQueue = (candidateId: string, jobId: string) => {
        removeFromQueue(candidateId, jobId);
        loadCandidates();
    };

    const handleReviewCandidate = (queuedCandidate: EnrichedQueuedCandidate) => {
        setSelectedCandidate(queuedCandidate);
        setIsReviewModalOpen(true);
    };

    // Get unique job titles for filter
    const jobTitles = Array.from(new Set(queuedCandidates.map(qc => qc.jobTitle)));

    // Filter candidates
    const filteredCandidates = queuedCandidates.filter((qc) => {
        const matchesSearch =
            qc.candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            qc.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesJob = filterJob === "all" || qc.jobTitle === filterJob;

        return matchesSearch && matchesJob;
    });

    // Group by status
    const candidatesByStatus = {
        to_review: filteredCandidates.filter(c => c.status === "to_review"),
        shortlisted: filteredCandidates.filter(c => c.status === "shortlisted"),
        accepted: filteredCandidates.filter(c => c.status === "accepted"),
        rejected: filteredCandidates.filter(c => c.status === "rejected"),
    };

    const statusConfig = {
        to_review: {
            title: "To Review",
            icon: Clock,
            color: "blue",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/30",
            iconColor: "text-blue-400"
        },
        shortlisted: {
            title: "Shortlisted",
            icon: Star,
            color: "purple",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/30",
            iconColor: "text-purple-400"
        },
        accepted: {
            title: "Accepted",
            icon: CheckCircle,
            color: "green",
            bgColor: "bg-green-500/10",
            borderColor: "border-green-500/30",
            iconColor: "text-green-400"
        },
        rejected: {
            title: "Rejected",
            icon: XCircle,
            color: "red",
            bgColor: "bg-red-500/10",
            borderColor: "border-red-500/30",
            iconColor: "text-red-400"
        }
    };

    return (
        <div className="min-h-screen p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                        <Users className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Candidate Review Queue
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Manage and track candidates across all job openings
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search candidates or jobs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                </div>

                {/* Job Filter */}
                <div className="relative sm:w-64">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                        value={filterJob}
                        onChange={(e) => setFilterJob(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none cursor-pointer"
                    >
                        <option value="all">All Jobs</option>
                        {jobTitles.map((title) => (
                            <option key={title} value={title}>{title}</option>
                        ))}
                    </select>
                </div>

                {/* Export Button */}
                <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50">
                    <Download className="w-5 h-5" />
                    Export
                </button>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                {(Object.keys(statusConfig) as QueueStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const Icon = config.icon;
                    const candidates = candidatesByStatus[status];

                    return (
                        <div key={status} className="flex flex-col">
                            {/* Column Header */}
                            <div className={`p-4 rounded-t-2xl border ${config.borderColor} ${config.bgColor} border-b-0`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Icon className={`w-5 h-5 ${config.iconColor}`} />
                                        <h2 className="font-semibold text-white">{config.title}</h2>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg ${config.bgColor} text-sm font-medium ${config.iconColor}`}>
                                        {candidates.length}
                                    </span>
                                </div>
                            </div>

                            {/* Column Content */}
                            <div className={`flex-1 p-4 rounded-b-2xl border ${config.borderColor} bg-white/5 backdrop-blur-sm min-h-[400px] space-y-3`}>
                                {candidates.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                        <Icon className="w-12 h-12 mb-2 opacity-30" />
                                        <p className="text-sm">No candidates</p>
                                    </div>
                                ) : (
                                    candidates.map((qc) => (
                                        <CandidateCard
                                            key={`${qc.candidate.id}-${qc.jobId}`}
                                            queuedCandidate={qc}
                                            onReview={handleReviewCandidate}
                                            onStatusChange={handleStatusChange}
                                            onRemove={handleRemoveFromQueue}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Review Modal */}
            {selectedCandidate && (
                <ApplicationReviewModal
                    candidate={selectedCandidate.candidate}
                    jobId={selectedCandidate.jobId}
                    jobTitle={selectedCandidate.jobTitle}
                    isOpen={isReviewModalOpen}
                    onClose={() => {
                        setIsReviewModalOpen(false);
                        setSelectedCandidate(null);
                    }}
                    onAccept={(candidateId) => {
                        handleStatusChange(candidateId, selectedCandidate.jobId, "accepted");
                        setIsReviewModalOpen(false);
                        setSelectedCandidate(null);
                    }}
                    onReject={(candidateId) => {
                        handleStatusChange(candidateId, selectedCandidate.jobId, "rejected");
                        setIsReviewModalOpen(false);
                        setSelectedCandidate(null);
                    }}
                    onShortlist={(candidateId) => {
                        handleStatusChange(candidateId, selectedCandidate.jobId, "shortlisted");
                        loadCandidates();
                    }}
                />
            )}
        </div>
    );
}

// Candidate Card Component
interface CandidateCardProps {
    queuedCandidate: EnrichedQueuedCandidate;
    onReview: (qc: EnrichedQueuedCandidate) => void;
    onStatusChange: (candidateId: string, jobId: string, status: QueueStatus) => void;
    onRemove: (candidateId: string, jobId: string) => void;
}

function CandidateCard({ queuedCandidate, onReview, onStatusChange, onRemove }: CandidateCardProps) {
    const { candidate, jobTitle, addedAt, status } = queuedCandidate;

    const getMatchColor = (score: number) => {
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-yellow-400";
        return "text-orange-400";
    };

    return (
        <div className="group p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10">
            {/* Candidate Info */}
            <div className="flex items-start gap-3 mb-3">

                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{candidate.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{jobTitle}</p>
                </div>
            </div>

            {/* Match Score */}
            <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-400">AI Match</span>
                    <span className={`font-semibold ${getMatchColor(candidate.matchScore)}`}>
                        {candidate.matchScore}%
                    </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${candidate.matchScore >= 80 ? "bg-green-400" :
                            candidate.matchScore >= 60 ? "bg-yellow-400" : "bg-orange-400"
                            }`}
                        style={{ width: `${candidate.matchScore}%` }}
                    />
                </div>
            </div>

            {/* Skills Preview */}
            <div className="mb-3 flex flex-wrap gap-1">
                {candidate.skills.slice(0, 2).map((skill, idx) => (
                    <span
                        key={idx}
                        className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-xs text-purple-300"
                    >
                        {skill}
                    </span>
                ))}
                {candidate.skills.length > 2 && (
                    <span className="px-2 py-1 text-xs text-gray-400">
                        +{candidate.skills.length - 2}
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={() => onReview(queuedCandidate)}
                    className="flex-1 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm font-medium text-purple-300 transition-colors"
                >
                    Review
                </button>

                {status !== "rejected" && (
                    <button
                        onClick={() => onRemove(candidate.id, queuedCandidate.jobId)}
                        className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm font-medium text-red-300 transition-colors"
                        title="Remove from queue"
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Footer Info */}
            <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-500">
                Added {new Date(addedAt).toLocaleDateString()}
            </div>
        </div>
    );
}

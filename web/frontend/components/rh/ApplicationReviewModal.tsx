"use client";

import { Candidate } from "@/lib/mockData/candidates";
import {
    X,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    GraduationCap,
    Calendar,
    TrendingUp,
    CheckCircle,
    XCircle,
    FileText,
    Award,
    AlertTriangle,
    ThumbsUp,
    ThumbsDown,
    Download,
    Star,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useState } from "react";

type ApplicationReviewModalProps = {
    candidate: Candidate;
    jobId: string;
    jobTitle: string;
    isOpen: boolean;
    onClose: () => void;
    onAccept?: (candidateId: string) => void;
    onReject?: (candidateId: string) => void;
    onShortlist?: (candidateId: string, jobId: string, jobTitle: string) => void;
};

export function ApplicationReviewModal({
    candidate,
    jobId,
    jobTitle,
    isOpen,
    onClose,
    onAccept,
    onReject,
    onShortlist,
}: ApplicationReviewModalProps) {
    const [activeTab, setActiveTab] = useState<"cv" | "motivation" | "analysis">("cv");

    if (!isOpen || typeof document === "undefined") return null;

    const getMatchScoreColor = (score: number) => {
        if (score >= 90) return "text-emerald-400";
        if (score >= 80) return "text-blue-400";
        if (score >= 70) return "text-amber-400";
        return "text-gray-400";
    };

    const getMatchScoreBg = (score: number) => {
        if (score >= 90) return "bg-emerald-500/20 border-emerald-500/30";
        if (score >= 80) return "bg-blue-500/20 border-blue-500/30";
        if (score >= 70) return "bg-amber-500/20 border-amber-500/30";
        return "bg-gray-500/20 border-gray-500/30";
    };

    const handleAccept = () => {
        onAccept?.(candidate.id);
        onClose();
    };

    const handleReject = () => {
        onReject?.(candidate.id);
        onClose();
    };

    const handleShortlist = () => {
        onShortlist?.(candidate.id, jobId, jobTitle);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="relative w-full max-w-6xl h-[90vh] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 z-10 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm">
                    <div className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                {candidate.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{candidate.name}</h2>
                                <p className="text-gray-400">{candidate.currentRole}</p>
                            </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className="flex items-center gap-4">
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${getMatchScoreBg(
                                    candidate.matchScore
                                )}`}
                            >
                                <TrendingUp className={`w-5 h-5 ${getMatchScoreColor(candidate.matchScore)}`} />
                                <div>
                                    <div className="text-xs text-gray-400">AI Match Score</div>
                                    <div className={`text-2xl font-bold ${getMatchScoreColor(candidate.matchScore)}`}>
                                        {candidate.matchScore}%
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
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 px-6 pb-4">
                        <button
                            onClick={() => setActiveTab("cv")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "cv"
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            CV & Profile
                        </button>
                        <button
                            onClick={() => setActiveTab("motivation")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "motivation"
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <Mail className="w-4 h-4" />
                            Motivation Letter
                        </button>
                        <button
                            onClick={() => setActiveTab("analysis")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === "analysis"
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <Award className="w-4 h-4" />
                            AI Analysis
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto h-[calc(90vh-220px)]">
                    {/* CV Tab */}
                    {activeTab === "cv" && (
                        <div className="space-y-6">
                            {/* Contact Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                                        <Mail className="w-4 h-4" />
                                        <span className="text-xs font-medium">Email</span>
                                    </div>
                                    <p className="text-white font-medium">{candidate.email}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                                        <Phone className="w-4 h-4" />
                                        <span className="text-xs font-medium">Phone</span>
                                    </div>
                                    <p className="text-white font-medium">{candidate.phone}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-xs font-medium">Location</span>
                                    </div>
                                    <p className="text-white font-medium">{candidate.location}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                                        <Briefcase className="w-4 h-4" />
                                        <span className="text-xs font-medium">Experience</span>
                                    </div>
                                    <p className="text-white font-medium">{candidate.experience}</p>
                                </div>
                            </div>

                            {/* Education */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <GraduationCap className="w-5 h-5 text-purple-400" />
                                    Education
                                </h3>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-white font-medium">{candidate.education}</p>
                                </div>
                            </div>

                            {/* Skills */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-purple-400" />
                                    Technical Skills
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {candidate.skills.map((skill, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Application Date */}
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Calendar className="w-4 h-4" />
                                <span>
                                    Applied on{" "}
                                    {new Date(candidate.appliedDate).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Motivation Letter Tab */}
                    {activeTab === "motivation" && (
                        <div className="space-y-4">
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                                    {candidate.motivationLetter}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* AI Analysis Tab */}
                    {activeTab === "analysis" && (
                        <div className="space-y-6">
                            {/* AI Recommendation */}
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <h3 className="text-lg font-semibold text-blue-400 mb-2 flex items-center gap-2">
                                    <Award className="w-5 h-5" />
                                    AI Recommendation
                                </h3>
                                <p className="text-gray-300 leading-relaxed">{candidate.aiAnalysis.recommendations}</p>
                            </div>

                            {/* Strengths */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <ThumbsUp className="w-5 h-5 text-emerald-400" />
                                    Strengths
                                </h3>
                                <div className="space-y-2">
                                    {candidate.aiAnalysis.strengths.map((strength, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                                        >
                                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-gray-300">{strength}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Weaknesses */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <ThumbsDown className="w-5 h-5 text-amber-400" />
                                    Areas of Concern
                                </h3>
                                <div className="space-y-2">
                                    {candidate.aiAnalysis.weaknesses.map((weakness, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                                        >
                                            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-gray-300">{weakness}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Skill Match */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-purple-400" />
                                    Skill Match Analysis
                                </h3>
                                <div className="space-y-3">
                                    {candidate.aiAnalysis.skillMatch.map((skill, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white font-medium">{skill.skill}</span>
                                                <span className={getMatchScoreColor(skill.matchPercentage)}>
                                                    {skill.matchPercentage}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${skill.matchPercentage >= 90
                                                        ? "bg-emerald-500"
                                                        : skill.matchPercentage >= 80
                                                            ? "bg-blue-500"
                                                            : skill.matchPercentage >= 70
                                                                ? "bg-amber-500"
                                                                : "bg-gray-500"
                                                        }`}
                                                    style={{ width: `${skill.matchPercentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer - Action Buttons */}
                <div className="sticky bottom-0 border-t border-white/10 bg-gray-900/95 backdrop-blur-sm p-6">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={() => window.open(candidate.resumeUrl || "#", "_blank")}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all"
                        >
                            <Download className="w-4 h-4" />
                            <span>Download CV</span>
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={handleReject}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 font-medium transition-all hover:scale-105 active:scale-95"
                            >
                                <XCircle className="w-5 h-5" />
                                <span>Reject</span>
                            </button>
                            <button
                                onClick={handleShortlist}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 font-medium transition-all hover:scale-105 active:scale-95"
                            >
                                <Star className="w-5 h-5" />
                                <span>Add to Shortlist</span>
                            </button>
                            <button
                                onClick={handleAccept}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                            >
                                <CheckCircle className="w-5 h-5" />
                                <span>Accept</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

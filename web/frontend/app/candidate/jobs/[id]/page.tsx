"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  Send,
  CheckCircle,
  Loader2,
} from "lucide-react";

import { useJob, useCheckApplied, useResumes } from "@/lib/hooks/useAPI";
import { applicationsService } from "@/lib/api/services";

import { JobHeader } from "@/components/Candidate/jobs/JobHeader";
import { SkillAnalysis } from "@/components/Candidate/jobs/SkillAnalysis";
import { ApplicationModal } from "@/components/Candidate/jobs/ApplicationModal";
import { SuccessModal } from "@/components/Candidate/jobs/SuccessModal";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  // Charger les données
  const { data: job, loading: jobLoading, error: jobError } = useJob(jobId);
  const {
    data: appliedData,
    loading: appliedLoading,
    refetch: refetchApplied,
  } = useCheckApplied(jobId);
  const { data: resumes } = useResumes();

  // États
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const hasApplied = appliedData?.applied || false;
  const defaultResume = resumes?.find((r) => r.is_default);
  const hasCV = !!defaultResume;

  // État de chargement
  if (jobLoading || appliedLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading job details...</p>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (jobError || !job) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12">
          <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Job Not Found</h2>
          <p className="text-gray-400 mb-6">
            This job posting may have been removed or does not exist.
          </p>
          <button
            onClick={() => router.push("/candidate/jobs")}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            Return to Jobs
          </button>
        </div>
      </div>
    );
  }

  // Calcul des compétences (basé sur les données du profil candidat)
  const candidateSkills = resumes?.[0]?.parsed_text
    ? JSON.parse(resumes[0].parsed_text).skills || []
    : [];
  const jobSkillNames = job.skills.map((s) => s.name);
  const matchedSkills = candidateSkills.filter((s: string) =>
    jobSkillNames.includes(s)
  );
  const missingSkills = jobSkillNames.filter(
    (s) => !candidateSkills.includes(s)
  );

  // Gestionnaire de soumission
  const handleApplicationSubmit = async (formData: any) => {
    try {
      await applicationsService.create({
        job_id: jobId,
        resume_id: formData.resume_id,
        cover_letter: formData.includeCoverLetter
          ? formData.coverLetter
          : undefined,
      });

      setShowApplyModal(false);
      setShowSuccessModal(true);
      refetchApplied(); // Rafraîchir le statut
    } catch (error) {
      console.error("Application error:", error);
      alert("Failed to submit application. Please try again.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32">
      {/* Bouton Retour */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Jobs
      </button>

      {/* En-tête du Job avec Match Score */}
      <JobHeader job={job} hasCV={hasCV} />

      {/* Grille de contenu */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Gauche (Description) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              About the Role
            </h2>
            <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed whitespace-pre-line">
              {job.description}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              About {job.company.name}
            </h2>
            <p className="text-gray-300 leading-relaxed">
              {job.company.description || "No company description available."}
            </p>
          </div>
        </div>

        {/* Colonne Droite (Compétences & Sidebar) */}
        <div className="space-y-8">
          <SkillAnalysis
            matchedSkills={matchedSkills}
            missingSkills={missingSkills}
            matchScore={job.matchScore || 0}
          />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Required Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span
                  key={skill.id}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'action fixe en bas */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-64 p-4 bg-gradient-to-t from-black via-black to-transparent z-40">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[#121212] border border-white/10 rounded-xl p-4 shadow-2xl flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-white font-medium">Interested in this role?</p>
              <p className="text-sm text-gray-400">
                {hasApplied
                  ? "You have already applied."
                  : "Don't miss this opportunity."}
              </p>
            </div>

            <button
              onClick={() => setShowApplyModal(true)}
              disabled={hasApplied}
              className={`px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                hasApplied
                  ? "bg-green-500/10 text-green-500 border border-green-500/20 cursor-default"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95"
              }`}
            >
              {hasApplied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Applied
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Apply Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      {showApplyModal && (
        <ApplicationModal
          job={job}
          defaultResume={defaultResume}
          onClose={() => setShowApplyModal(false)}
          onSubmit={handleApplicationSubmit}
        />
      )}

      {showSuccessModal && (
        <SuccessModal onClose={() => setShowSuccessModal(false)} />
      )}
    </div>
  );
}

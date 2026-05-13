"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Send,
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

import { Resume, JobWithDetails } from "@/lib/types/database.types";

interface ApplicationModalProps {
  job: JobWithDetails;
  defaultResume?: Resume;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function ApplicationModal({
  job,
  defaultResume,
  onClose,
  onSubmit,
}: ApplicationModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resume, setResume] = useState<Resume | null>(defaultResume || null);
  const [formData, setFormData] = useState({
    coverLetter: "",
    includeCoverLetter: false,
  });

  useEffect(() => {
    // Vérifier si un CV existe dans le localStorage
    if (!defaultResume) {
      const saved = localStorage.getItem("user_resume");
      if (saved) {
        try {
          setResume(JSON.parse(saved));
        } catch (e) {
          console.error("Error loading resume:", e);
        }
      }
    }
  }, []);

  const handleGoToProfile = () => {
    onClose();
    router.push("/candidate/profile");
  };

  const handleSubmit = async () => {
    if (!resume) {
      alert("Please upload a CV from your profile first");
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    onSubmit({
      resume_id: resume.id,
      coverLetter: formData.includeCoverLetter
        ? formData.coverLetter
        : undefined,
      includeCoverLetter: formData.includeCoverLetter,
    });

    setIsSubmitting(false);
  };

  const companyName =
    typeof job.company === "object" ? job.company.name : job.company;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">
              Apply to {job.title}
            </h2>
            <p className="text-sm text-gray-400">{companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* CV Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              Resume / CV <span className="text-red-400">*</span>
            </label>

            {!resume ? (
              /* Pas de CV - Redirection vers le profil */
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-base font-semibold text-yellow-200 mb-2">
                        No CV Found
                      </p>
                      <p className="text-sm text-yellow-200/80 leading-relaxed">
                        You need to upload your CV before applying for jobs. CV
                        management is only available from your profile page.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleGoToProfile}
                    className="w-full px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg text-yellow-200 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Go to Profile to Upload CV
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    <strong className="text-blue-400">Note:</strong> You can
                    only manage your CV from the Profile page. Once uploaded, it
                    will be automatically used for all your applications.
                  </p>
                </div>
              </div>
            ) : (
              /* CV trouvé - Afficher les infos */
              <div className="space-y-4">
                <div className="p-4 rounded-xl border bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="text-sm font-medium text-green-200">
                      CV Ready for Application
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {resume.file_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(resume.file_size / 1024).toFixed(1)} KB • Uploaded{" "}
                        {new Date(resume.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-400">
                    💡 To update your CV, go to your{" "}
                    <button
                      onClick={handleGoToProfile}
                      className="text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Profile page
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Cover Letter Section - Only show if CV exists */}
          {resume && (
            <>
              <div className="w-full h-px bg-white/10" />

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.includeCoverLetter}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        includeCoverLetter: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white">
                      Include Cover Letter
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Optional - Add a personalized message to your application
                    </p>
                  </div>
                </label>

                {formData.includeCoverLetter && (
                  <div className="space-y-2">
                    <textarea
                      rows={6}
                      value={formData.coverLetter}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          coverLetter: e.target.value,
                        })
                      }
                      placeholder={`Dear Hiring Manager at ${companyName},

I am writing to express my strong interest in the ${job.title} position...`}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors"
                    />
                    <p className="text-xs text-gray-500">
                      {formData.coverLetter.length} characters
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/5">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            {!resume ? (
              <button
                onClick={handleGoToProfile}
                className="flex-[2] px-4 py-3 rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-medium flex items-center justify-center gap-2 transition-all"
              >
                <AlertCircle className="w-5 h-5" />
                Upload CV First
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-[2] px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

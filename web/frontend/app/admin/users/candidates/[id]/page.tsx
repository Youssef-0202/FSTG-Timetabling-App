"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  GraduationCap,
  FileText,
  Trash2,
  Award,
  Layers,
  Clock,
  AlertTriangle, // <-- Nouveau
  X, // <-- Nouveau
} from "lucide-react";

export default function CandidateDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- STATES POUR LA SUPPRESSION ---
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        // 1. Récupérer le profil candidat
        const candidateData = await api.candidates.getById(id);

        if (!candidateData) {
          setError("Candidate profile not found");
          return;
        }

        // 2. Récupérer les infos utilisateur (Email/Tel) via user_id
        const userData = await api.users.getById(candidateData.user_id);

        // 3. Fusionner les données
        setProfile({
          ...candidateData,
          email: userData?.email || "Unknown",
          phone: userData?.phone || "Not provided",
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load profile details");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDetails();
  }, [id]);

  // A. Ouvrir la modale
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  // B. Confirmer la suppression
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      // 1. Supprimer le profil (Cascade vers CVs, Apps...)
      await api.candidates.delete(id);

      // 2. Supprimer le compte utilisateur de connexion
      if (profile.user_id) {
        await api.users.delete(profile.user_id);
      }

      // 3. Rediriger vers la liste
      router.push("/admin/users/candidates");
    } catch (err) {
      alert("Failed to delete candidate. Please try again.");
      setIsDeleting(false);
      setShowDeleteModal(false); // Fermer la modale en cas d'erreur
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400">Loading profile...</div>
    );
  if (error || !profile)
    return <div className="p-8 text-center text-red-400">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/admin/users/candidates")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to List
        </button>

        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Profile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLONNE GAUCHE : Identité */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg">
                {profile.email.substring(0, 2).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-white break-all">
                {profile.email.split("@")[0]}
              </h2>
              <p className="text-indigo-400 font-medium mt-1">
                {profile.current_position || "No Title"}
              </p>

              <div className="w-full h-px bg-white/10 my-6"></div>

              <div className="w-full space-y-4 text-left">
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{profile.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>
                    Joined {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Box */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Activity Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <StatItem
                label="Applications"
                value={profile.stats?.total_applications || 0}
                icon={<Layers className="w-4 h-4 text-blue-400" />}
              />
              <StatItem
                label="Resumes"
                value={profile.stats?.total_resumes || 0}
                icon={<FileText className="w-4 h-4 text-green-400" />}
              />
              <StatItem
                label="Skills"
                value={profile.stats?.total_skills || 0}
                icon={<Award className="w-4 h-4 text-purple-400" />}
              />
              <StatItem
                label="Pending"
                value={profile.stats?.pending_applications || 0}
                icon={<Clock className="w-4 h-4 text-yellow-400" />}
              />
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : Détails */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio & Intro */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" /> Professional
              Summary
            </h3>
            <div className="bg-black/20 rounded-xl p-4 mb-4">
              <p className="text-gray-300 leading-relaxed italic">
                "{profile.bio || "No biography provided yet."}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                  Experience Level
                </p>
                <p className="text-xl font-bold text-white">
                  {profile.years_of_experience} Years
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                  Resume Status
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      profile.cv_uploaded ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <p className="text-white font-medium">
                    {profile.cv_uploaded ? "Uploaded" : "Missing"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Education & Experience Details */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-400" /> Education
              </h3>
              <p className="text-gray-300 whitespace-pre-line">
                {profile.education || "No education details provided."}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-green-400" /> Work Experience
              </h3>
              <p className="text-gray-300 whitespace-pre-line">
                {profile.experience || "No work experience details provided."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALE DE SUPPRESSION (PROFESSIONNELLE) --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1f37] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Delete Profile?
                </h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete this candidate?
                <br />
                <span className="font-bold text-white mt-1 block">
                  {profile.email}
                </span>
              </p>

              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-red-300 text-sm font-medium mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Warning: Irreversible Action
                </div>
                <p className="text-red-400/80 text-xs ml-6">
                  This action will permanently remove the candidate's profile,
                  user account, uploaded resumes, and applications history.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Confirm Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, icon }: any) {
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-white/5 rounded-lg border border-white/5">
      <div className="mb-1">{icon}</div>
      <span className="text-xl font-bold text-white">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

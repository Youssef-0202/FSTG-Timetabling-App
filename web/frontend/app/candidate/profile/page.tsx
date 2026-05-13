"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Edit2,
  Save,
  X,
  Briefcase,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  GraduationCap,
  Clock,
  AlignLeft,
} from "lucide-react";

import { useProfile, useApplicationStats } from "@/lib/hooks/useAPI";
import { profileService } from "@/lib/api/services";
import { CVUpload } from "@/components/Candidate/profile/CVUpload";
import { authClient } from "@/lib/auth-client";

// =====================================
// COMPOSANT: CARTE DE STATISTIQUE
// =====================================
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  delay: string;
}) {
  // Mapping des couleurs Tailwind pour supporter le rendu dynamique
  const colorMap: Record<string, any> = {
    indigo: {
      bg: "bg-indigo-500/10",
      text: "text-indigo-400",
      border: "border-indigo-500/20",
      glow: "bg-indigo-500",
    },
    yellow: {
      bg: "bg-yellow-500/10",
      text: "text-yellow-400",
      border: "border-yellow-500/20",
      glow: "bg-yellow-500",
    },
    green: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      glow: "bg-emerald-500",
    },
    red: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/20",
      glow: "bg-red-500",
    },
  };

  const theme = colorMap[color] || colorMap.indigo;

  return (
    <div
      className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm animate-slideUp hover:-translate-y-1 transition-all duration-300"
      style={{ animationDelay: delay }}
    >
      <div
        className={`absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 ${theme.glow}/20 rounded-full blur-3xl transition-all duration-500 group-hover:${theme.glow}/30`}
      />
      <div className="relative z-10">
        <div
          className={`p-3 rounded-xl ${theme.bg} ${theme.text} border ${theme.border} w-fit mb-3 group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-gray-400">{label}</p>
        <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
      </div>
    </div>
  );
}

// =====================================
// COMPOSANT PRINCIPAL
// =====================================
export default function ProfilePage() {
  const { data: session } = authClient.useSession();
  const {
    data: profile,
    loading: profileLoading,
    refetch: refetchProfile,
  } = useProfile();

  const { data: stats, loading: statsLoading } = useApplicationStats();

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    name: "",
    email: "",
    phone: "",
    education: "",
    experience: "",
    bio: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Récupérer name et email depuis la session
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";

  // --- Synchronisation des données d'édition ---
  useEffect(() => {
    if (profile) {
      setEditedData({
        name: userName,
        email: userEmail,
        phone: profile.user?.phone || "",
        education: profile.education || "",
        experience: profile.experience || "",
        bio: profile.bio || "",
      });
    }
  }, [profile, userName, userEmail]);

  // Loading state
  if (profileLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center animate-fadeIn">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse" />
            <Loader2 className="w-12 h-12 text-white animate-spin absolute top-2 left-1/2 -translate-x-1/2" />
          </div>
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 animate-fadeIn">
        <p className="text-gray-400">Unable to load profile</p>
      </div>
    );
  }

  // Handlers
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await profileService.update({
        education: editedData.education,
        experience: editedData.experience,
        bio: editedData.bio,
      });
      await refetchProfile();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditedData({
        name: userName,
        email: userEmail,
        phone: profile.user?.phone || "",
        education: profile.education || "",
        experience: profile.experience || "",
        bio: profile.bio || "",
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
        <div>
          <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-200">
            My Profile
          </h2>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Manage your professional identity
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="space-y-4">
        <h3
          className="text-xl font-semibold text-white animate-fadeIn"
          style={{ animationDelay: "0.1s" }}
        >
          Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={FileText}
            label="Total Applications"
            value={stats?.total || 0}
            color="indigo"
            delay="0.1s"
          />
          <StatCard
            icon={Briefcase}
            label="Pending"
            value={stats?.pending || 0}
            color="yellow"
            delay="0.2s"
          />
          <StatCard
            icon={CheckCircle}
            label="Accepted"
            value={stats?.accepted || 0}
            color="green"
            delay="0.3s"
          />
          <StatCard
            icon={XCircle}
            label="Rejected"
            value={stats?.rejected || 0}
            color="red"
            delay="0.4s"
          />
        </div>
      </div>

      {/* Profile Card */}
      <div
        className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm animate-slideUp"
        style={{ animationDelay: "0.5s" }}
      >
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b border-white/10 pb-8">
          <div className="flex items-center space-x-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-xl ring-4 ring-white/10">
                <User className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">{userName}</h2>
              <div className="flex items-center gap-2 mt-1 text-gray-400">
                <Mail className="w-4 h-4" />
                <p>{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Edit/Save Buttons */}
          <div className="flex-shrink-0">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-5 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 hover:border-white/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">
                  Edit Profile
                </span>
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Fields */}
        <div className="relative z-10 space-y-6">
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              <div className="space-y-2">
                <label className="text-sm font-medium text-indigo-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={editedData.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-indigo-300">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    value={editedData.phone}
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-indigo-300">
                  Education
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    value={editedData.education}
                    onChange={(e) =>
                      setEditedData({
                        ...editedData,
                        education: e.target.value,
                      })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    placeholder="e.g. Master in Computer Science..."
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-indigo-300">
                  Experience
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    value={editedData.experience}
                    onChange={(e) =>
                      setEditedData({
                        ...editedData,
                        experience: e.target.value,
                      })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    placeholder="e.g. 2 years as Full Stack Developer..."
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-indigo-300">
                  Bio
                </label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-4 w-4 h-4 text-gray-500" />
                  <textarea
                    rows={4}
                    value={editedData.bio}
                    onChange={(e) =>
                      setEditedData({ ...editedData, bio: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
                    placeholder="Tell us a bit about yourself..."
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-indigo-300/70 mb-0.5 font-medium uppercase tracking-wider">
                    Email
                  </p>
                  <p className="text-sm font-medium text-white">{userEmail}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-purple-300/70 mb-0.5 font-medium uppercase tracking-wider">
                    Phone
                  </p>
                  <p className="text-sm font-medium text-white">
                    {profile.user?.phone || "Not set"}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2 p-5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-2 mb-2 text-indigo-300/70">
                  <GraduationCap className="w-4 h-4" />
                  <p className="text-xs font-medium uppercase tracking-wider">
                    Education
                  </p>
                </div>
                <p className="text-sm text-white pl-6 border-l-2 border-indigo-500/30">
                  {profile.education || "Not specified"}
                </p>
              </div>

              <div className="md:col-span-2 p-5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-2 mb-2 text-indigo-300/70">
                  <Briefcase className="w-4 h-4" />
                  <p className="text-xs font-medium uppercase tracking-wider">
                    Experience
                  </p>
                </div>
                <p className="text-sm text-white pl-6 border-l-2 border-indigo-500/30">
                  {profile.experience || "Not specified"}
                </p>
              </div>

              {profile.bio && (
                <div className="md:col-span-2 p-5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-2 mb-2 text-indigo-300/70">
                    <AlignLeft className="w-4 h-4" />
                    <p className="text-xs font-medium uppercase tracking-wider">
                      Bio
                    </p>
                  </div>
                  <p className="text-sm text-white pl-6 border-l-2 border-indigo-500/30 leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CV Upload Section */}
      <div className="animate-slideUp" style={{ animationDelay: "0.6s" }}>
        <CVUpload />
      </div>

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

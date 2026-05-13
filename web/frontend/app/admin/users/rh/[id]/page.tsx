"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { rhService, RHProfile } from "@/lib/api/rh";
import { api } from "@/lib/api"; // <-- Import de votre API User
import { companiesService } from "@/lib/api/companies"; // <-- Import API Companies
import {
  ArrowLeft,
  Building2,
  Mail,
  Briefcase,
  BarChart3,
  Users,
  FileText,
  Clock,
  Phone,
  Edit,
  Calendar,
} from "lucide-react";

export default function RHUserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // On crée un type étendu localement pour stocker les infos fusionnées
  const [profile, setProfile] = useState<
    | (RHProfile & {
        real_email?: string;
        real_phone?: string;
        real_company_name?: string;
      })
    | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFullProfile = async () => {
      try {
        setLoading(true);

        // 1. D'abord, on charge le profil RH (Table rh_profiles)
        const rhData = await rhService.getById(id);

        if (!rhData) {
          throw new Error("RH Profile not found");
        }

        // 2. Ensuite, on lance les appels pour User et Company en parallèle
        // On utilise les IDs trouvés dans rhData
        const [userData, companyData] = await Promise.all([
          api.users.getById(rhData.user_id), // Récupère email/phone
          companiesService.getById(rhData.company_id), // Récupère nom entreprise
        ]);

        // 3. On fusionne tout dans le state
        setProfile({
          ...rhData,
          real_email: userData?.email || "Email not found",
          real_phone: userData?.phone || "No phone",
          real_company_name: companyData?.name || "Unknown Company",
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadFullProfile();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12 text-red-400">
        {error || "Profile not found"}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/users/rh")}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">
              RH Profile Details
            </h2>
            <p className="text-gray-400 text-sm">
              View statistics and information
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/admin/users/rh/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium"
        >
          <Edit className="w-4 h-4" />
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Identity Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg">
                RH
              </div>

              {/* Utilisation de l'email récupéré via api.users */}
              <h3 className="text-xl font-bold text-white break-all">
                {profile.real_email?.split("@")[0]}
              </h3>
              <p className="text-gray-400 text-sm mt-1">{profile.position}</p>

              <div className="w-full h-px bg-white/10 my-6"></div>

              <div className="w-full space-y-4">
                {/* Email Display */}
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate" title={profile.real_email}>
                    {profile.real_email}
                  </span>
                </div>

                {/* Phone Display */}
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{profile.real_phone}</span>
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
        </div>

        {/* Right Column: Professional Info & Stats */}
        <div className="md:col-span-2 space-y-6">
          {/* Professional Info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              Professional Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                  Company
                </p>
                <div className="flex items-center gap-2 text-white font-medium">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  {/* Nom de l'entreprise récupéré via companiesService */}
                  {profile.real_company_name}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                  Department
                </p>
                <div className="flex items-center gap-2 text-white font-medium">
                  <Users className="w-4 h-4 text-pink-400" />
                  {profile.department}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatsCard
              label="Total Jobs"
              value={profile.total_jobs_posted || 0}
              icon={<FileText className="w-5 h-5 text-blue-400" />}
            />
            <StatsCard
              label="Active Jobs"
              value={profile.active_jobs || 0}
              icon={<BarChart3 className="w-5 h-5 text-green-400" />}
            />
            <StatsCard
              label="Total Apps"
              value={profile.total_applications || 0}
              icon={<Users className="w-5 h-5 text-purple-400" />}
            />
            <StatsCard
              label="Pending"
              value={profile.pending_applications || 0}
              icon={<Clock className="w-5 h-5 text-yellow-400" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-colors">
      <div className="mb-2 p-2 bg-white/5 rounded-full">{icon}</div>
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-gray-400 mt-1">{label}</span>
    </div>
  );
}

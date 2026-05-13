"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { companiesService, Company } from "@/lib/api/companies";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  Globe,
  Briefcase,
  Calendar,
} from "lucide-react";

export default function CompanyDetailsPage() {
  const router = useRouter();
  const params = useParams(); // Récupère l'ID depuis l'URL
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setLoading(true);
        // On utilise l'ID récupéré dans l'URL
        const data = await companiesService.getById(params.id as string);
        setCompany(data);
      } catch (err) {
        setError("Failed to load company details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchCompany();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || "Company not found"}</p>
        <button
          onClick={() => router.push("/admin/companies")}
          className="text-indigo-400 hover:text-indigo-300"
        >
          Return to list
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header avec bouton retour */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/admin/companies")}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-white">{company.name}</h2>
          <p className="text-gray-400 mt-1">Company Details</p>
        </div>
      </div>

      {/* Carte principale */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Banner / Header de la carte */}
        <div className="p-8 border-b border-white/10 bg-gradient-to-r from-indigo-900/20 to-purple-900/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Logo Placeholder */}
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                {company.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {company.name}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-300">
                  <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    {company.industry}
                  </span>
                  <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">
                    <Users className="w-4 h-4 text-purple-400" />
                    {company.size} employees
                  </span>
                </div>
              </div>
            </div>

            {/* Status Badge (optionnel) */}
            <div className="px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
              Active
            </div>
          </div>
        </div>

        {/* Contenu détaillé */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section Description */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              About Company
            </h3>
            <p className="text-gray-300 leading-relaxed bg-black/20 p-6 rounded-xl border border-white/5">
              {company.description || "No description provided."}
            </p>
          </div>

          {/* Section Infos Contact */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
              Contact & Location
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-300">
                <div className="p-2 rounded-lg bg-white/5 text-indigo-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p>{company.location || "Not specified"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <div className="p-2 rounded-lg bg-white/5 text-pink-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Website</p>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline"
                    >
                      {company.website}
                    </a>
                  ) : (
                    <p>Not specified</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section Stats (Exemple) */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
              System Info
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-300">
                <div className="p-2 rounded-lg bg-white/5 text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Member Since</p>
                  <p>Dec 2025</p>
                </div>
              </div>
              {/* Vous pouvez ajouter d'autres stats ici */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

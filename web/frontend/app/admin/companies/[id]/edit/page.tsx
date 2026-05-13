"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Building2,
  Globe,
  MapPin,
  Users,
  Briefcase,
  ArrowLeft,
  Save,
} from "lucide-react";
import { companiesService, Company } from "@/lib/api/companies";

// Listes identiques à la création pour la cohérence
const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Real Estate",
  "Media & Entertainment",
  "Telecommunications",
  "Energy",
  "Transportation",
  "Hospitality",
  "Agriculture",
  "Construction",
  "Legal",
  "Non-Profit",
  "Government",
  "Other",
];

const SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000-5000",
  "5000+",
];

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // State du formulaire
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industry: "",
    size: "",
    location: "",
    website: "",
    logo_url: "",
  });

  // 1. Charger les données existantes au démarrage
  useEffect(() => {
    const loadCompany = async () => {
      try {
        setLoading(true);
        const data = await companiesService.getById(companyId);

        // On pré-remplit le formulaire
        setFormData({
          name: data.name || "",
          description: data.description || "",
          industry: data.industry || "",
          size: data.size || "",
          location: data.location || "",
          website: data.website || "",
          logo_url: data.logo_url || "",
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load company details. It might have been deleted.");
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      loadCompany();
    }
  }, [companyId]);

  // Gestion des changements dans les inputs
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // 2. Soumission du formulaire (UPDATE)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // NETTOYAGE DES DONNÉES (Crucial pour éviter l'erreur 422)
      // Si un champ optionnel est vide (""), on l'envoie comme undefined
      // Le backend comprendra qu'il ne faut pas valider ce champ comme une URL
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        industry: formData.industry || undefined,
        //size: formData.size || undefined,
        size: formData.size as Company["size"],
        location: formData.location || undefined,
        website: formData.website || undefined,
        logo_url: formData.logo_url || undefined,
      };

      console.log("Updating with payload:", payload);

      await companiesService.update(companyId, payload);

      // Succès -> Retour à la liste
      router.push("/admin/companies");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update company.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/companies")}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-white">Edit Company</h2>
          <p className="text-gray-400 mt-1">
            Update information for {formData.name}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border-l-4 border-red-500 p-4 rounded-lg animate-shake">
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Company Name *
            </label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Industry */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                Industry *
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
              >
                <option value="" className="bg-gray-900">
                  Select industry
                </option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind} className="bg-gray-900">
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            {/* Size */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Company Size *
              </label>
              <select
                name="size"
                value={formData.size}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
              >
                <option value="" className="bg-gray-900">
                  Select size
                </option>
                {SIZES.map((s) => (
                  <option key={s} value={s} className="bg-gray-900">
                    {s} employees
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                Location
              </label>
              <input
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
              />
            </div>
            {/* Website */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                Website
              </label>
              <input
                name="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
              />
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Logo URL
            </label>
            <input
              name="logo_url"
              type="url"
              placeholder="https://example.com/logo.png"
              value={formData.logo_url}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-6 border-t border-white/10">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition duration-200"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/companies")}
              disabled={submitting}
              className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-lg font-semibold hover:bg-white/10 transition duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

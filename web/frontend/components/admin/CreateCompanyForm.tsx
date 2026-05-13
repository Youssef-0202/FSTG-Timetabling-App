"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  MapPin,
  Users,
  Briefcase,
  ArrowLeft,
} from "lucide-react";
import { companiesService } from "@/lib/api/companies";
// Assurez-vous que le type CompanyInput est compatible, sinon vous pouvez l'importer ou le définir localement
import { CompanyInput } from "@/lib/mockData/companies";

export default function CreateCompanyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // État initial avec des chaînes vides pour le contrôle des champs
  const [formData, setFormData] = useState<CompanyInput>({
    name: "",
    description: "",
    industry: "",
    size: "",
    location: "",
    website: "",
    logo_url: "",
  });

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // ÉTAPE CRUCIALE : Nettoyage des données
      // On convertit les chaînes vides ("") en undefined.
      // Cela évite que le backend tente de valider "" comme une URL ou une Enum.
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        industry: formData.industry || undefined,
        size: formData.size || undefined,
        location: formData.location || undefined,
        website: formData.website || undefined,
        logo_url: formData.logo_url || undefined,
      };

      console.log("Envoi du payload nettoyé:", payload);

      await companiesService.create(payload as any);
      // note: 'as any' est utilisé ici pour éviter les conflits de typage stricts
      // si votre interface attend obligatoirement des strings non-nulles.

      // Succès - redirection
      router.push("/admin/companies");
    } catch (err: any) {
      console.error("Erreur lors de la création:", err);
      // Affiche le message d'erreur précis (ex: "website: invalid URL")
      setError(err.message || "Failed to create company. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/companies");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-white">Create New Company</h2>
          <p className="text-gray-400 mt-1">
            Add a new company to the platform
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border-l-4 border-red-500 p-4 rounded-lg animate-shake">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div>
            <label
              htmlFor="name"
              className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
            >
              <Building2 className="w-4 h-4 text-indigo-400" />
              Company Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter company name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
            >
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Brief description of the company"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none resize-none"
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Industry */}
            <div>
              <label
                htmlFor="industry"
                className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
              >
                <Briefcase className="w-4 h-4 text-indigo-400" />
                Industry *
              </label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
              >
                <option value="" className="bg-gray-900">
                  Select industry
                </option>
                <option value="Technology" className="bg-gray-900">
                  Technology
                </option>
                <option value="Finance" className="bg-gray-900">
                  Finance
                </option>
                <option value="Healthcare" className="bg-gray-900">
                  Healthcare
                </option>
                <option value="Education" className="bg-gray-900">
                  Education
                </option>
                <option value="Retail" className="bg-gray-900">
                  Retail
                </option>
                <option value="Manufacturing" className="bg-gray-900">
                  Manufacturing
                </option>
                <option value="Consulting" className="bg-gray-900">
                  Consulting
                </option>
                <option value="Real Estate" className="bg-gray-900">
                  Real Estate
                </option>
                <option value="Media & Entertainment" className="bg-gray-900">
                  Media & Entertainment
                </option>
                <option value="Telecommunications" className="bg-gray-900">
                  Telecommunications
                </option>
                <option value="Energy" className="bg-gray-900">
                  Energy
                </option>
                <option value="Transportation" className="bg-gray-900">
                  Transportation
                </option>
                <option value="Hospitality" className="bg-gray-900">
                  Hospitality
                </option>
                <option value="Agriculture" className="bg-gray-900">
                  Agriculture
                </option>
                <option value="Construction" className="bg-gray-900">
                  Construction
                </option>
                <option value="Legal" className="bg-gray-900">
                  Legal
                </option>
                <option value="Non-Profit" className="bg-gray-900">
                  Non-Profit
                </option>
                <option value="Government" className="bg-gray-900">
                  Government
                </option>
                <option value="Other" className="bg-gray-900">
                  Other
                </option>
              </select>
            </div>

            {/* Company Size */}
            <div>
              <label
                htmlFor="size"
                className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                Company Size *
              </label>
              <select
                id="size"
                name="size"
                value={formData.size}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
              >
                <option value="" className="bg-gray-900">
                  Select size
                </option>
                <option value="1-10" className="bg-gray-900">
                  1-10 employees
                </option>
                <option value="11-50" className="bg-gray-900">
                  11-50 employees
                </option>
                <option value="51-200" className="bg-gray-900">
                  51-200 employees
                </option>
                <option value="201-500" className="bg-gray-900">
                  201-500 employees
                </option>
                <option value="501-1000" className="bg-gray-900">
                  501-1000 employees
                </option>
                <option value="1000-5000" className="bg-gray-900">
                  1000-5000 employees
                </option>
                <option value="5000+" className="bg-gray-900">
                  5000+ employees
                </option>
              </select>
            </div>
          </div>

          {/* Two Column Layout - Location & Website */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
              >
                <MapPin className="w-4 h-4 text-indigo-400" />
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="e.g., Paris, France"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
              />
            </div>

            {/* Website */}
            <div>
              <label
                htmlFor="website"
                className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
              >
                <Globe className="w-4 h-4 text-indigo-400" />
                Website
              </label>
              <input
                id="website"
                name="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
              />
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label
              htmlFor="logo_url"
              className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
            >
              <Building2 className="w-4 h-4 text-indigo-400" />
              Logo URL
            </label>
            <input
              id="logo_url"
              name="logo_url"
              type="url"
              placeholder="https://example.com/logo.png"
              value={formData.logo_url}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Direct link to company logo image
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-6 border-t border-white/10">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating Company...
                </span>
              ) : (
                "Create Company"
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-lg font-semibold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Helper Text */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
        <p className="text-sm text-indigo-300">
          <strong>Note:</strong> Fields marked with * are required. Once
          created, you can assign RH users to this company.
        </p>
      </div>
    </div>
  );
}

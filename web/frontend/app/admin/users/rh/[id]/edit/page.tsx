"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { rhService } from "@/lib/api/rh";
import { companiesService, Company } from "@/lib/api/companies";
import { ArrowLeft, Save, Building2, Users, Briefcase } from "lucide-react";

// Mêmes constantes que CreateForm pour consistance
const VALID_DEPARTMENTS = [
  "Human Resources",
  "Talent Acquisition",
  "Recruitment",
  "People Operations",
  "Engineering",
  "Sales",
  "Marketing",
  "Finance",
  "Operations",
  "Product",
  "Customer Success",
  "Administration",
  "Legal",
  "Other",
];

const VALID_POSITIONS = [
  "HR Manager",
  "HR Director",
  "HR Business Partner",
  "Recruiter",
  "Senior Recruiter",
  "Talent Acquisition Manager",
  "Talent Acquisition Specialist",
  "Hiring Manager",
  "People Operations Manager",
  "Head of Talent",
  "Chief People Officer",
  "Chief Human Resources Officer",
  "HR Coordinator",
  "HR Analyst",
  "Recruitment Coordinator",
  "Sourcing Specialist",
  "HR Generalist",
  "Other",
];

export default function EditRHProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    company_id: "",
    department: "",
    position: "",
  });

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Charger Profil + Companies en parallèle
        const [profile, companiesData] = await Promise.all([
          rhService.getById(id),
          companiesService.getAll(),
        ]);

        setFormData({
          company_id: profile.company_id,
          department: profile.department,
          position: profile.position,
        });
        setCompanies(companiesData as Company[]);
      } catch (err) {
        setError("Failed to load data.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      await rhService.update(id, formData);
      router.push(`/admin/users/rh`); // Retour à la liste
    } catch (err: any) {
      // Gestion propre de l'erreur 422
      console.error("Update failed", err);
      setError("Failed to update profile. Please check your inputs.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/users/rh")}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Edit RH Profile</h2>
          <p className="text-gray-400 text-sm">
            Update professional information
          </p>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border-l-4 border-red-500 p-4 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
              <Building2 className="w-4 h-4 text-indigo-400" /> Company
            </label>
            <select
              value={formData.company_id}
              onChange={(e) =>
                setFormData({ ...formData, company_id: e.target.value })
              }
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            >
              <option value="" className="bg-gray-900">
                Select Company
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id} className="bg-gray-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
              <Users className="w-4 h-4 text-indigo-400" /> Department
            </label>
            <select
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            >
              {VALID_DEPARTMENTS.map((d) => (
                <option key={d} value={d} className="bg-gray-900">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
              <Briefcase className="w-4 h-4 text-indigo-400" /> Position
            </label>
            <select
              value={formData.position}
              onChange={(e) =>
                setFormData({ ...formData, position: e.target.value })
              }
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            >
              {VALID_POSITIONS.map((p) => (
                <option key={p} value={p} className="bg-gray-900">
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 pt-6 border-t border-white/10">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

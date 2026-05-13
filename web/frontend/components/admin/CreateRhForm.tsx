"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Building2,
  Briefcase,
  Users as UsersIcon,
  ArrowLeft,
  Eye,
  EyeOff,
  Phone,
  AlertCircle,
} from "lucide-react";

// --- IMPORTS API & ACTIONS ---
import { api } from "@/lib/api";
import { companiesService, Company } from "@/lib/api/companies";
import { rhService } from "@/lib/api/recruiters"; // On utilise le service pour le profil
import { createAuthUserAction } from "@/app/actions/create-auth-user"; // L'action serveur sécurisée

// Listes strictes exigées par le Backend
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

export default function CreateRhForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Typage strict avec l'interface de l'API
  const [companies, setCompanies] = useState<Company[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    company_id: "",
    department: "",
    position: "",
  });

  // Chargement des entreprises
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await companiesService.getAll();
        setCompanies(data as Company[]);
      } catch (err) {
        console.error("Failed to load companies", err);
        setError("Could not load companies list.");
      }
    };
    fetchCompanies();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
      if (!formData.company_id) {
        throw new Error("Please select a company");
      }

      // ---------------------------------------------------------
      // 1. CREATE AUTH USER (Via Server Action sécurisée)
      // ---------------------------------------------------------
      const authResult = await createAuthUserAction({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: "rh", // Autorisé ici car côté serveur
      });

      if (!authResult.success || !authResult.data) {
        throw new Error(authResult.error || "Failed to create auth user");
      }

      const authUserId = authResult.data.user.id;

      // ---------------------------------------------------------
      // 2. CREATE BACKEND USER (Table 'users')
      // ---------------------------------------------------------
      // On envoie le téléphone ici comme demandé
      let newUser;
      try {
        newUser = await api.users.create({
          email: formData.email,
          role: "rh",
          auth_id: authUserId,
          phone: formData.phone, // ✅ Téléphone envoyé ici
        });
      } catch (backendError: any) {
        console.error("Backend user creation failed:", backendError);
        throw new Error("Failed to sync user to backend database");
      }

      // ---------------------------------------------------------
      // 3. CREATE RH PROFILE (Table 'rh_profiles')
      // ---------------------------------------------------------
      // On utilise le service dédié au lieu d'un fetch brut
      await rhService.create({
        user_id: newUser.id, // ID du backend (pas auth_id)
        company_id: formData.company_id,
        department: formData.department,
        position: formData.position,
      });

      // ---------------------------------------------------------
      // SUCCESS
      // ---------------------------------------------------------
      router.push("/admin/users/rh");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create RH user.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/users/rh");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-white">Create New RH User</h2>
          <p className="text-gray-400 mt-1">
            Add a new HR staff member to the platform
          </p>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border-l-4 border-red-500 p-4 rounded-lg animate-shake">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
            >
              <User className="w-4 h-4 text-indigo-400" /> Full Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter full name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
              >
                <Mail className="w-4 h-4 text-indigo-400" /> Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
              >
                <Phone className="w-4 h-4 text-indigo-400" /> Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+1 234 567 890"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
            >
              <Lock className="w-4 h-4 text-indigo-400" /> Initial Password *
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Set initial password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="company_id"
              className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
            >
              <Building2 className="w-4 h-4 text-indigo-400" /> Company *
            </label>
            <select
              id="company_id"
              name="company_id"
              value={formData.company_id}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
            >
              <option value="" className="bg-gray-900">
                Select a company
              </option>
              {companies.map((company) => (
                <option
                  key={company.id}
                  value={company.id}
                  className="bg-gray-900"
                >
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="department"
                className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
              >
                <UsersIcon className="w-4 h-4 text-indigo-400" /> Department *
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
              >
                <option value="" className="bg-gray-900">
                  Select Department
                </option>
                {VALID_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-gray-900">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="position"
                className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2"
              >
                <Briefcase className="w-4 h-4 text-indigo-400" /> Position *
              </label>
              <select
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition duration-200 outline-none"
              >
                <option value="" className="bg-gray-900">
                  Select Position
                </option>
                {VALID_POSITIONS.map((pos) => (
                  <option key={pos} value={pos} className="bg-gray-900">
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6 border-t border-white/10">
            <button
              type="submit"
              disabled={loading || companies.length === 0}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? "Creating RH User..." : "Create RH User"}
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
    </div>
  );
}

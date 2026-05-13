"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  DollarSign,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  Building2,
  User,
  Flag,
} from "lucide-react";
import { jobsApi, CreateJobPayload } from "@/lib/api/jobs";
import { jobSkillsApi, JobSkillPayload } from "@/lib/api/jobSkills";
import { recruitersApi } from "@/lib/api/recruiters";
import { companiesService, Company } from "@/lib/api/companies";
import { authClient } from "@/lib/auth-client";
import { userApi } from "@/lib/api/users"; // CRITICAL IMPORT: For Identity Resolution

interface UiSkill {
  name: string;
  level: string;
  mandatory: boolean;
}

export default function CreateJobForm() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } =
    authClient.useSession();

  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState("");

  // "Setup Mode": Activated if the RH profile does not exist yet
  const [setupMode, setSetupMode] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);

  // Stores the internal User UUID (from users table)
  const [internalUserId, setInternalUserId] = useState<string | null>(null);

  const [skills, setSkills] = useState<UiSkill[]>([
    { name: "", level: "Intermediate", mandatory: false },
  ]);

  const [formData, setFormData] = useState<Partial<CreateJobPayload>>({
    title: "",
    description: "",
    location: "",
    job_type: "Full-time",
    experience_level: "Mid Level",
    salary_min: 0,
    salary_max: 0,
    status: "active",
    company_id: "",
    recruiter_id: "", // Will store the RH Profile ID (existing or new)
  });

  // --- 1. INITIALIZATION & IDENTITY RESOLUTION ---
  useEffect(() => {
    const initData = async () => {
      if (isSessionLoading) return;

      if (!session?.user?.email) {
        setError("You must be logged in.");
        setInitLoading(false);
        return;
      }

      try {
        console.log("🔍 Resolving identity for:", session.user.email);

        // A. Get the real Internal UUID via email (Table: users)
        // (We do this because session.user.id might be a string like "Ox..." instead of a UUID)
        const internalUser = await userApi.getByEmail(session.user.email);
        if (!internalUser || !internalUser.id)
          throw new Error("Internal user not found.");

        setInternalUserId(internalUser.id);
        console.log("✅ Internal UUID found:", internalUser.id);

        // B. Check if a Recruiter Profile already exists (Table: rh_profiles)
        const recruiterProfile = await recruitersApi.getByUserId(
          internalUser.id
        );

        if (recruiterProfile && recruiterProfile.id) {
          console.log(
            "✅ Existing Recruiter Profile found:",
            recruiterProfile.id
          );
          setFormData((prev) => ({
            ...prev,
            recruiter_id: recruiterProfile.id, // This is the ID required by the jobs table!
            company_id: recruiterProfile.company_id,
          }));
        } else {
          console.warn("⚠️ No RH Profile found. Activating Setup Mode.");
          setSetupMode(true);
          await loadCompanies();
        }
      } catch (err) {
        console.error("Initialization error:", err);
        // On error, assume setup is needed or manual intervention
        setSetupMode(true);
        await loadCompanies();
      } finally {
        setInitLoading(false);
      }
    };

    initData();
  }, [session, isSessionLoading]);

  const loadCompanies = async () => {
    try {
      const data = await companiesService.getAll();
      setCompanies(data);
      // Pre-select the first company if available
      if (data.length > 0 && !formData.company_id) {
        setFormData((prev) => ({ ...prev, company_id: data[0].id }));
      }
    } catch (e) {
      console.error("Error loading companies", e);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === "number" ? (value ? Number(value) : 0) : value,
    });
  };

  // --- SKILLS MANAGEMENT ---
  const addSkill = () =>
    setSkills([
      ...skills,
      { name: "", level: "Intermediate", mandatory: false },
    ]);

  const removeSkill = (index: number) => {
    const newSkills = [...skills];
    newSkills.splice(index, 1);
    setSkills(newSkills);
  };

  const updateSkill = (index: number, field: keyof UiSkill, value: any) => {
    const newSkills = [...skills];
    // @ts-ignore
    newSkills[index][field] = value;
    setSkills(newSkills);
  };

  // --- 2. FORM SUBMISSION ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.company_id) {
      setError("Please select a company.");
      setLoading(false);
      return;
    }

    if (skills.length === 0 || skills.some((s) => !s.name.trim())) {
      setError("Please add at least one valid skill.");
      setLoading(false);
      return;
    }

    try {
      // --- CRITICAL STEP: Create RH Profile if needed ---
      let finalRecruiterProfileId = formData.recruiter_id;

      // If we are in setup mode OR we don't have a valid profile ID yet
      if (setupMode || !finalRecruiterProfileId) {
        if (!internalUserId) throw new Error("Internal User ID missing.");

        console.log("🛠️ Auto-creating RH Profile for user:", internalUserId);

        // Create the profile in rh_profiles table
        const newProfile = await recruitersApi.create({
          user_id: internalUserId,
          company_id: formData.company_id,
          department: "HR",
          position: "Recruiter",
        });

        if (!newProfile || !newProfile.id)
          throw new Error("Failed to create RH Profile.");

        finalRecruiterProfileId = newProfile.id;
        console.log("✅ New RH Profile Created:", finalRecruiterProfileId);
      }

      // --- CREATE THE JOB ---
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      const jobPayload: CreateJobPayload = {
        title: formData.title!,
        description: formData.description!,
        location: formData.location!,
        job_type: formData.job_type!,
        experience_level: formData.experience_level!,
        salary_min: formData.salary_min || 0,
        salary_max: formData.salary_max || 0,
        salary_currency: "USD",
        salary_period: "yearly",
        is_salary_negotiable: true,
        status: formData.status || "active",
        company_id: formData.company_id,
        recruiter_id: finalRecruiterProfileId, // Using the validated PROFILE ID
        required_skills: skills.map((s) => s.name),
        expires_at: expirationDate.toISOString(),
      };

      console.log("🚀 Submitting Job:", jobPayload);
      const createdJob = await jobsApi.create(jobPayload);

      if (!createdJob || !createdJob.id)
        throw new Error("Job created but no ID returned.");

      // --- ADD SKILLS ---
      const skillsPayload: JobSkillPayload[] = skills.map((s) => ({
        job_id: createdJob.id,
        skill_name: s.name,
        required_level: s.level,
        is_mandatory: s.mandatory,
        priority: s.mandatory ? "Critical" : "Medium",
        years_required: 0,
        skill_category: "General",
      }));

      await jobSkillsApi.bulkCreate({
        job_id: createdJob.id,
        skills: skillsPayload,
      });

      // Redirect on success
      router.push("/rh/jobs");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while creating the job.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => router.back();

  // --- RENDER ---
  if (initLoading || isSessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
        <p>Verifying profile status...</p>
      </div>
    );
  }

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
          <h2 className="text-3xl font-bold text-white">Post New Job</h2>
          <p className="text-gray-400 mt-1">Create a new job listing</p>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border-l-4 border-red-500 p-4 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Info Box for Setup Mode */}
        {setupMode && (
          <div className="mb-6 bg-indigo-500/10 border-l-4 border-indigo-500 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-indigo-400 mt-0.5" />
              <div>
                <h4 className="text-indigo-400 font-bold text-sm">
                  First Time Setup
                </h4>
                <p className="text-indigo-300/80 text-xs mt-1">
                  It looks like you don't have a Recruiter Profile linked to a
                  company yet. Select a company below, and we will automatically
                  create your profile when you post this job.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Company Selection (Only visible if profile missing) */}
          {setupMode && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white/90 flex items-center gap-2 border-b border-white/10 pb-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                Company Association
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Select Company *
                  </label>
                  <select
                    name="company_id"
                    value={formData.company_id}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white outline-none [&>option]:bg-gray-900"
                  >
                    <option value="" disabled>
                      Select...
                    </option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section: Job Details */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white/90 flex items-center gap-2 border-b border-white/10 pb-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              Job Details
            </h3>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Job Title *
              </label>
              <input
                name="title"
                type="text"
                placeholder="e.g., Senior Frontend Developer"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                rows={6}
                placeholder="Detailed job description..."
                value={formData.description}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white outline-none resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Job Type *
                </label>
                <select
                  name="job_type"
                  value={formData.job_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white outline-none [&>option]:bg-gray-900"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              {/* STATUS FIELD */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Status *
                </label>
                <div className="relative">
                  <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white outline-none [&>option]:bg-gray-900 appearance-none"
                  >
                    <option value="active">Active (Published)</option>
                    <option value="draft">Draft (Unpublished)</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Experience Level *
                </label>
                <select
                  name="experience_level"
                  value={formData.experience_level}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white outline-none [&>option]:bg-gray-900"
                >
                  <option value="Entry Level">Entry Level</option>
                  <option value="Junior">Junior</option>
                  <option value="Mid Level">Mid Level</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead</option>
                  <option value="Manager">Manager</option>
                  <option value="Director">Director</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  name="location"
                  type="text"
                  placeholder="e.g., Paris, France"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Min Salary
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="salary_min"
                    type="number"
                    placeholder="40000"
                    value={formData.salary_min || ""}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Max Salary
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="salary_max"
                    type="number"
                    placeholder="60000"
                    value={formData.salary_max || ""}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Skills */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xl font-semibold text-white/90 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" /> Required
                Skills
              </h3>
              <button
                type="button"
                onClick={addSkill}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg hover:bg-indigo-500/30 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Skill
              </button>
            </div>

            <div className="space-y-4">
              {skills.map((skill, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-4 items-start p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="col-span-11 md:col-span-5">
                    <label className="block text-xs text-gray-400 mb-1">
                      Skill Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., React"
                      value={skill.name}
                      onChange={(e) =>
                        updateSkill(index, "name", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-4">
                    <label className="block text-xs text-gray-400 mb-1">
                      Level
                    </label>
                    <select
                      value={skill.level}
                      onChange={(e) =>
                        updateSkill(index, "level", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none [&>option]:bg-gray-900"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <div className="col-span-4 md:col-span-2 flex flex-col justify-center h-full pt-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={skill.mandatory}
                        onChange={(e) =>
                          updateSkill(index, "mandatory", e.target.checked)
                        }
                        className="peer h-4 w-4 rounded border-gray-600 bg-black/20 text-indigo-500"
                      />
                      <span className="text-sm text-gray-400 group-hover:text-white">
                        Mandatory
                      </span>
                    </label>
                  </div>
                  <div className="col-span-1 flex justify-end pt-6 md:col-start-12">
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6 border-t border-white/10">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-600 disabled:opacity-50"
            >
              {loading
                ? setupMode
                  ? "Creating Profile & Publishing..."
                  : "Publishing..."
                : "Post Job"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-lg font-semibold hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

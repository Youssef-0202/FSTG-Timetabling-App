// =====================================
// SERVICE MOCK avec localStorage
// Pour tester en attendant le backend
// =====================================

import type {
  JobWithDetails,
  ApplicationWithDetails,
  CandidateProfileWithDetails,
  Resume,
  Application,
} from "@/lib/types/database.types";

// =====================================
// DONNÉES STATIQUES DE TEST
// =====================================

const MOCK_JOBS: JobWithDetails[] = [
  {
    id: "job-1",
    title: "Senior Frontend Developer",
    description: "We are looking for an experienced React developer to join our team. You will work on cutting-edge web applications using Next.js, TypeScript, and modern CSS frameworks.\n\nResponsibilities:\n- Develop new user-facing features\n- Build reusable components\n- Optimize applications for speed\n- Collaborate with designers and backend developers",
    location: "Paris, France",
    job_type: "Full-time",
    salary_min: 55000,
    salary_max: 75000,
    status: "active",
    company_id: "company-1",
    recruiter_id: "rh-1",
    created_at: new Date("2024-12-01"),
    company: {
      id: "company-1",
      name: "TechCorp",
      description: "Leading technology company specializing in web solutions",
      industry: "Technology",
      size: "100-500",
      location: "Paris, France",
      website: "https://techcorp.com",
      logo_url: undefined,
      created_at: new Date("2020-01-01"),
    },
    skills: [
      { id: "skill-1", name: "React", category: "Frontend", description: "", created_at: new Date(), required_level: "advanced", is_mandatory: true },
      { id: "skill-2", name: "TypeScript", category: "Language", description: "", created_at: new Date(), required_level: "intermediate", is_mandatory: true },
      { id: "skill-3", name: "Next.js", category: "Framework", description: "", created_at: new Date(), required_level: "intermediate", is_mandatory: false },
      { id: "skill-4", name: "Tailwind CSS", category: "Styling", description: "", created_at: new Date(), required_level: "intermediate", is_mandatory: false },
    ],
    matchScore: 85,
    applicants: 12,
  },
  {
    id: "job-2",
    title: "Full Stack JavaScript Developer",
    description: "Join our dynamic team to build innovative web applications. We use Node.js, Express, and React to create scalable solutions for our clients.",
    location: "Lyon, France",
    job_type: "Full-time",
    salary_min: 45000,
    salary_max: 60000,
    status: "active",
    company_id: "company-2",
    recruiter_id: "rh-2",
    created_at: new Date("2024-11-28"),
    company: {
      id: "company-2",
      name: "WebAgency",
      description: "Creative digital agency",
      industry: "Digital",
      size: "10-50",
      location: "Lyon, France",
      website: "https://webagency.com",
      logo_url: undefined,
      created_at: new Date("2018-05-15"),
    },
    skills: [
      { id: "skill-1", name: "React", category: "Frontend", description: "", created_at: new Date(), required_level: "intermediate", is_mandatory: true },
      { id: "skill-5", name: "Node.js", category: "Backend", description: "", created_at: new Date(), required_level: "intermediate", is_mandatory: true },
      { id: "skill-6", name: "Express", category: "Framework", description: "", created_at: new Date(), required_level: "intermediate", is_mandatory: true },
      { id: "skill-7", name: "MongoDB", category: "Database", description: "", created_at: new Date(), required_level: "beginner", is_mandatory: false },
    ],
    matchScore: 72,
    applicants: 8,
  },
  {
    id: "job-3",
    title: "React Native Mobile Developer",
    description: "We're seeking a talented mobile developer to create cross-platform applications. Experience with React Native and native iOS/Android development is a plus.",
    location: "Remote",
    job_type: "Contract",
    salary_min: 50000,
    salary_max: 70000,
    status: "active",
    company_id: "company-3",
    recruiter_id: "rh-3",
    created_at: new Date("2024-12-05"),
    company: {
      id: "company-3",
      name: "MobileFirst",
      description: "Mobile-first software company",
      industry: "Mobile",
      size: "50-100",
      location: "Remote",
      website: "https://mobilefirst.com",
      logo_url: undefined,
      created_at: new Date("2019-03-20"),
    },
    skills: [
      { id: "skill-1", name: "React", category: "Frontend", description: "", created_at: new Date(), required_level: "advanced", is_mandatory: true },
      { id: "skill-8", name: "React Native", category: "Mobile", description: "", created_at: new Date(), required_level: "advanced", is_mandatory: true },
      { id: "skill-2", name: "TypeScript", category: "Language", description: "", created_at: new Date(), required_level: "intermediate", is_mandatory: false },
      { id: "skill-9", name: "iOS", category: "Mobile", description: "", created_at: new Date(), required_level: "beginner", is_mandatory: false },
    ],
    matchScore: 65,
    applicants: 5,
  },
];

const MOCK_USER_ID = "user-123";

// =====================================
// HELPERS localStorage
// =====================================

const storage = {
  get: <T>(key: string): T | null => {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  
  set: (key: string, value: any): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  },
  
  remove: (key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },
};

// =====================================
// INITIALISATION DES DONNÉES
// =====================================

const initMockData = () => {
  // Profil utilisateur
  if (!storage.get("mock_profile")) {
    storage.set("mock_profile", {
      id: "profile-1",
      user_id: MOCK_USER_ID,
      education: "Master in Computer Science - University of Paris",
      experience: "5 years as Frontend Developer",
      bio: "Passionate developer with expertise in React and modern web technologies",
      current_position: "Senior Frontend Developer",
      years_of_experience: 5,
      created_at: new Date("2020-01-01"),
      user: {
        id: MOCK_USER_ID,
        auth_user_id: "auth-123",
        email: "john.doe@example.com", ////////////////////////////////////////////////////
        name: "John Doe",//////////////////////////////////////////////////////////////////
        phone: "+33 6 12 34 56 78",
        role: "candidate" as const,
        created_at: new Date("2020-01-01"),
        updated_at: new Date(),
      },
      skills: [
        {
          id: "skill-1",
          name: "React",
          category: "Frontend",
          description: "",
          created_at: new Date(),
          candidate_id: "profile-1",
          skill_id: "skill-1",
          proficiency_level: "advanced",
          years: 5,
          source: "cv_parsing",
        },
        {
          id: "skill-2",
          name: "TypeScript",
          category: "Language",
          description: "",
          created_at: new Date(),
          candidate_id: "profile-1",
          skill_id: "skill-2",
          proficiency_level: "advanced",
          years: 4,
          source: "cv_parsing",
        },
        {
          id: "skill-3",
          name: "Next.js",
          category: "Framework",
          description: "",
          created_at: new Date(),
          candidate_id: "profile-1",
          skill_id: "skill-3",
          proficiency_level: "intermediate",
          years: 3,
          source: "cv_parsing",
        },
        {
          id: "skill-4",
          name: "Tailwind CSS",
          category: "Styling",
          description: "",
          created_at: new Date(),
          candidate_id: "profile-1",
          skill_id: "skill-4",
          proficiency_level: "intermediate",
          years: 3,
          source: "cv_parsing",
        },
      ],
      resumes: [
        {
          id: "resume-1",
          candidate_id: "profile-1",
          file_url: "/mock/cv.pdf",
          file_name: "John_Doe_CV_2024.pdf",
          file_size: 524288,
          parsed_text: JSON.stringify({
            skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
          }),
          is_default: true,
          uploaded_at: new Date("2024-11-01"),
        },
      ],
    });
  }

  // Applications
  if (!storage.get("mock_applications")) {
    storage.set("mock_applications", []);
  }

  // Jobs
  if (!storage.get("mock_jobs")) {
    storage.set("mock_jobs", MOCK_JOBS);
  }
};

// =====================================
// MOCK SERVICES
// =====================================

export const mockJobsService = {
  getAll: async (): Promise<JobWithDetails[]> => {
    initMockData();
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simuler latence
    return storage.get<JobWithDetails[]>("mock_jobs") || MOCK_JOBS;
  },

  getById: async (jobId: string): Promise<JobWithDetails> => {
    initMockData();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const jobs = storage.get<JobWithDetails[]>("mock_jobs") || MOCK_JOBS;
    const job = jobs.find((j) => j.id === jobId);
    if (!job) throw new Error("Job not found");
    return job;
  },

  search: async (params: any): Promise<JobWithDetails[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const jobs = storage.get<JobWithDetails[]>("mock_jobs") || MOCK_JOBS;
    return jobs; // Simplified - pas de vraie recherche
  },
};

export const mockApplicationsService = {
  getMyApplications: async (): Promise<ApplicationWithDetails[]> => {
    initMockData();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const applications = storage.get<ApplicationWithDetails[]>("mock_applications") || [];
    return applications;
  },

  getById: async (applicationId: string): Promise<ApplicationWithDetails> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const applications = storage.get<ApplicationWithDetails[]>("mock_applications") || [];
    const app = applications.find((a) => a.id === applicationId);
    if (!app) throw new Error("Application not found");
    return app;
  },

  create: async (data: {
    job_id: string;
    resume_id: string;
    cover_letter?: string;
  }): Promise<Application> => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    
    const jobs = storage.get<JobWithDetails[]>("mock_jobs") || MOCK_JOBS;
    const job = jobs.find((j) => j.id === data.job_id);
    if (!job) throw new Error("Job not found");

    // Assigner un statut aléatoire : 60% pending, 20% accepted, 20% rejected
    const random = Math.random();
    let status: "pending" | "accepted" | "rejected";
    if (random < 0.6) {
      status = "pending";
    } else if (random < 0.8) {
      status = "accepted";
    } else {
      status = "rejected";
    }

    const newApplication: ApplicationWithDetails = {
      id: `app-${Date.now()}`,
      job_id: data.job_id,
      candidate_id: "profile-1",
      resume_id: data.resume_id,
      status: status,
      cover_letter: data.cover_letter,
      applied_at: new Date(),
      job: job,
      resume: {} as any,
      matchScore: {
        id: `match-${Date.now()}`,
        application_id: `app-${Date.now()}`,
        overall_score: job.matchScore || 75,
        skills_score: 80,
        experience_score: 70,
        education_score: 75,
        calculated_at: new Date(),
        algorithm_version: "1.0",
      },
    };

    const applications = storage.get<ApplicationWithDetails[]>("mock_applications") || [];
    applications.push(newApplication);
    storage.set("mock_applications", applications);

    return newApplication;
  },

  checkApplied: async (jobId: string): Promise<{ applied: boolean }> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const applications = storage.get<ApplicationWithDetails[]>("mock_applications") || [];
    const applied = applications.some((app) => app.job_id === jobId);
    return { applied };
  },

  getStats: async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const applications = storage.get<ApplicationWithDetails[]>("mock_applications") || [];
    
    const total = applications.length;
    const pending = applications.filter((a) => a.status === "pending").length;
    const accepted = applications.filter((a) => a.status === "accepted").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    const avgMatchScore = total > 0
      ? Math.round(applications.reduce((sum, a) => sum + (a.matchScore?.overall_score || 0), 0) / total)
      : 0;

    return { total, pending, accepted, rejected, avgMatchScore };
  },
};

export const mockProfileService = {
  getMe: async (): Promise<CandidateProfileWithDetails> => {
    initMockData();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const profile = storage.get<CandidateProfileWithDetails>("mock_profile");
    if (!profile) throw new Error("Profile not found");
    return profile;
  },

  update: async (data: Partial<CandidateProfileWithDetails>) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const profile = storage.get<CandidateProfileWithDetails>("mock_profile");
    if (!profile) throw new Error("Profile not found");

    const updated = { ...profile, ...data };
    storage.set("mock_profile", updated);
    return updated;
  },

  updateSkills: async (skills: any) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    // Simplified
    return { success: true };
  },
};

export const mockResumesService = {
  getAll: async (): Promise<Resume[]> => {
    initMockData();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const profile = storage.get<CandidateProfileWithDetails>("mock_profile");
    return profile?.resumes || [];
  },

  upload: async (file: File): Promise<Resume> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const newResume: Resume = {
      id: `resume-${Date.now()}`,
      candidate_id: "profile-1",
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      file_size: file.size,
      parsed_text: JSON.stringify({ skills: ["React", "TypeScript"] }),
      is_default: false,
      uploaded_at: new Date(),
    };

    const profile = storage.get<CandidateProfileWithDetails>("mock_profile");
    if (profile) {
      profile.resumes.push(newResume);
      storage.set("mock_profile", profile);
    }

    return newResume;
  },

  setDefault: async (resumeId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const profile = storage.get<CandidateProfileWithDetails>("mock_profile");
    if (profile) {
      profile.resumes.forEach((r) => {
        r.is_default = r.id === resumeId;
      });
      storage.set("mock_profile", profile);
    }
  },

  download: async (resumeId: string): Promise<Blob> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    // Simuler un fichier PDF vide
    return new Blob(["Mock PDF content"], { type: "application/pdf" });
  },

  delete: async (resumeId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const profile = storage.get<CandidateProfileWithDetails>("mock_profile");
    if (profile) {
      profile.resumes = profile.resumes.filter((r) => r.id !== resumeId);
      storage.set("mock_profile", profile);
    }
  },
};

// =====================================
// HELPER: Réinitialiser les données
// =====================================

export const resetMockData = () => {
  storage.remove("mock_profile");
  storage.remove("mock_applications");
  storage.remove("mock_jobs");
  initMockData();
};
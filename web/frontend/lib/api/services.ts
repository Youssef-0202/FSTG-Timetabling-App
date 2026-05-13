// =====================================
// Services API pour l'espace candidat
// Bascule automatique entre Mock et API Réelle
// =====================================

import { apiFetch } from "./config";
import { USE_MOCK_API } from "./mode.config";
import {
  mockJobsService,
  mockApplicationsService,
  mockProfileService,
  mockResumesService,
} from "./mockStorage.service";
import type {
  JobWithDetails,
  ApplicationWithDetails,
  CandidateProfileWithDetails,
  Application,
  Resume,
} from "@/lib/types/database.types";

// =====================================
// JOBS SERVICE
// =====================================

const realJobsService = {
  getAll: async (): Promise<JobWithDetails[]> => {
    return apiFetch<JobWithDetails[]>("/jobs");
  },
  getById: async (jobId: string): Promise<JobWithDetails> => {
    return apiFetch<JobWithDetails>(`/jobs/${jobId}`);
  },
  search: async (params: {
    query?: string;
    location?: string;
    jobType?: string;
  }): Promise<JobWithDetails[]> => {
    const searchParams = new URLSearchParams(params as Record<string, string>);
    return apiFetch<JobWithDetails[]>(`/jobs/search?${searchParams}`);
  },
};

export const jobsService = USE_MOCK_API ? mockJobsService : realJobsService;

// =====================================
// APPLICATIONS SERVICE
// =====================================

const realApplicationsService = {
  getMyApplications: async (): Promise<ApplicationWithDetails[]> => {
    return apiFetch<ApplicationWithDetails[]>("/applications/me");
  },
  getById: async (applicationId: string): Promise<ApplicationWithDetails> => {
    return apiFetch<ApplicationWithDetails>(`/applications/${applicationId}`);
  },
  create: async (data: {
    job_id: string;
    resume_id: string;
    cover_letter?: string;
  }): Promise<Application> => {
    return apiFetch<Application>("/applications", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  checkApplied: async (jobId: string): Promise<{ applied: boolean }> => {
    return apiFetch<{ applied: boolean }>(`/applications/check/${jobId}`);
  },
  getStats: async (): Promise<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    avgMatchScore: number;
  }> => {
    return apiFetch("/applications/stats");
  },
};

export const applicationsService = USE_MOCK_API ? mockApplicationsService : realApplicationsService;

// =====================================
// PROFILE SERVICE
// =====================================

const realProfileService = {
  getMe: async (): Promise<CandidateProfileWithDetails> => {
    return apiFetch<CandidateProfileWithDetails>("/profile/me");
  },
  update: async (data: Partial<CandidateProfileWithDetails>) => {
    return apiFetch("/profile/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  updateSkills: async (skills: { skill_id: string; proficiency_level: string }[]) => {
    return apiFetch("/profile/skills", {
      method: "PUT",
      body: JSON.stringify({ skills }),
    });
  },
};

export const profileService = USE_MOCK_API ? mockProfileService : realProfileService;

// =====================================
// RESUMES SERVICE
// =====================================

const realResumesService = {
  getAll: async (): Promise<Resume[]> => {
    return apiFetch<Resume[]>("/resumes");
  },
  upload: async (file: File): Promise<Resume> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<Resume>("/resumes/upload", {
      method: "POST",
      body: formData,
      headers: {}, // On laisse le navigateur définir le Content-Type pour FormData
    });
  },
  setDefault: async (resumeId: string): Promise<void> => {
    return apiFetch(`/resumes/${resumeId}/set-default`, {
      method: "PATCH",
    });
  },
  download: async (resumeId: string): Promise<Blob> => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/resumes/${resumeId}/download`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      }
    );
    return response.blob();
  },
  delete: async (resumeId: string): Promise<void> => {
    return apiFetch(`/resumes/${resumeId}`, {
      method: "DELETE",
    });
  },
};

export const resumesService = USE_MOCK_API ? mockResumesService : realResumesService;

// =====================================
// MATCH SCORES SERVICE (Optionnel)
// =====================================

export const matchScoresService = {
  getForApplication: async (applicationId: string) => {
    if (USE_MOCK_API) {
      // Mode mock - retourner un score fictif
      return {
        id: `match-${applicationId}`,
        application_id: applicationId,
        overall_score: 75,
        skills_score: 80,
        experience_score: 70,
        education_score: 75,
        calculated_at: new Date(),
        algorithm_version: "1.0",
      };
    }
    return apiFetch(`/match-scores/${applicationId}`);
  },

  recalculate: async (applicationId: string) => {
    if (USE_MOCK_API) {
      return { success: true };
    }
    return apiFetch(`/match-scores/${applicationId}/recalculate`, {
      method: "POST",
    });
  },
};
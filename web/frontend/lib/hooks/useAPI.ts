// =====================================
// Hooks React pour les appels API
// =====================================

import { useState, useEffect } from "react";
import {
  jobsService,
  applicationsService,
  profileService,
  resumesService,
} from "@/lib/api/services";
import type {
  JobWithDetails,
  ApplicationWithDetails,
  CandidateProfileWithDetails,
  Resume,
} from "@/lib/types/database.types";

// =====================================
// Hook générique pour les appels API
// =====================================

interface UseAPIState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useAPI<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
): UseAPIState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}

// =====================================
// Hooks spécifiques pour les Jobs
// =====================================

export function useJobs() {
  return useAPI<JobWithDetails[]>(() => jobsService.getAll());
}

export function useJob(jobId: string) {
  return useAPI<JobWithDetails>(() => jobsService.getById(jobId), [jobId]);
}

// =====================================
// Hooks pour les Applications
// =====================================

export function useApplications() {
  return useAPI<ApplicationWithDetails[]>(
    () => applicationsService.getMyApplications()
  );
}

export function useApplication(applicationId: string) {
  return useAPI<ApplicationWithDetails>(
    () => applicationsService.getById(applicationId),
    [applicationId]
  );
}

export function useApplicationStats() {
  return useAPI(() => applicationsService.getStats());
}

// =====================================
// Hook pour le Profil
// =====================================

export function useProfile() {
  return useAPI<CandidateProfileWithDetails>(() => profileService.getMe());
}

// =====================================
// Hook pour les CVs
// =====================================

export function useResumes() {
  return useAPI<Resume[]>(() => resumesService.getAll());
}

// =====================================
// Hook pour vérifier si déjà postulé
// =====================================

export function useCheckApplied(jobId: string) {
  return useAPI<{ applied: boolean }>(
    () => applicationsService.checkApplied(jobId),
    [jobId]
  );
}
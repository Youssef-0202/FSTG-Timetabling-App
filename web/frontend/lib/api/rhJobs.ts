import { client } from "./client"; 
import { Job } from "@/types/job";

export const rhJobsApi = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    status?: string;
    query?: string; 
    company_id?: string;
    recruiter_id?: string; 
  }) => {
    const queryParams = new URLSearchParams();
    
    if (params?.skip) queryParams.append("skip", params.skip.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    
    if (params?.status && params.status !== "all") {
      queryParams.append("status", params.status);
    }
    
    if (params?.query) queryParams.append("query", params.query);
    if (params?.company_id) queryParams.append("company_id", params.company_id);
    if (params?.recruiter_id) queryParams.append("recruiter_id", params.recruiter_id);

    return client.get<Job[]>(`/api/jobs/?${queryParams.toString()}`);
  },

  getOne: async (id: string) => {
    return client.get<Job>(`/api/jobs/${id}`);
  },

  create: async (data: Partial<Job>) => {
    return client.post<Job>("/api/jobs/", data);
  },

  update: async (id: string, data: Partial<Job>) => {
    return client.put<Job>(`/api/jobs/${id}`, data);
  },

 



delete: async (id: string, permanent: boolean = false) => {
  return client.delete<void>(`/api/jobs/${id}?permanent=${permanent}`);
}
};
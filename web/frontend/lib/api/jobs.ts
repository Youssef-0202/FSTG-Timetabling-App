import { client } from "./client"; 
import { Job } from "@/types/job";


export interface JobQueryParams {
  status?: string;
  company_id?: string;
  recruiter_id?: string;
  skip?: number;
  limit?: number;
}

export interface CreateJobPayload {
  title: string;
  description: string;
  location: string;
  job_type: string;
  experience_level: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  is_salary_negotiable?: boolean;
  company_id: string;
  recruiter_id: string;
  status: string;
  required_skills: string[]; 
  expires_at?: string;
}

export const jobsApi = {
  
  getAll: async (params: JobQueryParams = {}) => {
    const queryParams = new URLSearchParams();

    if (params.skip !== undefined) queryParams.append("skip", params.skip.toString());
    if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());
    if (params.status) queryParams.append("status", params.status);
    if (params.company_id) queryParams.append("company_id", params.company_id);
    if (params.recruiter_id) queryParams.append("recruiter_id", params.recruiter_id);

    return client.get<Job[]>(`/api/jobs/?${queryParams.toString()}`);
  },

 

  getById: async (id: string) => {
    return client.get<Job>(`/api/jobs/${id}`);
  },


  
  delete: async (id: string, permanent: boolean = false) => {
    return client.delete<void>(`/api/jobs/${id}?permanent=${permanent}`);
  },

  create: async (data: CreateJobPayload) => {
    return client.post<Job>('/api/jobs/', data);
  }


  
};
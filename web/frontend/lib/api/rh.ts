import { client } from "@/lib/api/client";

export interface RHProfile {
  id: string;
  user_id: string;
  user_email?: string; // Peut venir d'une jointure backend
  user_name?: string;  // Peut venir d'une jointure backend
  company_id: string;
  company_name?: string;
  department: string;
  position: string;
  phone?: string;
  created_at: string;
  
  // Stats fournies par le GET /{id}
  total_jobs_posted?: number;
  active_jobs?: number;
  total_applications?: number;
  pending_applications?: number;
}

// Type pour l'update (PUT)
export interface RHProfileUpdate {
  company_id?: string;
  department?: string;
  position?: string;
}

export const rhService = {
  // ... getAll existant ...

  getAll: async (
    page: number = 1,
    pageSize: number = 8,
    companyId: string = "",
    department: string = ""
  ) => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("page_size", pageSize.toString());
    if (companyId) params.append("company_id", companyId);
    if (department) params.append("department", department);
    return client.get<RHProfile[]>(`/rh-profiles/?${params.toString()}`);
  },

  // 1. GET BY ID
  getById: async (id: string) => {
    return client.get<RHProfile>(`/rh-profiles/${id}`);
  },

  // 2. UPDATE (PUT)
  update: async (id: string, data: RHProfileUpdate) => {
    return client.put<RHProfile>(`/rh-profiles/${id}`, data);
  },

  // 3. DELETE
  delete: async (id: string) => {
    return client.delete<void>(`/rh-profiles/${id}`);
  }
};
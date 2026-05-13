export interface Job {
  id: string;
  title: string;
  description: string;
  company_id: string;
  company_name: string;
  company_logo?: string;
  location: string;
  job_type: string;
  experience_level: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  status: string;
  created_at: string;
  expires_at?: string;
  total_applications: number;
  required_skills?: string[];
  is_featured: boolean;
  is_urgent: boolean;
}
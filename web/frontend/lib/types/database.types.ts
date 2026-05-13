// =====================================
// Types de base de données (Backend PostgreSQL)
// =====================================

export interface User {
  id: string; // UUID
  auth_user_id: string; // UUID pour l'authentification
  email: string;
  role: "candidate" | "rh";
  phone?: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CandidateProfile {
  id: string; // UUID
  user_id: string; // FK -> users
  education?: string;
  experience?: string;
  bio?: string;
  current_position?: string;
  years_of_experience?: number;
  created_at: Date | string;
}

export interface Resume {
  id: string; // UUID
  candidate_id: string; // FK -> candidate_profiles
  file_url: string;
  file_name: string;
  filename?: string;
  file_size: number; // en bytes
  parsed_text?: string;
  is_default: boolean;
  uploaded_at: Date | string;
}

export interface Skill {
  id: string; // UUID (ou PK composite avec name)
  name: string; // UNIQUE
  category?: string;
  description?: string;
  created_at: Date | string;
}

export interface CandidateSkill {
  id: string; // UUID (ou PK composite)
  candidate_id: string; // FK -> candidate_profiles
  skill_id: string; // FK -> skills
  proficiency_level?: string; // "beginner", "intermediate", "advanced", "expert"
  years?: number;
  source?: string; // "manual", "cv_parsing", "test"
}

export interface Company {
  id: string; // UUID
  name: string;
  description?: string;
  industry?: string;
  size?: string;
  location?: string;
  website?: string;
  logo_url?: string;
  email?: string;
  phone?: string;
  created_at: Date | string;
}

export interface Job {
  id: string; // UUID
  title: string;
  description: string;
  location: string;
  job_type: string; // "Full-time", "Part-time", "Contract", "Internship"
  salary_min?: number;
  salary_max?: number;
  status: string; // "active", "closed", "draft"
  company_id: string; // FK -> companies
  recruiter_id: string; // FK -> rh_profiles
  created_at: Date | string;
}

export interface JobSkill {
  id: string; // UUID
  job_id: string; // FK -> jobs
  skill_id: string; // FK -> skills
  required_level?: string;
  is_mandatory: boolean;
}

export interface Application {
  id: string; // UUID
  job_id: string; // FK -> jobs
  candidate_id: string; // FK -> candidate_profiles
  resume_id: string; // FK -> resumes
  status: "pending" | "accepted" | "rejected"; // 3 statuts
  cover_letter?: string;
  applied_at: Date | string;
}

export interface MatchScore {
  id: string; // UUID
  application_id: string; // FK -> applications
  overall_score: number; // 0-100
  skills_score: number;
  experience_score: number;
  education_score: number;
  calculated_at: Date | string;
  algorithm_version: string;
}

// =====================================
// Types enrichis pour le Frontend
// =====================================

export interface JobWithDetails extends Job {
  company: Company;
  skills: (Skill & { required_level?: string; is_mandatory: boolean })[];
  matchScore?: number; // Calculé par le backend
  applicants?: number;
  salary_range?: string;
}

export interface ApplicationWithDetails extends Application {
  job: JobWithDetails;
  resume: Resume;
  matchScore?: MatchScore;
  matchedSkills?: string[];
  missingSkills?: string[];
  timeline?: any[];
}

export interface CandidateProfileWithDetails extends CandidateProfile {
  user: User;
  skills: (Skill & CandidateSkill)[];
  resumes: Resume[];
}
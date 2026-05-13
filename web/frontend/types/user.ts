// types/user.ts

export interface User {
  id: string; // C'est le UUID interne (ex: 3fa85f64...)
  email: string;
  role: string;
  auth_user_id_unique: string; // L'ID venant de better-auth (ex: "Ox...")
  created_at: string;
}

export interface CandidateProfile {
  id: string;
  user_id: string; // UUID interne
  education: string;
  experience: string;
  bio: string;
  current_position: string;
  years_of_experience: number;
  cv_uploaded: boolean;
  stats: {
    total_resumes: number;
    total_skills: number;
    total_applications: number;
    pending_applications: number;
    profile_completion_percentage: number;
  };
}
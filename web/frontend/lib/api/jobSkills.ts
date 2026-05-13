// lib/api/jobSkills.ts
import { client } from "./client";

// Définition d'une compétence détaillée pour l'envoi (Payload)
export interface JobSkillPayload {
  job_id: string;
  skill_name: string;
  required_level: string; // "Beginner", "Intermediate", "Advanced", "Expert"
  is_mandatory: boolean;
  priority?: string;      // "Low", "Medium", "High", "Critical"
  years_required?: number;
  skill_category?: string;
}

export interface BulkCreateSkillsPayload {
  job_id: string;
  skills: JobSkillPayload[];
}

export const jobSkillsApi = {
  // POST /job-skills/bulk
  // Permet d'ajouter toutes les compétences d'un coup avec leurs niveaux et priorités
  bulkCreate: async (data: BulkCreateSkillsPayload) => {
    return client.post('/job-skills/bulk', data);
  },

  // POST /job-skills/with-name (Au cas où vous voudriez en ajouter une seule)
  createWithName: async (data: JobSkillPayload) => {
    return client.post('/job-skills/with-name', data);
  }
};
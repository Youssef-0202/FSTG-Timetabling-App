// lib/api/users.ts
import { client } from "./client";
import { User, CandidateProfile } from "@/types/user";

export const userApi = {
  // 1. Récupérer l'utilisateur interne via son email
  getByEmail: async (email: string) => {
    // L'email doit être encodé au cas où il contient des caractères spéciaux
    return client.get<User>(`/users/email/${encodeURIComponent(email)}`);
  },

  // 2. Récupérer le profil candidat via l'UUID interne
  getCandidateProfile: async (userId: string) => {
    return client.get<CandidateProfile>(`/candidate-profiles/user/${userId}`);
  }
};
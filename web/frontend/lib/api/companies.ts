import { client } from "./client";

export interface Company {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  // On autorise "string" générique pour éviter les erreurs de validation strictes des formulaires
  size?: "1-10" | "11-50" | "51-200" | "201-500" | "500+" | string;
  location?: string;
  website?: string;
  logo_url?: string;
  
  // Champs de date (optionnels pour gérer les variations du backend)
  create_at?: string; 
  created_at?: string;

  // --- STATS (Ajoutées pour corriger les erreurs de build dans ViewCompanyModal) ---
  // Ces champs sont renvoyés par l'API lors d'un GET by ID
  total_employees?: number;
  total_jobs?: number;
  active_jobs?: number;
  total_applications?: number;
}

export interface CreateCompanyData {
  name: string;
  description?: string;
  industry?: string;
  size?: string;
  location?: string;
  website?: string;
  logo_url?: string;
}

export const companiesService = {
  // Récupérer toutes les entreprises
  getAll: async () => {
    // Note: Le slash final '/companies/' est souvent préféré par les backends Python (FastAPI/Django)
    // Si votre API renvoie 404, essayez d'enlever le slash final.
    return client.get<Company[]>('/companies/'); 
  },

  // Récupérer une entreprise par ID (contient souvent les stats détaillées)
  getById: async (id: string) => {
    return client.get<Company>(`/companies/${id}`);
  },

  // Créer une nouvelle entreprise
  create: async (data: CreateCompanyData) => {
    return client.post<Company>('/companies/', data);
  },

  // Mettre à jour une entreprise existante
  update: async (id: string, data: Partial<Company>) => {
    return client.put<Company>(`/companies/${id}`, data);
  },

  // Supprimer une entreprise (avec paramètre force pour suppression en cascade)
  delete: async (id: string, force: boolean = false) => {
    return client.delete<void>(`/companies/${id}?force=${force}`);
  },
};
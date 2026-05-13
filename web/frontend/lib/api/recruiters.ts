import { client } from "./client";

// Interface principale (Correspond à la table 'rh_profiles')
export interface RHProfile {
  id: string;          // ID du profil RH
  user_id: string;     // ID de l'utilisateur (Auth)
  company_id: string;  // ID de l'entreprise
  department: string;
  position: string;
  created_at?: string; // Optionnel selon le backend
  
  // Stats optionnelles (peuvent venir d'une jointure)
  total_jobs_posted?: number;
  active_jobs?: number;
}

// Interface pour la création (Payload POST)
export interface CreateRHPayload {
  user_id: string;
  company_id: string;
  department: string;
  position: string;
}

// Interface pour la mise à jour (Payload PUT)
export interface UpdateRHPayload {
  company_id?: string;
  department?: string;
  position?: string;
}

// Paramètres de filtrage (GET)
export interface RHQueryParams {
  page?: number;
  page_size?: number;
  company_id?: string;
  department?: string;
  user_id?: string; // Utile pour le getByUserId
}

export const rhService = {
  // ------------------------------------------------------------------
  // 1. LECTURE (GET)
  // ------------------------------------------------------------------

  // Récupère la liste avec pagination et filtres
  getAll: async (params: RHQueryParams = {}) => {
    const query = new URLSearchParams();
    
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());
    if (params.company_id) query.append('company_id', params.company_id);
    if (params.department) query.append('department', params.department);
    if (params.user_id) query.append('user_id', params.user_id);

    return client.get<RHProfile[]>(`/rh-profiles/?${query.toString()}`);
  },

  // Récupérer un profil par son ID unique
  getById: async (profileId: string) => {
    return client.get<RHProfile>(`/rh-profiles/${profileId}`);
  },

  // Récupérer le profil RH via l'ID utilisateur (Astuce via filtre)
  getByUserId: async (userId: string) => {
    try {
      // On utilise getAll avec le filtre user_id
      const profiles = await client.get<RHProfile[]>(`/rh-profiles/?user_id=${userId}`);
      // On retourne le premier résultat ou null
      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.warn("Could not fetch RH profile via user_id:", error);
      return null;
    }
  },

  // ------------------------------------------------------------------
  // 2. ÉCRITURE (POST / PUT / DELETE)
  // ------------------------------------------------------------------

  // CRÉATION (Indispensable pour CreateRhForm)
  create: async (data: CreateRHPayload) => {
    return client.post<RHProfile>("/rh-profiles/", data);
  },

  // MISE À JOUR
  update: async (id: string, data: UpdateRHPayload) => {
    return client.put<RHProfile>(`/rh-profiles/${id}`, data);
  },

  // SUPPRESSION
  delete: async (id: string) => {
    return client.delete<void>(`/rh-profiles/${id}`);
  }
};

// Export d'un alias pour la compatibilité si d'autres fichiers utilisent recruitersApi
export const recruitersApi = rhService;
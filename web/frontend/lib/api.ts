const API_BASE_URL = 'http://localhost:8000';


// Types pour la recherche (pour être propre)
export interface CandidateSearchFilters {
  query?: string;
  min_years_experience?: number;
  max_years_experience?: number;
  skills?: string[];
  has_resume?: boolean;
  limit?: number;
  offset?: number;
}

export const api = {
  // ---------------------------------------------------------
  // 1. GESTION DES UTILISATEURS (Table 'users')
  // ---------------------------------------------------------
  users: {
    create: async (userData: { email: string; role: string; phone?: string ;auth_id?: string }) => {
      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Gestion propre de l'erreur
        let errorMessage = 'Failed to create backend user';
        if (error.detail) {
            if (typeof error.detail === 'string') {
                errorMessage = error.detail;
            } else if (Array.isArray(error.detail)) {
                errorMessage = error.detail
                    .map((err: any) => `${err.loc ? err.loc.join('.') : 'Field'}: ${err.msg}`)
                    .join(' | ');
            } else {
                errorMessage = JSON.stringify(error.detail);
            }
        }
        
        console.error('Backend Error:', errorMessage);
        throw new Error(errorMessage);
      }

      return response.json();
    },

    getById: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return null; 
      return response.json();
    },

    delete: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    },
  },

  // ---------------------------------------------------------
  // 2. GESTION DES CANDIDATS (Table 'candidate_profiles')
  // C'est ici qu'on respecte votre Swagger POST /candidate-profiles/
  // ---------------------------------------------------------
  candidates: {
    // MODIFICATION ICI : On accepte les champs optionnels
    create: async (profileData: { 
      user_id: string;
      education?: string;
      experience?: string;
      bio?: string;
      current_position?: string;
      years_of_experience?: number;
    }) => {
      
      const payload = {
        user_id: profileData.user_id,
        // Si aucune donnée n'est fournie, on envoie une chaîne vide ""
        education: profileData.education || "", 
        experience: profileData.experience || "",
        bio: profileData.bio || "",
        current_position: profileData.current_position || "",
        years_of_experience: profileData.years_of_experience || 0
      };

      const response = await fetch(`${API_BASE_URL}/candidate-profiles/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error.detail) || 'Failed to create candidate profile');
      }
      return response.json();
    },


  
    
    





  getAll: async (page: number = 1, pageSize: number = 100) => {
      const response = await fetch(
        `${API_BASE_URL}/candidate-profiles/?page=${page}&page_size=${pageSize}`, 
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        // Lecture détaillée de l'erreur pour le debug
        const error = await response.json();
        console.error("API Error getAll:", error);
        
        const msg = error.detail 
            ? (typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail))
            : 'Failed to fetch candidates';
        throw new Error(msg);
      }
      return response.json();
    },


    getById: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/candidate-profiles/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        // Si le profil n'existe pas
        return null;
      }
      return response.json();
    },

    delete: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/candidate-profiles/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    }


  },
};
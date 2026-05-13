const API_BASE_URL = 'http://localhost:8000';

export interface Candidate {
  id: string;
  user_id: string;
  current_position: string;
  years_of_experience: number;
  total_skills: number;
  created_at: string;
  education?: string;
  experience_desc?: string;
  bio?: string;
}

export const candidateService = {
  // Récupération de tous les candidats (Max 100 pour le filtrage frontend)
  getAll: async (page: number = 1, pageSize: number = 100) => {
    const response = await fetch(
      `${API_BASE_URL}/candidate-profiles/?page=${page}&page_size=${pageSize}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch candidates');
    }
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/candidate-profiles/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  },
};
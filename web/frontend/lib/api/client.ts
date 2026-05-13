const API_BASE_URL = "http://localhost:8000";

type FetchOptions = RequestInit & {
  headers?: Record<string, string>;
};

async function fetchClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { headers, ...rest } = options;
  const config: RequestInit = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  try {
    const response = await fetch(
      `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`,
      config
    );

    if (!response.ok) {
      // On récupère le corps de l'erreur JSON
      const errorBody = await response.json().catch(() => ({}));

      // FastAPI renvoie souvent "detail", parfois sous forme de tableau (validation) ou de chaîne
      const serverError = errorBody?.detail || errorBody?.details || errorBody?.message;
      
      let errorMessage = `HTTP error! status: ${response.status}`;

      if (serverError) {
        if (Array.isArray(serverError)) {
          // Si c'est un tableau d'erreurs de validation (ex: Pydantic)
          errorMessage = serverError
            .map((err: any) => {
              // On essaie de récupérer le nom du champ (loc est souvent ["body", "industry"])
              const field = err.loc ? err.loc[err.loc.length - 1] : "Field";
              return `${field}: ${err.msg}`;
            })
            .join(", ");
        } else {
          // Si c'est juste un message texte
          errorMessage = String(serverError);
        }
      }

      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    console.error("API Request Failed:", error);
    throw error;
  }
}

export const client = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    fetchClient<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body: any, options?: FetchOptions) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: any, options?: FetchOptions) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    fetchClient<T>(endpoint, { ...options, method: "DELETE" }),
};
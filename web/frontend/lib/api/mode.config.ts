// =====================================
// Configuration du Mode API
// Bascule entre Mock (localStorage) et API Réelle
// =====================================

// ⚙️ CHANGEZ CETTE VALEUR POUR BASCULER DE MODE
export const USE_MOCK_API = true; // true = Mock, false = API réelle

// =====================================
// AIDE VISUELLE (Ne pas supprimer)
// =====================================

/*
╔═══════════════════════════════════════════════════════════════╗
║                   MODE DE L'APPLICATION                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  USE_MOCK_API = true   →  ✅ Mode Mock (localStorage)        ║
║                           - Données persistantes localement   ║
║                           - Pas besoin du backend             ║
║                           - Idéal pour développer/tester      ║
║                                                               ║
║  USE_MOCK_API = false  →  🌐 Mode API Réelle                 ║
║                           - Connecté au backend PostgreSQL    ║
║                           - Authentification requise          ║
║                           - Données en temps réel             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
*/

// =====================================
// Helper pour vérifier le mode
// =====================================

export const getAPIMode = () => {
  return {
    isMock: USE_MOCK_API,
    isReal: !USE_MOCK_API,
    modeName: USE_MOCK_API ? "Mock (localStorage)" : "Real API",
  };
};

// =====================================
// Log du mode au démarrage (dev only)
// =====================================

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const mode = getAPIMode();
  console.log(
    `%c🔧 API Mode: ${mode.modeName}`,
    "background: #4F46E5; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;"
  );
  
  if (USE_MOCK_API) {
    console.log(
      "%c📦 Utilisation de localStorage pour les données",
      "color: #10B981; font-weight: bold;"
    );
  } else {
    console.log(
      "%c🌐 Connecté à l'API: " + (process.env.NEXT_PUBLIC_API_URL || "localhost:8000"),
      "color: #3B82F6; font-weight: bold;"
    );
  }
}
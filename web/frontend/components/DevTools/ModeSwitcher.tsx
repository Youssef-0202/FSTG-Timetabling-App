"use client";

import { useState } from "react";
import { getAPIMode } from "@/lib/api/mode.config";
import { resetMockData } from "@/lib/api/mockStorage.service";
import { Database, Trash2, RefreshCw } from "lucide-react";

/**
 * Composant de Développement - Mode Switcher
 *
 * Affiche le mode actuel et permet de gérer les données mock
 * À utiliser uniquement en développement
 *
 * Usage:
 * Ajoutez ce composant dans app/layout.tsx (uniquement si NODE_ENV === 'development')
 */
export function ModeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const mode = getAPIMode();

  // Ne pas afficher en production
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const handleReset = () => {
    if (
      confirm(
        "Réinitialiser toutes les données mock ? Cette action est irréversible."
      )
    ) {
      resetMockData();
      window.location.reload();
    }
  };

  const handleClearAll = () => {
    if (
      confirm("Supprimer TOUTES les données localStorage (y compris auth) ?")
    ) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const viewData = (key: string) => {
    const data = localStorage.getItem(key);
    if (data) {
      console.log(`📦 ${key}:`, JSON.parse(data));
      alert(`Données affichées dans la console (F12)`);
    } else {
      alert(`Aucune donnée trouvée pour ${key}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Bouton Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${mode.isMock
          ? "bg-green-600 hover:bg-green-700"
          : "bg-blue-600 hover:bg-blue-700"
          }`}
        title={`Mode: ${mode.modeName}`}
      >
        <Database className="w-6 h-6 text-white" />
      </button>

      {/* Panel - Version Compacte */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div
            className={`p-4 ${mode.isMock ? "bg-green-600" : "bg-blue-600"
              } text-white`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                <span className="font-bold">Dev Tools</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="text-sm mt-2 opacity-90">
              Mode: <span className="font-bold">{mode.modeName}</span>
            </p>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Mode Info */}
            <div className="bg-gray-800 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-2 h-2 rounded-full ${mode.isMock ? "bg-green-500" : "bg-blue-500"
                    }`}
                />
                <span className="text-gray-300 font-medium">
                  {mode.isMock ? "Mock Data (localStorage)" : "Real API"}
                </span>
              </div>
              {mode.isMock && (
                <p className="text-gray-400 text-xs">
                  Les données sont stockées localement et persistent entre les
                  sessions.
                </p>
              )}
              {mode.isReal && (
                <p className="text-gray-400 text-xs">
                  Connecté à: {process.env.NEXT_PUBLIC_API_URL || "N/A"}
                </p>
              )}
            </div>

            {/* Actions (Mode Mock uniquement) */}
            {mode.isMock && (
              <>
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium uppercase">
                    Gestion des Données
                  </p>

                  <button
                    onClick={() => viewData("mock_profile")}
                    className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm flex items-center gap-2 transition-colors"
                  >
                    <span>👤</span>
                    Voir Profil
                  </button>

                  <button
                    onClick={() => viewData("mock_applications")}
                    className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm flex items-center gap-2 transition-colors"
                  >
                    <span>📝</span>
                    Voir Candidatures
                  </button>

                  <button
                    onClick={() => viewData("mock_jobs")}
                    className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm flex items-center gap-2 transition-colors"
                  >
                    <span>💼</span>
                    Voir Jobs
                  </button>
                </div>

                <div className="border-t border-gray-700 pt-3 space-y-2">
                  <button
                    onClick={handleReset}
                    className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réinitialiser Mock
                  </button>

                  <button
                    onClick={handleClearAll}
                    className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Tout Supprimer
                  </button>
                </div>
              </>
            )}

            {/* Instruction pour changer de mode */}
            <div className="bg-gray-800 rounded-lg p-3 text-xs">
              <p className="text-gray-400 mb-2">
                <span className="font-semibold text-gray-300">
                  Pour changer de mode:
                </span>
              </p>
              <code className="block bg-gray-900 p-2 rounded text-green-400">
                lib/api/mode.config.ts
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

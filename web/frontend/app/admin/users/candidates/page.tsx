"use client";

import Header from "@/components/admin/Header";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
// J'ai ajouté AlertTriangle et X pour la modale
import {
  Mail,
  Calendar,
  Trash2,
  Eye,
  Briefcase,
  AlertTriangle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 10;

export default function CandidateUsersPage() {
  const router = useRouter();
  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // --- NOUVEAUX ETATS POUR LA MODALE DE SUPPRESSION ---
  const [candidateToDelete, setCandidateToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- 1. CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        const profiles = await api.candidates.getAll(1, 100);

        const enriched = await Promise.all(
          profiles.map(async (profile: any) => {
            try {
              const user = await api.users.getById(profile.user_id);
              return {
                ...profile,
                email: user?.email || "Unknown",
                phone: user?.phone,
              };
            } catch (e) {
              return { ...profile, email: "Error fetching user" };
            }
          })
        );

        setAllCandidates(enriched);
        setFilteredCandidates(enriched);
      } catch (error) {
        console.error("Failed to load candidates", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // --- 2. LOGIQUE DE FILTRAGE ---
  useEffect(() => {
    let result = allCandidates;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.current_position && c.current_position.toLowerCase().includes(q))
      );
    }

    if (experienceFilter) {
      if (experienceFilter === "entry") {
        result = result.filter((c) => c.years_of_experience <= 2);
      } else if (experienceFilter === "mid") {
        result = result.filter(
          (c) => c.years_of_experience >= 3 && c.years_of_experience <= 5
        );
      } else if (experienceFilter === "senior") {
        result = result.filter((c) => c.years_of_experience >= 6);
      }
    }

    setFilteredCandidates(result);
    setCurrentPage(1);
  }, [searchQuery, experienceFilter, allCandidates]);

  // --- 3. PAGINATION ---
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = filteredCandidates.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  // --- 4. LOGIQUE DE SUPPRESSION PROFESSIONNELLE ---

  // Etape A : Ouvrir la modale (au lieu de supprimer direct)
  const handleDeleteClick = (candidate: any) => {
    setCandidateToDelete(candidate);
  };

  // Etape B : Confirmer la suppression
  const confirmDelete = async () => {
    if (!candidateToDelete) return;

    setIsDeleting(true);
    try {
      // 1. Supprimer le profil candidat (Table 2)
      await api.candidates.delete(candidateToDelete.id);

      // 2. Supprimer le user associé (Table 1)
      if (candidateToDelete.user_id) {
        try {
          await api.users.delete(candidateToDelete.user_id);
        } catch (err) {
          console.warn("User maybe already deleted or not found");
        }
      }

      // 3. Mise à jour Optimiste de l'UI
      setAllCandidates((prev) =>
        prev.filter((c) => c.id !== candidateToDelete.id)
      );

      // 4. Fermer la modale
      setCandidateToDelete(null);
    } catch (e) {
      alert("Error: Failed to delete candidate completely.");
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = (id: string) => {
    router.push(`/admin/users/candidates/${id}`);
  };

  return (
    <div className="space-y-8 relative">
      <Header
        title="Candidate Management"
        description="View and manage registered candidates"
      />

      <SearchBar
        placeholder="Search by email or position..."
        filterOptions={[
          { label: "All Experience Levels", value: "" },
          { label: "Entry Level (0-2 years)", value: "entry" },
          { label: "Mid Level (3-5 years)", value: "mid" },
          { label: "Senior Level (6+ years)", value: "senior" },
        ]}
        onFilterChange={setExperienceFilter}
        filterLabel="Filter by Experience"
        onSearchChange={setSearchQuery}
      />

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Candidate
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Current Role
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Experience
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Date
                </th>
                <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className="group hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                          {candidate.email
                            ? candidate.email.substring(0, 2).toUpperCase()
                            : "??"}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {candidate.email
                              ? candidate.email.split("@")[0]
                              : "Unknown"}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {candidate.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Briefcase className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm">
                          {candidate.current_position || "Open to Work"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          candidate.years_of_experience > 2
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}
                      >
                        {candidate.years_of_experience} Years Exp
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(candidate.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleView(candidate.id)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        // ICI : On appelle handleDeleteClick (qui ouvre la modale) au lieu de delete direct
                        onClick={() => handleDeleteClick(candidate)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No candidates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCandidates.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          itemLabel="candidates"
        />
      </div>

      {/* --- 5. MODALE DE SUPPRESSION (OVERLAY) --- */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1f37] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header de la modale */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Delete Candidate?
                </h3>
              </div>
              <button
                onClick={() => setCandidateToDelete(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps de la modale */}
            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete the candidate
                <span className="font-bold text-white">
                  {" "}
                  {candidateToDelete.email}
                </span>
                ?
              </p>

              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                <p className="text-red-300 text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> Warning: Irreversible
                  Action
                </p>
                <p className="text-red-400/80 text-xs mt-1 pl-5">
                  This will permanently remove the <strong>Profile</strong>,
                  <strong> User Account</strong>, <strong>Resumes</strong>, and
                  <strong> Applications</strong>.
                </p>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setCandidateToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Confirm Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Header from "@/components/admin/Header";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
import { Company } from "@/lib/mockData/companies";
import {
  Calendar,
  Eye,
  Pencil,
  Shield,
  Trash2,
  UserPlus,
  AlertTriangle,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { companiesService } from "@/lib/api/companies";

const ITEMS_PER_PAGE = 8;

export default function CompaniesPage() {
  const router = useRouter();

  // Data States
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // --- NOUVEAUX ÉTATS POUR LA SUPPRESSION ---
  // Stocke l'entreprise qu'on veut supprimer
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  // Est-ce qu'on est en train d'attendre l'API ?
  const [isDeleting, setIsDeleting] = useState(false);
  // Est-ce qu'on doit forcer la suppression ? (Étape 2)
  const [needsForceDelete, setNeedsForceDelete] = useState(false);
  // Message d'erreur API si besoin
  const [deleteError, setDeleteError] = useState("");

  // Fetch initial
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setIsLoading(true);
        const response: any = await companiesService.getAll();
        setAllCompanies(response);
        setFilteredCompanies(response);
      } catch (error) {
        console.error("Failed to fetch companies", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  // Logique de filtrage
  useEffect(() => {
    let result = allCompanies;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (company) =>
          company.name.toLowerCase().includes(lowerQuery) ||
          (company.description &&
            company.description.toLowerCase().includes(lowerQuery))
      );
    }
    if (selectedIndustry) {
      result = result.filter(
        (company) => company.industry === selectedIndustry
      );
    }
    setFilteredCompanies(result);
    setCurrentPage(1);
  }, [searchQuery, selectedIndustry, allCompanies]);

  // --- LOGIQUE DE SUPPRESSION PROFESSIONNELLE ---

  // 1. L'utilisateur clique sur la poubelle -> On ouvre la modale
  const initiateDelete = (company: Company) => {
    setCompanyToDelete(company);
    setNeedsForceDelete(false); // Reset
    setDeleteError("");
  };

  // 2. L'utilisateur confirme dans la modale
  const confirmDelete = async () => {
    if (!companyToDelete) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      // Cas A : On tente une suppression normale (force = false) ou forcée (force = true) si déjà demandée
      await companiesService.delete(companyToDelete.id, needsForceDelete);

      // Si succès :
      setAllCompanies((prev) =>
        prev.filter((c) => c.id !== companyToDelete.id)
      );
      setCompanyToDelete(null); // On ferme la modale
    } catch (error: any) {
      console.error("Delete failed", error);

      // Cas B : Échec car des données sont liées (Error 400/409/422 selon backend)
      // Si on n'a pas encore forcé, et que l'erreur suggère des données liées, on propose le Force Delete
      if (!needsForceDelete) {
        setNeedsForceDelete(true);
        // On affiche un message explicite à l'utilisateur
        setDeleteError(
          "Warning: This company has associated employees or jobs."
        );
      } else {
        // Cas C : Vraie erreur technique
        setDeleteError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setCompanyToDelete(null);
    setNeedsForceDelete(false);
    setDeleteError("");
  };

  // --- RENDU PAGINATION ---
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentDisplayedCompanies = filteredCompanies.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const industryOptions = useMemo(() => {
    const industries = Array.from(
      new Set(allCompanies.map((c) => c.industry).filter(Boolean))
    );
    return industries.map((ind) => ({
      label: ind as string,
      value: ind as string,
    }));
  }, [allCompanies]);

  const handleEditCompany = (id: string) => {
    router.push(`/admin/companies/${id}/edit`);
  };

  return (
    <div className="space-y-8 relative">
      <Header
        title="Companies Management"
        description="Manage companies"
        buttonLabel="Create Company"
        buttonIcon={<UserPlus className="w-5 h-5" />}
        onButtonClick={() => router.push("/admin/companies/new")}
      />

      <SearchBar
        placeholder="Search..."
        onSearchChange={setSearchQuery}
        filterOptions={industryOptions}
        onFilterChange={setSelectedIndustry}
        filterLabel="All Industries"
      />

      {/* TABLEAU */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Name
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Description
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Industry
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Size
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
              ) : currentDisplayedCompanies.length > 0 ? (
                currentDisplayedCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="group hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {company.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="font-medium text-white">
                          {company.name}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Shield className="w-4 h-4 text-indigo-400" />
                        <span className="truncate max-w-[200px]">
                          {company.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        {company.industry}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{company.size}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() =>
                          router.push(`/admin/companies/${company.id}`)
                        }
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleEditCompany(company.id)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Edit Company"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => initiateDelete(company)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No companies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCompanies.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          itemLabel="companies"
        />
      </div>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {companyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1f37] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  {needsForceDelete
                    ? "Force Delete Required"
                    : "Confirm Deletion"}
                </h3>
              </div>
              <button
                onClick={cancelDelete}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete{" "}
                <strong>{companyToDelete.name}</strong>?
              </p>

              {/* Message spécifique si on doit forcer */}
              {needsForceDelete && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                  <p className="text-red-300 text-sm font-medium">
                    {deleteError}
                  </p>
                  <p className="text-red-400 text-xs mt-1">
                    Proceeding will permanently delete this company AND all its
                    employees and jobs history.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={cancelDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
                    needsForceDelete
                      ? "bg-red-600 hover:bg-red-700" // Rouge vif pour le Force Delete
                      : "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30" // Rouge plus doux pour le standard
                  }`}
                >
                  {isDeleting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : needsForceDelete ? (
                    "Force Delete Everything"
                  ) : (
                    "Delete Company"
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

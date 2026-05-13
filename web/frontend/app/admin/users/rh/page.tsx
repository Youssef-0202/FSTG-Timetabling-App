"use client";

import Header from "@/components/admin/Header";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
import {
  UserPlus,
  Calendar,
  Trash2,
  Eye,
  Building2,
  Pencil,
  AlertTriangle,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { rhService, RHProfile } from "@/lib/api/rh";
import { api } from "@/lib/api"; // <--- IMPORTANT : Pour supprimer l'utilisateur

const ITEMS_PER_PAGE = 8;

export default function RHUsersPage() {
  const router = useRouter();

  // Data States
  const [allProfiles, setAllProfiles] = useState<RHProfile[]>([]);
  const [displayedProfiles, setDisplayedProfiles] = useState<RHProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // DELETE MODAL STATE
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await rhService.getAll(1, 100);
        setAllProfiles(data);
        setDisplayedProfiles(data);
      } catch (error) {
        console.error("Failed to fetch RH profiles", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Filtrage
  useEffect(() => {
    let result = allProfiles;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.user_email && p.user_email.toLowerCase().includes(lowerQuery)) ||
          (p.position && p.position.toLowerCase().includes(lowerQuery)) ||
          (p.department && p.department.toLowerCase().includes(lowerQuery))
      );
    }
    if (selectedDepartment) {
      result = result.filter((p) => p.department === selectedDepartment);
    }
    setDisplayedProfiles(result);
    setCurrentPage(1);
  }, [searchQuery, selectedDepartment, allProfiles]);

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = displayedProfiles.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const departmentOptions = useMemo(() => {
    const depts = Array.from(
      new Set(allProfiles.map((p) => p.department).filter(Boolean))
    );
    return depts.map((d) => ({ label: d, value: d }));
  }, [allProfiles]);

  // --- ACTIONS ---

  const handleCreateRh = () => router.push("/admin/users/rh/new");

  const handleView = (id: string) => router.push(`/admin/users/rh/${id}`);

  const handleEdit = (id: string) => router.push(`/admin/users/rh/${id}/edit`);

  // --- LOGIQUE DE SUPPRESSION COMPLETE ---
  const confirmDelete = async () => {
    if (!profileToDelete) return;
    setIsDeleting(true);

    try {
      // 1. On trouve le profil complet pour récupérer le user_id
      const targetProfile = allProfiles.find((p) => p.id === profileToDelete);

      if (!targetProfile) {
        throw new Error("Profile not found in memory");
      }

      // 2. On supprime le profil RH (Table rh_profiles)
      await rhService.delete(profileToDelete);

      // 3. On supprime l'utilisateur associé (Table users)
      if (targetProfile.user_id) {
        try {
          await api.users.delete(targetProfile.user_id);
          console.log(`User ${targetProfile.user_id} deleted successfully`);
        } catch (userErr) {
          console.error("Warning: Could not delete associated user", userErr);
          // On ne bloque pas si le user est déjà supprimé ou introuvable
        }
      }

      // 4. Mise à jour de l'affichage
      setAllProfiles((prev) => prev.filter((p) => p.id !== profileToDelete));
      setProfileToDelete(null); // Fermer la modale
    } catch (err) {
      console.error(err);
      alert("Failed to delete profile completely.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      <Header
        title="RH Management"
        description="Manage human resource accounts and permissions"
        buttonLabel="Create RH User"
        buttonIcon={<UserPlus className="w-5 h-5" />}
        onButtonClick={handleCreateRh}
      />

      <SearchBar
        placeholder="Search by email, position or department..."
        filterOptions={departmentOptions}
        onFilterChange={setSelectedDepartment}
        filterLabel="All Departments"
        onSearchChange={setSearchQuery}
      />

      {/* Users Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  User / Company
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Department
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Position
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Stats
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
                    Loading profiles...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((profile) => (
                  <tr
                    key={profile.id}
                    className="group hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          RH
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {profile.user_email || "No Email"}
                          </div>
                          <div className="text-xs text-indigo-300 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {profile.company_name || "Unknown Company"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {profile.department}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300 text-sm">
                        {profile.position}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1 text-xs text-gray-400">
                        <span>
                          Jobs:{" "}
                          <span className="text-white">
                            {profile.active_jobs || 0}
                          </span>
                        </span>
                        <span>
                          Apps:{" "}
                          <span className="text-white">
                            {profile.total_applications || 0}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {/* VIEW BUTTON */}
                      <button
                        onClick={() => handleView(profile.id)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* EDIT BUTTON */}
                      <button
                        onClick={() => handleEdit(profile.id)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Edit Profile"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* DELETE BUTTON */}
                      <button
                        onClick={() => setProfileToDelete(profile.id)}
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
                  <td
                    colSpan={5}
                    className="py-8 px-6 text-center text-gray-400"
                  >
                    No RH users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={displayedProfiles.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          itemLabel="users"
        />
      </div>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {profileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1f37] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Delete RH Profile?
                </h3>
              </div>
              <button
                onClick={() => setProfileToDelete(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete this profile? This cannot be
                undone.
              </p>
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                <p className="text-red-300 text-sm font-medium">Warning:</p>
                <p className="text-red-400 text-xs mt-1">
                  This will permanently delete the recruiter's profile, and
                  cascade delete the associated <strong>User Account</strong>,{" "}
                  <strong>Jobs</strong> and <strong>Applications</strong>.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setProfileToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

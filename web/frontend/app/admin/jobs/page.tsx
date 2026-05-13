"use client";

import { useEffect, useState } from "react";
// Import de l'API réelle
import { jobsApi } from "@/lib/api/jobs";

// Composants UI
import Header from "@/components/admin/Header";
import SearchBar from "@/components/admin/SearchBar";
import JobsStatsCards from "@/components/admin/JobsStatsCards";
import JobsTable from "@/components/admin/JobsTable";
import JobDetailsModal from "@/components/admin/JobDetailsModal";
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"; // ✅ NOUVEAU

export default function AdminJobsPage() {
  // --- STATES ---
  const [jobs, setJobs] = useState<any[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States pour les Modales
  const [selectedJob, setSelectedJob] = useState<any | null>(null); // Pour les détails
  const [jobToDelete, setJobToDelete] = useState<any | null>(null); // ✅ Pour la confirmation suppression

  // --- FILTRES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // --- STATS ---
  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const draftJobs = jobs.filter((j) => j.status === "draft").length;
  const closedJobs = jobs.filter((j) => j.status === "closed").length;

  // --- 1. CHARGEMENT DES DONNÉES ---
  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const data = await jobsApi.getAll({ skip: 0, limit: 100 });

      // Adaptation des données
      const adaptedData = data.map((job: any) => ({
        ...job,
        skills: job.required_skills
          ? job.required_skills.map((name: string) => ({ name, level: "N/A" }))
          : [],
      }));

      setJobs(adaptedData);
      setFilteredJobs(adaptedData);
    } catch (error: any) {
      console.error("Failed to load jobs:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // --- 2. LOGIQUE DE FILTRAGE ---
  useEffect(() => {
    let result = jobs;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          (j.title && j.title.toLowerCase().includes(q)) ||
          (j.company_name && j.company_name.toLowerCase().includes(q))
      );
    }

    if (statusFilter) {
      result = result.filter(
        (j) => j.status && j.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredJobs(result);
  }, [searchQuery, statusFilter, jobs]);

  // --- ACTIONS ---

  const handleView = (job: any) => {
    setSelectedJob(job);
  };

  // 1. Déclencheur : Clic sur la poubelle du tableau
  const initiateDelete = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setJobToDelete(job); // Cela ouvre la ConfirmDeleteModal
    }
  };

  // 2. Exécution : Confirmé par la modale (Tableau) ou directement par la modale de détails
  const executeDelete = async (jobId: string, permanent: boolean) => {
    try {
      // Appel API avec le choix (true/false)
      await jobsApi.delete(jobId, permanent);

      // Mise à jour locale
      const updatedJobs = jobs.filter((j) => j.id !== jobId);
      setJobs(updatedJobs);
      setFilteredJobs((prev) => prev.filter((j) => j.id !== jobId));

      // Fermeture des modales si ouvertes
      if (selectedJob?.id === jobId) setSelectedJob(null);
      if (jobToDelete?.id === jobId) setJobToDelete(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(`Failed to delete job: ${error.message || "Unknown error"}`);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Jobs Management"
        description="Manage job listings and applications"
      />

      <JobsStatsCards
        activeCount={activeJobs}
        draftCount={draftJobs}
        closedCount={closedJobs}
      />

      <SearchBar
        placeholder="Search by title or company..."
        filterOptions={[
          { label: "All Status", value: "" },
          { label: "Active", value: "active" },
          { label: "Draft", value: "draft" },
          { label: "Closed", value: "closed" },
        ]}
        onFilterChange={setStatusFilter}
        filterLabel="Filter by Status"
        onSearchChange={setSearchQuery}
      />

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 animate-pulse">
            Loading jobs...
          </div>
        ) : (
          <>
            <JobsTable
              jobs={filteredJobs}
              onView={handleView}
              // ICI : On n'appelle plus handleDelete directement, on ouvre la modale de choix
              onDelete={initiateDelete}
            />

            {filteredJobs.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>No jobs found matching your criteria.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modale Détails (Gère sa propre UI de suppression) */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={selectedJob !== null}
        onClose={() => setSelectedJob(null)}
        onDelete={executeDelete}
      />

      {/* ✅ Modale de Confirmation (Pour le tableau) */}
      <ConfirmDeleteModal
        isOpen={jobToDelete !== null}
        onClose={() => setJobToDelete(null)}
        onConfirm={(permanent) => executeDelete(jobToDelete.id, permanent)}
        jobTitle={jobToDelete?.title}
      />
    </div>
  );
}

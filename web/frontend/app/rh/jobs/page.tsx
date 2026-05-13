"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Job } from "@/types/job";
import { rhJobsApi } from "@/lib/api/rhJobs";
import { authClient } from "@/lib/auth-client";
import { userApi } from "@/lib/api/users";
import { recruitersApi } from "@/lib/api/recruiters";
import { JobsStatsCards } from "@/components/rh/JobsStatsCards";
import { JobsSearchBar } from "@/components/rh/JobsSearchBar";
import { JobsGrid } from "@/components/rh/JobsGrid";
import { JobDetailsModal } from "@/components/rh/JobDetailsModal";
// NOUVEAUX IMPORTS
import { DeleteJobModal } from "@/components/rh/DeleteJobModal";
import { EditJobModal } from "@/components/rh/EditJobModal";

export default function RHJobsPage() {
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isJobsLoading, setIsJobsLoading] = useState(false);
  const [recruiterProfileId, setRecruiterProfileId] = useState<string | null>(
    null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // --- MODAL STATES ---
  const [selectedJob, setSelectedJob] = useState<Job | null>(null); // Pour View Details
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [jobToDelete, setJobToDelete] = useState<Job | null>(null); // Pour Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [jobToEdit, setJobToEdit] = useState<Job | null>(null); // Pour Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // ... (Le code useEffect resolveIdentity reste identique) ...
  useEffect(() => {
    const resolveIdentity = async () => {
      if (session?.user?.email && !recruiterProfileId) {
        try {
          // ... (votre logique d'identité existante) ...
          const internalUser = await userApi.getByEmail(session.user.email);
          if (!internalUser?.id) throw new Error("Internal user not found");
          const profile = await recruitersApi.getByUserId(internalUser.id);
          if (profile && profile.id) {
            setRecruiterProfileId(profile.id);
          } else {
            setRecruiterProfileId("NONE");
          }
        } catch (error) {
          console.error("Identity resolution failed:", error);
        }
      }
    };
    if (!isAuthPending && session?.user) {
      resolveIdentity();
    }
  }, [session, isAuthPending, recruiterProfileId]);

  // ... (Le fetchJobs reste identique) ...
  const fetchJobs = async () => {
    if (!recruiterProfileId || recruiterProfileId === "NONE") return;
    try {
      setIsJobsLoading(true);
      const data = await rhJobsApi.getAll({
        limit: 100,
        recruiter_id: recruiterProfileId,
        status: statusFilter,
        query: searchQuery,
      });
      setJobs(data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setIsJobsLoading(false);
    }
  };

  useEffect(() => {
    if (recruiterProfileId && recruiterProfileId !== "NONE") {
      const timer = setTimeout(() => fetchJobs(), 500);
      return () => clearTimeout(timer);
    }
  }, [recruiterProfileId, statusFilter, searchQuery]);

  // ... (filteredJobs et stats restent identiques) ...
  const filteredJobs = jobs.filter((job) => {
    const matchLocation = locationFilter
      ? job.location.toLowerCase().includes(locationFilter.toLowerCase())
      : true;
    const matchQuery = searchQuery
      ? job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company_name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchLocation && matchQuery;
  });

  const stats = {
    total: jobs.length,
    active: jobs.filter((j) => j.status === "active").length,
    draft: jobs.filter((j) => j.status === "draft").length,
    closed: jobs.filter((j) => j.status === "closed").length,
  };

  // --- HANDLERS MIS À JOUR ---

  const handleCreateJob = () => router.push("/rh/jobs/new");

  // VIEW
  const handleView = (job: Job) => {
    setSelectedJob(job);
    setIsDetailsModalOpen(true);
  };

  // EDIT - Ouvre la modale
  const handleEdit = (job: Job) => {
    setJobToEdit(job);
    setIsEditModalOpen(true);
  };

  // DELETE - Ouvre la modale
  const handleDelete = (job: Job) => {
    setJobToDelete(job);
    setIsDeleteModalOpen(true);
  };

  // --- ACTIONS SERVEUR ---

  // Appelé par EditJobModal
  const confirmEdit = async (jobId: string, data: any) => {
    // Note: Ajoutez la méthode update à votre rhJobsApi si elle manque
    // ex: update: (id, data) => client.put(`/api/jobs/${id}`, data)
    await rhJobsApi.update(jobId, data);
    await fetchJobs(); // Rafraîchir la liste
  };

  // Appelé par DeleteJobModal
  const confirmDelete = async (permanent: boolean) => {
    if (!jobToDelete) return;
    setIsDeleting(true);
    try {
      // API call avec le paramètre permanent
      await rhJobsApi.delete(jobToDelete.id, permanent);
      await fetchJobs();
      setIsDeleteModalOpen(false);
      setJobToDelete(null);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // ... (Loader et Auth check restent identiques) ...
  if (isAuthPending)
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-purple-500" />
      </div>
    );
  if (!session) return null;

  return (
    <div className="space-y-8">
      {/* Header, Stats, SearchBar restent identiques */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Job Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage and track all your job postings
          </p>
        </div>
        <button
          onClick={handleCreateJob}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" /> <span>Post New Job</span>
        </button>
      </div>

      <JobsStatsCards stats={stats} />

      <JobsSearchBar
        onSearch={setSearchQuery}
        onLocationChange={setLocationFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Content */}
      {isJobsLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="min-h-[300px]">
          {recruiterProfileId === "NONE" ? (
            <div className="text-center py-16 px-4 bg-white/5 rounded-xl border border-white/10">
              {/* ... Empty state ... */}
              <h3 className="text-xl font-semibold text-white mb-2">
                No Jobs Found
              </h3>
            </div>
          ) : (
            <JobsGrid
              jobs={filteredJobs}
              onView={handleView}
              onEdit={handleEdit} // Passe maintenant la fonction qui ouvre la modale
              // IMPORTANT: JobsGrid doit attendre un (job: Job) => void pour onDelete,
              // si votre JobsGrid attend un (id: string) => void, il faudra adapter ici :
              onDelete={(jobId) => {
                const job = jobs.find((j) => j.id === jobId);
                if (job) handleDelete(job);
              }}
            />
          )}
        </div>
      )}

      {/* --- MODALES --- */}

      {/* 1. View Details */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedJob(null);
          }}
        />
      )}

      {/* 2. Edit Job */}
      {jobToEdit && (
        <EditJobModal
          job={jobToEdit}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setJobToEdit(null);
          }}
          onSave={confirmEdit}
        />
      )}

      {/* 3. Delete Job */}
      {jobToDelete && (
        <DeleteJobModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setJobToDelete(null);
          }}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
          jobTitle={jobToDelete.title}
        />
      )}
    </div>
  );
}

import Header from "@/components/admin/Header";
import HeroFeaturedStat from "@/components/admin/HeroFeaturedStat";
import QuickActions from "@/components/admin/QuickActions";
import RecentActivity from "@/components/admin/RecentActivity";
import SidebarMiniStats from "@/components/admin/SidebarMiniStats";
import StatisticsChart from "@/components/admin/StatisticsChart";
import { requireAdmin } from "@/lib/utils/role-check";

// Imports API
import { companiesService } from "@/lib/api/companies";
import { jobsApi } from "@/lib/api/jobs";
import { recruitersApi } from "@/lib/api/recruiters";
import { api } from "@/lib/api";

export default async function AdminDashboard() {
  // Vérification Auth
  const session = await requireAdmin();
  const username = session.user.name;

  // 1. Récupération des données en parallèle (Backend)
  // On utilise try/catch ou .catch([]) pour éviter de planter tout le dashboard si une API échoue
  const [companies, jobs, recruiters, candidates] = await Promise.all([
    companiesService.getAll().catch((err) => {
      console.error("Err Companies", err);
      return [];
    }),
    jobsApi.getAll().catch((err) => {
      console.error("Err Jobs", err);
      return [];
    }),
    recruitersApi.getAll().catch((err) => {
      console.error("Err Recruiters", err);
      return [];
    }),
    
    api.candidates.getAll(1, 100).catch((err) => {
      console.error("Err Candidates", err);
      return [];
    }),
  ]);

  // 2. Calcul des Statistiques
  const totalCompanies = companies.length;
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j: any) => j.status === "active").length;
  const totalRecruiters = recruiters.length;

  // Note : Comme on est limité à 100 par page, si vous avez plus de 100 candidats,
  // ce chiffre sera bloqué à 100. Pour avoir le total exact, il faudrait que le backend
  // renvoie le champ "total" dans la réponse, ou faire une requête spécifique de "count".
  const totalCandidates = Array.isArray(candidates) ? candidates.length : 0;

  // Calcul augmentation (Fake pour l'exemple, ou basé sur dates réelles)
  const newCompaniesThisWeek = companies.filter((c: any) => {
    const d = new Date(c.create_at);
    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - d.getTime() < oneWeek;
  }).length;

  // 3. Préparation du flux d'activité
  const activities = [
    ...companies.map((c: any) => ({
      type: "company",
      title: `${c.name} joined`,
      desc: "New company registered",
      date: new Date(c.create_at || Date.now()),
    })),
    ...jobs.map((j: any) => ({
      type: "job",
      title: j.title,
      desc: j.status === "active" ? "New job published" : "Job draft created",
      date: new Date(j.created_at || Date.now()),
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime()) // Tri plus récent
    .slice(0, 5); // 5 derniers

  return (
    <div className="space-y-8">
      {/* Header */}
      <Header
        title="Dashboard Overview"
        description={`Welcome back, ${username}! Here's what's happening today.`}
      />

      {/* Quick Actions (Sans 'Post Job') */}
      <QuickActions />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Hero Stat avec données réelles */}
          <HeroFeaturedStat
            count={totalCompanies}
            increase={newCompaniesThisWeek}
          />
        </div>
        <div className="space-y-4">
          {/* Sidebar Stats avec données réelles */}
          <SidebarMiniStats
            rhCount={totalRecruiters}
            candidatesCount={totalCandidates}
            openJobsCount={activeJobs}
          />
        </div>
      </div>

      {/* Recent Activity Dynamique */}
      <RecentActivity activities={activities} />

      {/* Chart Dynamique */}
      <StatisticsChart
        jobsCount={totalJobs}
        companiesCount={totalCompanies}
        rhCount={totalRecruiters}
        candidatesCount={totalCandidates}
      />
    </div>
  );
}

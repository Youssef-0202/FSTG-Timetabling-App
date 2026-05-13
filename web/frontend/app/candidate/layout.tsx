// =====================================
// 1. app/(candidate)/layout.tsx
// =====================================
import RoleGuard from "@/components/auth/RoleGuard";
import { CandidateSidebar } from "@/components/Candidate/CandidateSidebar";
import { ModeSwitcher } from "@/components/DevTools/ModeSwitcher";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["user"]}>
      <div className="min-h-screen bg-[#030303] text-white selection:bg-indigo-500/30">
        {/* Background Gradients */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[100px]" />
        </div>

        <CandidateSidebar />

        <div className="pl-64 relative z-10">
          <main className="min-h-screen p-8">{children}</main>
        </div>

        {/* ✨ DEVTOOLS - Visible uniquement en développement */}
        {process.env.NODE_ENV === "development" && <ModeSwitcher />}
      </div>
    </RoleGuard>
  );
}

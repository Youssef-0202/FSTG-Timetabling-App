import RoleGuard from "@/components/auth/RoleGuard";
import { RhSidebar } from "@/components/rh/RhSidebar";

export default function RhLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["rh"]}>
      <div className="min-h-screen bg-[#030303] text-white selection:bg-purple-500/30">
        {/* Background Gradients */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px]" />
        </div>

        <RhSidebar />

        <div className="pl-64 relative z-10">
          <main className="min-h-screen p-8">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}

import { GeometricBackground } from "@/components/ui/geometric-background";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#030303] overflow-hidden relative">
      <GeometricBackground />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md p-4">
        {children}
      </div>
    </div>
  );
}
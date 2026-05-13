"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Briefcase, LogOut, Settings, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const sidebarItems = [
  {
    title: "Job Offers",
    href: "/rh/jobs",
    icon: Briefcase,
  },
  {
    title: "Candidates",
    href: "/rh/candidates",
    icon: Users,
  },
  {
    title: "CV Analysis",
    href: "/rh/cv-analysis",
    icon: FileText,
  },
];

export function RhSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/signin");
  };

  return (
    <aside className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 h-screen fixed left-0 top-0 flex flex-col z-50">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
          RH Panel
        </h1>
        <p className="text-xs text-gray-400 mt-1">Human Resources</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-purple-400" : "text-gray-500 group-hover:text-white"
                )}
              />
              <span className="font-medium">{item.title}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 group">
          <Settings className="w-5 h-5 text-gray-500 group-hover:text-white" />
          <span className="font-medium">Settings</span>
        </button>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5 text-rose-500/70 group-hover:text-rose-400" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

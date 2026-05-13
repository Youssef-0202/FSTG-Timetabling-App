"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, FileText, User, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";

// =====================================
// MENU ITEMS (SANS DASHBOARD)
// =====================================
const sidebarItems = [
  {
    title: "Browse Jobs",
    href: "/candidate/jobs",
    icon: Briefcase,
  },
  {
    title: "My Applications",
    href: "/candidate/applications",
    icon: FileText,
  },
  {
    title: "Profile & CV",
    href: "/candidate/profile",
    icon: User,
  },
];

export function CandidateSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profileCompletion] = useState(85); // Peut être dynamique plus tard

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/signin");
  };

  return (
    <aside className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 h-screen fixed left-0 top-0 flex flex-col z-50">
      {/* Header */}
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
          Candidate Panel
        </h1>
      </div>

      {/* Profile Completion Banner */}
      {profileCompletion < 100 && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">
              Profile Completion
            </span>
            <span className="text-sm font-bold text-indigo-400">
              {profileCompletion}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 mb-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
          <Link
            href="/candidate/profile"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Complete your profile →
          </Link>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  isActive
                    ? "text-indigo-400"
                    : "text-gray-500 group-hover:text-white"
                )}
              />
              <span className="font-medium">{item.title}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
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

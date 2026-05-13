"use client";
import { Building, UserPlus, BarChart3, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QuickActions() {
  const router = useRouter();

  const scrollToAnalytics = () => {
    const element = document.getElementById("platform-overview");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const actions = [
    {
      icon: <Building className="w-5 h-5" />,
      title: "Create Company",
      description: "Add new company",
      color: "indigo",
      onClick: () => router.push("/admin/companies/new"),
    },
    {
      icon: <UserPlus className="w-5 h-5" />,
      title: "Add RH User",
      description: "Invite HR staff",
      color: "purple",
      onClick: () => router.push("/admin/users/rh/new"),
    },
    {
      icon: <Briefcase className="w-5 h-5" />,
      title: "Manage Jobs",
      description: "View all listings",
      color: "blue",
      onClick: () => router.push("/admin/jobs"),
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Analytics",
      description: "View reports",
      color: "green",
      onClick: scrollToAnalytics,
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: any = {
      indigo: {
        bg: "bg-indigo-500/20",
        text: "text-indigo-400",
        hover: "hover:bg-indigo-500/30",
      },
      purple: {
        bg: "bg-purple-500/20",
        text: "text-purple-400",
        hover: "hover:bg-purple-500/30",
      },
      blue: {
        bg: "bg-blue-500/20",
        text: "text-blue-400",
        hover: "hover:bg-blue-500/30",
      },
      green: {
        bg: "bg-green-500/20",
        text: "text-green-400",
        hover: "hover:bg-green-500/30",
      },
    };
    return colors[color] || colors.indigo;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => {
          const colors = getColorClasses(action.color);
          return (
            <button
              key={index}
              onClick={action.onClick}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 group text-left"
            >
              <div
                className={`w-10 h-10 rounded-lg ${colors.bg} ${colors.hover} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
              >
                <div className={colors.text}>{action.icon}</div>
              </div>
              <h4 className="text-sm font-medium text-white mb-1">
                {action.title}
              </h4>
              <p className="text-xs text-gray-400">{action.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

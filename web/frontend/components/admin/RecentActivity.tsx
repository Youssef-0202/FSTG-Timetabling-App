import React from "react";

// Définition du type d'une activité
interface ActivityItem {
  type: "company" | "job" | "candidate" | "rh" | string;
  title: string;
  desc: string;
  date: Date | string; // Accepte Date objet ou string ISO
}

interface RecentActivityProps {
  activities?: ActivityItem[];
}

export default function RecentActivity({
  activities = [],
}: RecentActivityProps) {
  // Fonction helper pour afficher le temps relatif (ex: "5 min ago")
  const timeAgo = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min ago";
    return "Just now";
  };

  // Helper pour récupérer l'icône et la couleur de fond selon le type
  const getVisuals = (type: string) => {
    switch (type) {
      case "company":
        return { icon: "🏢", bg: "bg-indigo-500/20" };
      case "job":
        return { icon: "💼", bg: "bg-green-500/20" };
      case "candidate":
        return { icon: "🎓", bg: "bg-blue-500/20" }; // Bleu pour les candidats
      default:
        return { icon: "👤", bg: "bg-purple-500/20" }; // RH ou User par défaut
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No recent activity found.
          </div>
        ) : (
          activities.map((item, index) => {
            const visual = getVisuals(item.type);

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Icône colorée */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${visual.bg}`}
                  >
                    <span className="text-lg">{visual.icon}</span>
                  </div>

                  {/* Textes */}
                  <div>
                    <p className="text-sm text-white font-medium">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                </div>

                {/* Date relative */}
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                  {timeAgo(item.date)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

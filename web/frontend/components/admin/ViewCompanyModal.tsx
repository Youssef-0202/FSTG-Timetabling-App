import {
  X,
  Building2,
  MapPin,
  Globe,
  Users,
  Briefcase,
  Calendar,
  Edit,
} from "lucide-react";
import { Company } from "@/lib/api/companies";
import { useEffect } from "react";

interface ViewCompanyModalProps {
  company: Company;
  onClose: () => void;
  onEdit: () => void;
}

export default function ViewCompanyModal({
  company,
  onClose,
  onEdit,
}: ViewCompanyModalProps) {
  
  // Gestion de la touche Echap pour fermer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-b border-white/10 p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                company.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold text-white mb-1">
                {company.name}
              </h3>
              <p className="text-sm text-gray-400">Company Details</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="p-2 rounded-lg hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-colors"
                title="Edit company"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {company.description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">
                Description
              </h4>
              <p className="text-gray-300">{company.description}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox
              label="Employees"
              // CORRECTION : Priorité aux stats numériques, sinon on affiche la taille (ex: "10-50")
              value={company.total_employees ?? company.size ?? "N/A"}
              icon={<Users className="w-5 h-5" />}
              color="indigo"
            />
            <StatBox
              label="Total Jobs"
              value={company.total_jobs || 0}
              icon={<Briefcase className="w-5 h-5" />}
              color="green"
            />
            <StatBox
              label="Active Jobs"
              value={company.active_jobs || 0}
              icon={<Briefcase className="w-5 h-5" />}
              color="purple"
            />
            <StatBox
              label="Applications"
              value={company.total_applications || 0}
              icon={<Users className="w-5 h-5" />}
              color="pink"
            />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-3">
                Company Information
              </h4>
              {company.industry && (
                <InfoRow
                  icon={<Building2 className="w-5 h-5 text-gray-400" />}
                  label="Industry"
                  value={company.industry}
                />
              )}
              {company.size && (
                <InfoRow
                  icon={<Users className="w-5 h-5 text-gray-400" />}
                  label="Company Size"
                  value={`${company.size} employees`}
                />
              )}
              {/* Gestion sécurisée de la date de création */}
              {(company.created_at || company.create_at) && (
                <InfoRow
                  icon={<Calendar className="w-5 h-5 text-gray-400" />}
                  label="Created"
                  value={new Date(
                    company.created_at || company.create_at || Date.now()
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-3">
                Contact Information
              </h4>
              {company.location && (
                <InfoRow
                  icon={<MapPin className="w-5 h-5 text-gray-400" />}
                  label="Location"
                  value={company.location}
                />
              )}
              {company.website && (
                <InfoRow
                  icon={<Globe className="w-5 h-5 text-gray-400" />}
                  label="Website"
                  value={
                    <a
                      href={
                        company.website.startsWith("http")
                          ? company.website
                          : `https://${company.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 underline"
                    >
                      {company.website}
                    </a>
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/5 border-t border-white/10 p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-6 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Company</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------

function StatBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string; // CORRECTION : Accepte string ou number
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses = {
    indigo:
      "from-indigo-500/10 to-indigo-600/10 border-indigo-500/20 text-indigo-400",
    green:
      "from-green-500/10 to-green-600/10 border-green-500/20 text-green-400",
    purple:
      "from-purple-500/10 to-purple-600/10 border-purple-500/20 text-purple-400",
    pink: "from-pink-500/10 to-pink-600/10 border-pink-500/20 text-pink-400",
  };

  return (
    <div
      className={`bg-gradient-to-br ${
        colorClasses[color as keyof typeof colorClasses]
      } border rounded-xl p-4`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        {/* Affichage conditionnel : si nombre => format local, sinon texte brut */}
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
        <div className="text-white">
          {typeof value === "string" ? value : value}
        </div>
      </div>
    </div>
  );
}
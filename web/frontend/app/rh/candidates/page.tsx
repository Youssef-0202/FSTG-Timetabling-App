"use client";
import Header from "@/components/admin/Header";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/admin/SearchBar";
import {
  UserPlus,
  Search,
  MoreVertical,
  Mail,
  Calendar,
  FileText,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";

export default function CandidateUsersPage() {
  const handleFilterChange = (value: string) => {
    console.log("Filter changed:", value);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <Header
        title="Candidate Management"
        description="View and manage registered candidates"
        buttonLabel="Create Candidate"
        buttonIcon={<UserPlus className="w-5 h-5" />}
      />

      {/* Filters & Search */}
      <SearchBar
        placeholder="Search by name, email or skills..."
        filterOptions={[
          { label: "All Status", value: "" },
          { label: "Active", value: "active" },
          { label: "Looking for Job", value: "looking-for-job" },
          { label: "Hired", value: "hired" },
        ]}
        onFilterChange={handleFilterChange}
        filterLabel="All Status"
      />

      {/* Users Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Candidate
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Resume
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Status
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
                  Joined Date
                </th>
                <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {[1, 2, 3].map((i) => (
                <tr
                  key={i}
                  className="group hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold">
                        AS
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          Alice Smith
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          alice.smith@email.com
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-300">
                      <FileText className="w-4 h-4 text-rose-400" />
                      <span className="text-sm hover:text-rose-400 cursor-pointer transition-colors">
                        View Resume
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Open to Work
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>Dec 10, 2024</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {/* <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button> */}

                    <button
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                      title="Edit Job"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete Job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={11}
          totalItems={100}
          itemsPerPage={10}
          itemLabel="users"
        />
      </div>
    </div>
  );
}

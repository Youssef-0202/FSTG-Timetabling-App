"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Save, Loader2 } from "lucide-react";
import { Job } from "@/types/job";

interface EditJobModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onSave: (jobId: string, data: any) => Promise<void>;
}

export function EditJobModal({
  job,
  isOpen,
  onClose,
  onSave,
}: EditJobModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    status: "",
    salary_min: 0,
    salary_max: 0,
    job_type: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Initialiser le formulaire avec les données du job
  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || "",
        location: job.location || "",
        status: job.status || "draft",
        salary_min: job.salary_min || 0,
        salary_max: job.salary_max || 0,
        job_type: job.job_type || "Full-time",
        description: job.description || "",
      });
    }
  }, [job]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(job.id, formData);
      onClose();
    } catch (error) {
      console.error("Failed to update", error);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Edit Job Posting</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form
            id="edit-job-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Title & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Location & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Job Type
                </label>
                <select
                  value={formData.job_type}
                  onChange={(e) =>
                    setFormData({ ...formData, job_type: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
            </div>

            {/* Salary */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Min Salary
                </label>
                <input
                  type="number"
                  value={formData.salary_min}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salary_min: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Max Salary
                </label>
                <input
                  type="number"
                  value={formData.salary_max}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salary_max: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={6}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/[0.02]">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-job-form"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import { Resume } from "@/lib/types/database.types";

interface CVUploadProps {
  onCVUploaded?: (resume: Resume) => void;
  showTitle?: boolean;
}

export function CVUpload({ onCVUploaded, showTitle = true }: CVUploadProps) {
  const [resume, setResume] = useState<Resume | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("user_resume");
    if (saved) {
      try {
        setResume(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading resume:", e);
      }
    }
  }, []);

  const saveResume = (newResume: Resume | null) => {
    setResume(newResume);
    if (newResume) {
      localStorage.setItem("user_resume", JSON.stringify(newResume));
    } else {
      localStorage.removeItem("user_resume");
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file || (!file.type.includes("pdf") && !file.name.endsWith(".pdf"))) {
      alert("Please upload a PDF file only");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newResume = {
      id: `resume-${Date.now()}`,
      candidate_id: "profile-1",
      file_name: file.name,
      file_size: file.size,
      file_url: URL.createObjectURL(file),
      is_default: true,
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      parsed_text: JSON.stringify({ skills: ["React", "TypeScript"] }),
    };

    saveResume(newResume);
    setUploading(false);
    if (onCVUploaded) onCVUploaded(newResume);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!resume) {
      setDragActive(e.type === "dragenter" || e.type === "dragover");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!resume && e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete your CV? This action cannot be undone."
      )
    ) {
      saveResume(null);
    }
  };

  const handleDownload = () => {
    if (resume) {
      const link = document.createElement("a");
      link.href = resume.file_url;
      link.download = resume.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReplace = () => {
    const input = document.getElementById("cv-file-input");
    if (input) input.click();
  };

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">My Resume</h3>
            <p className="text-sm text-gray-400 mt-1">
              Upload and manage your CV for job applications
            </p>
          </div>
          {resume && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              CV Uploaded
            </span>
          )}
        </div>
      )}

      {!resume ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 transition-all ${dragActive
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-white/10 bg-white/5"
            }`}
        >
          <input
            id="cv-file-input"
            type="file"
            accept=".pdf"
            onChange={(e) =>
              e.target.files?.[0] && handleFileUpload(e.target.files[0])
            }
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <div className="text-center pointer-events-none">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-indigo-400" />
              )}
            </div>
            <p className="text-white font-medium mb-1">
              {uploading
                ? "Uploading your CV..."
                : "Drop your CV here or click to browse"}
            </p>
            <p className="text-sm text-gray-400">PDF only • Max 5MB</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* CV Card */}
          <div className="p-6 rounded-2xl border bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-7 h-7 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white truncate mb-1">
                  {resume.file_name}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{(resume.file_size / 1024).toFixed(1)} KB</span>
                  <span>•</span>
                  <span>
                    Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}
                  </span>
                </div>
                <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded">
                  Active CV
                </span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleDownload}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="Download CV"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={handleReplace}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-indigo-400 transition-colors"
                  title="Replace CV"
                >
                  <Upload className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete CV"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-200 mb-1">
                  Single CV Policy
                </p>
                <p className="text-xs text-blue-200/80 leading-relaxed">
                  You can only have one CV in the system. This CV will be
                  automatically used for all your job applications. To update
                  it, use the replace button above.
                </p>
              </div>
            </div>
          </div>

          {/* Hidden input for replace */}
          <input
            id="cv-file-input"
            type="file"
            accept=".pdf"
            onChange={(e) =>
              e.target.files?.[0] && handleFileUpload(e.target.files[0])
            }
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Trash2, Archive, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (permanent: boolean) => void;
  jobTitle?: string;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  jobTitle,
}: ConfirmDeleteModalProps) {
  const [isPermanent, setIsPermanent] = useState(false);

  // Remettre la checkbox à false quand la modale s'ouvre
  useEffect(() => {
    if (isOpen) setIsPermanent(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Fond sombre */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Carte Modale */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[#0F1115] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto animate-in zoom-in-95 duration-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* En-tête */}
          <div className="p-6 border-b border-white/5 flex items-start gap-4">
            <div
              className={`p-3 rounded-full shrink-0 ${
                isPermanent
                  ? "bg-red-500/10 text-red-500"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">
                {isPermanent ? "Delete Permanently?" : "Archive Job?"}
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                You are about to remove{" "}
                <span className="text-white font-medium">
                  "{jobTitle || "this job"}"
                </span>
                .
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corps avec Checkbox */}
          <div className="p-6 bg-white/[0.02]">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
              <div className="relative flex items-center mt-0.5">
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-600 bg-gray-900/50 checked:border-red-500 checked:bg-red-500 transition-all"
                />
                <svg
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div>
                <span className="block text-sm font-medium text-white group-hover:text-red-400 transition-colors">
                  Permanent Delete
                </span>
                <span className="block text-xs text-gray-500">
                  Checking this will remove the job from the database
                  completely.
                </span>
              </div>
            </label>
          </div>

          {/* Pied de page avec actions */}
          <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 bg-gray-900/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={() => onConfirm(isPermanent)}
              className={`px-5 py-2 rounded-lg text-sm font-medium text-white shadow-lg flex items-center gap-2 transition-all ${
                isPermanent
                  ? "bg-red-600 hover:bg-red-700 shadow-red-900/20"
                  : "bg-amber-600 hover:bg-amber-700 shadow-amber-900/20"
              }`}
            >
              {isPermanent ? (
                <Trash2 className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              {isPermanent ? "Delete Forever" : "Archive"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

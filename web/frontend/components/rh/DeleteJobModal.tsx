"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

interface DeleteJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (permanent: boolean) => void;
  isDeleting: boolean;
  jobTitle: string;
}

export function DeleteJobModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  jobTitle,
}: DeleteJobModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            Delete Job Posting?
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Are you sure you want to delete{" "}
            <span className="text-white font-medium">"{jobTitle}"</span>? This
            action can be permanent.
          </p>

          <div className="flex flex-col gap-3">
            {/* Bouton Archive (Soft Delete - Recommandé par votre Swagger) */}
            <button
              onClick={() => onConfirm(false)}
              disabled={isDeleting}
              className="w-full py-2.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Archive (Soft Delete)"
              )}
            </button>

            {/* Bouton Delete Permanent */}
            <button
              onClick={() => onConfirm(true)}
              disabled={isDeleting}
              className="w-full py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete Permanently"
              )}
            </button>

            <button
              onClick={onClose}
              disabled={isDeleting}
              className="w-full py-2.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

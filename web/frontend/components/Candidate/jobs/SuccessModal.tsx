import { CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          Application Sent!
        </h2>
        <p className="text-gray-400 mb-8">Good luck!</p>

        <div className="space-y-3">
          <Link
            href="/candidate/applications"
            className="block w-full px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            View My Applications
          </Link>
          <button
            onClick={onClose}
            className="block w-full px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Back to Job Details
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { X } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#141414] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-white/[0.06] hover:text-neutral-300"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-neutral-500">settings coming soon.</p>
      </div>
    </div>
  );
}

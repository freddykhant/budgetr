"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { X } from "lucide-react";

import { BudgieMascot } from "./budgie-mascot";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "celebration" | "info" | "error";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  visible: boolean;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {
    if (typeof window !== "undefined") {
      console.warn("useToast must be used within ToastProvider");
    }
  },
});

export function useToast() {
  return useContext(ToastContext);
}

// ─── Individual toast item ────────────────────────────────────────────────────

const typeStyles: Record<ToastType, { card: string; dot: string }> = {
  success: {
    card: "border-green-100 bg-white",
    dot: "bg-green-400",
  },
  celebration: {
    card: "border-green-200 bg-linear-to-br from-green-50 to-white",
    dot: "bg-green-500",
  },
  info: {
    card: "border-blue-100 bg-white",
    dot: "bg-blue-400",
  },
  error: {
    card: "border-red-100 bg-red-50",
    dot: "bg-red-400",
  },
};

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const { card, dot } = typeStyles[toast.type];

  return (
    <div
      className={`flex min-w-[220px] max-w-[320px] items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-green-900/10 transition-all duration-300 ${card} ${
        toast.visible
          ? "translate-y-0 opacity-100"
          : "translate-y-3 opacity-0"
      }`}
    >
      {toast.type === "celebration" ? (
        <span className="shrink-0">
          <BudgieMascot size={24} animate="bob" />
        </span>
      ) : (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      )}
      <p className="flex-1 text-sm font-medium text-green-950">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-1 shrink-0 cursor-pointer text-green-300 transition hover:text-green-500"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", duration = 3500) => {
      const id = Math.random().toString(36).slice(2, 9);

      // Cap at 2 visible at once — drop the oldest if needed
      setToasts((prev) => [
        ...prev.slice(-1),
        { id, message, type, visible: false },
      ]);

      // Trigger enter transition after paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, visible: true } : t)),
          );
        });
      });

      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onDismiss={() => dismiss(toast.id)}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

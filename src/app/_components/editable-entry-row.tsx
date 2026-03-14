"use client";

import { useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday, parseISO, subDays } from "date-fns";
import { Check, Pencil, Trash2, X } from "lucide-react";

import { api } from "~/trpc/react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntryAccent = "orange" | "green" | "blue" | "violet";

type Props = {
  id: number;
  amount: number;
  description: string | null;
  date: string; // YYYY-MM-DD
  accent: EntryAccent;
  /** Prefix shown before the amount in view mode, e.g. "+" */
  amountPrefix?: string;
  onDelete: () => void;
  onSaveSuccess: () => void;
  isDeleting?: boolean;
};

// ─── Accent classes ───────────────────────────────────────────────────────────

const accentClasses = {
  orange: {
    input: "border-orange-200 bg-orange-50 focus:border-orange-300",
    dollar: "text-orange-400",
    chipActive: "bg-orange-500 text-white font-medium",
    chipInactive: "border border-orange-200 text-orange-600 hover:text-orange-800",
    save: "bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 disabled:text-orange-400",
    amount: "text-orange-500",
  },
  green: {
    input: "border-green-200 bg-green-50 focus:border-green-300",
    dollar: "text-green-400",
    chipActive: "bg-green-500 text-white font-medium",
    chipInactive: "border border-green-200 text-green-600 hover:text-green-800",
    save: "bg-green-500 hover:bg-green-600 disabled:bg-green-200 disabled:text-green-400",
    amount: "text-green-600",
  },
  blue: {
    input: "border-blue-200 bg-blue-50 focus:border-blue-300",
    dollar: "text-blue-400",
    chipActive: "bg-blue-500 text-white font-medium",
    chipInactive: "border border-blue-200 text-blue-600 hover:text-blue-800",
    save: "bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 disabled:text-blue-400",
    amount: "text-blue-500",
  },
  violet: {
    input: "border-violet-200 bg-violet-50 focus:border-violet-300",
    dollar: "text-violet-400",
    chipActive: "bg-violet-500 text-white font-medium",
    chipInactive: "border border-violet-200 text-violet-600 hover:text-violet-800",
    save: "bg-violet-500 hover:bg-violet-600 disabled:bg-violet-200 disabled:text-violet-400",
    amount: "text-violet-500",
  },
} satisfies Record<EntryAccent, Record<string, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function inferDateMode(dateStr: string): "today" | "yesterday" | "pick" {
  const d = parseISO(dateStr);
  if (isToday(d)) return "today";
  if (isYesterday(d)) return "yesterday";
  return "pick";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditableEntryRow({
  id,
  amount,
  description,
  date,
  accent,
  amountPrefix = "",
  onDelete,
  onSaveSuccess,
  isDeleting = false,
}: Props) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  const [isEditing, setIsEditing] = useState(false);
  const [draftAmount, setDraftAmount] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "pick">("today");
  const [pickDate, setPickDate] = useState(todayStr);

  const amountRef = useRef<HTMLInputElement>(null);

  const c = accentClasses[accent];

  const updateEntry = api.entry.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      onSaveSuccess();
    },
  });

  function openEdit() {
    setDraftAmount(String(amount));
    setDraftDesc(description ?? "");
    const mode = inferDateMode(date);
    setDateMode(mode);
    setPickDate(date);
    setIsEditing(true);
  }

  useEffect(() => {
    if (isEditing) amountRef.current?.focus();
  }, [isEditing]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(draftAmount);
    if (!Number.isFinite(val) || val <= 0) return;
    const newDate =
      dateMode === "today"
        ? todayStr
        : dateMode === "yesterday"
          ? yesterdayStr
          : pickDate;
    updateEntry.mutate({
      id,
      amount: val,
      date: newDate,
      description: draftDesc.trim() || null,
    });
  }

  function handleCancel() {
    setIsEditing(false);
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <li className="py-3">
        {/* Date chips */}
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          {(["today", "yesterday"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDateMode(d)}
              className={`cursor-pointer rounded-full px-3 py-1 text-sm transition ${
                dateMode === d ? c.chipActive : c.chipInactive
              }`}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDateMode("pick")}
            className={`cursor-pointer rounded-full px-3 py-1 text-sm transition ${
              dateMode === "pick" ? c.chipActive : c.chipInactive
            }`}
          >
            {dateMode === "pick" ? format(parseISO(pickDate), "d MMM") : "pick date"}
          </button>
          {dateMode === "pick" && (
            <input
              type="date"
              value={pickDate}
              max={todayStr}
              onChange={(e) => setPickDate(e.target.value)}
              className={`rounded-lg border px-2 py-1 text-sm text-green-700 outline-none ${c.input}`}
            />
          )}
        </div>

        {/* Amount + desc + actions */}
        <form onSubmit={handleSave} className="flex items-center gap-2">
          <div className={`flex items-center rounded-xl border px-3 py-2 ${c.input}`}>
            <span className={`mr-1 text-sm ${c.dollar}`}>$</span>
            <input
              ref={amountRef}
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-20 bg-transparent font-mono text-base font-semibold tabular-nums text-green-950 outline-none placeholder:text-green-300"
              placeholder="0.00"
              inputMode="decimal"
            />
          </div>
          <input
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-base text-green-800 outline-none placeholder:text-green-400 ${c.input}`}
            placeholder="description (optional)"
          />
          <button
            type="submit"
            disabled={!draftAmount || updateEntry.isPending}
            className={`shrink-0 cursor-pointer rounded-full px-3 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed ${c.save}`}
          >
            {updateEntry.isPending ? (
              "saving…"
            ) : (
              <Check size={14} />
            )}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="shrink-0 cursor-pointer rounded-full p-2 text-green-400 transition hover:bg-green-50 hover:text-green-600"
          >
            <X size={14} />
          </button>
        </form>
      </li>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────

  return (
    <li className="group flex items-center justify-between py-2.5">
      <p className="text-base text-green-800">
        {description ?? (
          <span className="italic text-green-400">no description</span>
        )}
      </p>
      <div className="flex items-center gap-2">
        <p className={`font-mono text-base tabular-nums ${c.amount}`}>
          {amountPrefix}{fmtFull(amount)}
        </p>
        <button
          type="button"
          onClick={openEdit}
          className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Edit entry"
        >
          <Pencil size={13} className="text-green-400 transition hover:text-green-600" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Delete entry"
        >
          <Trash2 size={13} className="text-green-400 transition hover:text-red-500" />
        </button>
      </div>
    </li>
  );
}

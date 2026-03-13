"use client";

import { useEffect, useMemo, useState } from "react";
import { getDaysInMonth } from "date-fns";
import { Pencil, X, Check, Trash2 as TrashIcon } from "lucide-react";

import { api } from "~/trpc/react";
import { useToast } from "./toast-provider";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function typeColor(type: string | null | undefined) {
  switch (type) {
    case "spending":
      return { bar: "bg-orange-400", slider: "accent-orange-400" };
    case "saving":
      return { bar: "bg-green-500", slider: "accent-green-500" };
    case "investment":
      return { bar: "bg-blue-400", slider: "accent-blue-400" };
    case "credit_card":
      return { bar: "bg-amber-400", slider: "accent-amber-400" };
    default:
      return { bar: "bg-green-300", slider: "accent-green-400" };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Allocation = {
  id: number;
  name: string;
  emoji: string | null;
  type: string | null;
  pct: number;
  amount: number;
  color: string;
  sliderAccent: string;
};

type Props = {
  month: number;
  year: number;
  onBudgetChange?: (income: number) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MonthlyBudgetCard({ month, year, onBudgetChange }: Props) {
  const utils = api.useUtils();
  const { showToast } = useToast();
  const budgetQuery = api.budget.getOrCreateCurrent.useQuery({ month, year });
  const categoriesQuery = api.category.list.useQuery();
  const updateBudget = api.budget.update.useMutation({
    onSuccess: () => {
      void utils.budget.getOrCreateCurrent.invalidate({ month, year });
      setIsEditing(false);
      showToast("Budget updated.", "success");
    },
  });

  const today = new Date();
  const monthDate = new Date(year, month - 1, 1);
  const totalDaysInMonth = getDaysInMonth(monthDate);
  const monthEnd = new Date(year, month, 0);

  let daysElapsed = 0;
  if (today < monthDate) {
    daysElapsed = 0;
  } else if (today > monthEnd) {
    daysElapsed = totalDaysInMonth;
  } else {
    daysElapsed = today.getDate();
  }

  const monthProgressPct =
    totalDaysInMonth > 0 ? (daysElapsed / totalDaysInMonth) * 100 : 0;

  const incomeNum = useMemo(
    () => Number(budgetQuery.data?.income ?? 0),
    [budgetQuery.data],
  );

  const allocations: Allocation[] = useMemo(() => {
    if (!budgetQuery.data || !categoriesQuery.data) return [];
    return budgetQuery.data.allocations
      .map((a) => {
        const cat = categoriesQuery.data.find((c) => c.id === a.categoryId);
        if (!cat) return null;
        const colors = typeColor(cat.type);
        return {
          id: cat.id,
          name: cat.name,
          emoji: cat.emoji,
          type: cat.type,
          pct: a.allocationPct,
          amount: (incomeNum * a.allocationPct) / 100,
          color: colors.bar,
          sliderAccent: colors.slider,
        };
      })
      .filter(Boolean) as Allocation[];
  }, [budgetQuery.data, categoriesQuery.data, incomeNum]);

  const totalAllocated = useMemo(
    () => allocations.reduce((s, a) => s + a.amount, 0),
    [allocations],
  );
  const unallocated = Math.max(0, incomeNum - totalAllocated);

  // ── Edit state ──────────────────────────────────────────────────────────────

  const [isEditing, setIsEditing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [draftIncome, setDraftIncome] = useState("");
  const [draftSplits, setDraftSplits] = useState<Record<number, number>>({});

  const clearMonth = api.entry.clearMonth.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.entry.list.invalidate(),
        utils.entry.listForCategories.invalidate(),
        utils.entry.listAllForCategory.invalidate(),
      ]);
      handleSave();
      const monthName = new Date(year, month - 1, 1).toLocaleString("en-AU", {
        month: "long",
      });
      showToast(
        `Month reset. Fresh start for ${monthName}.`,
        "info",
      );
    },
  });

  useEffect(() => {
    if (!confirmClear) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmClear(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmClear]);

  useEffect(() => {
    if (budgetQuery.data) {
      setDraftIncome(String(incomeNum || ""));
      const splits: Record<number, number> = {};
      budgetQuery.data.allocations.forEach((a) => {
        splits[a.categoryId] = a.allocationPct;
      });
      setDraftSplits(splits);
    }
  }, [budgetQuery.data, incomeNum]);

  const draftIncomeNum = Number(draftIncome);

  const draftTotalPct = useMemo(
    () => Object.values(draftSplits).reduce((s, v) => s + (v || 0), 0),
    [draftSplits],
  );

  const canSave =
    Number.isFinite(draftIncomeNum) &&
    draftIncomeNum > 0 &&
    draftTotalPct === 100 &&
    !updateBudget.isPending;

  function handleSave() {
    if (!canSave) return;
    setConfirmClear(false);
    updateBudget.mutate({
      month,
      year,
      income: draftIncomeNum,
      allocations: Object.entries(draftSplits).map(([catId, pct]) => ({
        categoryId: Number(catId),
        allocationPct: pct,
      })),
    });
    onBudgetChange?.(draftIncomeNum);
  }

  function handleCancel() {
    setIsEditing(false);
    setConfirmClear(false);
    if (budgetQuery.data) {
      setDraftIncome(String(incomeNum || ""));
      const splits: Record<number, number> = {};
      budgetQuery.data.allocations.forEach((a) => {
        splits[a.categoryId] = a.allocationPct;
      });
      setDraftSplits(splits);
    }
  }

  function setSplit(catId: number, value: number) {
    setDraftSplits((prev) => ({ ...prev, [catId]: value }));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const liveIncome = isEditing ? (draftIncomeNum || 0) : incomeNum;

  return (
    <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm shadow-green-900/5">
      {/* Month progress bar */}
      <div className="mb-4 h-0.5 w-full overflow-hidden rounded-full bg-green-100">
        <div
          className="h-full rounded-full bg-green-400 transition-all duration-500"
          style={{ width: `${monthProgressPct}%` }}
        />
      </div>

      {/* Top row: income + edit button */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-400">
              monthly income
            </p>
            {daysElapsed > 0 && (
              <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-600 tabular-nums">
                day {daysElapsed} of {totalDaysInMonth}
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 flex items-center rounded-xl border border-green-200 bg-green-50 px-3 py-2">
              <span className="mr-1.5 text-base text-green-500">$</span>
              <input
                value={draftIncome}
                onChange={(e) =>
                  setDraftIncome(e.target.value.replace(/[^0-9.]/g, ""))
                }
                className="w-36 bg-transparent font-mono text-3xl font-semibold tabular-nums text-green-950 outline-none placeholder:text-green-300"
                placeholder="4100"
                inputMode="decimal"
                autoFocus
              />
            </div>
          ) : (
            <p className="mt-2 font-mono text-5xl font-semibold tabular-nums tracking-tight text-green-950">
              {fmt(incomeNum)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing && !confirmClear ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-green-200 text-green-500 transition hover:text-green-700"
              >
                <X size={15} />
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={!canSave}
                className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-4 text-sm font-medium text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400"
              >
                <Check size={14} />
                {updateBudget.isPending ? "saving…" : "save"}
              </button>
            </>
          ) : isEditing && confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-green-200 px-4 text-sm text-green-600 transition hover:border-green-300 hover:text-green-800"
            >
              <X size={14} />
              back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-4 text-sm text-green-600 transition hover:border-green-300 hover:text-green-800"
            >
              <Pencil size={13} />
              edit
            </button>
          )}
        </div>
      </div>

      {/* Confirmation modal — save options */}
      {isEditing && confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-green-950/20 backdrop-blur-md [animation:backdrop-enter_0.2s_ease-out]"
            onClick={() => setConfirmClear(false)}
          />
          <div
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-white/60 bg-white p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_2px_4px_-2px_rgba(0,0,0,0.05),0_12px_24px_-4px_rgba(0,0,0,0.08),0_24px_48px_-8px_rgba(0,0,0,0.06)] [animation:modal-enter_0.25s_cubic-bezier(0.16,1,0.3,1)]"
            role="alertdialog"
            aria-labelledby="save-confirm-title"
            aria-describedby="save-confirm-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="save-confirm-title" className="text-lg font-semibold tracking-tight text-green-950">
              How would you like to save?
            </p>
            <p id="save-confirm-desc" className="mt-2 text-[15px] leading-relaxed text-green-600">
              Keep your logged entries, or clear{" "}
              {new Date(year, month - 1, 1).toLocaleString("en-AU", { month: "long" })}{" "}
              and start fresh.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || updateBudget.isPending}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-500 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition hover:bg-green-600 hover:shadow-[0_2px_8px_rgba(34,197,94,0.25)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                <Check size={15} />
                Save budget only
              </button>
              <button
                type="button"
                onClick={() => clearMonth.mutate({ month, year })}
                disabled={clearMonth.isPending || updateBudget.isPending}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/50 text-sm font-medium text-amber-800 transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearMonth.isPending ? (
                  "Clearing…"
                ) : (
                  <>
                    <TrashIcon size={15} />
                    Save & clear this month
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="mt-1 flex h-10 w-full cursor-pointer items-center justify-center rounded-xl text-sm text-green-500 transition hover:bg-green-50/80 hover:text-green-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="my-5 h-px bg-green-100" />

      {/* Budget split */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-green-600">
          <span>budget split</span>
          {!isEditing && (
            <span className="tabular-nums">
              {fmt(totalAllocated)} allocated · {fmt(unallocated)} free
            </span>
          )}
          {isEditing && (
            <span
              className={`tabular-nums transition-colors ${
                draftTotalPct === 100
                  ? "text-green-600"
                  : draftTotalPct > 100
                    ? "text-red-500"
                    : "text-amber-500"
              }`}
            >
              {draftTotalPct}% of 100%
            </span>
          )}
        </div>

        {/* Segmented bar */}
        <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-green-100">
          {(isEditing
            ? allocations.map((a) => ({
                ...a,
                pct: draftSplits[a.id] ?? a.pct,
                amount: (liveIncome * (draftSplits[a.id] ?? a.pct)) / 100,
              }))
            : allocations
          ).map((a) => (
            <div
              key={a.id}
              className={`h-full rounded-full ${a.color} transition-all duration-200`}
              style={{ width: `${a.pct}%` }}
            />
          ))}
        </div>

        {/* Category rows */}
        {isEditing ? (
          <div className="space-y-3 pt-1">
            {allocations.map((a) => {
              const draftPct = draftSplits[a.id] ?? a.pct;
              const draftAmount = (liveIncome * draftPct) / 100;
              return (
                <div key={a.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {a.emoji ?? ""}
                      </span>
                      <span className="text-base text-green-800">
                        {a.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums text-green-500">
                        {fmt(draftAmount)}
                      </span>
                      <div className="flex items-center rounded-lg border border-green-200 bg-green-50 px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={draftPct}
                          onChange={(e) =>
                            setSplit(
                              a.id,
                              Math.min(
                                100,
                                Math.max(
                                  0,
                                  parseInt(e.target.value || "0", 10),
                                ),
                              ),
                            )
                          }
                          className="w-10 bg-transparent text-right font-mono text-sm tabular-nums text-green-950 outline-none"
                        />
                        <span className="ml-0.5 text-sm text-green-500">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thin slider */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={draftPct}
                    onChange={(e) =>
                      setSplit(a.id, parseInt(e.target.value, 10))
                    }
                    className={`h-1 w-full cursor-pointer appearance-none rounded-full bg-green-200 ${a.sliderAccent}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {allocations.map((a) => (
              <div key={a.id} className="rounded-xl bg-green-50 p-3.5">
                <div className={`mb-2 h-1 w-6 rounded-full ${a.color}`} />
                <p className="font-mono text-xl font-semibold tabular-nums text-green-950">
                  {a.pct}%
                </p>
                <p className="mt-0.5 truncate text-sm text-green-600">
                  {a.emoji && (
                    <span className="mr-1">{a.emoji}</span>
                  )}
                  {a.name}
                </p>
                <p className="mt-1 font-mono text-sm tabular-nums text-green-500">
                  {fmt(a.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

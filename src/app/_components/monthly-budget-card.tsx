"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, X, Check } from "lucide-react";

import { api } from "~/trpc/react";

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
      return { bar: "bg-emerald-400", slider: "accent-emerald-400" };
    case "investment":
      return { bar: "bg-blue-400", slider: "accent-blue-400" };
    case "credit_card":
      return { bar: "bg-amber-400", slider: "accent-amber-400" };
    default:
      return { bar: "bg-neutral-500", slider: "accent-neutral-400" };
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
  const budgetQuery = api.budget.getOrCreateCurrent.useQuery({ month, year });
  const categoriesQuery = api.category.list.useQuery();
  const updateBudget = api.budget.update.useMutation({
    onSuccess: () => {
      void budgetQuery.refetch();
      setIsEditing(false);
    },
  });

  const incomeNum = useMemo(
    () => Number(budgetQuery.data?.income ?? 0),
    [budgetQuery.data],
  );

  const allocations: Allocation[] = useMemo(() => {
    if (!budgetQuery.data || !categoriesQuery.data) return [];
    return budgetQuery.data.allocations
      .map((a) => {
        const cat = categoriesQuery.data!.find((c) => c.id === a.categoryId);
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
  const [draftIncome, setDraftIncome] = useState("");
  const [draftSplits, setDraftSplits] = useState<
    Record<number, number>
  >({});

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
    <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
      {/* Top row: income + edit button */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
            monthly income
          </p>

          {isEditing ? (
            <div className="mt-2 flex items-center rounded-xl border border-white/[0.10] bg-black/40 px-3 py-2">
              <span className="mr-1.5 text-sm text-neutral-500">$</span>
              <input
                value={draftIncome}
                onChange={(e) =>
                  setDraftIncome(e.target.value.replace(/[^0-9.]/g, ""))
                }
                className="w-36 bg-transparent font-mono text-2xl font-semibold tabular-nums outline-none placeholder:text-neutral-600"
                placeholder="4100"
                inputMode="decimal"
                autoFocus
              />
            </div>
          ) : (
            <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">
              {fmt(incomeNum)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] text-neutral-500 transition hover:text-neutral-200"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
              >
                <Check size={13} />
                {updateBudget.isPending ? "saving…" : "save"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex h-8 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 text-xs text-neutral-400 transition hover:border-white/[0.16] hover:text-neutral-100"
            >
              <Pencil size={12} />
              edit
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="my-5 h-px bg-white/[0.05]" />

      {/* Budget split */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-neutral-500">
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
                  ? "text-emerald-400"
                  : draftTotalPct > 100
                    ? "text-red-400"
                    : "text-amber-400"
              }`}
            >
              {draftTotalPct}% of 100%
            </span>
          )}
        </div>

        {/* Segmented bar */}
        <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-white/[0.05]">
          {(isEditing ? allocations.map((a) => ({
            ...a,
            pct: draftSplits[a.id] ?? a.pct,
            amount: (liveIncome * (draftSplits[a.id] ?? a.pct)) / 100,
          })) : allocations).map((a) => (
            <div
              key={a.id}
              className={`h-full rounded-full ${a.color} opacity-80 transition-all duration-200`}
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
                      <span className="text-sm">
                        {a.emoji ?? ""}
                      </span>
                      <span className="text-sm text-neutral-200">
                        {a.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tabular-nums text-neutral-500">
                        {fmt(draftAmount)}
                      </span>
                      <div className="flex items-center rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1">
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
                          className="w-10 bg-transparent text-right font-mono text-sm tabular-nums outline-none"
                        />
                        <span className="ml-0.5 text-xs text-neutral-500">
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
                    className={`h-1 w-full cursor-pointer appearance-none rounded-full bg-white/[0.07] ${a.sliderAccent}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {allocations.map((a) => (
              <div key={a.id} className="rounded-xl bg-white/[0.03] p-3.5">
                <div className={`mb-2 h-1 w-5 rounded-full ${a.color}`} />
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {a.pct}%
                </p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {a.emoji && (
                    <span className="mr-1">{a.emoji}</span>
                  )}
                  {a.name}
                </p>
                <p className="mt-1 font-mono text-xs tabular-nums text-neutral-400">
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

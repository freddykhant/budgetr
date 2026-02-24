"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, ArrowLeft } from "lucide-react";

import { api } from "~/trpc/react";

type CategoryType = "spending" | "saving" | "investment" | "credit_card" | "custom";

type DraftCategory = {
  id: number;
  name: string;
  emoji?: string;
  color?: string;
  type: CategoryType;
  allocationPct: number;
};

const DEFAULT_CATEGORIES: DraftCategory[] = [
  { id: 1, name: "Spending", emoji: "💸", type: "spending", allocationPct: 30 },
  { id: 2, name: "Savings", emoji: "🐷", type: "saving", allocationPct: 40 },
  { id: 3, name: "Investments", emoji: "📈", type: "investment", allocationPct: 30 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [income, setIncome] = useState<string>("4100");
  const [categories, setCategories] = useState<DraftCategory[]>(DEFAULT_CATEGORIES);

  const completeMutation = api.onboarding.complete.useMutation({
    onSuccess: () => {
      router.push("/home");
    },
  });

  const totalPct = useMemo(
    () => categories.reduce((sum, c) => sum + (Number.isFinite(c.allocationPct) ? c.allocationPct : 0), 0),
    [categories],
  );

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  function handleAddCategory() {
    const nextId = (categories.at(-1)?.id ?? 0) + 1;
    setCategories([
      ...categories,
      { id: nextId, name: "New category", emoji: "✨", type: "custom", allocationPct: 0 },
    ]);
  }

  function handleUpdateCategory(id: number, patch: Partial<DraftCategory>) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }

  function handleRemoveCategory(id: number) {
    if (categories.length <= 1) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  function handleSubmit() {
    const parsedIncome = Number(income);
    if (!Number.isFinite(parsedIncome) || parsedIncome <= 0) return;
    if (totalPct !== 100) return;

    completeMutation.mutate({
      income: parsedIncome,
      month,
      year,
      categories: categories.map((c) => ({
        name: c.name,
        emoji: c.emoji,
        color: c.color,
        type: c.type,
        allocationPct: c.allocationPct,
      })),
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
      <div className="w-full max-w-xl rounded-2xl border border-white/[0.06] bg-[#101010] p-6 shadow-2xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              setup
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              let&apos;s set up your month
            </h1>
          </div>
          <p className="text-xs text-neutral-500">
            step {step} of 3
          </p>
        </header>

        {step === 1 && (
          <section className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-neutral-200">
                what&apos;s your monthly salary after tax?
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                we&apos;ll use this to auto-calculate your budget split.
              </p>
            </div>

            <div className="mt-3">
              <label className="text-xs text-neutral-500">
                monthly income
              </label>
              <div className="mt-1 flex items-center overflow-hidden rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5">
                <span className="mr-2 text-sm text-neutral-500">$</span>
                <input
                  value={income}
                  onChange={(e) => setIncome(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full bg-transparent text-lg font-semibold tabular-nums outline-none placeholder:text-neutral-600"
                  placeholder="4100"
                  inputMode="decimal"
                />
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-neutral-200">
                choose your categories
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                start with the defaults, or create the buckets that match how you think.
              </p>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2.5"
                >
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-base"
                    onClick={() => {
                      const nextEmoji = cat.emoji === "💸" ? "🐷" : cat.emoji === "🐷" ? "📈" : "💸";
                      handleUpdateCategory(cat.id, { emoji: nextEmoji });
                    }}
                  >
                    {cat.emoji ?? "✨"}
                  </button>
                  <input
                    value={cat.name}
                    onChange={(e) =>
                      handleUpdateCategory(cat.id, { name: e.target.value })
                    }
                    className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-neutral-600"
                    placeholder="Category name"
                  />
                  <select
                    value={cat.type}
                    onChange={(e) =>
                      handleUpdateCategory(cat.id, {
                        type: e.target.value as CategoryType,
                      })
                    }
                    className="rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1 text-xs text-neutral-300 outline-none"
                  >
                    <option value="spending">spending</option>
                    <option value="saving">saving</option>
                    <option value="investment">investment</option>
                    <option value="credit_card">credit card</option>
                    <option value="custom">custom</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(cat.id)}
                    className="text-xs text-neutral-600 hover:text-neutral-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddCategory}
              className="flex items-center gap-2 text-xs font-medium text-neutral-300 transition hover:text-white"
            >
              <Plus size={14} /> add category
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-neutral-200">
                set your budget split
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                how do you want to divide{" "}
                <span className="font-mono tabular-nums text-neutral-300">
                  ${income || "0"}
                </span>{" "}
                across your categories?
              </p>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2.5"
                >
                  <div className="w-32 truncate text-sm text-neutral-200">
                    {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
                    {cat.name}
                  </div>
                  <div className="flex-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${Math.max(0, Math.min(100, cat.allocationPct))}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      value={cat.allocationPct.toString()}
                      onChange={(e) =>
                        handleUpdateCategory(cat.id, {
                          allocationPct: Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                        })
                      }
                      className="w-12 rounded-md border border-white/[0.08] bg-black/40 px-1.5 py-1 text-right text-xs font-mono tabular-nums outline-none"
                      inputMode="numeric"
                    />
                    <span className="text-xs text-neutral-500">%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">total</span>
              <span
                className={`font-mono tabular-nums ${
                  totalPct === 100
                    ? "text-emerald-400"
                    : totalPct > 100
                      ? "text-red-400"
                      : "text-amber-400"
                }`}
              >
                {totalPct}%
              </span>
            </div>
          </section>
        )}

        {/* Footer actions */}
        <footer className="mt-8 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)))}
            className="inline-flex items-center gap-1 text-xs text-neutral-500 disabled:opacity-40"
          >
            <ArrowLeft size={14} /> back
          </button>

          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 3 ? 3 : ((s + 1) as 1 | 2 | 3)))}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-neutral-200"
            >
              next <ArrowRight size={14} />
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                completeMutation.isPending ||
                !income ||
                totalPct !== 100
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-500 disabled:text-neutral-200"
            >
              {completeMutation.isPending ? "saving…" : "finish & go to dashboard"}
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}


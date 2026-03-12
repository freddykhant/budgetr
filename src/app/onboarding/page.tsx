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
    onSuccess: () => { router.push("/home"); },
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
    setCategories([...categories, { id: nextId, name: "New category", emoji: "✨", type: "custom", allocationPct: 0 }]);
  }

  function handleUpdateCategory(id: number, patch: Partial<DraftCategory>) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
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
      income: parsedIncome, month, year,
      categories: categories.map((c) => ({ name: c.name, emoji: c.emoji, color: c.color, type: c.type, allocationPct: c.allocationPct })),
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 px-4 text-green-950">
      <div className="w-full max-w-xl rounded-2xl border border-green-100 bg-white p-6 shadow-xl shadow-green-900/10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-green-500">setup</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-green-950">let&apos;s set up your month</h1>
          </div>
          <p className="text-sm text-green-500">step {step} of 3</p>
        </header>

        {step === 1 && (
          <section className="space-y-6">
            <div>
              <h2 className="text-base font-medium text-green-800">what&apos;s your monthly salary after tax?</h2>
              <p className="mt-1 text-sm text-green-600">we&apos;ll use this to auto-calculate your budget split.</p>
            </div>
            <div className="mt-3">
              <label className="text-sm text-green-600">monthly income</label>
              <div className="mt-1 flex items-center overflow-hidden rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 focus-within:border-green-400">
                <span className="mr-2 text-base text-green-500">$</span>
                <input
                  value={income} onChange={(e) => setIncome(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full bg-transparent text-xl font-semibold tabular-nums text-green-950 outline-none placeholder:text-green-300"
                  placeholder="4100" inputMode="decimal"
                />
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-medium text-green-800">choose your categories</h2>
              <p className="mt-1 text-sm text-green-600">start with the defaults, or create the buckets that match how you think.</p>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-3 py-2.5">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-lg"
                    onClick={() => {
                      const nextEmoji = cat.emoji === "💸" ? "🐷" : cat.emoji === "🐷" ? "📈" : "💸";
                      handleUpdateCategory(cat.id, { emoji: nextEmoji });
                    }}
                  >
                    {cat.emoji ?? "✨"}
                  </button>
                  <input
                    value={cat.name} onChange={(e) => handleUpdateCategory(cat.id, { name: e.target.value })}
                    className="flex-1 bg-transparent text-base font-medium text-green-950 outline-none placeholder:text-green-300"
                    placeholder="Category name"
                  />
                  <select
                    value={cat.type} onChange={(e) => handleUpdateCategory(cat.id, { type: e.target.value as CategoryType })}
                    className="rounded-lg border border-green-200 bg-white px-2 py-1 text-sm text-green-700 outline-none"
                  >
                    <option value="spending">spending</option>
                    <option value="saving">saving</option>
                    <option value="investment">investment</option>
                    <option value="credit_card">credit card</option>
                    <option value="custom">custom</option>
                  </select>
                  <button type="button" onClick={() => handleRemoveCategory(cat.id)} className="cursor-pointer text-base text-green-400 hover:text-green-700">×</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={handleAddCategory} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-green-600 transition hover:text-green-800">
              <Plus size={15} /> add category
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-medium text-green-800">set your budget split</h2>
              <p className="mt-1 text-sm text-green-600">
                how do you want to divide{" "}
                <span className="font-mono tabular-nums text-green-800">${income || "0"}</span>{" "}
                across your categories?
              </p>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-3 py-2.5">
                  <div className="w-32 truncate text-base text-green-800">
                    {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
                    {cat.name}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-green-200">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.max(0, Math.min(100, cat.allocationPct))}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      value={cat.allocationPct.toString()}
                      onChange={(e) => handleUpdateCategory(cat.id, { allocationPct: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })}
                      className="w-12 rounded-md border border-green-200 bg-white px-1.5 py-1 text-right text-sm font-mono tabular-nums text-green-950 outline-none focus:border-green-400"
                      inputMode="numeric"
                    />
                    <span className="text-sm text-green-500">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600">total</span>
              <span className={`font-mono tabular-nums ${totalPct === 100 ? "text-green-600" : totalPct > 100 ? "text-red-500" : "text-amber-500"}`}>
                {totalPct}%
              </span>
            </div>
          </section>
        )}

        <footer className="mt-8 flex items-center justify-between">
          <button
            type="button" disabled={step === 1}
            onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)))}
            className="inline-flex items-center gap-1 text-sm text-green-500 disabled:opacity-40"
          >
            <ArrowLeft size={15} /> back
          </button>

          {step < 3 && (
            <button
              type="button" onClick={() => setStep((s) => (s === 3 ? 3 : ((s + 1) as 1 | 2 | 3)))}
              className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600"
            >
              next <ArrowRight size={15} />
            </button>
          )}

          {step === 3 && (
            <button
              type="button" onClick={handleSubmit}
              disabled={completeMutation.isPending || !income || totalPct !== 100}
              className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400"
            >
              {completeMutation.isPending ? "saving…" : "finish & go to dashboard"}
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}

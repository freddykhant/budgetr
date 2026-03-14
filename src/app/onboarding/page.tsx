"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";

import { api } from "~/trpc/react";
import { BudgieMascot } from "~/app/_components/budgie-mascot";

type CategoryType = "spending" | "saving" | "investment" | "custom";

type DraftCategory = {
  id: number;
  name: string;
  emoji: string;
  type: CategoryType;
  allocationPct: number;
};

const DEFAULT_CATEGORIES: DraftCategory[] = [
  { id: 1, name: "Spending",    emoji: "💸", type: "spending",   allocationPct: 30 },
  { id: 2, name: "Savings",     emoji: "🐷", type: "saving",     allocationPct: 40 },
  { id: 3, name: "Investments", emoji: "📈", type: "investment", allocationPct: 30 },
];

const TYPE_OPTIONS: { value: CategoryType; label: string }[] = [
  { value: "spending",   label: "spending"   },
  { value: "saving",     label: "saving"     },
  { value: "investment", label: "investment" },
  { value: "custom",     label: "custom"     },
];

const EMOJI_CYCLE = [
  "💸", "🐷", "📈", "🏠", "🍔", "✈️", "🎮", "🎵",
  "💊", "👗", "🚗", "⚡", "📱", "🎓", "☕", "🎁",
  "🛒", "💼", "🎬", "🐾", "🏋️", "🌿", "🎨", "✨",
];

function cycleEmoji(current: string): string {
  const idx = EMOJI_CYCLE.indexOf(current);
  return EMOJI_CYCLE[(idx + 1) % EMOJI_CYCLE.length] ?? EMOJI_CYCLE[0]!;
}

const COMMON_PAYDAYS = [1, 7, 14, 15, 21, 28];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [income, setIncome] = useState<string>("4100");
  const [payday, setPayday] = useState<number | null>(null);
  const [customPayday, setCustomPayday] = useState<string>("");
  const [showCustomPayday, setShowCustomPayday] = useState(false);
  const [categories, setCategories] = useState<DraftCategory[]>(DEFAULT_CATEGORIES);

  const completeMutation = api.onboarding.complete.useMutation({
    onSuccess: () => router.push("/home"),
  });

  const totalPct = useMemo(
    () => categories.reduce((sum, c) => sum + (Number.isFinite(c.allocationPct) ? c.allocationPct : 0), 0),
    [categories],
  );

  const incomeNum = Number(income);
  const hasValidIncome = Number.isFinite(incomeNum) && incomeNum > 0;

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

  function handlePaydayChip(day: number) {
    setPayday(day);
    setShowCustomPayday(false);
    setCustomPayday("");
  }

  function handleCustomPaydayChange(val: string) {
    setCustomPayday(val.replace(/[^0-9]/g, ""));
    const n = Number(val.replace(/[^0-9]/g, ""));
    if (n >= 1 && n <= 31) setPayday(n);
    else setPayday(null);
  }

  const resolvedPayday = showCustomPayday
    ? (Number(customPayday) >= 1 && Number(customPayday) <= 31 ? Number(customPayday) : null)
    : payday;

  function handleSubmit() {
    if (!hasValidIncome || totalPct !== 100) return;
    completeMutation.mutate({
      income: incomeNum,
      month,
      year,
      paydayOfMonth: resolvedPayday ?? undefined,
      categories: categories.map((c) => ({
        name: c.name,
        emoji: c.emoji,
        color: undefined,
        type: c.type,
        allocationPct: c.allocationPct,
      })),
    });
  }

  const nextDisabled =
    (step === 1 && !hasValidIncome) ||
    (step === 3 && totalPct !== 100);

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 px-4 text-green-950">
      <div className="w-full max-w-xl rounded-2xl border border-green-100 bg-white p-6 shadow-xl shadow-green-900/10">

        {/* Brand header — always visible */}
        <header className="mb-6 flex flex-col items-center text-center">
          <BudgieMascot size={52} animate="bob" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-green-950">
            let&apos;s set up your budget
          </h1>
          <p className="mt-1 text-sm text-green-500">takes about a minute</p>
        </header>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-6 bg-green-500"
                  : s < step
                    ? "w-3 bg-green-300"
                    : "w-3 bg-green-100"
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Income ─────────────────────────────────────────────── */}
        {step === 1 && (
          <section className="space-y-6">
            <div>
              <h2 className="text-base font-medium text-green-800">
                what&apos;s your monthly salary after tax?
              </h2>
              <p className="mt-1 text-sm text-green-600">
                we&apos;ll use this to auto-calculate your budget split.
              </p>
            </div>
            <div>
              <label className="text-sm text-green-600">monthly income</label>
              <div className="mt-1 flex items-center overflow-hidden rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 focus-within:border-green-400">
                <span className="mr-2 text-base text-green-500">$</span>
                <input
                  value={income}
                  onChange={(e) => setIncome(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full cursor-text bg-transparent text-xl font-semibold tabular-nums text-green-950 outline-none placeholder:text-green-300"
                  placeholder="4100"
                  inputMode="decimal"
                  autoFocus
                />
              </div>
            </div>
          </section>
        )}

        {/* ── Step 2: Categories ─────────────────────────────────────────── */}
        {step === 2 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-medium text-green-800">choose your categories</h2>
              <p className="mt-1 text-sm text-green-600">
                start with the defaults, or create the buckets that match how you think.
              </p>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-xl border border-green-100 bg-green-50 p-3"
                >
                  {/* Row 1: emoji + name + delete */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="click to cycle emoji"
                      onClick={() => handleUpdateCategory(cat.id, { emoji: cycleEmoji(cat.emoji) })}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-green-100 text-lg transition hover:bg-green-200 active:scale-90"
                    >
                      {cat.emoji}
                    </button>
                    <input
                      value={cat.name}
                      onChange={(e) => handleUpdateCategory(cat.id, { name: e.target.value })}
                      className="flex-1 cursor-text bg-transparent text-base font-medium text-green-950 outline-none placeholder:text-green-300"
                      placeholder="Category name"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat.id)}
                      disabled={categories.length <= 1}
                      className="cursor-pointer text-lg leading-none text-green-300 transition hover:text-red-400 active:scale-90 disabled:opacity-30"
                    >
                      ×
                    </button>
                  </div>

                  {/* Row 2: type pill chips */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TYPE_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => handleUpdateCategory(cat.id, { type: t.value })}
                        className={`cursor-pointer rounded-full px-2.5 py-1 text-xs transition active:scale-95 ${
                          cat.type === t.value
                            ? "bg-green-500 font-medium text-white"
                            : "border border-green-200 text-green-600 hover:bg-green-100"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddCategory}
              className="flex cursor-pointer items-center gap-2 text-sm font-medium text-green-600 transition hover:text-green-800 active:scale-95"
            >
              <Plus size={15} /> add category
            </button>
          </section>
        )}

        {/* ── Step 3: Budget split ───────────────────────────────────────── */}
        {step === 3 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-medium text-green-800">set your budget split</h2>
              <p className="mt-1 text-sm text-green-600">
                how do you want to divide{" "}
                <span className="font-mono tabular-nums text-green-800">
                  ${incomeNum.toLocaleString()}
                </span>{" "}
                across your categories?
              </p>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => {
                const dollarAmt = Math.round((incomeNum * cat.allocationPct) / 100);
                return (
                  <div
                    key={cat.id}
                    className="rounded-xl border border-green-100 bg-green-50 px-3 py-2.5"
                  >
                    {/* Name row */}
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">
                        {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
                        {cat.name}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-green-400">
                        ${dollarAmt.toLocaleString()}/mo
                      </span>
                    </div>

                    {/* Bar + % input */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-green-200">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all duration-300"
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
                          className="w-12 cursor-text rounded-md border border-green-200 bg-white px-1.5 py-1 text-right text-sm font-mono tabular-nums text-green-950 outline-none focus:border-green-400"
                          inputMode="numeric"
                        />
                        <span className="text-sm text-green-500">%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total row */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600">total</span>
              <div className="text-right">
                <span
                  className={`font-mono tabular-nums ${
                    totalPct === 100
                      ? "text-green-600"
                      : totalPct > 100
                        ? "text-red-500"
                        : "text-amber-500"
                  }`}
                >
                  {totalPct}%
                </span>
                {totalPct === 100 ? (
                  <p className="text-xs text-green-400">
                    ${incomeNum.toLocaleString()}/mo fully allocated ✓
                  </p>
                ) : totalPct > 100 ? (
                  <p className="text-xs text-red-400">{totalPct - 100}% over — reduce a category</p>
                ) : (
                  <p className="text-xs text-amber-400">{100 - totalPct}% remaining to allocate</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Footer navigation ─────────────────────────────────────────── */}
        <footer className="mt-8 flex items-center justify-between">
          {/* Back — hidden on step 1 */}
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)))}
              className="inline-flex cursor-pointer items-center gap-1 text-sm text-green-500 transition hover:text-green-800 active:scale-95"
            >
              <ArrowLeft size={15} /> back
            </button>
          ) : (
            <span />
          )}

          {step < 3 && (
            <button
              type="button"
              disabled={nextDisabled}
              onClick={() => setStep((s) => (s === 3 ? 3 : ((s + 1) as 1 | 2 | 3)))}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400"
            >
              next <ArrowRight size={15} />
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={completeMutation.isPending || !hasValidIncome || totalPct !== 100}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400"
            >
              {completeMutation.isPending ? "saving…" : "finish & go to dashboard"}
              {!completeMutation.isPending && <ArrowRight size={15} />}
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}

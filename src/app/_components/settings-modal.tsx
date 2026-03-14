"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, User, Wallet, LogOut, Check, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";

import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";

type Tab = "account" | "budget" | "preferences";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// ─── Account tab ─────────────────────────────────────────────────────────────

function AccountTab({ user }: { user: SettingsModalProps["user"] }) {
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-green-950">account</h3>
        <p className="mt-0.5 text-sm text-green-600">
          your profile from Google sign-in.
        </p>
      </div>

      {/* Avatar + info */}
      <div className="flex items-center gap-4 rounded-xl border border-green-100 bg-green-50 px-4 py-4">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-200">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? "User"}
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <span className="text-base font-semibold text-green-700">
              {initials}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-green-950">
            {user.name ?? "—"}
          </p>
          <p className="truncate text-sm text-green-600">{user.email ?? "—"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-green-100 bg-green-50 p-4">
        <p className="mb-1 text-sm font-medium text-green-600">sign-in method</p>
        <div className="flex items-center gap-2">
          <svg className="size-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-sm text-green-600">Google</span>
        </div>
      </div>

      {/* Danger zone */}
      <div className="border-t border-green-100 pt-6">
        <p className="mb-3 text-sm font-medium text-green-500">session</p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-500 transition hover:border-red-300 hover:bg-red-100"
        >
          <LogOut size={14} />
          sign out
        </button>
      </div>
    </div>
  );
}

// ─── Budget tab ───────────────────────────────────────────────────────────────

type Budget = NonNullable<RouterOutputs["budget"]["getOrCreateCurrent"]>;
type Category = RouterOutputs["category"]["list"][number];

function BudgetForm({
  budget,
  categories,
  month,
  year,
}: {
  budget: Budget;
  categories: Category[];
  month: number;
  year: number;
}) {
  const utils = api.useUtils();
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [income, setIncome] = useState(() =>
    String(Math.round(Number(budget.income ?? 0))),
  );
  const [allocs, setAllocs] = useState<Record<number, number>>(() =>
    Object.fromEntries(budget.allocations.map((a) => [a.categoryId, a.allocationPct])),
  );
  const [saved, setSaved] = useState(false);

  const totalPct = useMemo(
    () => Object.values(allocs).reduce((s, v) => s + (v || 0), 0),
    [allocs],
  );

  const updateBudget = api.budget.update.useMutation({
    onSuccess: async () => {
      await utils.budget.getOrCreateCurrent.invalidate({ month, year });
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
      setSaved(true);
    },
  });

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  function handleSave() {
    const parsedIncome = Number(income);
    if (!Number.isFinite(parsedIncome) || parsedIncome <= 0) return;
    updateBudget.mutate({
      month,
      year,
      income: parsedIncome,
      allocations: Object.entries(allocs).map(([id, pct]) => ({
        categoryId: Number(id),
        allocationPct: pct,
      })),
    });
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);

  const incomeNum = Number(income) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-green-950">budget</h3>
        <p className="mt-0.5 text-sm text-green-600">
          update your income and how it&apos;s split across categories.
        </p>
      </div>

      {/* Income */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-green-600">
          monthly income (after tax)
        </label>
        <div className="flex items-center overflow-hidden rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 transition focus-within:border-green-400">
          <span className="mr-2 text-base text-green-500">$</span>
          <input
            value={income}
            onChange={(e) => setIncome(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-transparent font-mono text-lg font-semibold tabular-nums text-green-950 outline-none placeholder:text-green-300"
            placeholder="4100"
            inputMode="decimal"
          />
        </div>
      </div>

      {/* Allocations */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-green-600">
            budget split
          </label>
          <span
            className={`font-mono text-sm tabular-nums ${
              totalPct === 100
                ? "text-green-600"
                : totalPct > 100
                  ? "text-red-500"
                  : "text-amber-500"
            }`}
          >
            {totalPct}% of 100%
          </span>
        </div>

        <div className="space-y-2">
          {categories.map((cat) => {
            const pct = allocs[cat.id] ?? 0;
            const amount = incomeNum > 0 ? (incomeNum * pct) / 100 : 0;
            return (
              <div
                key={cat.id}
                className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-3 py-2.5"
              >
                <span className="w-5 shrink-0 text-lg">
                  {cat.emoji ?? "·"}
                </span>
                <span className="min-w-0 flex-1 truncate text-base text-green-800">
                  {cat.name}
                </span>
                {incomeNum > 0 && (
                  <span className="shrink-0 font-mono text-sm tabular-nums text-green-500">
                    {fmt(amount)}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <input
                    value={pct === 0 ? "" : pct.toString()}
                    onChange={(e) => {
                      const val = Number(e.target.value.replace(/[^0-9]/g, ""));
                      setAllocs((prev) => ({ ...prev, [cat.id]: val }));
                    }}
                    className="w-12 rounded-lg border border-green-200 bg-white px-1.5 py-1 text-right font-mono text-sm tabular-nums text-green-950 outline-none transition focus:border-green-400"
                    inputMode="numeric"
                    placeholder="0"
                  />
                  <span className="text-sm text-green-500">%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between border-t border-green-100 pt-4">
        <p className="text-sm text-green-500">
          changes apply to{" "}
          {new Date().toLocaleString("en-AU", { month: "long", year: "numeric" })}
        </p>
        <button
          onClick={handleSave}
          disabled={updateBudget.isPending || totalPct !== 100 || !income}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400"
        >
          {saved ? (
            <>
              <Check size={13} /> saved
            </>
          ) : updateBudget.isPending ? (
            "saving…"
          ) : (
            "save changes"
          )}
        </button>
      </div>
    </div>
  );
}

function BudgetTab() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const { data: budget } = api.budget.getOrCreateCurrent.useQuery({ month, year });
  const { data: categories } = api.category.list.useQuery();

  if (!budget || !categories) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="h-5 w-16 animate-pulse rounded bg-green-100" />
          <div className="h-4 w-56 animate-pulse rounded bg-green-50" />
        </div>
        <div className="h-12 animate-pulse rounded-xl bg-green-50" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-green-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <BudgetForm
      key={budget.id}
      budget={budget}
      categories={categories}
      month={month}
      year={year}
    />
  );
}

// ─── Preferences tab ─────────────────────────────────────────────────────────

const COMMON_PAYDAYS = [1, 7, 14, 15, 21, 28];

function PreferencesTab() {
  const utils = api.useUtils();
  const { data: settings } = api.userSettings.get.useQuery();

  const [payday, setPayday] = useState<number | null>(null);
  const [customPayday, setCustomPayday] = useState<string>("");
  const [showCustom, setShowCustom] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from server once loaded
  useEffect(() => {
    if (settings?.paydayOfMonth == null) return;
    const day = settings.paydayOfMonth;
    if (COMMON_PAYDAYS.includes(day)) {
      setPayday(day);
      setShowCustom(false);
    } else {
      setShowCustom(true);
      setCustomPayday(String(day));
      setPayday(day);
    }
  }, [settings?.paydayOfMonth]);

  useEffect(() => {
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); };
  }, []);

  const updateMutation = api.userSettings.update.useMutation({
    onSuccess: async () => {
      await utils.userSettings.get.invalidate();
      setSaved(true);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    },
  });

  const resolvedPayday = showCustom
    ? (Number(customPayday) >= 1 && Number(customPayday) <= 31 ? Number(customPayday) : null)
    : payday;

  function handleChip(day: number) {
    setPayday(day);
    setShowCustom(false);
    setCustomPayday("");
  }

  function handleCustomChange(val: string) {
    const clean = val.replace(/[^0-9]/g, "");
    setCustomPayday(clean);
    const n = Number(clean);
    setPayday(n >= 1 && n <= 31 ? n : null);
  }

  function handleSave() {
    updateMutation.mutate({ paydayOfMonth: resolvedPayday });
  }

  const ordinal = (n: number) =>
    n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

  if (!settings) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-32 animate-pulse rounded bg-green-100" />
        <div className="h-10 animate-pulse rounded-xl bg-green-50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-green-950">preferences</h3>
        <p className="mt-0.5 text-sm text-green-600">
          personal settings for your budgie experience.
        </p>
      </div>

      {/* Payday */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-green-600">payday</label>
          {settings.paydayOfMonth && (
            <span className="text-xs text-green-400">
              currently {ordinal(settings.paydayOfMonth)}
            </span>
          )}
        </div>
        <p className="text-xs text-green-500">what day of the month do you get paid?</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_PAYDAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => handleChip(day)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                payday === day && !showCustom
                  ? "bg-green-500 text-white"
                  : "border border-green-200 text-green-600 hover:bg-green-50"
              }`}
            >
              {ordinal(day)}{day === 28 ? " / last" : ""}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setShowCustom(true); setPayday(null); }}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
              showCustom
                ? "bg-green-500 text-white"
                : "border border-green-200 text-green-600 hover:bg-green-50"
            }`}
          >
            other
          </button>
        </div>

        {showCustom && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="31"
              value={customPayday}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="e.g. 23"
              className="w-24 cursor-text rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-mono tabular-nums text-green-950 outline-none focus:border-green-400"
              inputMode="numeric"
            />
            <span className="text-sm text-green-500">of the month</span>
          </div>
        )}

        {resolvedPayday && (
          <p className="text-xs text-green-500">
            budgie will show a countdown to the {ordinal(resolvedPayday)} each month.
          </p>
        )}
      </div>

      {/* Save */}
      <div className="border-t border-green-100 pt-4 flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400 active:scale-95"
        >
          {saved ? (
            <><Check size={13} /> saved</>
          ) : updateMutation.isPending ? "saving…" : "save preferences"}
        </button>
      </div>
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "account", label: "account", icon: <User size={15} /> },
  { id: "budget", label: "budget", icon: <Wallet size={15} /> },
  { id: "preferences", label: "preferences", icon: <Settings size={15} /> },
];

export function SettingsModal({ isOpen, onClose, user }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>("account");

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-green-950/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex h-[580px] w-full max-w-2xl overflow-hidden rounded-2xl border border-green-100 bg-white shadow-2xl shadow-green-900/15">
        {/* Left sidebar */}
        <aside className="flex w-48 shrink-0 flex-col border-r border-green-100 bg-green-50 p-3">
          <p className="mb-4 px-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
            settings
          </p>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-base transition-colors ${
                  tab === item.id
                    ? "bg-green-100 text-green-900"
                    : "text-green-500 hover:bg-green-100 hover:text-green-800"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Right content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-green-100 px-6 py-4">
            <p className="text-base font-medium capitalize text-green-950">{tab}</p>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-green-500 transition hover:bg-green-100 hover:text-green-700"
              aria-label="Close settings"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {tab === "account" && <AccountTab user={user} />}
            {tab === "budget" && <BudgetTab />}
            {tab === "preferences" && <PreferencesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

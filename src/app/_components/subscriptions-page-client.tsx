"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";

import { api } from "~/trpc/react";
import { BackButton } from "./back-button";
import { EmptyState } from "./empty-state";
import { useToast } from "./toast-provider";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtAUD(n: number, decimals = 0) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function monthlyAmount(amount: number, cycle: string) {
  return cycle === "yearly" ? amount / 12 : amount;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Subscription = {
  id: number;
  name: string;
  emoji: string;
  amount: string;
  billingCycle: string;
  color: string;
  isActive: boolean;
  createdAt: Date;
};

// ─── Color options ────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { key: "violet", bg: "bg-violet-100", ring: "ring-violet-400" },
  { key: "indigo", bg: "bg-indigo-100", ring: "ring-indigo-400" },
  { key: "blue",   bg: "bg-blue-100",   ring: "ring-blue-400"   },
  { key: "green",  bg: "bg-green-100",  ring: "ring-green-400"  },
  { key: "orange", bg: "bg-orange-100", ring: "ring-orange-400" },
  { key: "rose",   bg: "bg-rose-100",   ring: "ring-rose-400"   },
  { key: "amber",  bg: "bg-amber-100",  ring: "ring-amber-400"  },
  { key: "teal",   bg: "bg-teal-100",   ring: "ring-teal-400"   },
];

function colorFor(key: string) {
  return COLOR_OPTIONS.find((c) => c.key === key) ?? COLOR_OPTIONS[0]!;
}

// ─── Shared class helpers ─────────────────────────────────────────────────────

const btnPrimary =
  "flex cursor-pointer items-center gap-1.5 rounded-full bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-600 active:scale-95 disabled:opacity-60";
const btnGhost =
  "cursor-pointer rounded-full border border-green-200 px-3 py-1.5 text-sm text-green-600 transition hover:bg-green-50 active:scale-95";
const cycleBtnActive = "cursor-pointer bg-indigo-500 px-3 py-2 font-medium text-white transition";
const cycleBtnInactive = "cursor-pointer px-3 py-2 text-green-600 transition hover:bg-green-100";

// ─── SubscriptionRow ─────────────────────────────────────────────────────────

function SubscriptionRow({ sub }: { sub: Subscription }) {
  const utils = api.useUtils();
  const { showToast } = useToast();

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editName, setEditName] = useState(sub.name);
  const [editEmoji, setEditEmoji] = useState(sub.emoji);
  const [editAmount, setEditAmount] = useState(String(Number(sub.amount)));
  const [editCycle, setEditCycle] = useState<"monthly" | "yearly">(
    sub.billingCycle as "monthly" | "yearly",
  );
  const [editColor, setEditColor] = useState(sub.color);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const col = colorFor(sub.color);

  // Focus name input when entering edit mode
  useEffect(() => {
    if (editing) nameInputRef.current?.focus();
  }, [editing]);

  // Escape to cancel
  useEffect(() => {
    if (!editing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelEdit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const updateMutation = api.subscription.update.useMutation({
    onSuccess: async () => {
      await utils.subscription.list.invalidate();
      setEditing(false);
      showToast("subscription updated ✓");
    },
  });

  const deleteMutation = api.subscription.delete.useMutation({
    onSuccess: async () => {
      await utils.subscription.list.invalidate();
      showToast("subscription removed");
    },
  });

  function saveEdit() {
    const parsed = parseFloat(editAmount);
    if (!editName.trim() || isNaN(parsed) || parsed <= 0) return;
    updateMutation.mutate({
      id: sub.id,
      name: editName.trim(),
      emoji: editEmoji.trim() || "💳",
      amount: parsed,
      billingCycle: editCycle,
      color: editColor,
    });
  }

  function cancelEdit() {
    setEditName(sub.name);
    setEditEmoji(sub.emoji);
    setEditAmount(String(Number(sub.amount)));
    setEditCycle(sub.billingCycle as "monthly" | "yearly");
    setEditColor(sub.color);
    setEditing(false);
  }

  const monthly = monthlyAmount(Number(sub.amount), sub.billingCycle);

  if (deleting) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          remove <span className="font-medium">{sub.name}</span>?
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeleting(false)}
            className="cursor-pointer rounded-full border border-green-200 bg-white px-3 py-1 text-sm text-green-600 transition hover:bg-green-50 active:scale-95"
          >
            cancel
          </button>
          <button
            onClick={() => deleteMutation.mutate({ id: sub.id })}
            disabled={deleteMutation.isPending}
            className="cursor-pointer rounded-full bg-red-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-600 active:scale-95 disabled:opacity-60"
          >
            {deleteMutation.isPending ? "removing…" : "remove"}
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <input
            value={editEmoji}
            onChange={(e) => setEditEmoji(e.target.value)}
            className="w-12 cursor-text rounded-xl border border-green-200 bg-green-50 p-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            maxLength={4}
          />
          <input
            ref={nameInputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="subscription name"
            className="flex-1 cursor-text rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-950 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="mt-2 flex gap-2">
          <input
            type="number"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            placeholder="amount"
            min="0.01"
            step="0.01"
            className="w-32 cursor-text rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-950 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <div className="flex overflow-hidden rounded-xl border border-green-200 bg-green-50 text-sm">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setEditCycle(c)}
                className={editCycle === c ? cycleBtnActive : cycleBtnInactive}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.key}
              onClick={() => setEditColor(c.key)}
              className={`h-5 w-5 cursor-pointer rounded-full ring-offset-1 transition ${c.bg} ${editColor === c.key ? `ring-2 ${c.ring}` : ""}`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={saveEdit} disabled={updateMutation.isPending} className={btnPrimary}>
            <Check size={12} />
            {updateMutation.isPending ? "saving…" : "save"}
          </button>
          <button onClick={cancelEdit} className={btnGhost}>
            cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-green-100 bg-white p-4 shadow-sm shadow-green-900/5 transition hover:border-green-200">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${col.bg}`}>
        {sub.emoji}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-green-950">{sub.name}</p>
        <p className="text-xs text-green-400">
          {fmtAUD(Number(sub.amount), 2)}{" "}
          <span className="rounded-full border border-green-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            {sub.billingCycle}
          </span>
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono text-base font-semibold tabular-nums text-green-950">
          {fmtAUD(monthly)}
          <span className="text-xs font-normal text-green-400">/mo</span>
        </p>
      </div>

      {/* Action buttons — reveal on row hover */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-green-200 text-green-400 transition hover:border-green-300 hover:text-green-700 active:scale-90"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => setDeleting(true)}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-red-100 text-red-300 transition hover:border-red-300 hover:text-red-500 active:scale-90"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── AddSubscriptionForm ──────────────────────────────────────────────────────

function AddSubscriptionForm({ onDone }: { onDone: () => void }) {
  const utils = api.useUtils();
  const { showToast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [color, setColor] = useState("violet");

  // Auto-focus name on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDone]);

  const createMutation = api.subscription.create.useMutation({
    onSuccess: async () => {
      await utils.subscription.list.invalidate();
      showToast("subscription added 🎉");
      onDone();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!name.trim() || isNaN(parsed) || parsed <= 0) return;
    createMutation.mutate({
      name: name.trim(),
      emoji: emoji.trim() || "💳",
      amount: parsed,
      billingCycle: cycle,
      color,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
        new subscription
      </p>

      <div className="flex gap-2">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="💳"
          className="w-12 cursor-text rounded-xl border border-green-200 bg-green-50 p-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          maxLength={4}
        />
        <input
          ref={nameInputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Netflix, Spotify…"
          className="flex-1 cursor-text rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-950 placeholder:text-green-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          required
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="amount"
          min="0.01"
          step="0.01"
          required
          className="w-32 cursor-text rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-950 placeholder:text-green-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <div className="flex overflow-hidden rounded-xl border border-green-200 bg-green-50 text-sm">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={cycle === c ? cycleBtnActive : cycleBtnInactive}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setColor(c.key)}
            className={`h-5 w-5 cursor-pointer rounded-full ring-offset-1 transition ${c.bg} ${color === c.key ? `ring-2 ${c.ring}` : ""}`}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="submit" disabled={createMutation.isPending} className={btnPrimary}>
          <Plus size={12} />
          {createMutation.isPending ? "adding…" : "add subscription"}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>
          cancel
        </button>
      </div>
    </form>
  );
}

// ─── SubscriptionsPageClient ──────────────────────────────────────────────────

export function SubscriptionsPageClient() {
  const query = api.subscription.list.useQuery();
  const [showForm, setShowForm] = useState(false);

  const subs = useMemo(() => query.data ?? [], [query.data]);
  const activeSubs = useMemo(() => subs.filter((s) => s.isActive), [subs]);

  const totalMonthly = useMemo(
    () =>
      activeSubs.reduce(
        (sum, s) => sum + monthlyAmount(Number(s.amount), s.billingCycle),
        0,
      ),
    [activeSubs],
  );

  const totalYearly = totalMonthly * 12;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      {/* Page header */}
      <header className="mb-8">
        <BackButton href="/home" />
        <div className="mt-5 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-green-950">
              subscriptions
            </h1>
            {activeSubs.length > 0 ? (
              <p className="mt-0.5 font-mono text-sm tabular-nums text-green-500">
                {fmtAUD(totalMonthly)}/mo · {fmtAUD(totalYearly)}/yr
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-green-500">
                your recurring bills, all in one place
              </p>
            )}
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100 active:scale-95"
            >
              <Plus size={13} />
              add
            </button>
          )}
        </div>
      </header>

      <div className="space-y-3">
        {showForm && (
          <AddSubscriptionForm onDone={() => setShowForm(false)} />
        )}

        {query.isLoading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-indigo-50" />
          ))}

        {!query.isLoading && subs.length === 0 && !showForm && (
          <EmptyState
            mascotSize={64}
            animate="bob"
            headline="no subscriptions yet"
            body="add your recurring bills — Netflix, Spotify, iCloud — and budgie will total them up."
            action={{ label: "add your first subscription", onClick: () => setShowForm(true) }}
          />
        )}

        {!query.isLoading &&
          subs.map((sub) => (
            <SubscriptionRow key={sub.id} sub={sub} />
          ))}
      </div>

      {/* Totals footer */}
      {activeSubs.length > 0 && (
        <div className="mt-8 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm shadow-indigo-900/5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
            totals
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-500">per month</p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-green-950">
                {fmtAUD(totalMonthly)}
              </p>
            </div>
            <div className="h-8 w-px bg-green-100" />
            <div className="text-right">
              <p className="text-xs text-green-500">per year</p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-green-950">
                {fmtAUD(totalYearly)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-green-400">
            {activeSubs.length} active subscription{activeSubs.length === 1 ? "" : "s"}
            {activeSubs.some((s) => s.billingCycle === "yearly") &&
              " · yearly amounts shown as monthly equivalent"}
          </p>
        </div>
      )}
    </main>
  );
}

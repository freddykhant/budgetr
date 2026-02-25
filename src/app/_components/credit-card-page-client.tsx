"use client";

import { useMemo, useState } from "react";
import {
  differenceInCalendarDays,
  format,
  isAfter,
  parseISO,
  subDays,
} from "date-fns";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Pencil, Plus, Trash2, X } from "lucide-react";

import { api } from "~/trpc/react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function dateLabel(dateStr: string) {
  const d = parseISO(dateStr);
  const today = new Date();
  const yesterday = subDays(today, 1);
  if (format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) return "today";
  if (format(d, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd"))
    return "yesterday";
  return format(d, "EEE d MMM");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreditCardPageClient({
  categoryId,
  categoryName,
  categoryEmoji,
}: {
  categoryId: number;
  categoryName: string;
  categoryEmoji: string | null;
}) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  // ── Setup form state ───────────────────────────────────────────────────────
  const [setupCardName, setSetupCardName] = useState(categoryName);
  const [setupTarget, setSetupTarget] = useState("");
  const [setupPoints, setSetupPoints] = useState("");
  const [setupStartDate, setSetupStartDate] = useState(todayStr);
  const [setupEndDate, setSetupEndDate] = useState("");

  // ── Edit tracker form state ────────────────────────────────────────────────
  const [showEditForm, setShowEditForm] = useState(false);
  const [editCardName, setEditCardName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  // ── Spend entry form state ─────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "pick">(
    "today",
  );
  const [pickDate, setPickDate] = useState(todayStr);

  const entryDate =
    dateMode === "today"
      ? todayStr
      : dateMode === "yesterday"
        ? yesterdayStr
        : pickDate;

  // ── Queries & mutations ────────────────────────────────────────────────────
  const trackerQuery = api.creditCard.get.useQuery({ categoryId });
  const entriesQuery = api.entry.listAllForCategory.useQuery({ categoryId });

  const upsertTracker = api.creditCard.upsert.useMutation({
    onSuccess: () => {
      void trackerQuery.refetch();
      setShowEditForm(false);
    },
  });

  const updateTracker = api.creditCard.update.useMutation({
    onSuccess: () => void trackerQuery.refetch(),
  });

  const deleteTracker = api.creditCard.delete.useMutation({
    onSuccess: () => void trackerQuery.refetch(),
  });

  const createEntry = api.entry.create.useMutation({
    onSuccess: () => {
      void entriesQuery.refetch();
      setAmount("");
      setDescription("");
      setDateMode("today");
      setShowAddForm(false);
    },
  });

  const deleteEntry = api.entry.delete.useMutation({
    onSuccess: () => void entriesQuery.refetch(),
  });

  // ── Derived stats ──────────────────────────────────────────────────────────
  const tracker = trackerQuery.data;

  const entriesData = entriesQuery.data;
  const allEntries = useMemo(() => entriesData ?? [], [entriesData]);

  // Only count entries within the tracker's date window
  const windowEntries = useMemo(() => {
    if (!tracker) return [];
    return allEntries.filter(
      (e) => e.date >= tracker.startDate && e.date <= tracker.endDate,
    );
  }, [allEntries, tracker]);

  const totalSpent = useMemo(
    () => windowEntries.reduce((sum, e) => sum + Number(e.amount), 0),
    [windowEntries],
  );

  const spendTarget = tracker ? Number(tracker.spendTarget) : 0;
  const remaining = Math.max(0, spendTarget - totalSpent);
  const spendPct = spendTarget > 0 ? Math.min(100, (totalSpent / spendTarget) * 100) : 0;

  const daysLeft = tracker
    ? Math.max(0, differenceInCalendarDays(parseISO(tracker.endDate), today))
    : 0;
  const totalDays = tracker
    ? differenceInCalendarDays(parseISO(tracker.endDate), parseISO(tracker.startDate)) + 1
    : 0;
  const daysElapsed = tracker
    ? Math.min(totalDays, differenceInCalendarDays(today, parseISO(tracker.startDate)))
    : 0;

  // Pacing: where should spend be right now at even daily pace?
  const expectedByNow = totalDays > 0 ? (spendTarget / totalDays) * daysElapsed : 0;
  const aheadOfPace = totalSpent - expectedByNow;
  const dailyRequired = daysLeft > 0 ? remaining / daysLeft : 0;

  const isComplete = spendTarget > 0 && totalSpent >= spendTarget;
  const isPastEnd = tracker
    ? isAfter(today, parseISO(tracker.endDate))
    : false;

  type Status = "complete" | "expired" | "urgent" | "behind" | "on_track";
  const status: Status = isComplete
    ? "complete"
    : isPastEnd
      ? "expired"
      : daysLeft <= 7 && !isComplete
        ? "urgent"
        : aheadOfPace < 0
          ? "behind"
          : "on_track";

  const statusConfig: Record<Status, { label: string; color: string }> = {
    complete: { label: "bonus earned 🎉", color: "text-emerald-400" },
    expired: { label: "window closed", color: "text-neutral-500" },
    urgent: { label: "deadline soon", color: "text-red-400" },
    behind: { label: "behind pace", color: "text-amber-400" },
    on_track: { label: "on track", color: "text-emerald-400" },
  };

  const barColor =
    isComplete
      ? "bg-emerald-400"
      : isPastEnd
        ? "bg-neutral-600"
        : status === "urgent" || status === "behind"
          ? "bg-amber-400"
          : "bg-amber-400";

  // Group spend history by date
  const grouped = useMemo(() => {
    const map = new Map<string, typeof windowEntries>();
    windowEntries.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [windowEntries]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(setupTarget);
    const points = Number(setupPoints);
    if (!Number.isFinite(target) || target <= 0) return;
    upsertTracker.mutate({
      categoryId,
      cardName: setupCardName.trim() || categoryName,
      spendTarget: target,
      bonusPoints: Number.isFinite(points) && points > 0 ? Math.round(points) : 0,
      startDate: setupStartDate,
      endDate: setupEndDate || undefined,
    });
  }

  function handleEditOpen() {
    if (!tracker) return;
    setEditCardName(tracker.cardName);
    setEditTarget(String(Number(tracker.spendTarget)));
    setEditPoints(String(tracker.bonusPoints));
    setEditStartDate(tracker.startDate);
    setEditEndDate(tracker.endDate);
    setShowEditForm(true);
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(editTarget);
    if (!Number.isFinite(target) || target <= 0) return;
    upsertTracker.mutate({
      categoryId,
      cardName: editCardName.trim() || categoryName,
      spendTarget: target,
      bonusPoints: Math.round(Number(editPoints) || 0),
      startDate: editStartDate,
      endDate: editEndDate || undefined,
    });
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    createEntry.mutate({
      categoryId,
      amount: value,
      date: entryDate,
      description: description.trim() || undefined,
    });
  }

  const isLoading = trackerQuery.isLoading || entriesQuery.isLoading;
  const displayName = `${categoryEmoji ? categoryEmoji + " " : ""}${categoryName}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      {/* Page header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-neutral-400 transition hover:border-white/20 hover:text-neutral-100"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {displayName}
            </h1>
            <p className="text-xs text-neutral-600">
              {format(today, "MMMM yyyy")}
            </p>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-white/[0.03]"
            />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {/* ── No tracker: setup card ──────────────────────────────────── */}
          {!tracker && (
            <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
              <p className="mb-1 text-base font-semibold">
                set up your bonus tracker
              </p>
              <p className="mb-5 text-xs text-neutral-600">
                track your spend toward a credit card sign-up bonus.
              </p>

              <form onSubmit={handleSetup} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs text-neutral-500">
                      card name
                    </label>
                    <input
                      value={setupCardName}
                      onChange={(e) => setSetupCardName(e.target.value)}
                      placeholder="e.g. ANZ Rewards Visa"
                      className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-700"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-neutral-500">
                      spend target
                    </label>
                    <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5">
                      <span className="mr-1 text-sm text-neutral-600">$</span>
                      <input
                        value={setupTarget}
                        onChange={(e) =>
                          setSetupTarget(
                            e.target.value.replace(/[^0-9.]/g, ""),
                          )
                        }
                        placeholder="3,000"
                        inputMode="decimal"
                        className="w-full bg-transparent font-mono text-sm tabular-nums outline-none placeholder:text-neutral-700"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-neutral-500">
                      bonus reward (points)
                    </label>
                    <input
                      value={setupPoints}
                      onChange={(e) =>
                        setSetupPoints(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      placeholder="100,000"
                      inputMode="numeric"
                      className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 font-mono text-sm tabular-nums text-neutral-100 outline-none placeholder:text-neutral-700"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-neutral-500">
                      start date
                    </label>
                    <input
                      type="date"
                      value={setupStartDate}
                      onChange={(e) => setSetupStartDate(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-sm text-neutral-100 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs text-neutral-500">
                      end date{" "}
                      <span className="text-neutral-700">
                        (leave blank for 90 days)
                      </span>
                    </label>
                    <input
                      type="date"
                      value={setupEndDate}
                      min={setupStartDate}
                      onChange={(e) => setSetupEndDate(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-sm text-neutral-100 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={upsertTracker.isPending || !setupTarget}
                    className="rounded-full bg-white px-5 py-2 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                  >
                    {upsertTracker.isPending ? "saving…" : "create tracker"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Active tracker ───────────────────────────────────────────── */}
          {tracker && (
            <>
              {/* Edit tracker form */}
              {showEditForm && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      edit tracker
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowEditForm(false)}
                      className="text-neutral-600 transition hover:text-neutral-300"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <form onSubmit={handleEditSave} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          card name
                        </label>
                        <input
                          value={editCardName}
                          onChange={(e) => setEditCardName(e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-neutral-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          spend target
                        </label>
                        <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2">
                          <span className="mr-1 text-sm text-neutral-600">$</span>
                          <input
                            value={editTarget}
                            onChange={(e) =>
                              setEditTarget(
                                e.target.value.replace(/[^0-9.]/g, ""),
                              )
                            }
                            className="w-full bg-transparent font-mono text-sm tabular-nums outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          bonus points
                        </label>
                        <input
                          value={editPoints}
                          onChange={(e) =>
                            setEditPoints(
                              e.target.value.replace(/[^0-9]/g, ""),
                            )
                          }
                          className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 font-mono text-sm tabular-nums text-neutral-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          end date
                        </label>
                        <input
                          type="date"
                          value={editEndDate}
                          min={editStartDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-neutral-100 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => deleteTracker.mutate({ id: tracker.id })}
                        disabled={deleteTracker.isPending}
                        className="text-xs text-neutral-700 transition hover:text-red-400"
                      >
                        delete tracker
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowEditForm(false)}
                          className="rounded-full px-3 py-1.5 text-xs text-neutral-500 transition hover:text-neutral-200"
                        >
                          cancel
                        </button>
                        <button
                          type="submit"
                          disabled={upsertTracker.isPending}
                          className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:bg-neutral-700 disabled:text-neutral-400"
                        >
                          {upsertTracker.isPending ? "saving…" : "save"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Bonus tracker card */}
              {!showEditForm && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
                  {/* Header */}
                  <div className="mb-5 flex items-start justify-between">
                    <div>
                      <p className="text-xs text-neutral-600">
                        {tracker.cardName}
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-amber-400">
                          {tracker.bonusPoints > 0
                            ? tracker.bonusPoints.toLocaleString()
                            : "—"}
                        </p>
                        {tracker.bonusPoints > 0 && (
                          <p className="text-xs text-neutral-500">pts</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleEditOpen}
                      className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-neutral-400 transition hover:border-white/[0.16] hover:text-neutral-100"
                    >
                      <Pencil size={11} />
                      edit
                    </button>
                  </div>

                  {/* Spend progress */}
                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <p className="font-mono text-2xl font-semibold tabular-nums">
                        {fmt(totalSpent)}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        of {fmt(spendTarget)} target
                      </p>
                    </div>
                    <p
                      className={`mb-0.5 text-sm font-medium ${statusConfig[status].color}`}
                    >
                      {statusConfig[status].label}
                    </p>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${spendPct}%` }}
                    />
                  </div>

                  {/* Window info */}
                  <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
                    <span>
                      {isPastEnd
                        ? `ended ${format(parseISO(tracker.endDate), "d MMM yyyy")}`
                        : `ends ${format(parseISO(tracker.endDate), "d MMM yyyy")}`}
                    </span>
                    <span className="tabular-nums">
                      {isComplete
                        ? `${Math.round(spendPct)}% — done!`
                        : isPastEnd
                          ? `${Math.round(spendPct)}% reached`
                          : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                    </span>
                  </div>
                </div>
              )}

              {/* Pace card */}
              {!showEditForm && !isPastEnd && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5">
                  <p className="mb-3 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    pace
                  </p>

                  {isComplete ? (
                    <p className="text-sm text-emerald-400">
                      target reached — bonus unlocked! check your card&apos;s
                      terms for points arrival.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                        <p className="text-xs text-neutral-600">still needed</p>
                        <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
                          {fmt(remaining)}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-600">
                          in {daysLeft} day{daysLeft === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                        <p className="text-xs text-neutral-600">
                          daily pace needed
                        </p>
                        <p
                          className={`mt-0.5 font-mono text-lg font-semibold tabular-nums ${
                            aheadOfPace >= 0
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          {fmt(dailyRequired)}/day
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-600">
                          {aheadOfPace >= 0
                            ? `${fmt(aheadOfPace)} ahead`
                            : `${fmt(Math.abs(aheadOfPace))} behind`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Paid in full toggle */}
              {!showEditForm && (
                <button
                  type="button"
                  onClick={() =>
                    updateTracker.mutate({
                      id: tracker.id,
                      paidInFull: !tracker.paidInFull,
                    })
                  }
                  disabled={updateTracker.isPending}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-5 text-left transition ${
                    tracker.paidInFull
                      ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                      : "border-white/[0.06] bg-[#111111] hover:border-white/[0.10]"
                  }`}
                >
                  {tracker.paidInFull ? (
                    <CheckCircle2
                      size={18}
                      className="shrink-0 text-emerald-400"
                    />
                  ) : (
                    <Circle
                      size={18}
                      className="shrink-0 text-neutral-600"
                    />
                  )}
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        tracker.paidInFull
                          ? "text-emerald-400"
                          : "text-neutral-300"
                      }`}
                    >
                      paid in full this month
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-600">
                      paying the full statement balance avoids interest and
                      protects your bonus value
                    </p>
                  </div>
                </button>
              )}

              {/* Log spend */}
              {!showEditForm && (
                <>
                  {!showAddForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] py-3 text-xs text-neutral-600 transition hover:border-white/[0.14] hover:text-neutral-300"
                    >
                      <Plus size={12} />
                      log spend
                    </button>
                  ) : (
                    <form
                      onSubmit={handleAddSubmit}
                      className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                          log spend
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="text-neutral-600 transition hover:text-neutral-300"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      {/* Date chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(["today", "yesterday"] as const).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDateMode(d)}
                            className={`rounded-full px-3 py-1 text-xs transition ${
                              dateMode === d
                                ? "bg-white font-medium text-black"
                                : "border border-white/[0.08] text-neutral-500 hover:text-neutral-200"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDateMode("pick")}
                          className={`rounded-full px-3 py-1 text-xs transition ${
                            dateMode === "pick"
                              ? "bg-white font-medium text-black"
                              : "border border-white/[0.08] text-neutral-500 hover:text-neutral-200"
                          }`}
                        >
                          {dateMode === "pick"
                            ? format(parseISO(pickDate), "d MMM")
                            : "pick date"}
                        </button>
                        {dateMode === "pick" && (
                          <input
                            type="date"
                            value={pickDate}
                            max={todayStr}
                            onChange={(e) => setPickDate(e.target.value)}
                            className="rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1 text-xs text-neutral-300 outline-none"
                          />
                        )}
                      </div>

                      <div className="flex gap-2">
                        <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5">
                          <span className="mr-1 text-sm text-neutral-600">$</span>
                          <input
                            value={amount}
                            onChange={(e) =>
                              setAmount(
                                e.target.value.replace(/[^0-9.]/g, ""),
                              )
                            }
                            className="w-20 bg-transparent font-mono text-sm font-semibold tabular-nums outline-none placeholder:text-neutral-700"
                            placeholder="0.00"
                            inputMode="decimal"
                            autoFocus
                          />
                        </div>
                        <input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-700"
                          placeholder="what did you buy?"
                        />
                        <button
                          type="submit"
                          disabled={createEntry.isPending || !amount}
                          className="shrink-0 rounded-full bg-amber-500 px-4 py-2.5 text-xs font-medium text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
                        >
                          {createEntry.isPending ? "adding…" : "add"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Spend history */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                        spend history
                      </p>
                      {windowEntries.length > 0 && (
                        <p className="text-xs text-neutral-600">
                          {windowEntries.length}{" "}
                          {windowEntries.length === 1
                            ? "transaction"
                            : "transactions"}
                        </p>
                      )}
                    </div>

                    {entriesQuery.isLoading && (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-2"
                          >
                            <div className="h-3 w-32 animate-pulse rounded-md bg-white/[0.05]" />
                            <div className="h-3 w-16 animate-pulse rounded-md bg-white/[0.05]" />
                          </div>
                        ))}
                      </div>
                    )}

                    {!entriesQuery.isLoading && windowEntries.length === 0 && (
                      <div className="py-6 text-center">
                        <p className="text-sm text-neutral-600">
                          no spend logged yet.
                        </p>
                        <p className="mt-1 text-xs text-neutral-700">
                          log purchases you put on this card to track your
                          bonus progress.
                        </p>
                      </div>
                    )}

                    {!entriesQuery.isLoading && windowEntries.length > 0 && (
                      <div className="space-y-5">
                        {grouped.map(([dateStr, txs]) => (
                          <div key={dateStr}>
                            <p className="mb-2 text-xs font-medium text-neutral-600">
                              {dateLabel(dateStr)}
                            </p>
                            <ul className="divide-y divide-white/[0.04]">
                              {(txs ?? []).map((tx) => (
                                <li
                                  key={tx.id}
                                  className="group flex items-center justify-between py-2.5"
                                >
                                  <p className="text-sm text-neutral-200">
                                    {tx.description ?? (
                                      <span className="text-neutral-600">
                                        purchase
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-3">
                                    <p className="font-mono text-sm tabular-nums text-amber-400">
                                      {fmtFull(Number(tx.amount))}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        deleteEntry.mutate({ id: tx.id })
                                      }
                                      disabled={deleteEntry.isPending}
                                      className="opacity-0 transition-opacity group-hover:opacity-100"
                                      aria-label="Delete transaction"
                                    >
                                      <Trash2
                                        size={13}
                                        className="text-neutral-600 transition hover:text-red-400"
                                      />
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}

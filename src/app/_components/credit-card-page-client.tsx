"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays, format, isAfter, parseISO, subDays } from "date-fns";
import { CheckCircle2, Circle, Pencil, Plus, Trash2, X } from "lucide-react";

import { api } from "~/trpc/react";

import { BackButton } from "./back-button";
import { EmptyState } from "./empty-state";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function dateLabel(dateStr: string) {
  const d = parseISO(dateStr);
  const today = new Date();
  const yesterday = subDays(today, 1);
  if (format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) return "today";
  if (format(d, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) return "yesterday";
  return format(d, "EEE d MMM");
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputCls = "w-full rounded-xl border border-green-200 bg-white px-3 py-2.5 text-base text-green-950 outline-none placeholder:text-green-300 focus:border-green-400";
const inputSmCls = "w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-base text-green-950 outline-none focus:border-green-400";

// ─── Component ────────────────────────────────────────────────────────────────

export function CreditCardPageClient({
  categoryId, categoryName, categoryEmoji,
}: {
  categoryId: number; categoryName: string; categoryEmoji: string | null;
}) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  const [setupCardName, setSetupCardName] = useState(categoryName);
  const [setupTarget, setSetupTarget] = useState("");
  const [setupPoints, setSetupPoints] = useState("");
  const [setupStartDate, setSetupStartDate] = useState(todayStr);
  const [setupEndDate, setSetupEndDate] = useState("");

  const [showEditForm, setShowEditForm] = useState(false);
  const [editCardName, setEditCardName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "pick">("today");
  const [pickDate, setPickDate] = useState(todayStr);

  const entryDate = dateMode === "today" ? todayStr : dateMode === "yesterday" ? yesterdayStr : pickDate;

  const trackerQuery = api.creditCard.get.useQuery({ categoryId });
  const entriesQuery = api.entry.listAllForCategory.useQuery({ categoryId });

  const upsertTracker = api.creditCard.upsert.useMutation({ onSuccess: () => { void trackerQuery.refetch(); setShowEditForm(false); } });
  const updateTracker = api.creditCard.update.useMutation({ onSuccess: () => void trackerQuery.refetch() });
  const deleteTracker = api.creditCard.delete.useMutation({ onSuccess: () => void trackerQuery.refetch() });
  const createEntry = api.entry.create.useMutation({
    onSuccess: () => { void entriesQuery.refetch(); setAmount(""); setDescription(""); setDateMode("today"); setShowAddForm(false); },
  });
  const deleteEntry = api.entry.delete.useMutation({ onSuccess: () => void entriesQuery.refetch() });

  const tracker = trackerQuery.data;
  const allEntries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);

  const windowEntries = useMemo(() => {
    if (!tracker) return [];
    return allEntries.filter((e) => e.date >= tracker.startDate && e.date <= tracker.endDate);
  }, [allEntries, tracker]);

  const totalSpent = useMemo(() => windowEntries.reduce((sum, e) => sum + Number(e.amount), 0), [windowEntries]);
  const spendTarget = tracker ? Number(tracker.spendTarget) : 0;
  const remaining = Math.max(0, spendTarget - totalSpent);
  const spendPct = spendTarget > 0 ? Math.min(100, (totalSpent / spendTarget) * 100) : 0;
  const daysLeft = tracker ? Math.max(0, differenceInCalendarDays(parseISO(tracker.endDate), today)) : 0;
  const totalDays = tracker ? differenceInCalendarDays(parseISO(tracker.endDate), parseISO(tracker.startDate)) + 1 : 0;
  const daysElapsed = tracker ? Math.min(totalDays, differenceInCalendarDays(today, parseISO(tracker.startDate))) : 0;
  const expectedByNow = totalDays > 0 ? (spendTarget / totalDays) * daysElapsed : 0;
  const aheadOfPace = totalSpent - expectedByNow;
  const dailyRequired = daysLeft > 0 ? remaining / daysLeft : 0;
  const isComplete = spendTarget > 0 && totalSpent >= spendTarget;
  const isPastEnd = tracker ? isAfter(today, parseISO(tracker.endDate)) : false;

  type Status = "complete" | "expired" | "urgent" | "behind" | "on_track";
  const status: Status = isComplete ? "complete" : isPastEnd ? "expired" : daysLeft <= 7 && !isComplete ? "urgent" : aheadOfPace < 0 ? "behind" : "on_track";

  const statusConfig: Record<Status, { label: string; color: string }> = {
    complete: { label: "bonus earned 🎉", color: "text-green-600" },
    expired: { label: "window closed", color: "text-green-500" },
    urgent: { label: "deadline soon", color: "text-red-500" },
    behind: { label: "behind pace", color: "text-amber-500" },
    on_track: { label: "on track", color: "text-green-600" },
  };

  const barColor = isComplete ? "bg-green-500" : isPastEnd ? "bg-green-200" : "bg-amber-400";

  const grouped = useMemo(() => {
    const map = new Map<string, typeof windowEntries>();
    windowEntries.forEach((e) => { if (!map.has(e.date)) map.set(e.date, []); map.get(e.date)!.push(e); });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [windowEntries]);

  function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(setupTarget);
    const points = Number(setupPoints);
    if (!Number.isFinite(target) || target <= 0) return;
    upsertTracker.mutate({ categoryId, cardName: setupCardName.trim() || categoryName, spendTarget: target, bonusPoints: Number.isFinite(points) && points > 0 ? Math.round(points) : 0, startDate: setupStartDate, endDate: setupEndDate || undefined });
  }

  function handleEditOpen() {
    if (!tracker) return;
    setEditCardName(tracker.cardName); setEditTarget(String(Number(tracker.spendTarget)));
    setEditPoints(String(tracker.bonusPoints)); setEditStartDate(tracker.startDate); setEditEndDate(tracker.endDate);
    setShowEditForm(true);
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(editTarget);
    if (!Number.isFinite(target) || target <= 0) return;
    upsertTracker.mutate({ categoryId, cardName: editCardName.trim() || categoryName, spendTarget: target, bonusPoints: Math.round(Number(editPoints) || 0), startDate: editStartDate, endDate: editEndDate || undefined });
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    createEntry.mutate({ categoryId, amount: value, date: entryDate, description: description.trim() || undefined });
  }

  const isLoading = trackerQuery.isLoading || entriesQuery.isLoading;
  const displayName = `${categoryEmoji ? categoryEmoji + " " : ""}${categoryName}`;

  const dateChipCls = (active: boolean) => `rounded-full px-3 py-1 text-sm transition ${active ? "bg-green-500 text-white font-medium" : "border border-green-200 text-green-600 hover:text-green-800"}`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton href="/home" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-green-950">{displayName}</h1>
            <p className="text-sm text-green-500">{format(today, "MMMM yyyy")}</p>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-green-100" />)}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {/* No tracker: setup card */}
          {!tracker && (
            <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm shadow-green-900/5">
              <p className="mb-1 text-lg font-semibold text-green-950">set up your bonus tracker</p>
              <p className="mb-5 text-sm text-green-500">track your spend toward a credit card sign-up bonus.</p>
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm text-green-600">card name</label>
                    <input value={setupCardName} onChange={(e) => setSetupCardName(e.target.value)} placeholder="e.g. ANZ Rewards Visa" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-green-600">spend target</label>
                    <div className="flex items-center rounded-xl border border-green-200 bg-white px-3 py-2.5 focus-within:border-green-400">
                      <span className="mr-1 text-base text-green-500">$</span>
                      <input value={setupTarget} onChange={(e) => setSetupTarget(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="3,000" inputMode="decimal" className="w-full bg-transparent font-mono text-base tabular-nums text-green-950 outline-none placeholder:text-green-300" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-green-600">bonus reward (points)</label>
                    <input value={setupPoints} onChange={(e) => setSetupPoints(e.target.value.replace(/[^0-9]/g, ""))} placeholder="100,000" inputMode="numeric" className={`${inputCls} font-mono tabular-nums`} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-green-600">start date</label>
                    <input type="date" value={setupStartDate} onChange={(e) => setSetupStartDate(e.target.value)} className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm text-green-600">end date <span className="text-green-400">(leave blank for 90 days)</span></label>
                    <input type="date" value={setupEndDate} min={setupStartDate} onChange={(e) => setSetupEndDate(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={upsertTracker.isPending || !setupTarget}
                    className="rounded-full bg-green-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400"
                  >{upsertTracker.isPending ? "saving…" : "create tracker"}</button>
                </div>
              </form>
            </div>
          )}

          {tracker && (
            <>
              {/* Edit tracker form */}
              {showEditForm && (
                <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm shadow-green-900/5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm uppercase tracking-[0.18em] text-green-500">edit tracker</p>
                    <button type="button" onClick={() => setShowEditForm(false)} className="cursor-pointer text-green-500 transition hover:text-green-700"><X size={14} /></button>
                  </div>
                  <form onSubmit={handleEditSave} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-green-600">card name</label>
                        <input value={editCardName} onChange={(e) => setEditCardName(e.target.value)} className={inputSmCls} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-green-600">spend target</label>
                        <div className="flex items-center rounded-xl border border-green-200 bg-white px-3 py-2 focus-within:border-green-400">
                          <span className="mr-1 text-base text-green-500">$</span>
                          <input value={editTarget} onChange={(e) => setEditTarget(e.target.value.replace(/[^0-9.]/g, ""))} className="w-full bg-transparent font-mono text-base tabular-nums text-green-950 outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-green-600">bonus points</label>
                        <input value={editPoints} onChange={(e) => setEditPoints(e.target.value.replace(/[^0-9]/g, ""))} className={`${inputSmCls} font-mono tabular-nums`} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-green-600">end date</label>
                        <input type="date" value={editEndDate} min={editStartDate} onChange={(e) => setEditEndDate(e.target.value)} className={inputSmCls} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => deleteTracker.mutate({ id: tracker.id })} disabled={deleteTracker.isPending} className="cursor-pointer text-sm text-green-400 transition hover:text-red-500 disabled:cursor-not-allowed">delete tracker</button>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowEditForm(false)} className="cursor-pointer rounded-full px-3 py-1.5 text-sm text-green-500 transition hover:text-green-700">cancel</button>
                        <button type="submit" disabled={upsertTracker.isPending}
                          className="rounded-full bg-green-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-green-600 disabled:bg-green-200 disabled:text-green-400"
                        >{upsertTracker.isPending ? "saving…" : "save"}</button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Bonus tracker card */}
              {!showEditForm && (
                <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm shadow-green-900/5">
                  <div className="mb-5 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-green-500">{tracker.cardName}</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-amber-500">
                          {tracker.bonusPoints > 0 ? tracker.bonusPoints.toLocaleString() : "—"}
                        </p>
                        {tracker.bonusPoints > 0 && <p className="text-sm text-green-500">pts</p>}
                      </div>
                    </div>
                    <button type="button" onClick={handleEditOpen}
                      className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-600 transition hover:border-green-300 hover:text-green-800"
                    ><Pencil size={12} /> edit</button>
                  </div>

                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <p className="font-mono text-3xl font-semibold tabular-nums text-green-950">{fmt(totalSpent)}</p>
                      <p className="mt-0.5 text-sm text-green-600">of {fmt(spendTarget)} target</p>
                    </div>
                    <p className={`mb-0.5 text-base font-medium ${statusConfig[status].color}`}>{statusConfig[status].label}</p>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-green-100">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${spendPct}%` }} />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm text-green-500">
                    <span>{isPastEnd ? `ended ${format(parseISO(tracker.endDate), "d MMM yyyy")}` : `ends ${format(parseISO(tracker.endDate), "d MMM yyyy")}`}</span>
                    <span className="tabular-nums">{isComplete ? `${Math.round(spendPct)}% — done!` : isPastEnd ? `${Math.round(spendPct)}% reached` : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}</span>
                  </div>
                </div>
              )}

              {/* Pace card */}
              {!showEditForm && !isPastEnd && (
                <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm shadow-green-900/5">
                  <p className="mb-3 text-sm uppercase tracking-[0.18em] text-green-500">pace</p>
                  {isComplete ? (
                    <p className="text-base text-green-600">target reached — bonus unlocked! check your card&apos;s terms for points arrival.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-green-50 px-4 py-3">
                        <p className="text-sm text-green-600">still needed</p>
                        <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-green-950">{fmt(remaining)}</p>
                        <p className="mt-0.5 text-sm text-green-600">in {daysLeft} day{daysLeft === 1 ? "" : "s"}</p>
                      </div>
                      <div className="rounded-xl bg-green-50 px-4 py-3">
                        <p className="text-sm text-green-600">daily pace needed</p>
                        <p className={`mt-0.5 font-mono text-xl font-semibold tabular-nums ${aheadOfPace >= 0 ? "text-green-600" : "text-amber-500"}`}>{fmt(dailyRequired)}/day</p>
                        <p className="mt-0.5 text-sm text-green-600">{aheadOfPace >= 0 ? `${fmt(aheadOfPace)} ahead` : `${fmt(Math.abs(aheadOfPace))} behind`}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Paid in full toggle */}
              {!showEditForm && (
                <button
                  type="button"
                  onClick={() => updateTracker.mutate({ id: tracker.id, paidInFull: !tracker.paidInFull })}
                  disabled={updateTracker.isPending}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-5 text-left transition ${tracker.paidInFull ? "border-green-300 bg-green-50" : "border-green-100 bg-white hover:border-green-200 shadow-sm shadow-green-900/5"}`}
                >
                  {tracker.paidInFull ? (
                    <CheckCircle2 size={18} className="shrink-0 text-green-600" />
                  ) : (
                    <Circle size={18} className="shrink-0 text-green-300" />
                  )}
                  <div>
                    <p className={`text-base font-medium ${tracker.paidInFull ? "text-green-700" : "text-green-800"}`}>paid in full this month</p>
                    <p className="mt-0.5 text-sm text-green-500">paying the full statement balance avoids interest and protects your bonus value</p>
                  </div>
                </button>
              )}

              {/* Log spend */}
              {!showEditForm && (
                <>
                  {!showAddForm ? (
                    <button type="button" onClick={() => setShowAddForm(true)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-green-200 py-3 text-sm text-green-500 transition hover:border-green-300 hover:text-green-700"
                    ><Plus size={13} /> log spend</button>
                  ) : (
                    <form onSubmit={handleAddSubmit} className="space-y-3 rounded-2xl border border-green-100 bg-white p-5 shadow-sm shadow-green-900/5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm uppercase tracking-[0.18em] text-green-500">log spend</p>
                        <button type="button" onClick={() => setShowAddForm(false)} className="cursor-pointer text-green-500 transition hover:text-green-700"><X size={14} /></button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(["today", "yesterday"] as const).map((d) => (
                          <button key={d} type="button" onClick={() => setDateMode(d)} className={dateChipCls(dateMode === d)}>{d}</button>
                        ))}
                        <button type="button" onClick={() => setDateMode("pick")} className={dateChipCls(dateMode === "pick")}>
                          {dateMode === "pick" ? format(parseISO(pickDate), "d MMM") : "pick date"}
                        </button>
                        {dateMode === "pick" && (
                          <input type="date" value={pickDate} max={todayStr} onChange={(e) => setPickDate(e.target.value)} className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-sm text-green-700 outline-none" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 focus-within:border-green-400">
                          <span className="mr-1 text-base text-green-500">$</span>
                          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                            className="w-20 bg-transparent font-mono text-base font-semibold tabular-nums text-green-950 outline-none placeholder:text-green-300"
                            placeholder="0.00" inputMode="decimal" autoFocus
                          />
                        </div>
                        <input value={description} onChange={(e) => setDescription(e.target.value)}
                          className="min-w-0 flex-1 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-base text-green-800 outline-none placeholder:text-green-300"
                          placeholder="what did you buy?"
                        />
                        <button type="submit" disabled={createEntry.isPending || !amount}
                          className="shrink-0 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-green-200 disabled:text-green-400"
                        >{createEntry.isPending ? "adding…" : "add"}</button>
                      </div>
                    </form>
                  )}

                  {/* Spend history */}
                  <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm shadow-green-900/5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm uppercase tracking-[0.18em] text-green-500">spend history</p>
                      {windowEntries.length > 0 && (
                        <p className="text-sm text-green-500">{windowEntries.length} {windowEntries.length === 1 ? "transaction" : "transactions"}</p>
                      )}
                    </div>

                    {entriesQuery.isLoading && (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center justify-between py-2">
                            <div className="h-4 w-32 animate-pulse rounded-md bg-green-100" />
                            <div className="h-4 w-16 animate-pulse rounded-md bg-green-100" />
                          </div>
                        ))}
                      </div>
                    )}

                    {!entriesQuery.isLoading && windowEntries.length === 0 && (
                      <EmptyState
                        mascotSize={48}
                        animate="bob"
                        headline="no spend logged yet"
                        body="log purchases you put on this card to track your bonus progress."
                      />
                    )}

                    {!entriesQuery.isLoading && windowEntries.length > 0 && (
                      <div className="space-y-5">
                        {grouped.map(([dateStr, txs]) => (
                          <div key={dateStr}>
                            <p className="mb-2 text-sm font-medium text-green-600">{dateLabel(dateStr)}</p>
                            <ul className="divide-y divide-green-100">
                              {(txs ?? []).map((tx) => (
                                <li key={tx.id} className="group flex items-center justify-between py-2.5">
                                  <p className="text-base text-green-800">{tx.description ?? <span className="text-green-400">purchase</span>}</p>
                                  <div className="flex items-center gap-3">
                                    <p className="font-mono text-base tabular-nums text-amber-500">{fmtFull(Number(tx.amount))}</p>
                                    <button type="button" onClick={() => deleteEntry.mutate({ id: tx.id })} disabled={deleteEntry.isPending}
                                      className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="Delete transaction"
                                    ><Trash2 size={14} className="text-green-400 transition hover:text-red-500" /></button>
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

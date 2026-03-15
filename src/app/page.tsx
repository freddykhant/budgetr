import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { BudgieMascot } from "~/app/_components/budgie-mascot";
import { FloatingNavbar } from "~/app/_components/floating-navbar";
import { MockDashboard } from "~/app/_components/mock-dashboard";
import { OtpSignInForm } from "~/app/_components/otp-signin-form";

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/home");

  const features = [
    "Smart Budgets",
    "Savings Goals",
    "Subscription Tracking",
    "Monthly History",
    "Credit Cards",
    "Investments",
  ];

  return (
    <>
      <FloatingNavbar />

      <main className="bg-white text-green-950">
        {/* ── Hero + Dashboard ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Frosted green gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-100/80 via-emerald-50/60 to-lime-50/40" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/3 h-[600px] w-[600px] -translate-y-1/3 rounded-full bg-green-300/30 blur-[120px]" />
            <div className="absolute right-0 top-1/4 h-[500px] w-[500px] rounded-full bg-emerald-200/25 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-lime-200/20 blur-[80px]" />
            <div className="absolute right-1/4 bottom-1/3 h-[300px] w-[300px] rounded-full bg-teal-200/15 blur-[90px]" />
          </div>

          {/* Subtle noise/grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,80,0,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,80,0,.15) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }}
          />

          {/* Floating mascots */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute right-[7%] top-[12%] opacity-10">
              <BudgieMascot size={72} animate="float" />
            </div>
            <div className="absolute bottom-[25%] left-[4%] opacity-8">
              <BudgieMascot size={44} animate="bob" />
            </div>
          </div>

          {/* Hero content */}
          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pt-36 pb-8 text-center">
            {/* Headline */}
            <h1 className="mb-6 text-[clamp(2.8rem,7.5vw,5rem)] leading-[1.02] font-bold tracking-tight text-green-950">
              Your money,{" "}
              <span className="landing-gradient-text">finally</span>{" "}
              making sense.
            </h1>

            {/* CTA row */}
            <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-green-200/60 bg-white/60 px-2 py-2 shadow-sm backdrop-blur-md">
              <a
                href="#signin"
                className="rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-600/20 transition-all hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/25 active:scale-[0.97]"
              >
                Get Started
              </a>
              <span className="pr-3 text-sm text-green-700/50">
                or{" "}
                <a href="#features" className="font-medium text-green-700 underline decoration-green-300 underline-offset-2 transition hover:text-green-600">
                  See Features
                </a>
              </span>
            </div>

            {/* Feature links row — shining gradient text */}
            <div className="mb-14 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              {features.map((f, i) => (
                <span key={f} className="flex items-center gap-2">
                  <a
                    href="#features"
                    className="landing-shimmer-text text-sm font-medium transition-opacity hover:opacity-80"
                  >
                    {f}
                  </a>
                  {i < features.length - 1 && (
                    <span className="text-green-300">&middot;</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Mock dashboard — exact 1:1 replica of the real app */}
          <div className="relative mx-auto max-w-6xl px-6 pb-20">
            <MockDashboard />
            {/* Shadow reflection */}
            <div className="mx-auto mt-[-2px] h-8 w-[85%] rounded-b-2xl bg-gradient-to-b from-green-200/30 to-transparent blur-sm" />
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section id="how" className="border-t border-green-100 bg-white py-24">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-16 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-500">
                how it works
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-green-950 md:text-4xl">
                three steps. two minutes.{" "}
                <span className="text-green-400">zero stress.</span>
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  emoji: "💰",
                  title: "set your income",
                  body: "tell budgie how much you earn each month. that\u2019s your starting point.",
                },
                {
                  step: "02",
                  emoji: "🎯",
                  title: "split it up",
                  body: "divvy your income across spending, savings, investments, and custom goals.",
                },
                {
                  step: "03",
                  emoji: "✨",
                  title: "log & watch",
                  body: "add transactions as they happen. balances update instantly. magic.",
                },
              ].map(({ step, emoji, title, body }) => (
                <div
                  key={step}
                  className="group rounded-2xl border border-green-100 bg-green-50/30 p-6 transition-all hover:border-green-200 hover:bg-green-50"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-xl">
                      {emoji}
                    </span>
                    <span className="font-mono text-xs tracking-wider text-green-400">
                      {step}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-green-950">{title}</h3>
                  <p className="text-sm leading-relaxed text-green-700/60">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features grid ───────────────────────────────────────────────── */}
        <section id="features" className="border-t border-green-100 bg-green-50/30 py-24">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-14 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-500">
                features
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-green-950 md:text-4xl">
                everything you need,{" "}
                <span className="text-green-400">nothing you don&apos;t.</span>
              </h2>
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-green-100 bg-green-100 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { emoji: "💸", title: "smart budget split", body: "divide your income across categories with percentage sliders." },
                { emoji: "✏️", title: "two-tap logging", body: "add a transaction in seconds. balances update instantly." },
                { emoji: "🎯", title: "savings goals", body: "set targets and track progress with visual milestones." },
                { emoji: "📈", title: "investment tracking", body: "monitor investment contributions alongside everything else." },
                { emoji: "💳", title: "credit card chaser", body: "track intro spend targets and bonus points deadlines." },
                { emoji: "🔄", title: "subscription counter", body: "keep tabs on recurring costs. see the real monthly total." },
                { emoji: "📊", title: "monthly history", body: "rewind to past months. see trends, charts, and patterns." },
                { emoji: "✨", title: "custom categories", body: "travel fund, wedding, side hustle \u2014 create anything." },
                { emoji: "🔒", title: "private & secure", body: "your data stays yours. no tracking, no ads, no selling." },
              ].map(({ emoji, title, body }) => (
                <div
                  key={title}
                  className="group bg-white p-6 transition-colors hover:bg-green-50/50"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-lg transition-transform group-hover:scale-105">
                    {emoji}
                  </div>
                  <h3 className="mb-1.5 text-sm font-semibold text-green-950">{title}</h3>
                  <p className="text-xs leading-relaxed text-green-700/60">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Personality section ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-green-950 py-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500/10 blur-[150px]" />
          </div>

          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 text-center">
            <div className="flex items-center gap-4">
              <BudgieMascot size={64} animate="float" />
              <BudgieMascot size={44} animate="bob" />
              <BudgieMascot size={28} animate="tilt" />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              built by someone who{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                hated spreadsheets
              </span>
            </h2>

            <p className="max-w-lg text-lg leading-relaxed text-green-300/60">
              budgie isn&apos;t a finance app for finance people. it&apos;s a
              budget tool for normal humans who just want to know where their
              money went without a 47-column spreadsheet.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              {[
                { value: "2 min", label: "to set up" },
                { value: "0", label: "spreadsheets" },
                { value: "100%", label: "free" },
                { value: "∞", label: "peace of mind" },
              ].map(({ value, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 rounded-xl border border-green-800/40 bg-green-900/30 px-5 py-3 backdrop-blur-sm"
                >
                  <span className="text-xl font-bold text-green-400">{value}</span>
                  <span className="text-xs text-green-400/60">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Sign in ─────────────────────────────────────────────────────── */}
        <section id="signin" className="relative overflow-hidden border-t border-green-100 bg-gradient-to-b from-green-50 to-white py-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-200/30 blur-[100px]" />
          </div>

          <div className="relative mx-auto flex max-w-lg flex-col items-center gap-8 px-6 text-center">
            <BudgieMascot size={48} animate="bob" />

            <div>
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-green-950 md:text-3xl">
                ready to take control?
              </h2>
              <p className="text-green-700/60">
                takes about 2 minutes. no card required, no catch.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <OtpSignInForm />
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="border-t border-green-900/20 bg-green-950 px-6 py-8">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Image
                src="/budgie_1.png"
                alt="budgie"
                width={22}
                height={22}
                className="rounded-md opacity-80"
              />
              <span className="text-sm font-semibold text-green-400/70">budgie</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-green-600/50">
              <a href="#how" className="transition hover:text-green-400">how it works</a>
              <a href="#features" className="transition hover:text-green-400">features</a>
              <a href="#signin" className="transition hover:text-green-400">sign in</a>
            </div>
            <p className="text-xs text-green-600/40">
              made with ☕ and way too many spreadsheets
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}

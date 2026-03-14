import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { BudgieMascot } from "~/app/_components/budgie-mascot";
import { FloatingNavbar } from "~/app/_components/floating-navbar";
import { OtpSignInForm } from "~/app/_components/otp-signin-form";

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/home");

  return (
    <>
      <FloatingNavbar />

      <main className="bg-white text-green-950">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative min-h-screen overflow-hidden bg-linear-to-br from-green-50 via-white to-white">
          {/* Glow orbs */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/4 left-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-200/40 blur-[120px]" />
            <div className="absolute right-1/4 bottom-1/3 h-[400px] w-[400px] rounded-full bg-lime-200/30 blur-[100px]" />
          </div>

          {/* Decorative mascots */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute right-[6%] top-[22%] opacity-15">
              <BudgieMascot size={72} animate="float" />
            </div>
            <div className="absolute bottom-[18%] left-[4%] opacity-10">
              <BudgieMascot size={48} animate="bob" />
            </div>
            <div className="absolute top-[60%] right-[18%] opacity-10">
              <BudgieMascot size={36} animate="tilt" />
            </div>
          </div>

          {/* Hero content */}
          <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-16 px-6 py-32 md:flex-row md:gap-12 md:py-0">
            {/* Left: copy */}
            <div className="flex flex-1 flex-col items-center gap-6 text-center md:items-start md:text-left">
              {/* Mascot + badge */}
              <div className="flex items-center gap-3">
                <BudgieMascot size={52} animate="float" />
                <span className="rounded-full border border-green-200 bg-green-100/60 px-3 py-1 text-xs font-medium tracking-wide text-green-700">
                  stupidly simple budgeting
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-[clamp(2.5rem,6vw,4rem)] font-semibold leading-[1.05] tracking-tight text-green-950">
                your money,{" "}
                <span className="text-green-500">finally</span>{" "}
                making sense
              </h1>

              {/* Sub-copy */}
              <p className="max-w-md text-lg leading-relaxed text-green-700/80">
                set your income, log what you spend, watch the magic happen.
                no formulas, no guilt, no spreadsheets.
              </p>

              {/* Trust pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                {["free forever", "no ads", "your data stays yours"].map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs text-green-600"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: sign-in card */}
            <div id="signin" className="w-full max-w-sm shrink-0">
              <div className="rounded-2xl border border-green-100 bg-white p-7 shadow-xl shadow-green-900/6">
                <OtpSignInForm />
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section id="features" className="border-t border-green-100 bg-white py-24">
          <div className="mx-auto max-w-5xl px-6">
            {/* Section heading */}
            <div className="mb-14 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-green-500">
                what's inside
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-green-950 md:text-4xl">
                everything your budget needs,{" "}
                <span className="text-green-400">nothing it doesn't</span>
              </h2>
            </div>

            {/* Tiles */}
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  emoji: "💸",
                  title: "split it your way",
                  body: "set your income and allocate it across spending, savings, and investments in seconds.",
                },
                {
                  emoji: "✏️",
                  title: "log in two taps",
                  body: "add a transaction and watch your remaining balance update instantly. that's it.",
                },
                {
                  emoji: "🎯",
                  title: "goals that show up",
                  body: "savings goals, investment milestones, subscription tracking — all in one place.",
                },
              ].map(({ emoji, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-green-100 bg-green-50/50 p-6"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-xl">
                    {emoji}
                  </div>
                  <h3 className="mb-2 font-semibold text-green-950">{title}</h3>
                  <p className="text-sm leading-relaxed text-green-700/75">{body}</p>
                </div>
              ))}
            </div>

            {/* Secondary row — extra details */}
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {[
                {
                  emoji: "📊",
                  title: "see the full picture",
                  body: "history view shows how your spending has shifted month to month. patterns become obvious.",
                },
                {
                  emoji: "💳",
                  title: "credit card chaser",
                  body: "track intro spend targets, bonus points progress, and whether you've paid it in full.",
                },
              ].map(({ emoji, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-green-100 bg-green-50/50 p-6"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-xl">
                    {emoji}
                  </div>
                  <h3 className="mb-2 font-semibold text-green-950">{title}</h3>
                  <p className="text-sm leading-relaxed text-green-700/75">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA strip ────────────────────────────────────────────────────── */}
        <section className="border-t border-green-100 bg-green-50 py-20">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 text-center">
            <BudgieMascot size={48} animate="bob" />
            <h2 className="text-2xl font-semibold tracking-tight text-green-950 md:text-3xl">
              ready to ditch the spreadsheet?
            </h2>
            <p className="text-green-700/70">
              takes about 2 minutes to set up. no card required, no catch.
            </p>
            <a
              href="#signin"
              className="rounded-xl bg-green-500 px-8 py-3 text-sm font-semibold text-white shadow-md shadow-green-500/25 transition hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/30"
            >
              get started free
            </a>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="border-t border-green-900/20 bg-green-950 px-6 py-6">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Image
                src="/budgie_1.png"
                alt="budgie"
                width={22}
                height={22}
                className="rounded-md opacity-80"
              />
              <span className="text-sm font-medium text-green-400/70">budgie</span>
            </div>
            <p className="text-xs text-green-600/60">
              made with ☕ and way too many spreadsheets
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";

export default async function LandingPage() {
  const session = await auth();

  if (session?.user) redirect("/home");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-neutral-950 text-white">
      {/* Subtle glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[520px] w-[520px] rounded-full bg-white/[0.03] blur-3xl" />
      </div>

      <div className="relative flex w-full max-w-4xl flex-col items-center gap-10 px-6 text-center md:items-start md:text-left">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 md:items-start">

          <div className="flex flex-col gap-1">
            <h1 className="text-[40px] font-semibold tracking-tight text-white md:text-[44px]">
              budgetr
            </h1>
            <p className="max-w-md text-base text-neutral-400 md:text-lg">
              stupid simple monthly tracking. <br/>replace that old excel sheet, welcome to the future.
            </p>
          </div>
        </div>

        {/* CTA + micro copy */}
        <div className="flex flex-col items-center gap-4 md:items-start">
          <Link
            href="/api/auth/signin?callbackUrl=/home"
            className="group flex items-center gap-3 rounded-full border border-neutral-800 bg-neutral-900 px-7 py-3.5 text-base font-medium text-neutral-200 transition-all duration-200 hover:border-neutral-600 hover:bg-neutral-800 hover:text-white"
          >
            <GoogleIcon />
            continue with google
          </Link>

          <div className="flex flex-col items-center gap-1 text-xs text-neutral-600 md:items-start md:text-sm">
            <p className="text-neutral-500 md:text-neutral-600">
              your data stays yours. no ads, no tracking.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

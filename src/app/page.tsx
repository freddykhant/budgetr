import Image from "next/image";
import { redirect } from "next/navigation";

import { LandingSignInButton } from "~/app/_components/landing-signin-button";
import { auth } from "~/server/auth";

export default async function LandingPage() {
  const session = await auth();

  if (session?.user) redirect("/home");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-linear-to-br from-[#052e16] via-[#0f4c2a] to-[#166534] text-white">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[420px] w-[420px] rounded-full bg-green-300/10 blur-[100px]" />
        <div className="absolute left-1/4 top-2/3 h-[280px] w-[280px] rounded-full bg-lime-400/10 blur-[80px]" />
      </div>

      <div className="relative flex w-full max-w-4xl flex-col items-center gap-10 px-6 text-center md:items-start md:text-left">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 md:items-start">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Image
                src="/budgie.svg"
                alt="budgie"
                width={44}
                height={44}
                className="rounded-xl shadow-lg shadow-emerald-900/50"
                priority
              />
              <h1 className="text-[40px] font-semibold tracking-tight text-white md:text-[44px]">
                budgie
              </h1>
            </div>
            <p className="max-w-md text-base text-emerald-100/70 md:text-lg">
              stupid simple monthly budget planning. replace that old excel sheet
              with something that feels clean and obvious.
            </p>
          </div>
        </div>

        {/* CTA + micro copy */}
        <div className="flex flex-col items-center gap-4 md:items-start">
          <LandingSignInButton />

          <div className="flex flex-col items-center gap-1 text-xs md:items-start md:text-sm">
            <p className="text-emerald-200/40">
              your data stays yours. no ads, no tracking.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

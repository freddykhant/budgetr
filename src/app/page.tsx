import Image from "next/image";
import { redirect } from "next/navigation";

import { BudgieMascot } from "~/app/_components/budgie-mascot";
import { LandingSignInButton } from "~/app/_components/landing-signin-button";
import { auth } from "~/server/auth";

export default async function LandingPage() {
  const session = await auth();

  if (session?.user) redirect("/home");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-linear-to-br from-[#86efac] via-[#22c55e] to-[#16a34a] text-white">
      {/* Floating budgies */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-[12%] top-[18%] opacity-25">
          <BudgieMascot size={56} animate="float" />
        </div>
        <div className="absolute bottom-[20%] left-[8%] opacity-20">
          <BudgieMascot size={40} animate="bob" />
        </div>
      </div>

      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-300/30 blur-[130px]" />
        <div className="absolute right-1/4 bottom-1/4 h-[420px] w-[420px] rounded-full bg-yellow-300/15 blur-[100px]" />
        <div className="absolute top-2/3 left-1/4 h-[280px] w-[280px] rounded-full bg-green-200/25 blur-[80px]" />
      </div>

      <div className="relative flex w-full max-w-4xl flex-col items-center gap-10 px-6 text-center md:items-start md:text-left">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 md:items-start">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Image
                src="/budgie_1.png"
                alt="budgie"
                width={44}
                height={44}
                className="rounded-xl shadow-lg shadow-green-900/20"
                priority
              />
              <h1 className="text-[40px] font-semibold tracking-tight text-green-950 md:text-[44px]">
                budgie
              </h1>
            </div>
            <p className="max-w-md text-base text-green-950/60 md:text-lg">
              stupid simple monthly budget planning. replace that old excel
              sheet with something that feels clean and obvious.
            </p>
          </div>
        </div>

        {/* CTA + micro copy */}
        <div className="flex flex-col items-center gap-4 md:items-start">
          <LandingSignInButton />

          <div className="flex flex-col items-center gap-1 text-xs md:items-start md:text-sm">
            <p className="text-green-950/40">
              your data stays yours. no ads, no tracking.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

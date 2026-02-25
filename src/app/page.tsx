import Image from "next/image";
import { redirect } from "next/navigation";

import { LandingSignInButton } from "~/app/_components/landing-signin-button";
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Image
                src="/budgetr.svg"
                alt="budgetr"
                width={40}
                height={40}
                className="rounded-md"
                priority
              />
              <h1 className="text-[40px] font-semibold tracking-tight text-white md:text-[44px]">
                budgetr
              </h1>
            </div>
            <p className="max-w-md text-base text-neutral-400 md:text-lg">
              stupid simple monthly budget planning. replace that old excel sheet
              with something that feels clean and obvious.
            </p>
          </div>
        </div>

        {/* CTA + micro copy */}
        <div className="flex flex-col items-center gap-4 md:items-start">
          <LandingSignInButton />

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

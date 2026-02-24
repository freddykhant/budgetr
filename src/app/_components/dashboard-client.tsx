 "use client";

type DashboardClientProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function DashboardClient({ user }: DashboardClientProps) {
  const firstName = user.name?.split(" ")[0] ?? "hey";

  return (
    <main className="px-6 py-12 xl:px-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="space-y-2">
          <h1 className="text-[28px] font-semibold tracking-tight">
            {firstName}, your budget is ready to build
          </h1>
          <p className="text-sm text-neutral-500">
            as you start adding spending, savings, and investments, this
            dashboard will come to life.
          </p>
        </section>

        <section className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6">
          <div className="mb-4 h-4 w-32 rounded-full bg-white/[0.04]" />
          <div className="mb-6 h-7 w-56 rounded-full bg-white/[0.04]" />

          <div className="grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="rounded-xl border border-dashed border-white/[0.08] bg-black/20 p-4"
              >
                <div className="mb-3 h-3 w-20 rounded-full bg-white/[0.04]" />
                <div className="mb-2 h-5 w-24 rounded-full bg-white/[0.06]" />
                <div className="h-1.5 w-full rounded-full bg-white/[0.05]" />
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-neutral-600">
            soon: live progress for each category, updated as you type.
          </p>
        </section>
      </div>
    </main>
  );
}


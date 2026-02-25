import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { userSettings } from "~/server/db/schema";
import { Header } from "~/app/_components/header";
import { InvestmentsPageClient } from "~/app/_components/investments-page-client";

export default async function InvestmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, session.user.id),
  });

  if (!settings?.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED]">
      <Header user={session.user} />
      <InvestmentsPageClient />
    </div>
  );
}

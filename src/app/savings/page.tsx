import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { userSettings } from "~/server/db/schema";
import { Header } from "~/app/_components/header";
import { SavingsPageClient } from "~/app/_components/savings-page-client";

export default async function SavingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, session.user.id),
  });

  if (!settings?.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-green-50 text-green-950">
      <Header user={session.user} />
      <SavingsPageClient />
    </div>
  );
}

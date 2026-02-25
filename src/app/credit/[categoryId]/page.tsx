import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { categories, userSettings } from "~/server/db/schema";
import { Header } from "~/app/_components/header";
import { CreditCardPageClient } from "~/app/_components/credit-card-page-client";

export default async function CreditCardPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, session.user.id),
  });
  if (!settings?.onboardingCompleted) redirect("/onboarding");

  const { categoryId: categoryIdStr } = await params;
  const categoryId = parseInt(categoryIdStr, 10);
  if (isNaN(categoryId)) redirect("/home");

  const category = await db.query.categories.findFirst({
    where: and(
      eq(categories.id, categoryId),
      eq(categories.userId, session.user.id),
    ),
  });

  if (category?.type !== "credit_card") redirect("/home");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED]">
      <Header user={session.user} />
      <CreditCardPageClient
        categoryId={category.id}
        categoryName={category.name}
        categoryEmoji={category.emoji}
      />
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) redirect("/");

  const user = session.user;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Top nav */}
      <header className="border-b border-neutral-900 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-sm font-medium text-white">budgetr</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">{user.email}</span>
            {user.image && (
              <Image
                src={user.image}
                alt={user.name ?? "avatar"}
                width={28}
                height={28}
                className="rounded-full"
              />
            )}
            <Link
              href="/api/auth/signout"
              className="text-xs text-neutral-600 transition hover:text-neutral-400"
            >
              sign out
            </Link>
          </div>
        </div>
      </header>

      {/* Main content placeholder */}
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">
            hey, {user.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-neutral-500">your dashboard is coming soon.</p>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";

import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-6xl font-bold tracking-tight">budgetr</h1>
        <p className="text-neutral-400 text-lg">
          stupidly simple monthly budget planning
        </p>
        {session?.user ? (
          <p className="text-sm text-neutral-500">
            signed in as {session.user.email}
          </p>
        ) : (
          <Link
            href="/api/auth/signin"
            className="mt-4 rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            sign in
          </Link>
        )}
      </div>
    </main>
  );
}

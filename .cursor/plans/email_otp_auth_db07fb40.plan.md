---
name: Email OTP Auth
overview: Complete the Better Auth migration (deps already installed). Wire up Google OAuth + email OTP plugin, update schema, replace all auth callsites, and build the Luma-style sign-in UI.
todos:
  - id: schema
    content: Update schema.ts — replace NextAuth auth tables with Better Auth shapes (user, session, account, verification), run db:push
    status: in_progress
  - id: auth-config
    content: Write src/server/auth/config.ts with Better Auth + Google provider + emailOtp plugin + Resend sender
    status: completed
  - id: auth-index
    content: Simplify src/server/auth/index.ts to re-export auth from config
    status: completed
  - id: api-route
    content: Delete [...nextauth] route, create src/app/api/auth/[...all]/route.ts with toNextJsHandler
    status: completed
  - id: trpc-context
    content: "Update src/server/api/trpc.ts to use auth.api.getSession({ headers: await headers() })"
    status: completed
  - id: env
    content: Update src/env.js — add BETTER_AUTH_SECRET and RESEND_API_KEY, remove AUTH_SECRET
    status: completed
  - id: page-auth-checks
    content: Update all 9 server pages to use auth.api.getSession instead of auth()
    status: completed
  - id: auth-client
    content: Create src/lib/auth-client.ts with createAuthClient + emailOtpClient plugin
    status: completed
  - id: otp-ui
    content: Build otp-signin-form.tsx (email step + animated 6-box OTP step) and update page.tsx
    status: in_progress
isProject: false
---

# Email OTP Auth — Resuming Implementation

## Current state

- `better-auth` and `resend` are installed
- `next-auth` and `@auth/drizzle-adapter` are removed
- Nothing else has changed yet

## Why Better Auth (not NextAuth)

NextAuth's `Credentials` provider is explicitly incompatible with database sessions. The app uses the Drizzle adapter for DB sessions. Making OTP work in NextAuth would require switching to JWT sessions — more work and more risk than the Better Auth migration. Better Auth has a native `emailOtp` plugin and the package swap is already done.

## What needs to be done

### 1. Schema — `[src/server/db/schema.ts](src/server/db/schema.ts)`

Replace the four NextAuth auth tables with Better Auth's required shape. Keep the `budgetr_` prefix. Better Auth needs:

- `user` — add `createdAt` / `updatedAt`; remove `emailVerified` (Better Auth uses `emailVerified` as a boolean, not timestamp — rename/retype)
- `session` — new shape: `id`, `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent`
- `account` — new shape: `id`, `accountId`, `providerId`, `userId`, `accessToken`, `refreshToken`, `expiresAt`, etc.
- `verification` — new table for OTP codes: `id`, `identifier`, `value`, `expiresAt`

Drop the old `verificationTokens` table export. Remove the `AdapterAccount` import from `next-auth/adapters`.

### 2. Better Auth config — `[src/server/auth/config.ts](src/server/auth/config.ts)`

Replace entirely:

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOtp } from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "~/server/db";
import { env } from "~/env";

const resend = new Resend(env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: false,
    // map Better Auth table names to our budgetr_ prefixed tables
  }),
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    },
  },
  plugins: [
    emailOtp({
      async sendVerificationOTP({ email, otp, type }) {
        await resend.emails.send({
          from: "budgie <noreply@yourdomain.com>",
          to: email,
          subject: `${otp} — your budgie sign-in code`,
          text: `Your budgie verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
        });
      },
      expiresIn: 600, // 10 minutes
    }),
  ],
  secret: env.BETTER_AUTH_SECRET,
});
```

### 3. Auth index — `[src/server/auth/index.ts](src/server/auth/index.ts)`

Simplify to just re-export `auth`:

```ts
export { auth } from "./config";
```

### 4. API route

Delete `src/app/api/auth/[...nextauth]/route.ts` and its folder. Create `src/app/api/auth/[...all]/route.ts`:

```ts
import { auth } from "~/server/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

### 5. tRPC context — `[src/server/api/trpc.ts](src/server/api/trpc.ts)`

```ts
import { auth } from "~/server/auth";
import { headers } from "next/headers";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({ headers: await headers() });
  return { db, session, ...opts };
};
```

`session.user.id` still works — Better Auth's session shape is compatible.

### 6. Env vars — `[src/env.js](src/env.js)`

Add:

- `BETTER_AUTH_SECRET` — required in all environments (replace `AUTH_SECRET`)
- `RESEND_API_KEY` — required

### 7. Page-level auth checks (9 files)

All pages use `auth()` from NextAuth. Replace with:

```ts
import { auth } from "~/server/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) redirect("/");
```

Files: `home/page.tsx`, `spending/page.tsx`, `savings/page.tsx`, `investments/page.tsx`, `history/page.tsx`, `subscriptions/page.tsx`, `credit/[categoryId]/page.tsx`, `custom/[categoryId]/page.tsx`, `page.tsx`

### 8. Browser client — new `src/lib/auth-client.ts`

```ts
import { createAuthClient } from "better-auth/react";
import { emailOtpClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [emailOtpClient()],
});
```

### 9. Sign-in UI

Replace `src/app/_components/landing-signin-button.tsx` and update `src/app/page.tsx` with a two-step OTP form:

- **Step 1**: Email input → calls `authClient.emailOtp.sendOtp({ email })`
- **Step 2**: 6 individual digit boxes (auto-advance on input, paste support) → calls `authClient.emailOtp.verifyOtp({ email, otp })` → router push to `/home`
- Google button remains as a secondary option below

### 10. Database migration

After schema changes, run `pnpm db:push` to apply the new table shapes.

## User data migration note

Existing Google users in `budgetr_user` are safe — their `id` values are unchanged. Better Auth will link them to Google OAuth via the new `budgetr_account` table on next sign-in.

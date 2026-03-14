import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOtp } from "better-auth/plugins";
import { Resend } from "resend";

import { env } from "~/env";
import { db } from "~/server/db";
import { users, sessions, accounts, verifications } from "~/server/db/schema";

const resend = new Resend(env.RESEND_API_KEY);

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    },
  },
  plugins: [
    emailOtp({
      async sendVerificationOTP({ email, otp }) {
        await resend.emails.send({
          from: "budgie <noreply@usebudgie.app>",
          to: email,
          subject: `${otp} — your budgie sign-in code`,
          text: `Your budgie verification code is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
        });
      },
      expiresIn: 600,
    }),
  ],
});

export type Auth = typeof auth;

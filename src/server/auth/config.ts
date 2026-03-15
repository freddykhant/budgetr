import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";

import { env } from "~/env";
import { db } from "~/server/db";
import { users, sessions, accounts, verifications } from "~/server/db/schema";

const resend = new Resend(env.RESEND_API_KEY);

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? "http://localhost:3000",
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
    emailOTP({
      async sendVerificationOTP({
        email,
        otp,
      }: {
        email: string;
        otp: string;
        type: string;
      }) {
        const { error } = await resend.emails.send({
          from: "budgie <onboarding@resend.dev>",
          to: email,
          subject: `${otp} — your budgie sign-in code`,
          text: `Your budgie verification code is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
        });

        if (error) {
          console.error("[auth] Resend error:", error);
          throw new Error("Failed to send verification email. Please try again.");
        }
      },
      expiresIn: 600,
    }),
  ],
});

export type Auth = typeof auth;

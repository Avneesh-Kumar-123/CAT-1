import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@workspace/db";
import {
  authUser,
  authSession,
  authAccount,
  authVerification,
} from "@workspace/db/schema";

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "http://localhost:5000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {};

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET must be set");
}

export const auth = betterAuth({
  /**
   * The public URL where Better Auth can be reached.
   * Used to build OAuth redirect URIs and email verification links.
   * In local dev with the Vite proxy, this is the FRONTEND URL (which proxies /api → API server).
   */
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:5000",

  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      if (process.env.NODE_ENV !== "production") {
        // In development: log the reset URL so you can test without an email service.
        // Replace this block with your email provider (Resend, SendGrid, etc.) for production.
        console.log(
          `\n[Dev] Password reset requested for ${user.email}\nOpen this link to reset:\n  ${url}\n`,
        );
        return;
      }
      // TODO: add production email sending here.
      // Example with Resend:
      //   await resend.emails.send({ from: "noreply@...", to: user.email,
      //     subject: "Reset your password", html: `<a href="${url}">Reset</a>` });
      console.warn("[Auth] sendResetPassword: no email provider configured for production.");
    },
  },

  socialProviders: googleProvider,

  trustedOrigins,

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes client-side cache
    },
  },
});

export type Auth = typeof auth;

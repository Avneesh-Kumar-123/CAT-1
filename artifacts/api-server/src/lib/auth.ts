import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@workspace/db";
import {
  authUser,
  authSession,
  authAccount,
  authVerification,
} from "@workspace/db/schema";

// Build the public base URL.
// In Replit the browser reaches the app through the dev proxy domain, not localhost.
const publicBaseURL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : (process.env.BETTER_AUTH_URL ?? "http://localhost:5000");

// Trusted origins for Better Auth's own origin validation.
// Must include every host the browser will send requests from, including the
// Replit preview domain (which is forwarded as-is through the Vite proxy).
const trustedOrigins = [
  ...(process.env.TRUSTED_ORIGINS ?? "http://localhost:5000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  publicBaseURL,
];

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
   * In Replit this is the preview domain; locally it's the Vite dev server (which proxies /api → API server).
   */
  baseURL: publicBaseURL,

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

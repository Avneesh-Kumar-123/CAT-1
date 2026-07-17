import { createAuthClient } from "better-auth/react";

/**
 * VITE_API_BASE_URL — optional env var pointing at the API server.
 *
 * Leave it empty (the default) to use Vite's dev-proxy so the browser
 * always talks to the same origin.  Set it to e.g.
 * "https://api.mycatchase.com" in production when the API lives on a
 * different domain from the Vercel-hosted frontend.
 */
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

export const authClient = createAuthClient({
  baseURL: apiBase,
});

export type Session = Awaited<ReturnType<typeof authClient.getSession>>["data"];
export type User = NonNullable<Session>["user"];

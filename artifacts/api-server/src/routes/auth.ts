import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth";

const router = Router();

/**
 * Mount the Better Auth request handler for all /api/auth/* paths.
 *
 * Better Auth handles:
 *   POST /api/auth/sign-in/email          — email+password sign-in
 *   POST /api/auth/sign-up/email          — registration
 *   POST /api/auth/sign-out               — sign-out
 *   GET  /api/auth/session                — current session
 *   GET  /api/auth/sign-in/social         — start OAuth flow
 *   GET  /api/auth/callback/:provider     — OAuth callback
 *   … plus more built-in endpoints
 */
const authHandler = toNodeHandler(auth);

router.all("/{*path}", (req, res) => {
  // Restore the full /api/auth prefix that Express strips when sub-routing
  req.url = `/api/auth${req.url === "/" ? "" : req.url}`;
  authHandler(req, res);
});

export default router;

import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { AuthUser } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

/**
 * Express middleware that validates the Better Auth session cookie/token.
 * Attaches `req.authUser` on success; returns 401 on failure.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.authUser = session.user as AuthUser;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};

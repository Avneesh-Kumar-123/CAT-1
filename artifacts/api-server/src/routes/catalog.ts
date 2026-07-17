import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, itemCatalog } from "@workspace/db";

const router = Router();

/**
 * GET /api/catalog
 * Returns all active items in the catalogue.
 * Public endpoint — no auth required.
 */
router.get("/", async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(itemCatalog)
      .where(eq(itemCatalog.active, true));
    res.json({ items });
  } catch {
    res.status(500).json({ error: "Failed to fetch catalog" });
  }
});

export default router;

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, cloudSaves } from "@workspace/db";
import { requireAuth } from "../middleware/require-auth";

const router = Router();

/**
 * GET /api/save
 * Returns the authenticated user's cloud save, or null if none exists yet.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.authUser!.id;
    const row = await db.query.cloudSaves.findFirst({
      where: eq(cloudSaves.userId, userId),
    });
    res.json({ save: row?.saveData ?? null, updatedAt: row?.updatedAt ?? null });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch save" });
  }
});

/**
 * PUT /api/save
 * Upserts the authenticated user's cloud save.
 * Body: { save: SaveData }
 */
router.put("/", requireAuth, async (req, res) => {
  try {
    const userId = req.authUser!.id;
    const saveData = req.body?.save;

    if (!saveData || typeof saveData !== "object") {
      res.status(400).json({ error: "Missing or invalid save data" });
      return;
    }

    await db
      .insert(cloudSaves)
      .values({ userId, saveData, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: cloudSaves.userId,
        set: { saveData, updatedAt: new Date() },
      });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save" });
  }
});

/**
 * DELETE /api/save
 * Wipes the authenticated user's cloud save (reset progress).
 */
router.delete("/", requireAuth, async (req, res) => {
  try {
    const userId = req.authUser!.id;
    await db.delete(cloudSaves).where(eq(cloudSaves.userId, userId));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete save" });
  }
});

export default router;

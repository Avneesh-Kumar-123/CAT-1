import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, inventoryItems, itemCatalog } from "@workspace/db";
import { requireAuth } from "../middleware/require-auth";

const router = Router();

/**
 * GET /api/inventory
 * Returns all inventory items owned by the current user, joined with catalog data.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.authUser!.id;
    const items = await db
      .select({
        id: inventoryItems.id,
        itemId: inventoryItems.itemId,
        acquiredAt: inventoryItems.acquiredAt,
        acquiredVia: inventoryItems.acquiredVia,
        // Catalog fields
        name: itemCatalog.name,
        itemType: itemCatalog.itemType,
        description: itemCatalog.description,
        coinPrice: itemCatalog.coinPrice,
        realPrice: itemCatalog.realPrice,
        metadata: itemCatalog.metadata,
      })
      .from(inventoryItems)
      .leftJoin(itemCatalog, eq(inventoryItems.itemId, itemCatalog.id))
      .where(eq(inventoryItems.userId, userId));

    res.json({ items });
  } catch {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

/**
 * POST /api/inventory
 * Adds an item to the user's inventory.
 * Body: { itemId: string; acquiredVia?: string; metadata?: object }
 *
 * Returns 409 if the user already owns the item (idempotent by item).
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.authUser!.id;
    const { itemId, acquiredVia = "coin_purchase", metadata } = req.body ?? {};

    if (!itemId || typeof itemId !== "string") {
      res.status(400).json({ error: "itemId is required" });
      return;
    }

    // Verify the item exists in the catalogue
    const catalogItem = await db.query.itemCatalog.findFirst({
      where: and(eq(itemCatalog.id, itemId), eq(itemCatalog.active, true)),
    });
    if (!catalogItem) {
      res.status(404).json({ error: "Item not found in catalog" });
      return;
    }

    // Idempotency — skip if already owned
    const existing = await db.query.inventoryItems.findFirst({
      where: and(
        eq(inventoryItems.userId, userId),
        eq(inventoryItems.itemId, itemId),
      ),
    });
    if (existing) {
      res.status(409).json({ error: "Item already owned", item: existing });
      return;
    }

    const [inserted] = await db
      .insert(inventoryItems)
      .values({ userId, itemId, acquiredVia, metadata })
      .returning();

    res.status(201).json({ item: inserted });
  } catch {
    res.status(500).json({ error: "Failed to add item" });
  }
});

export default router;

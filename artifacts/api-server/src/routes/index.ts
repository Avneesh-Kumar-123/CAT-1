import { Router, type IRouter } from "express";
import healthRouter from "./health";
import saveRouter from "./save";
import inventoryRouter from "./inventory";
import catalogRouter from "./catalog";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/save", saveRouter);
router.use("/inventory", inventoryRouter);
router.use("/catalog", catalogRouter);
router.use("/leaderboard", leaderboardRouter);

export default router;

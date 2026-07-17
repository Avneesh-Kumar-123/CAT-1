import { Router, type IRouter } from "express";
import healthRouter from "./health";
import saveRouter from "./save";
import inventoryRouter from "./inventory";
import catalogRouter from "./catalog";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/save", saveRouter);
router.use("/inventory", inventoryRouter);
router.use("/catalog", catalogRouter);

export default router;

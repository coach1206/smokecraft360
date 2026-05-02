import { Router, type IRouter } from "express";
import healthRouter    from "./health";
import recommendRouter from "./recommend";
import inventoryRouter from "./inventory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recommendRouter);
router.use(inventoryRouter);

export default router;

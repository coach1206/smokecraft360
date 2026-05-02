import { Router, type IRouter } from "express";
import healthRouter    from "./health";
import recommendRouter from "./recommend";
import inventoryRouter from "./inventory";
import authRouter      from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(recommendRouter);
router.use(inventoryRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter      from "./health";
import authRouter        from "./auth";
import recommendRouter   from "./recommend";
import productsRouter    from "./products";
import analyticsRouter   from "./analytics";
import eventsRouter      from "./events";
import experiencesRouter from "./experiences";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(recommendRouter);
router.use(productsRouter);
router.use(analyticsRouter);
router.use(eventsRouter);
router.use(experiencesRouter);

export default router;

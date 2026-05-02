import { Router, type IRouter } from "express";
import healthRouter      from "./health";
import recommendRouter   from "./recommend";
import inventoryRouter   from "./inventory";
import authRouter        from "./auth";
import eventsRouter      from "./events";
import experiencesRouter from "./experiences";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(recommendRouter);
router.use(inventoryRouter);
router.use(eventsRouter);
router.use(experiencesRouter);

export default router;

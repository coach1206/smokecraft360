import { Router, type IRouter } from "express";
import healthRouter        from "./health";
import authRouter          from "./auth";
import recommendRouter     from "./recommend";
import productsRouter      from "./products";
import analyticsRouter     from "./analytics";
import venueAnalyticsRouter from "./venueAnalytics";
import eventsRouter        from "./events";
import experiencesRouter   from "./experiences";
import preferencesRouter   from "./preferences";
import craftSessionsRouter from "./craftSessions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(recommendRouter);
router.use(productsRouter);
router.use(analyticsRouter);
router.use(venueAnalyticsRouter);
router.use(eventsRouter);
router.use(experiencesRouter);
router.use(preferencesRouter);
router.use("/craft-sessions", craftSessionsRouter);

export default router;

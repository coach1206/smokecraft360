import { Router, type IRouter } from "express";
import healthRouter            from "./health";
import authRouter              from "./auth";
import recommendRouter         from "./recommend";
import productsRouter          from "./products";
import analyticsRouter         from "./analytics";
import venueAnalyticsRouter    from "./venueAnalytics";
import eventsRouter            from "./events";
import experiencesRouter       from "./experiences";
import preferencesRouter       from "./preferences";
import craftSessionsRouter     from "./craftSessions";
import ordersRouter            from "./orders";
import devicesRouter           from "./devices";
import venuesRouter            from "./venues";
import demandInsightsRouter    from "./demandInsights";
import demandRouter            from "./demand";
import networkInsightsRouter   from "./networkInsights";
import distributionRouter      from "./distributionInsights";

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
router.use("/craft-sessions",  craftSessionsRouter);
router.use("/orders",          ordersRouter);
router.use("/devices",         devicesRouter);
router.use("/venues",          venuesRouter);
router.use("/demand",          demandInsightsRouter); // /demand/insights must come before /:venueId
router.use("/demand",          demandRouter);
router.use("/network",         networkInsightsRouter);
router.use("/distribution",    distributionRouter);

export default router;

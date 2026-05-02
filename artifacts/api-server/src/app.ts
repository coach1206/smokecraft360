import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";

import healthRouter      from "./routes/health";
import authRouter        from "./routes/auth";
import recommendRouter   from "./routes/recommend";
import productsRouter    from "./routes/products";
import analyticsRouter   from "./routes/analytics";
import eventsRouter      from "./routes/events";
import experiencesRouter from "./routes/experiences";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Each router owns its relative paths (e.g. GET "/" not GET "/api/products")
app.use("/api",              healthRouter);
app.use("/api/auth",         authRouter);
app.use("/api/recommend",    recommendRouter);
app.use("/api/products",     productsRouter);
app.use("/api/analytics",    analyticsRouter);
app.use("/api/events",       eventsRouter);
app.use("/api/experiences",  experiencesRouter);

export default app;

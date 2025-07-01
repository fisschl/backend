import { Hono } from "hono";
import { logger } from "hono/logger";
import { user } from "./user";
import { errorHandler } from "./utils/errors";

const api = new Hono().route("/user", user);

const app = new Hono().route("/api", api);
app.use(logger());
app.onError(errorHandler);

export default app;

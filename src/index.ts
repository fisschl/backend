import { Hono } from "hono";
import { logger } from "hono/logger";
import { user } from "./user";
import { consola, ServerError } from "./utils/errors";

const api = new Hono().route("/user", user);

const app = new Hono().route("/api", api);

const loggerMiddleware = logger((message, ...rest) => {
  consola.log(message, ...rest);
});

app.use(loggerMiddleware);

app.onError((err, ctx) => {
  if (err instanceof ServerError)
    return ctx.json({ error: err.message }, err.status);
  if (err instanceof Error) return ctx.json({ error: err.message }, 500);
  return ctx.json({ error: "请求失败，请稍后重试" }, 500);
});

export default app;

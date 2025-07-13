import { Hono } from "hono";
import { logger } from "hono/logger";
import { consola, ServerError } from "./utils/errors";
import { apiRouter } from "./api";

const app = new Hono().route("/api", apiRouter);

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

export default {
  port: 4000,
  fetch: app.fetch,
};

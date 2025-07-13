import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { apiRouter } from "./api";
import { websocket } from "./api/ws";

const app = new Hono()
  .route("/api", apiRouter)
  .use(logger())
  .onError((err, ctx) => {
    if (err instanceof HTTPException) return err.getResponse();
    if (err instanceof Error) return ctx.json({ message: err.message }, 500);
    return ctx.json({ error: "请求失败，请稍后重试" }, 500);
  });

export default {
  port: 4000,
  fetch: app.fetch,
  websocket,
};

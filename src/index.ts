import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { api } from "./api";
import { websocket } from "./utils/socket";
import { ws } from "./ws";

const app = new Hono()
  .use(logger())
  .use(cors())
  .onError((err, ctx) => {
    if (err instanceof HTTPException) return err.getResponse();
    if (err instanceof Error) return ctx.json({ message: err.message }, 500);
    return ctx.json({ error: "请求失败，请稍后重试" }, 500);
  })
  .route("/api", api)
  .route("/ws", ws);

export default {
  port: 4000,
  fetch: app.fetch,
  websocket,
};

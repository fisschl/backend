import { Hono } from "hono";
import { s3, uuid } from "../utils/db";
import { chat } from "./chat";
import { user } from "./user";

export const api = new Hono()
  .get("/static/*", async (ctx) => {
    const { path } = ctx.req;
    const s3Path = path.slice(path.indexOf("/static/"));
    ctx.header("Cache-Control", `public, max-age=${60 * 60 * 23}`);
    const url = s3.presign(s3Path, {
      expiresIn: 60 * 60 * 24,
      method: "GET",
    });
    return ctx.redirect(url);
  })
  .route("/user", user)
  .route("/chat", chat)
  .post("/uuid", (ctx) => {
    return ctx.json({
      uuid: uuid(),
      createTime: new Date().toISOString(),
    });
  });

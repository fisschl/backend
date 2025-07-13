import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { s3 } from "../utils/db";
import { user } from "./user";

export const api = new Hono()
  .route("/user", user)
  .get("/404", () => {
    throw new HTTPException(404, { message: "Not Found" });
  })
  .get("/static/*", async (ctx) => {
    const { path } = ctx.req;
    const s3Path = path.slice(path.indexOf("/static/"));
    ctx.header("Cache-Control", `public, max-age=${60 * 60 * 23}`);
    const url = s3.presign(s3Path, {
      expiresIn: 60 * 60 * 24,
      method: "GET",
    });
    return ctx.redirect(url);
  });

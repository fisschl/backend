import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { s3Router } from "./s3";
import { userRouter } from "./user";
import { wsHandler } from "./ws";

export const apiRouter = new Hono()
  .route("/user", userRouter)
  .route("/s3", s3Router)
  .get("/ws", wsHandler)
  .get("/404", () => {
    throw new HTTPException(404, { message: "Not Found" });
  });

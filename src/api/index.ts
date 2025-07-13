import { Hono } from "hono";
import { userRouter } from "./user";
import { s3Router } from "./s3";

export const apiRouter = new Hono().route("/user", userRouter).route("/s3", s3Router);

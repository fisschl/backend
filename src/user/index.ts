import { Hono } from "hono";
import { omit } from "radashi";
import { signIn, signUp, useVerifyJWT } from "./sign";
import { useSignJWT } from "./sign";
import { setCookie } from "hono/cookie";
import { ServerError } from "../utils/errors";
import { prisma } from "../utils/db";
import { changeUserInfo } from "./sign";

export const user = new Hono()
  .post("/sign-up", async (ctx) => {
    const body = await ctx.req.json();
    const user = await signUp(body);
    const jwt = await useSignJWT({ user_id: user.user_id });
    setCookie(ctx, "token", jwt);
    return ctx.json({ ...user, token: jwt });
  })
  .post("/sign-in", async (ctx) => {
    const body = await ctx.req.json();
    const user = await signIn(body);
    if (!user) throw new ServerError(401, "用户名或密码错误");
    const jwt = await useSignJWT({ user_id: user.user_id });
    setCookie(ctx, "token", jwt);
    return ctx.json({ ...user, token: jwt });
  })
  .put("/info", async (ctx) => {
    const { user_id } = await useVerifyJWT(ctx);
    const body = await ctx.req.json();
    const user = await changeUserInfo({ ...body, user_id });
    return ctx.json(user);
  })
  .get("/info", async (ctx) => {
    const { user_id } = await useVerifyJWT(ctx);
    const user = await prisma.user.findUnique({
      where: {
        user_id,
      },
    });
    if (!user) throw new ServerError(404, "用户不存在");
    return ctx.json(omit(user, ["password"]));
  });

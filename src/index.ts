import { Hono } from "hono";
import {
  changeUserInfo,
  ServerError,
  signIn,
  signUp,
  useSignJWT,
  useVerifyJWT,
} from "./utils/sign";
import { setCookie } from "hono/cookie";
import { logger } from "hono/logger";
import { prisma } from "./utils/db";
import { omit } from "radashi";

const api = new Hono()
  .post("/user/sign-up", async (ctx) => {
    const body = await ctx.req.json();
    const user = await signUp(body);
    const jwt = await useSignJWT({ user_id: user.user_id });
    setCookie(ctx, "token", jwt);
    return ctx.json({ ...user, token: jwt });
  })
  .post("/user/sign-in", async (ctx) => {
    const body = await ctx.req.json();
    const user = await signIn(body);
    if (!user) throw new ServerError(401, "用户名或密码错误");
    const jwt = await useSignJWT({ user_id: user.user_id });
    setCookie(ctx, "token", jwt);
    return ctx.json({ ...user, token: jwt });
  })
  .put("/user/info", async (ctx) => {
    const { user_id } = await useVerifyJWT(ctx);
    const body = await ctx.req.json();
    const user = await changeUserInfo({ ...body, user_id });
    return ctx.json(user);
  })
  .get("/user/info", async (ctx) => {
    const { user_id } = await useVerifyJWT(ctx);
    const user = await prisma.user.findUnique({
      where: {
        user_id,
      },
    });
    if (!user) throw new ServerError(404, "用户不存在");
    return ctx.json(omit(user, ["password"]));
  });

const app = new Hono();
app.use(logger());

app.onError((err, ctx) => {
  if (err instanceof ServerError)
    return ctx.json({ error: err.message }, err.status);
  if (err instanceof Error) return ctx.json({ error: err.message }, 500);
  return ctx.json({ error: "请求失败，请稍后重试" }, 500);
});

app.route("/api", api);

export default app;

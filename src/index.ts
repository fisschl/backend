import { Hono } from "hono";
import { ServerError, signIn, signUp, useSignJWT } from "./utils/sign";
import { setCookie } from "hono/cookie";
import { logger } from "hono/logger";

const api = new Hono()
  .post("/user/sign-up", async (ctx) => {
    const { user_name, password, email } = await ctx.req.json();
    const user = await signUp({ user_name, password, email });
    const jwt = await useSignJWT({ user_id: user.user_id });
    setCookie(ctx, "token", jwt);
    return ctx.json({ ...user, token: jwt });
  })
  .post("/user/sign-in", async (ctx) => {
    const { name, password } = await ctx.req.json();
    const user = await signIn({ name, password });
    if (!user) throw new ServerError(401, "用户名或密码错误");
    const jwt = await useSignJWT({ user_id: user.user_id });
    setCookie(ctx, "token", jwt);
    return ctx.json({ ...user, token: jwt });
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

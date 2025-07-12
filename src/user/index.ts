import { Hono, type Context } from "hono";
import { omit } from "radashi";
import { getCookie, setCookie } from "hono/cookie";
import { ServerError, validate } from "../utils/errors";
import { newToken, prisma } from "../utils/db";
import { LRUCache } from "lru-cache";
import { z } from "zod";
import type { User } from "@prisma/client";

const SignUpZod = z.object({
  userName: z.string(),
  password: z.string(),
  email: z.string(),
});

export const signUp = async (params: z.infer<typeof SignUpZod>) => {
  const data = validate(params, SignUpZod);
  data.password = await Bun.password.hash(data.password);
  try {
    const user = await prisma.user.create({
      data,
    });
    return omit(user, ["password"]);
  } catch {
    throw new ServerError(400, "该用户已存在");
  }
};

export const SignInZod = z.object({
  loginName: z.string(),
  password: z.string(),
});

export const signIn = async (params: z.infer<typeof SignInZod>) => {
  const data = validate(params, SignInZod);
  const userList = await prisma.user.findMany({
    where: {
      OR: [{ userName: data.loginName }, { email: data.loginName }],
    },
  });
  for (const user of userList) {
    const isPasswordValid = await Bun.password.verify(
      data.password,
      user.password
    );
    if (!isPasswordValid) continue;
    return omit(user, ["password"]);
  }
  throw new ServerError(401, "用户名或密码错误");
};

const getTokenFromContext = (ctx: Context) => {
  const queryToken = ctx.req.query("token");
  if (queryToken) return queryToken;
  const headerToken = ctx.req.header("token");
  if (headerToken) return headerToken;
  const cookieToken = getCookie(ctx, "token");
  if (cookieToken) return cookieToken;
};

/**
 * 用户缓存，通过 userId 或 token 获取用户信息
 */
export const userCache = new LRUCache<string, Omit<User, "password">>({
  max: 32 * 1024,
  // 24 小时
  ttl: 1000 * 60 * 60 * 24,
});

export const selectUserByUserId = async (userId: string) => {
  const cachedUser = userCache.get(userId);
  if (cachedUser) return cachedUser;
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
  });
  if (!user) return;
  const result = omit(user, ["password"]);
  userCache.set(userId, result);
  return result;
};

export const selectUserByToken = async (token: string) => {
  const cachedUser = userCache.get(token);
  if (cachedUser) return cachedUser;
  const tokenInfo = await prisma.token.findUnique({
    where: {
      token,
    },
  });
  if (!tokenInfo) return;
  const user = await selectUserByUserId(tokenInfo.userId);
  if (!user) return;
  userCache.set(token, user);
  return user;
};

const useNeedLogin = async (ctx: Context) => {
  const token = getTokenFromContext(ctx);
  if (!token) throw new ServerError(401, "请先登录");
  const user = await selectUserByToken(token);
  if (!user) throw new ServerError(401, "登录态非法");
  return user;
};

const ChangeUserInfoZod = z.object({
  userName: z.string().optional(),
  password: z.string().optional(),
  email: z.string().optional(),
});

export const user = new Hono()
  .post("/signUp", async (ctx) => {
    const body = await ctx.req.json();
    const user = await signUp(body);
    const token = newToken();
    setCookie(ctx, "token", token);
    return ctx.json({ ...user, token });
  })
  .post("/signIn", async (ctx) => {
    const body = await ctx.req.json();
    const user = await signIn(body);
    const token = newToken();
    setCookie(ctx, "token", token);
    return ctx.json({ ...user, token });
  })
  .put("/userInfo", async (ctx) => {
    const { userId } = await useNeedLogin(ctx);
    const body = await ctx.req.json();
    const data = validate(body, ChangeUserInfoZod);
    const user = await prisma.user.update({
      where: {
        userId,
      },
      data,
    });
    return ctx.json(omit(user, ["password"]));
  })
  .get("/me", async (ctx) => {
    const user = await useNeedLogin(ctx);
    return ctx.json(user);
  });

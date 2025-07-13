import type { User } from "@prisma/client";
import { subDays } from "date-fns";
import { Hono, type Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { LRUCache } from "lru-cache";
import { omit, throttle } from "radashi";
import { z } from "zod";
import { newToken, prisma } from "../../utils/db";
import { validate } from "../../utils/errors";

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
    throw new HTTPException(400, { message: "该用户已存在" });
  }
};

export const SignInZod = z.object({
  loginName: z.string(),
  password: z.string(),
});

export const signIn = async (params: z.infer<typeof SignInZod>) => {
  const data = validate(params, SignInZod);
  const user = await prisma.user.findFirst({
    where: {
      email: data.loginName,
    },
  });
  if (!user) throw new HTTPException(401, { message: "用户名或密码错误" });
  const isPasswordValid = await Bun.password.verify(data.password, user.password);
  if (!isPasswordValid) throw new HTTPException(401, { message: "用户名或密码错误" });
  return omit(user, ["password"]);
};

const getTokenFromContext = (ctx: Context) => {
  const queryToken = ctx.req.query("token");
  if (queryToken) return queryToken;
  const headerToken = ctx.req.header("token");
  if (headerToken) return headerToken;
  const cookieToken = getCookie(ctx, "token");
  if (cookieToken) return cookieToken;
};

export const userCache = new LRUCache<string, Omit<User, "password">>({
  max: 1024,
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

export const tokenCache = new LRUCache<string, string>({
  max: 6 * 1024,
  ttl: 1000 * 60 * 60 * 24,
});

export const selectUserByToken = async (token: string) => {
  const userId = tokenCache.get(token);
  if (userId) return selectUserByUserId(userId);
  const tokenInfo = await prisma.token.findUnique({
    where: {
      token,
    },
  });
  if (!tokenInfo) return;
  const user = await selectUserByUserId(tokenInfo.userId);
  if (!user) return;
  tokenCache.set(token, user.userId);
  return user;
};

const useNeedLogin = async (ctx: Context) => {
  const token = getTokenFromContext(ctx);
  if (!token) throw new HTTPException(401, { message: "请先登录" });
  const user = await selectUserByToken(token);
  if (!user) throw new HTTPException(401, { message: "登录态非法" });
  return user;
};

const ChangeUserInfoZod = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  password: z.string().optional(),
  email: z.string().optional(),
});

const registerNewToken = async (ctx: Context, user: Omit<User, "password">) => {
  const token = newToken();
  await prisma.token.create({
    data: {
      token,
      userId: user.userId,
    },
  });
  setCookie(ctx, "token", token);
  return token;
};

const clearOutdatedToken = throttle({ interval: 1000 * 60 }, async () => {
  const date = subDays(new Date(), 60);
  const tokens = await prisma.token.findMany({
    where: {
      createdAt: {
        lt: date,
      },
    },
    take: 1024,
    select: { token: true },
  });
  await prisma.token.deleteMany({
    where: {
      token: { in: tokens.map((token) => token.token) },
    },
  });
  for (const token of tokens) tokenCache.delete(token.token);
});

export const user = new Hono()
  .post("/register", async (ctx) => {
    const body = await ctx.req.json();
    const user = await signUp(body);
    const token = await registerNewToken(ctx, user);
    return ctx.json({ ...user, token });
  })
  .post("/login", async (ctx) => {
    const body = await ctx.req.json();
    const user = await signIn(body);
    const token = await registerNewToken(ctx, user);
    clearOutdatedToken();
    return ctx.json({ ...user, token });
  })
  .put("/userInfo", async (ctx) => {
    const currentUser = await useNeedLogin(ctx);
    const body = await ctx.req.json();
    const data = validate(body, ChangeUserInfoZod);
    const userId = data.userId || currentUser.userId;
    if (userId !== currentUser.userId && currentUser.role !== "SUPER_ADMIN")
      throw new HTTPException(403, { message: "无权限" });
    const user = await prisma.user.update({
      where: {
        userId,
      },
      data: omit(data, ["userId"]),
    });
    userCache.set(userId, omit(user, ["password"]));
    return ctx.json(omit(user, ["password"]));
  })
  .get("/userInfo", async (ctx) => {
    const { userId } = ctx.req.query();
    const currentUser = await useNeedLogin(ctx);
    if (!userId || userId === currentUser.userId) return ctx.json(currentUser);
    const user = await selectUserByUserId(userId);
    if (!user) throw new HTTPException(404, { message: "用户不存在" });
    return ctx.json(user);
  });

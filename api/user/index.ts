import { subDays } from "date-fns";
import { eq, inArray, lt } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { LRUCache } from "lru-cache";
import { omit, throttle } from "radashi";
import { z } from "zod";
import { db } from "../../drizzle";
import { tokens, users } from "../../drizzle/schema";
import { UserInsertZod, UserSelectZod, UserUpdateZod } from "../../drizzle/zod";
import { uuid } from "../../utils/uuid";
import { validate } from "../../utils/zod";

const getTokenFromContext = (ctx: Context) => {
  const queryToken = ctx.req.query("token");
  if (queryToken) return queryToken;
  const headerToken = ctx.req.header("token");
  if (headerToken) return headerToken;
  const cookieToken = getCookie(ctx, "token");
  if (cookieToken) return cookieToken;
};

type CacheUser = Omit<z.infer<typeof UserSelectZod>, "password">;

export const userCache = new LRUCache<string, CacheUser>({
  max: 1024,
  ttl: 1000 * 60 * 60 * 24,
});

export const selectUserByUserId = async (userId: string) => {
  const cachedUser = userCache.get(userId);
  if (cachedUser) return cachedUser;
  const [user] = await db.select().from(users).where(eq(users.userId, userId));
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
  const [tokenInfo] = await db.select().from(tokens).where(eq(tokens.token, token));
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

const registerNewToken = async (ctx: Context, user: CacheUser) => {
  const token = uuid();
  await db.insert(tokens).values({
    token,
    userId: user.userId,
  });
  setCookie(ctx, "token", token);
  return token;
};

const clearOutdatedToken = throttle({ interval: 1000 * 60 }, async () => {
  const date = subDays(new Date(), 60);
  const oldTokens = await db
    .select({ token: tokens.token })
    .from(tokens)
    .where(lt(tokens.createdAt, date))
    .limit(1024);
  if (!oldTokens.length) return;
  const tokenValues = oldTokens.map((t) => t.token);
  await db.delete(tokens).where(inArray(tokens.token, tokenValues));
  for (const token of oldTokens) tokenCache.delete(token.token);
});

// 基于 UserInsertZod 创建注册模式，但排除 userId（由系统生成）
const SignUpZod = UserInsertZod.omit({ userId: true });

// 登录模式 - 只需要邮箱和密码
const SignInZod = z.object({
  email: z.string(),
  password: z.string(),
});

// 基于 UserUpdateZod 创建用户信息更新模式
const ChangeUserInfoZod = UserUpdateZod.partial();

export const user = new Hono()
  .post("/register", async (ctx) => {
    const body = await ctx.req.json();
    const data = validate(body, SignUpZod);
    data.password = await Bun.password.hash(data.password);
    try {
      const [user] = await db
        .insert(users)
        .values({
          ...data,
          userId: uuid(),
        })
        .returning();
      const token = await registerNewToken(ctx, omit(user!, ["password"]));
      return ctx.json({ ...omit(user!, ["password"]), token });
    } catch {
      throw new HTTPException(400, { message: "该用户已存在" });
    }
  })
  .post("/login", async (ctx) => {
    const body = await ctx.req.json();
    const data = validate(body, SignInZod);
    const [user] = await db.select().from(users).where(eq(users.email, data.email));
    if (!user) throw new HTTPException(401, { message: "用户名或密码错误" });
    const isPasswordValid = await Bun.password.verify(data.password, user.password);
    if (!isPasswordValid) throw new HTTPException(401, { message: "用户名或密码错误" });
    const token = await registerNewToken(ctx, omit(user, ["password"]));
    clearOutdatedToken();
    return ctx.json({ ...omit(user, ["password"]), token });
  })
  .put("/userInfo", async (ctx) => {
    const currentUser = await useNeedLogin(ctx);
    const body = await ctx.req.json();
    const data = validate(body, ChangeUserInfoZod);
    const userId = data.userId || currentUser.userId;
    if (userId !== currentUser.userId && currentUser.role !== "SUPER_ADMIN")
      throw new HTTPException(403, { message: "无权限" });

    const updateData = omit(data, ["userId"]);
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.userId, userId))
      .returning();

    if (user) {
      userCache.set(userId, omit(user, ["password"]));
      return ctx.json(omit(user, ["password"]));
    }
    throw new HTTPException(404, { message: "用户不存在" });
  })
  .get("/userInfo", async (ctx) => {
    const { userId } = ctx.req.query();
    const currentUser = await useNeedLogin(ctx);
    if (!userId || userId === currentUser.userId) return ctx.json(currentUser);
    const user = await selectUserByUserId(userId);
    if (!user) throw new HTTPException(404, { message: "用户不存在" });
    return ctx.json(user);
  });

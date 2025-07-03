import { prisma } from "../utils/db";
import { omit } from "radashi";
import { sign as jwtSign, verify as jwtVerify } from "hono/jwt";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { z } from "zod/v4";
import { ServerError } from "../utils/errors";

const SignUpSchema = z.object({
  user_name: z.string(),
  password: z.string(),
  email: z.string(),
});

export const signUp = async (params: z.infer<typeof SignUpSchema>) => {
  try {
    const parsed = SignUpSchema.parse(params);
    parsed.password = await Bun.password.hash(parsed.password);
    const user = await prisma.user.create({
      data: parsed,
    });
    return omit(user, ["password"]);
  } catch {
    throw new ServerError(400, "该用户已存在");
  }
};

const SignInSchema = z.object({
  name: z.string(),
  password: z.string(),
});

export const signIn = async (params: z.infer<typeof SignInSchema>) => {
  const parsed = SignInSchema.parse(params);
  const userList = await prisma.user.findMany({
    where: {
      OR: [{ user_name: parsed.name }, { email: parsed.name }],
    },
  });
  for (const user of userList) {
    const isPasswordValid = await Bun.password.verify(
      parsed.password,
      user.password
    );
    if (!isPasswordValid) continue;
    return omit(user, ["password"]);
  }
};

export const JWTPayloadSchema = z.object({
  user_id: z.string(),
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

export const useSignJWT = async (payload: JWTPayload) => {
  const { HS256_SECRET } = Bun.env;
  if (!HS256_SECRET) throw new ServerError(500, "服务器错误");
  // 1 year
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  return await jwtSign({ ...payload, exp }, HS256_SECRET, "HS256");
};

const BearerRegex = /Bearer\s+(\S+)/;

const getToken = (ctx: Context) => {
  const cookieToken = getCookie(ctx, "token");
  if (cookieToken) return cookieToken;
  const bearer = ctx.req.header("Authorization");
  const bearerMatch = bearer?.match(BearerRegex);
  if (bearerMatch) return bearerMatch[1]!;
};

export const useVerifyJWT = async (ctx: Context): Promise<JWTPayload> => {
  const { HS256_SECRET } = Bun.env;
  if (!HS256_SECRET) throw new ServerError(500, "服务器错误");
  const token = getToken(ctx);
  if (!token) throw new ServerError(401, "请先登录");
  const payload = await jwtVerify(token, HS256_SECRET, "HS256");
  return JWTPayloadSchema.parse(payload);
};

const ChangeUserInfoSchema = z.object({
  user_id: z.string(),
  user_name: z.string().optional(),
  password: z.string().optional(),
  email: z.string().optional(),
});

export const changeUserInfo = async (
  params: z.infer<typeof ChangeUserInfoSchema>
) => {
  const parsed = ChangeUserInfoSchema.parse(params);
  if (parsed.password) parsed.password = await Bun.password.hash(parsed.password);
  else parsed.password = undefined;
  const user = await prisma.user.update({
    where: {
      user_id: parsed.user_id,
    },
    data: parsed,
  });
  return omit(user, ["password"]);
};

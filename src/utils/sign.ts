import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import { prisma } from "./db";
import { omit } from "radashi";
import { sign as jwtSign, verify as jwtVerify } from "hono/jwt";
import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { z } from "zod/v4";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const signUp = async (options: {
  user_name: string;
  password: string;
  email: string;
}) => {
  try {
    const user = await prisma.user.create({
      data: {
        user_name: options.user_name,
        password: await argon2Hash(options.password),
        email: options.email,
      },
    });
    return omit(user, ["password"]);
  } catch {
    throw new ServerError(400, "该用户已存在");
  }
};

export const signIn = async (options: { name: string; password: string }) => {
  const userList = await prisma.user.findMany({
    where: {
      OR: [{ user_name: options.name }, { email: options.name }],
    },
  });
  for (const user of userList) {
    const isPasswordValid = await argon2Verify(user.password, options.password);
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

export class ServerError extends Error {
  status: ContentfulStatusCode;
  constructor(status: ContentfulStatusCode, message: string) {
    super(message);
    this.status = status;
  }
}

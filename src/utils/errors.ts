import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ServerError extends Error {
  status: ContentfulStatusCode;
  constructor(status: ContentfulStatusCode, message: string) {
    super(message);
    this.status = status;
  }
}

export const errorHandler: ErrorHandler = (err, ctx) => {
  if (err instanceof ServerError)
    return ctx.json({ error: err.message }, err.status);
  if (err instanceof Error) return ctx.json({ error: err.message }, 500);
  return ctx.json({ error: "请求失败，请稍后重试" }, 500);
};

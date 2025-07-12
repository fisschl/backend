import { createConsola } from "consola";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z, type ZodType } from "zod";

export class ServerError extends Error {
  status: ContentfulStatusCode;
  constructor(status: ContentfulStatusCode, message: string) {
    super(message);
    this.status = status;
  }
}

export const consola = createConsola();

export const validate = <T>(params: unknown, schema: ZodType<T>) => {
  const result = schema.safeParse(params);
  if (result.success) return result.data;
  throw new ServerError(400, z.prettifyError(result.error));
};

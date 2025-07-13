import { HTTPException } from "hono/http-exception";
import { z, type ZodType } from "zod";

export const validate = <T>(params: unknown, schema: ZodType<T>) => {
  const result = schema.safeParse(params);
  if (result.success) return result.data;
  throw new HTTPException(400, {
    message: z.prettifyError(result.error),
  });
};

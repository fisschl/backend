import { HTTPError } from "h3";
import z, { type ZodType } from "zod";

export const validate = <T>(params: unknown, schema: ZodType<T>) => {
  const result = schema.safeParse(params);
  if (result.success) return result.data;
  throw new HTTPError(z.prettifyError(result.error), {
    status: 400,
    cause: result.error,
  });
};

import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Hono } from "hono";
import { z } from "zod";

const { OPENAI_API_KEY, OPENAI_PROXY_URL } = Bun.env;

export const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: OPENAI_PROXY_URL,
});

export const ChatDataZod = z
  .object({
    system: z.string(),
  })
  .partial();

export const chat = new Hono().post("openai", async (ctx) => {
  const { messages, data } = await ctx.req.json();
  const { OPENAI_MODEL } = Bun.env;
  if (!OPENAI_MODEL) throw new Error("Missing OpenAI model");
  const configs: z.infer<typeof ChatDataZod> = {};
  {
    const result = ChatDataZod.safeParse(data);
    if (result.success) Object.assign(configs, result.data);
  }
  const result = streamText({
    model: openai(OPENAI_MODEL),
    messages,
    system: configs.system,
  });
  return result.toDataStreamResponse();
});

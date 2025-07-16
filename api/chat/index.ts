import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import Emittery from "emittery";
import { Hono } from "hono";
import { z } from "zod";
import { upgradeWebSocket } from "../../utils/socket";

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

const emitRoom = new Emittery();

const room = upgradeWebSocket((ctx) => {
  const { room } = ctx.req.query();
  const offs: (() => void)[] = [];
  return {
    onOpen(evt, ws) {
      offs.push(
        emitRoom.on(`${room}:message`, (data) => {
          ws.send(data);
        }),
      );
    },
    onMessage(evt) {
      const { data } = evt;
      if (typeof data !== "string") return;
      emitRoom.emit(`${room}:message`, data);
    },
    onClose: () => {
      offs.forEach((off) => off());
    },
  };
});

export const chat = new Hono()
  .post("openai", async (ctx) => {
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
  })
  .get("/room", room);

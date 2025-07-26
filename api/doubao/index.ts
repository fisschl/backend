import { validate } from "@/utils/zod";
import { H3 } from "h3";
import { z } from "zod";

const { DOUBAO_API_KEY, DOUBAO_MODEL } = Bun.env;

const DoubaoThinkingZod = z.object({
  type: z.enum(["enabled", "disabled", "auto"]),
});

const DoubaoChatZod = z.object({
  messages: z.array(z.any()),
  thinking: DoubaoThinkingZod.optional(),
});

export const doubaoRouter = new H3().post("/chat", async (event) => {
  const body = await event.req.json();
  const { messages, thinking } = validate(body, DoubaoChatZod);
  return fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DOUBAO_API_KEY}`,
    },
    body: JSON.stringify({
      model: DOUBAO_MODEL,
      messages,
      stream: true,
      thinking,
    }),
  });
});

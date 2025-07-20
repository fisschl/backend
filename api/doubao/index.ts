import { H3, HTTPError, readBody } from "h3";

const { DOUBAO_API_KEY, DOUBAO_MODEL } = Bun.env;

export const doubao = new H3().post("/chat", async (event) => {
  const body = await readBody<Record<string, any>>(event);
  if (!body) throw new HTTPError("Bad Request", { status: 400 });
  const { messages, thinking } = body;
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

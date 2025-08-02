import type { H3Event, Middleware } from "h3";

const appendCorsHeaders = (event: H3Event) => {
  const { headers } = event.res;
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "*");
};

export const cors: Middleware = (event) => {
  appendCorsHeaders(event);
  const { method } = event.req;
  if (method === "OPTIONS") return new Response(null, { status: 204 });
};

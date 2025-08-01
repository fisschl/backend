import { doubaoRouter } from "@/api/doubao";
import { duckRouter } from "@/api/duck";
import { userRouter } from "@/api/user";
import { logger } from "@/utils/logger";
import { uuid } from "@/utils/uuid";
import { getRequestURL, H3, serve } from "h3";

const app = new H3()
  .use((event) => {
    const { method } = event.req;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };
    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
    const { headers } = event.res;
    Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
  })
  .use((event) => {
    const { method } = event.req;
    const { pathname } = getRequestURL(event);
    logger.info(`[${new Date().toISOString()}] [${method}] ${pathname}`);
  })
  .post("/api/uuid", () => uuid())
  .mount("/api/user", userRouter)
  .mount("/api/doubao", doubaoRouter)
  .mount("/api/duck", duckRouter);

serve(app, { port: 4000 });

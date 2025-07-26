import { doubaoRouter } from "@/api/doubao";
import { duckRouter } from "@/api/duck";
import { userRouter } from "@/api/user";
import { logger } from "@/utils/logger";
import { uuid } from "@/utils/uuid";
import { getRequestURL, H3, handleCors, serve } from "h3";
import { s3 } from "./utils/s3";

const app = new H3()
  .use((event) => {
    const isPreflight = handleCors(event, {
      preflight: { statusCode: 204 },
    });
    if (isPreflight) return true;
  })
  .use((event) => {
    const { method } = event.req;
    const { pathname } = getRequestURL(event);
    logger.info(`[${new Date().toISOString()}] [${method}] ${pathname}`);
  })
  .post("/api/uuid", () => uuid())
  .get("/api/static/**", async (event) => {
    const { pathname } = getRequestURL(event);
    const s3Path = pathname.slice(pathname.indexOf("/static/"));
    const file = s3.file(s3Path);
    return new Response(file);
  })
  .mount("/api/user", userRouter)
  .mount("/api/doubao", doubaoRouter)
  .mount("/api/duck", duckRouter);

serve(app, { port: 4000 });

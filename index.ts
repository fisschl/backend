import { doubaoRouter } from "@/api/doubao";
import { duckRouter } from "@/api/duck";
import { userRouter } from "@/api/user";
import { cors } from "@/utils/cors";
import { logger } from "@/utils/logger";
import { uuid } from "@/utils/uuid";
import { getRequestURL, H3, serve } from "h3";

const app = new H3()
  .use(cors)
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

import { doubao } from "@/api/doubao";
import { duck } from "@/api/duck";
import { user } from "@/api/user";
import { logger } from "@/utils/logger";
import { s3 } from "@/utils/s3";
import { uuid } from "@/utils/uuid";
import { getRequestURL, H3, handleCors, redirect, serve } from "h3";
import { daysToSeconds } from "./utils/time";

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
    logger.info(`[${method}] ${pathname}`);
  })
  .get("/api/static/**", async (event) => {
    const { pathname } = getRequestURL(event);
    const s3Path = pathname.slice(pathname.indexOf("/static/"));
    const { res } = event;
    res.headers.set("Cache-Control", `public, max-age=${daysToSeconds(29)}`);
    const url = s3.presign(s3Path, {
      expiresIn: daysToSeconds(30),
      method: "GET",
    });
    return redirect(event, url, 302);
  })
  .post("/api/uuid", () => {
    return {
      uuid: uuid(),
      createTime: new Date().toISOString(),
    };
  })
  .mount("/api/user", user)
  .mount("/api/doubao", doubao)
  .mount("/api/duck", duck);

serve(app, { port: 4000 });

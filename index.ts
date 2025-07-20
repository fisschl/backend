import { getRequestURL, H3, handleCors, redirect, serve } from "h3";
import { doubao } from "./api/doubao";
import { user } from "./api/user";
import { s3 } from "./utils/s3";
import { uuid } from "./utils/uuid";

const app = new H3()
  .use((event) => {
    const isPreflight = handleCors(event, {
      preflight: { statusCode: 204 },
    });
    if (isPreflight) return true;
  })
  .get("/api/static/**", async (event) => {
    const { pathname } = getRequestURL(event);
    const s3Path = pathname.slice(pathname.indexOf("/static/"));
    const { res } = event;
    res.headers.set("Cache-Control", `public, max-age=${60 * 60 * 23}`);
    const url = s3.presign(s3Path, {
      expiresIn: 60 * 60 * 24,
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
  .mount("/api/doubao", doubao);

serve(app, { port: 4000 });

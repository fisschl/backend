import { s3 } from "@/utils/s3";
import { daysToSeconds } from "@/utils/time";
import { getRequestURL, H3 } from "h3";

export const staticRouter = new H3().get("/**", async (event) => {
  const { pathname } = getRequestURL(event);
  const s3Path = pathname.slice(pathname.indexOf("/static/"));
  const file = s3.file(s3Path);
  const { type, size } = await file.stat();
  const bytes = await file.bytes();
  const headers = new Headers();
  headers.set("Cache-Control", `public, max-age=${daysToSeconds(30)}`);
  headers.set("Content-Type", type);
  headers.set("Content-Length", size.toString());
  return new Response(bytes, { headers });
});
